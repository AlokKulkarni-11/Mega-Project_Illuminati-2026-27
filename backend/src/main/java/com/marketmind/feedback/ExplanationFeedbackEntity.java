package com.marketmind.feedback;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "explanation_feedback", uniqueConstraints = {
        @UniqueConstraint(name = "uq_feedback_user_symbol_date", columnNames = {"user_id", "symbol", "anomaly_date"})
})
public class ExplanationFeedbackEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false, length = 50)
    private String symbol;

    @Column(name = "anomaly_date", nullable = false)
    private LocalDate anomalyDate;

    @Column(nullable = false)
    private boolean helpful;

    @Column(columnDefinition = "TEXT")
    private String comment;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public ExplanationFeedbackEntity() {}

    public ExplanationFeedbackEntity(UUID userId, String symbol, LocalDate anomalyDate, boolean helpful, String comment) {
        this.userId = userId;
        this.symbol = symbol.toUpperCase().trim();
        this.anomalyDate = anomalyDate;
        this.helpful = helpful;
        this.comment = comment;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getSymbol() {
        return symbol;
    }

    public LocalDate getAnomalyDate() {
        return anomalyDate;
    }

    public boolean isHelpful() {
        return helpful;
    }

    public void setHelpful(boolean helpful) {
        this.helpful = helpful;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
