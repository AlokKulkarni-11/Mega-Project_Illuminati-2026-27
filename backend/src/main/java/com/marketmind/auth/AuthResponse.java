package com.marketmind.auth;

import com.marketmind.user.UserDto;

public record AuthResponse(
        String token,
        String tokenType,
        long expiresInMs,
        UserDto user
) {
    public static AuthResponse of(String token, long expiresInMs, UserDto user) {
        return new AuthResponse(token, "Bearer", expiresInMs, user);
    }
}
