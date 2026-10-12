package com.marketmind.feedback;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
public class ExplanationFeedbackService {

    private final ExplanationFeedbackRepository feedbackRepository;

    public ExplanationFeedbackService(ExplanationFeedbackRepository feedbackRepository) {
        this.feedbackRepository = feedbackRepository;
    }

    @Transactional
    public FeedbackDto recordFeedback(UUID userId, FeedbackRequest request) {
        String symbol = request.symbol().toUpperCase().trim();
        Optional<ExplanationFeedbackEntity> existing = feedbackRepository
                .findByUserIdAndSymbolAndAnomalyDate(userId, symbol, request.anomalyDate());

        ExplanationFeedbackEntity entity;
        if (existing.isPresent()) {
            entity = existing.get();
            entity.setHelpful(request.helpful());
            entity.setComment(request.comment());
        } else {
            entity = new ExplanationFeedbackEntity(
                    userId,
                    symbol,
                    request.anomalyDate(),
                    request.helpful(),
                    request.comment()
            );
        }

        ExplanationFeedbackEntity saved = feedbackRepository.save(entity);
        return FeedbackDto.fromEntity(saved);
    }
}
