package com.voxelfashion.fabrictrack.common.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    ResponseEntity<ApiError> forbidden(Exception exception) {
        return ResponseEntity.status(403).body(new ApiError(403, "FORBIDDEN", "Access denied. Verify your account and permissions."));
    }

    @ExceptionHandler(org.springframework.web.bind.MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> invalidRequest(Exception exception) {
        return ResponseEntity.badRequest().body(new ApiError(400, "INVALID_REQUEST", "Enter a valid work email address."));
    }

    @ExceptionHandler(com.voxelfashion.fabrictrack.admin.team.InvitationException.class)
    ResponseEntity<ApiError> invitationFailed(com.voxelfashion.fabrictrack.admin.team.InvitationException exception) {
        return ResponseEntity.status(502).body(new ApiError(502, "INVITATION_FAILED", exception.getMessage()));
    }

    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    ResponseEntity<ApiError> notFound(Exception exception) {
        return ResponseEntity.status(404).body(new ApiError(404, "NOT_FOUND", "The requested endpoint does not exist."));
    }

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<ApiError> invalidArgument(MethodArgumentTypeMismatchException exception) {
        return ResponseEntity.badRequest().body(new ApiError(400, "INVALID_REQUEST", "A request parameter has an invalid value."));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> unexpected(Exception exception) {
        log.error("Unexpected API error", exception);
        return ResponseEntity.internalServerError().body(new ApiError(500, "INTERNAL_ERROR", "The request could not be completed."));
    }
}
