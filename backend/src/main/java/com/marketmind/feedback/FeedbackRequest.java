package com.marketmind.feedback;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record FeedbackRequest(
        @NotBlank(message = "Symbol is required")
        String symbol,

        @NotNull(message = "Anomaly date is required")
        LocalDate anomalyDate,

        @NotNull(message = "Helpful flag is required")
        Boolean helpful,

        String comment
) {}
