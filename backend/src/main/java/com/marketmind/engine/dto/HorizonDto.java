package com.marketmind.engine.dto;

import java.math.BigDecimal;

public record HorizonDto(
        int days,
        String sign,
        BigDecimal returnPct
) {}
