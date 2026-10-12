package com.marketmind.user;

import java.time.Instant;
import java.util.UUID;

public record UserDto(
        UUID id,
        String email,
        String fullName,
        Instant createdAt
) {
    public static UserDto fromEntity(UserEntity entity) {
        return new UserDto(
                entity.getId(),
                entity.getEmail(),
                entity.getFullName(),
                entity.getCreatedAt()
        );
    }
}
