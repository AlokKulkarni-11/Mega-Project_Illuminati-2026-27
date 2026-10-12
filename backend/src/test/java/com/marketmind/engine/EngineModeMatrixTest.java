package com.marketmind.engine;

import com.marketmind.auth.JwtTokenProvider;
import com.marketmind.user.UserEntity;
import com.marketmind.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class EngineModeMatrixTest {

    @Nested
    @SpringBootTest(properties = "marketmind.engine.mode=disabled")
    @AutoConfigureMockMvc
    @ActiveProfiles("test")
    class DisabledModeTests {

        @Autowired
        private MockMvc mockMvc;

        @Autowired
        private JwtTokenProvider jwtTokenProvider;

        @Autowired
        private UserRepository userRepository;

        private String token;

        @BeforeEach
        void setUp() {
            userRepository.deleteAll();
            UserEntity user = userRepository.save(new UserEntity("disabled@test.com", "hash", "Disabled User"));
            token = jwtTokenProvider.generateToken(user.getId(), "disabled@test.com");
        }

        @Test
        @DisplayName("Engine mode disabled -> GET /api/engine/instruments returns 404 ENGINE_DISABLED")
        void testDisabledModeReturns404() throws Exception {
            mockMvc.perform(get("/api/engine/instruments")
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.title").value("ENGINE_DISABLED"));
        }
    }

    @Nested
    @SpringBootTest(properties = "marketmind.engine.mode=mock")
    @AutoConfigureMockMvc
    @ActiveProfiles("test")
    class MockModeTests {

        @Autowired
        private MockMvc mockMvc;

        @Autowired
        private JwtTokenProvider jwtTokenProvider;

        @Autowired
        private UserRepository userRepository;

        private String token;

        @BeforeEach
        void setUp() {
            userRepository.deleteAll();
            UserEntity user = userRepository.save(new UserEntity("mock@test.com", "hash", "Mock User"));
            token = jwtTokenProvider.generateToken(user.getId(), "mock@test.com");
        }

        @Test
        @DisplayName("Engine mode mock -> GET /api/engine/instruments returns 200 with fixture data")
        void testMockModeReturnsData() throws Exception {
            mockMvc.perform(get("/api/engine/instruments")
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].symbol").value("NIFTYBANK"));
        }
    }

    @Nested
    @SpringBootTest(properties = {
            "marketmind.engine.mode=http",
            "marketmind.engine.base-url=http://localhost:59991",
            "marketmind.engine.timeout-ms=500"
    })
    @AutoConfigureMockMvc
    @ActiveProfiles("test")
    class HttpDownModeTests {

        @Autowired
        private MockMvc mockMvc;

        @Autowired
        private JwtTokenProvider jwtTokenProvider;

        @Autowired
        private UserRepository userRepository;

        private String token;

        @BeforeEach
        void setUp() {
            userRepository.deleteAll();
            UserEntity user = userRepository.save(new UserEntity("http@test.com", "hash", "Http User"));
            token = jwtTokenProvider.generateToken(user.getId(), "http@test.com");
        }

        @Test
        @DisplayName("Engine mode http with stub down -> GET /api/engine/instruments returns 503 ENGINE_UNAVAILABLE")
        void testHttpDownReturns503() throws Exception {
            mockMvc.perform(get("/api/engine/instruments")
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isServiceUnavailable())
                    .andExpect(jsonPath("$.title").value("ENGINE_UNAVAILABLE"));
        }
    }
}
