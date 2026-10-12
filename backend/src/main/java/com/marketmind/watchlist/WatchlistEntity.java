package com.marketmind.watchlist;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "watchlist", uniqueConstraints = {
        @UniqueConstraint(name = "uq_watchlist_user_symbol", columnNames = {"user_id", "symbol"})
})
public class WatchlistEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false, length = 50)
    private String symbol;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public WatchlistEntity() {}

    public WatchlistEntity(UUID userId, String symbol) {
        this.userId = userId;
        this.symbol = symbol.toUpperCase().trim();
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getSymbol() {
        return symbol;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
