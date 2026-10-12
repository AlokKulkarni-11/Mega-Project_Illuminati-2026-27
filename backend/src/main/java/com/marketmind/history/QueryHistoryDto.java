package com.marketmind.history;

import java.time.Instant;
import java.util.List;

public record QueryHistoryDto(
        Long id,
        String rawQuery,
        String intent,
        List<String> resolvedSymbols,
        Instant createdAt
) {
    public static QueryHistoryDto fromEntity(QueryHistoryEntity entity) {
        List<String> symbols = entity.getResolvedSymbols() != null
                ? List.of(entity.getResolvedSymbols())
                : List.of();
        return new QueryHistoryDto(
                entity.getId(),
                entity.getRawQuery(),
                entity.getIntent(),
                symbols,
                entity.getCreatedAt()
        );
    }
}
