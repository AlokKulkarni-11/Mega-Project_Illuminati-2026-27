package com.marketmind.engine.dto;

public record InstrumentDto(
        String symbol,
        String name,
        String type,
        String sector
) {}
