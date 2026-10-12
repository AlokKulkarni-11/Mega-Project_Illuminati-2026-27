package com.marketmind.feedback;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.marketmind.auth.JwtTokenProvider;
import com.marketmind.user.UserEntity;
import com.marketmind.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class ExplanationFeedbackControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ExplanationFeedbackRepository feedbackRepository;

    private String authToken;
    private UUID testUserId;

    @BeforeEach
    void setUp() {
        feedbackRepository.deleteAll();
        userRepository.deleteAll();

        UserEntity user = userRepository.save(new UserEntity("feedbackuser@example.com", "hash", "Feedback User"));
        testUserId = user.getId();
        authToken = jwtTokenProvider.generateToken(testUserId, "feedbackuser@example.com");
    }

    @Test
    @DisplayName("Submit feedback (thumbs up) on an explanation")
    void testSubmitFeedback() throws Exception {
        FeedbackRequest req = new FeedbackRequest(
                "NIFTYBANK",
                LocalDate.of(2026, 2, 1),
                true,
                "Accurate explanation regarding budget impact."
        );

        mockMvc.perform(post("/api/feedback")
                        .header("Authorization", "Bearer " + authToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.symbol").value("NIFTYBANK"))
                .andExpect(jsonPath("$.helpful").value(true))
                .andExpect(jsonPath("$.comment").value("Accurate explanation regarding budget impact."));
    }
}
