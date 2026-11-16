package com.vox.businessportal.api;

import com.vox.businessportal.domain.PortalException;
import java.util.Map;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

/** Scoped advice never changes exception behavior in existing admin controllers. */
@RestControllerAdvice(basePackageClasses = BusinessPortalController.class)
public class BusinessPortalExceptionHandler {
  @ExceptionHandler(PortalException.class)
  ResponseEntity<Map<String, Object>> portal(PortalException e) {
    var result = ResponseEntity.status(e.status()).header(HttpHeaders.CACHE_CONTROL, "no-store");
    if (e.retryAfter() > 0)
      result.header(HttpHeaders.RETRY_AFTER, Integer.toString(e.retryAfter()));
    return result.body(Map.of("message", e.getMessage(), "retryAfter", e.retryAfter()));
  }

  @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class})
  ResponseEntity<Map<String, String>> invalid(Exception e) {
    return ResponseEntity.badRequest()
        .body(Map.of("message", "Check the required fields and use valid numbers."));
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<Map<String, String>> unexpected(Exception e) {
    org.slf4j.LoggerFactory.getLogger(getClass())
        .error("Business Portal request failed: {}", e.getClass().getSimpleName());
    return ResponseEntity.internalServerError()
        .body(Map.of("message", "We couldn’t complete this request. Please try again."));
  }
}
