package com.voxelfashion.fabrictrack.common.exception;

import java.io.IOException;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/** Security filters run before controller advice, so they share this response writer. */
@Component
public class ApiErrorWriter {
    private final ObjectMapper mapper;
    public ApiErrorWriter(ObjectMapper mapper) { this.mapper = mapper; }

    public void write(HttpServletResponse response, int status, String code, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        if (status == 401) response.setHeader("WWW-Authenticate", "Bearer");
        mapper.writeValue(response.getWriter(), new ApiError(status, code, message));
    }
}
