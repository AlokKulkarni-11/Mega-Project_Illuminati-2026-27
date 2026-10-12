package com.marketmind.history;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "query_history")
public class QueryHistoryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "raw_query", nullable = false, columnDefinition = "TEXT")
    private String rawQuery;

    @Column(nullable = false, length = 50)
    private String intent;

    @Column(name = "resolved_symbols")
    private String[] resolvedSymbols = new String[0];

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public QueryHistoryEntity() {}

    public QueryHistoryEntity(UUID userId, String rawQuery, String intent, String[] resolvedSymbols) {
        this.userId = userId;
        this.rawQuery = rawQuery;
        this.intent = intent;
        this.resolvedSymbols = resolvedSymbols != null ? resolvedSymbols : new String[0];
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getRawQuery() {
        return rawQuery;
    }

    public String getIntent() {
        return intent;
    }

    public String[] getResolvedSymbols() {
        return resolvedSymbols;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
