package com.voxelfashion.fabrictrack.business.sms;
import com.voxelfashion.fabrictrack.business.exception.BusinessProblem;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Arrays;
import java.util.Base64;
import java.util.Locale;
import java.util.regex.Pattern;

public final class ConfiguredSmsSender implements SmsSender {

    private static final Logger log =
            LoggerFactory.getLogger(ConfiguredSmsSender.class);

    private static final Pattern ERROR_CODE_PATTERN =
            Pattern.compile("\"code\"\\s*:\\s*(\\d+)");

    private final boolean dev;
    private final String sid;
    private final String token;
    private final String from;

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public ConfiguredSmsSender(Environment env) {
        String mode = env.getProperty("business.sms-mode", "disabled")
                .trim()
                .toLowerCase(Locale.ROOT);

        if (!mode.equals("console") && !mode.equals("twilio")) {
            throw new IllegalStateException(
                    "Set BUSINESS_SMS_MODE to console or twilio."
            );
        }

        this.dev = mode.equals("console");

        if (dev && !Arrays.asList(env.getActiveProfiles())
                .contains("business-local")) {
            throw new IllegalStateException(
                    "Console SMS requires the business-local profile."
            );
        }

        this.sid = env.getProperty("TWILIO_ACCOUNT_SID", "").trim();
        this.token = env.getProperty("TWILIO_AUTH_TOKEN", "").trim();
        this.from = env.getProperty("TWILIO_FROM_NUMBER", "").trim();

        if (!dev) {
            if (!sid.matches("AC[a-fA-F0-9]{32}")) {
                throw new IllegalStateException(
                        "TWILIO_ACCOUNT_SID must be a valid Account SID."
                );
            }

            if (token.isBlank()) {
                throw new IllegalStateException(
                        "TWILIO_AUTH_TOKEN is required."
                );
            }

            if (from.isBlank()) {
                throw new IllegalStateException(
                        "TWILIO_FROM_NUMBER is required."
                );
            }
        }
    }

    @Override
    public boolean development() {
        return dev;
    }

    @Override
    public void send(String phone, String code) {
        if (dev) {
            log.info(
                    "LOCAL TEST ONLY — OTP for {}: {}",
                    phone,
                    code
            );
            return;
        }

        String message =
                "Your FabricTrack code is " + code
                        + ". Expires in 5 minutes.";

        String body =
                "To=" + encode(phone)
                        + "&From=" + encode(from)
                        + "&Body=" + encode(message);

        String credentials = Base64.getEncoder().encodeToString(
                (sid + ":" + token).getBytes(StandardCharsets.UTF_8)
        );

        URI endpoint = URI.create(
                "https://api.twilio.com/2010-04-01/Accounts/"
                        + sid
                        + "/Messages.json"
        );

        HttpRequest request = HttpRequest.newBuilder(endpoint)
                .timeout(Duration.ofSeconds(10))
                .header("Authorization", "Basic " + credentials)
                .header(
                        "Content-Type",
                        "application/x-www-form-urlencoded"
                )
                .POST(HttpRequest.BodyPublishers.ofString(
                        body,
                        StandardCharsets.UTF_8
                ))
                .build();

        try {
            HttpResponse<String> response = http.send(
                    request,
                    HttpResponse.BodyHandlers.ofString(
                            StandardCharsets.UTF_8
                    )
            );

            int status = response.statusCode();

            if (status < 200 || status >= 300) {
                String providerCode = extractErrorCode(response.body());

                log.warn(
                        "Twilio SMS rejected: HTTP {}, error code {}",
                        status,
                        providerCode
                );

                throw new BusinessProblem(
                        502,
                        "SMS provider rejected the request. Error code: "
                                + providerCode
                );
            }

            // Acceptance does not guarantee delivery to the phone.
            log.info("Twilio accepted the SMS request.");

        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();

            throw new BusinessProblem(
                    502,
                    "SMS delivery was interrupted. Please try again later."
            );

        } catch (IOException exception) {
            // Avoid logging request data, credentials or OTPs.
            log.warn(
                    "Twilio connection failed: {}",
                    exception.getClass().getSimpleName()
            );

            throw new BusinessProblem(
                    502,
                    "SMS service is unavailable. Please try again later."
            );
        }
    }

    private static String encode(String value) {
        return URLEncoder.encode(
                value,
                StandardCharsets.UTF_8
        );
    }

    private static String extractErrorCode(String responseBody) {
        if (responseBody == null) {
            return "UNKNOWN";
        }

        var matcher = ERROR_CODE_PATTERN.matcher(responseBody);

        return matcher.find() ? matcher.group(1) : "UNKNOWN";
    }
}