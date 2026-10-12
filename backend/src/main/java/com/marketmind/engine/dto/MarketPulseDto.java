package com.marketmind.engine.dto;

public record MarketPulseDto(
        int bullishCount,
        int bearishCount,
        int neutralCount,
        String dialLabel,
        double dialScore,
        HorizonDto shortTerm,
        HorizonDto mediumTerm,
        HorizonDto longTerm
) {}
