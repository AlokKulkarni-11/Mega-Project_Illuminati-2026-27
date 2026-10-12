package com.marketmind.engine.dto;

import java.util.List;

public record ComparisonDto(
        List<ComparisonRowDto> rows
) {}
