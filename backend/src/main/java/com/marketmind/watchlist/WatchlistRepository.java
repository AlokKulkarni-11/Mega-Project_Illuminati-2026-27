package com.marketmind.watchlist;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WatchlistRepository extends JpaRepository<WatchlistEntity, Long> {
    List<WatchlistEntity> findByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<WatchlistEntity> findByUserIdAndSymbol(UUID userId, String symbol);
    boolean existsByUserIdAndSymbol(UUID userId, String symbol);
    void deleteByUserIdAndSymbol(UUID userId, String symbol);
}
