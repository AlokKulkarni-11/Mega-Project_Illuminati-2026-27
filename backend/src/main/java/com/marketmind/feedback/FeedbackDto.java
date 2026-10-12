package com.marketmind.feedback;

import java.time.Instant;
import java.time.LocalDate;

public record FeedbackDto(
        Long id,
        String symbol,
        LocalDate anomalyDate,
        boolean helpful,
        String comment,
        Instant createdAt
) {
    public static FeedbackDto fromEntity(ExplanationFeedbackEntity entity) {
        return new FeedbackDto(
                entity.getId(),
                entity.getSymbol(),
                entity.getAnomalyDate(),
                entity.isHelpful(),
                entity.getComment(),
                entity.getCreatedAt()
        );
    }
}
