package com.marketmind.engine.dto;

import java.util.List;

public record PriceSeriesDto(
        String symbol,
        List<PricePointDto> points
) {}
