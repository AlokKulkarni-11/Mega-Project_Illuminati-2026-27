package com.marketmind.engine;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class CapabilitiesTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("GET /api/capabilities is publicly accessible and returns engine info and features")
    void testCapabilitiesPublic() throws Exception {
        mockMvc.perform(get("/api/capabilities"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.engine.enabled").value(true))
                .andExpect(jsonPath("$.engine.mode").value("mock"))
                .andExpect(jsonPath("$.engine.status").value("HEALTHY"))
                .andExpect(jsonPath("$.features.dossier").value(true))
                .andExpect(jsonPath("$.features.calculators").value(true))
                .andExpect(jsonPath("$.features.glossary").value(true))
                .andExpect(jsonPath("$.features.watchlist").value(true));
    }
}
