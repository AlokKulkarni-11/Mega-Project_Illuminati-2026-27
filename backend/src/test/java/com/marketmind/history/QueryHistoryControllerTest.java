package com.marketmind.history;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.marketmind.auth.JwtTokenProvider;
import com.marketmind.query.QueryResolveRequest;
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

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class QueryHistoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private QueryHistoryRepository historyRepository;

    private String authToken;
    private UUID testUserId;

    @BeforeEach
    void setUp() {
        historyRepository.deleteAll();
        userRepository.deleteAll();

        UserEntity user = userRepository.save(new UserEntity("historyuser@example.com", "hash", "History User"));
        testUserId = user.getId();
        authToken = jwtTokenProvider.generateToken(testUserId, "historyuser@example.com");
    }

    @Test
    @DisplayName("Query resolution auto-records to history and history can be queried and cleared")
    void testQueryHistoryLifecycle() throws Exception {
        // Resolve a query
        QueryResolveRequest req = new QueryResolveRequest("why did Nifty Bank fall on budget day");
        mockMvc.perform(post("/api/query/resolve")
                        .header("Authorization", "Bearer " + authToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        // Check history
        mockMvc.perform(get("/api/history")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].rawQuery").value("why did Nifty Bank fall on budget day"))
                .andExpect(jsonPath("$[0].intent").value("explain"));

        // Clear history
        mockMvc.perform(delete("/api/history")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/history")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }
}
