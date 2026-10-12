package com.marketmind.feedback;

import com.marketmind.auth.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/feedback")
@Tag(name = "Explanation Feedback", description = "User thumbs up/down feedback on causal explanations")
public class ExplanationFeedbackController {

    private final ExplanationFeedbackService feedbackService;

    public ExplanationFeedbackController(ExplanationFeedbackService feedbackService) {
        this.feedbackService = feedbackService;
    }

    @PostMapping
    @Operation(summary = "Submit feedback on an explanation")
    public ResponseEntity<FeedbackDto> submitFeedback(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody FeedbackRequest request
    ) {
        return ResponseEntity.ok(feedbackService.recordFeedback(principal.getId(), request));
    }
}
