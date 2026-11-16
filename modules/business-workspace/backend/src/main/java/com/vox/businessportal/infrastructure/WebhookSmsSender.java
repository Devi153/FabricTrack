package com.vox.businessportal.infrastructure;

import com.vox.businessportal.application.VerificationSender;
import com.vox.businessportal.config.PortalProperties;
import com.vox.businessportal.domain.PortalException;
import java.net.URI;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Map;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.*;

@Component
public class WebhookSmsSender implements VerificationSender {
  private final PortalProperties properties;
  private final RestClient client;

  public WebhookSmsSender(PortalProperties properties) {
    this.properties = properties;
    var factory =
        new JdkClientHttpRequestFactory(
            HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build());
    factory.setReadTimeout(Duration.ofSeconds(10));
    client = RestClient.builder().requestFactory(factory).build();
  }

  public com.vox.businessportal.domain.VerificationChannel channel() {
    return com.vox.businessportal.domain.VerificationChannel.PHONE;
  }

  public void send(String phone, String code) {
    String url = properties.smsWebhookUrl(), token = properties.smsApiToken();
    if (url == null || url.isBlank() || token == null || token.isBlank())
      throw new PortalException(
          503, "SMS delivery has not been configured. Please contact the business support team.");
    if (!"https".equalsIgnoreCase(URI.create(url).getScheme()))
      throw new IllegalStateException("Business SMS webhook must use HTTPS");
    try {
      client
          .post()
          .uri(url)
          .header("Authorization", "Bearer " + token)
          .body(
              Map.of(
                  "to",
                  phone,
                  "message",
                  "Your VOX Fabric OS verification code is "
                      + code
                      + ". Valid for 5 minutes. Do not share it."))
          .retrieve()
          .toBodilessEntity();
    } catch (RestClientException exception) {
      throw new PortalException(503, "We couldn’t deliver your code. Please try again later.");
    }
  }
}
