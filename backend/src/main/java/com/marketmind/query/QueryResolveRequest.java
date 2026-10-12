package com.marketmind.query;

import jakarta.validation.constraints.NotBlank;

public record QueryResolveRequest(
        @NotBlank(message = "Query text 'q' is required")
        String q
) {}
