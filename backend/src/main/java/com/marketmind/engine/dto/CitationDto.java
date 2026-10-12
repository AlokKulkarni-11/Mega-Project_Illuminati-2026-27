package com.marketmind.engine.dto;

public record CitationDto(
        int n,
        String title,
        String source,
        String url,
        String publishedDate
) {}
