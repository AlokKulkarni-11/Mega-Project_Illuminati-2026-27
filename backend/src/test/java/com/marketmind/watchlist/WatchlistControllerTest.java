package com.marketmind.watchlist;

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

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class WatchlistControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WatchlistRepository watchlistRepository;

    private String authToken;
    private UUID testUserId;

    @BeforeEach
    void setUp() {
        watchlistRepository.deleteAll();
        userRepository.deleteAll();

        UserEntity user = userRepository.save(new UserEntity("watchlistuser@example.com", "hash", "Watchlist User"));
        testUserId = user.getId();
        authToken = jwtTokenProvider.generateToken(testUserId, "watchlistuser@example.com");
    }

    @Test
    @DisplayName("Add symbol to watchlist and fetch items with engine enrichment")
    void testAddAndGetWatchlist() throws Exception {
        WatchlistRequest req = new WatchlistRequest("NIFTYBANK");

        mockMvc.perform(post("/api/watchlist")
                        .header("Authorization", "Bearer " + authToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.symbol").value("NIFTYBANK"));

        mockMvc.perform(get("/api/watchlist")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].symbol").value("NIFTYBANK"));
    }

    @Test
    @DisplayName("Duplicate symbol in watchlist throws 400 Bad Request")
    void testDuplicateWatchlistThrows400() throws Exception {
        WatchlistRequest req = new WatchlistRequest("TCS");

        mockMvc.perform(post("/api/watchlist")
                        .header("Authorization", "Bearer " + authToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/watchlist")
                        .header("Authorization", "Bearer " + authToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Remove symbol from watchlist")
    void testRemoveFromWatchlist() throws Exception {
        WatchlistRequest req = new WatchlistRequest("INFY");
        mockMvc.perform(post("/api/watchlist")
                        .header("Authorization", "Bearer " + authToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/watchlist/INFY")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Symbol removed from watchlist"));
    }
}
