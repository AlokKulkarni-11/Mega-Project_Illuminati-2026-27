package com.marketmind.user;

public record UserPreferenceDto(
        int defaultLookbackDays,
        boolean reducedMotion
) {}
