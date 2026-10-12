package com.marketmind.feedback;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExplanationFeedbackRepository extends JpaRepository<ExplanationFeedbackEntity, Long> {
    Optional<ExplanationFeedbackEntity> findByUserIdAndSymbolAndAnomalyDate(UUID userId, String symbol, LocalDate anomalyDate);
}
