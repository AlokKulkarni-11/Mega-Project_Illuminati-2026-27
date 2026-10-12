package com.marketmind.query;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class QueryResolutionTest {

    private QueryResolutionService service;

    @BeforeEach
    void setUp() {
        service = new QueryResolutionService();
    }

    @Test
    @DisplayName("Resolves single stock explanation: 'why is TCS falling this week'")
    void testResolveSingleStockExplain() {
        QueryResolveResponse res = service.resolve("why is TCS falling this week");
        assertEquals("explain", res.intent());
        assertEquals(1, res.symbols().size());
        assertEquals("TCS", res.symbols().getFirst());
        assertNull(res.unmatchedMessage());
    }

    @Test
    @DisplayName("Resolves company alias: 'why did Infosys drop'")
    void testResolveAlias() {
        QueryResolveResponse res = service.resolve("why did Infosys drop");
        assertEquals("explain", res.intent());
        assertTrue(res.symbols().contains("INFY"));
    }

    @Test
    @DisplayName("Resolves index query: 'what happened to Bank Nifty on budget day'")
    void testResolveBankNifty() {
        QueryResolveResponse res = service.resolve("what happened to Bank Nifty on budget day");
        assertEquals("explain", res.intent());
        assertTrue(res.symbols().contains("NIFTYBANK"));
    }

    @Test
    @DisplayName("Resolves compare query: 'compare TCS vs INFY'")
    void testResolveCompare() {
        QueryResolveResponse res = service.resolve("compare TCS vs INFY");
        assertEquals("compare", res.intent());
        assertTrue(res.symbols().contains("TCS"));
        assertTrue(res.symbols().contains("INFY"));
    }

    @Test
    @DisplayName("Unmatched query returns prototype empty-state copy")
    void testResolveUnmatched() {
        QueryResolveResponse res = service.resolve("why is unknown crypto coin dropping");
        assertTrue(res.symbols().isEmpty());
        assertNotNull(res.unmatchedMessage());
        assertEquals(QueryResolutionService.UNMATCHED_COPY, res.unmatchedMessage());
    }
}
