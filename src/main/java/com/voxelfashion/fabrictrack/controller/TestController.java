
package com.voxelfashion.fabrictrack.controller;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/test")
public class TestController {

    @GetMapping("/protected")
    public Map<String, String> protectedEndpoint(
            Authentication authentication) {

        return Map.of(
                "message", "FabricTrack authentication successful!",
                "userId", authentication.getName()
        );
    }
}
