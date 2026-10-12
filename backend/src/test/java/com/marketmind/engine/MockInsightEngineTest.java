package com.marketmind.engine;

import com.marketmind.engine.mock.MockInsightEngine;
import org.junit.jupiter.api.BeforeEach;

public class MockInsightEngineTest extends AbstractInsightEngineContractTest {

    private MockInsightEngine mockEngine;

    @BeforeEach
    void setUp() {
        mockEngine = new MockInsightEngine();
        mockEngine.init();
    }

    @Override
    protected InsightEngine getEngine() {
        return mockEngine;
    }
}
