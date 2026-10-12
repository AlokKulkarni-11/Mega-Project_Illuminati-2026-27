package com.marketmind.watchlist;

import com.marketmind.common.BadRequestException;
import com.marketmind.common.EngineDisabledException;
import com.marketmind.common.EngineUnavailableException;
import com.marketmind.engine.InsightEngine;
import com.marketmind.engine.dto.ComparisonDto;
import com.marketmind.engine.dto.ComparisonRowDto;
import com.marketmind.engine.dto.InstrumentDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class WatchlistService {

    private static final Logger log = LoggerFactory.getLogger(WatchlistService.class);

    private final WatchlistRepository watchlistRepository;
    private final InsightEngine engine;

    public WatchlistService(WatchlistRepository watchlistRepository, InsightEngine engine) {
        this.watchlistRepository = watchlistRepository;
        this.engine = engine;
    }

    @Transactional
    public WatchlistItemDto addToWatchlist(UUID userId, String symbol) {
        String cleanSymbol = symbol.toUpperCase().trim();

        // Validate symbol against engine instruments if engine is active
        try {
            List<InstrumentDto> instruments = engine.instruments();
            boolean exists = instruments.stream().anyMatch(i -> i.symbol().equalsIgnoreCase(cleanSymbol));
            if (!exists) {
                log.info("Symbol {} not in tracked instruments list, adding as custom entry", cleanSymbol);
            }
        } catch (EngineDisabledException | EngineUnavailableException e) {
            // Permitted when engine is absent or disabled
            log.debug("Engine unavailable during watchlist validation: {}", e.getMessage());
        }

        if (watchlistRepository.existsByUserIdAndSymbol(userId, cleanSymbol)) {
            throw new BadRequestException("Symbol " + cleanSymbol + " is already in your watchlist");
        }

        WatchlistEntity entity = watchlistRepository.save(new WatchlistEntity(userId, cleanSymbol));
        return enrichItem(entity, null, null);
    }

    @Transactional(readOnly = true)
    public List<WatchlistItemDto> getWatchlist(UUID userId) {
        List<WatchlistEntity> entities = watchlistRepository.findByUserIdOrderByCreatedAtDesc(userId);
        if (entities.isEmpty()) {
            return Collections.emptyList();
        }

        // Attempt enrichment if engine is online
        Map<String, String> instrumentNames = new HashMap<>();
        Map<String, ComparisonRowDto> compareMap = new HashMap<>();

        try {
            List<InstrumentDto> instruments = engine.instruments();
            for (InstrumentDto inst : instruments) {
                instrumentNames.put(inst.symbol().toUpperCase(), inst.name());
            }

            List<String> symbols = entities.stream().map(WatchlistEntity::getSymbol).collect(Collectors.toList());
            ComparisonDto comparison = engine.compare(symbols);
            if (comparison != null && comparison.rows() != null) {
                for (ComparisonRowDto row : comparison.rows()) {
                    compareMap.put(row.symbol().toUpperCase(), row);
                }
            }
        } catch (EngineDisabledException | EngineUnavailableException e) {
            log.debug("Engine inactive for watchlist enrichment: {}", e.getMessage());
        }

        return entities.stream()
                .map(e -> {
                    String sym = e.getSymbol().toUpperCase();
                    String name = instrumentNames.getOrDefault(sym, sym);
                    ComparisonRowDto comp = compareMap.get(sym);
                    String regime = comp != null ? comp.regime() : null;
                    String agreement = comp != null ? comp.agreement() : null;
                    return new WatchlistItemDto(e.getId(), e.getSymbol(), name, regime, agreement, e.getCreatedAt());
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public void removeFromWatchlist(UUID userId, String symbol) {
        String cleanSymbol = symbol.toUpperCase().trim();
        watchlistRepository.deleteByUserIdAndSymbol(userId, cleanSymbol);
    }

    @Transactional(readOnly = true)
    public boolean isInWatchlist(UUID userId, String symbol) {
        return watchlistRepository.existsByUserIdAndSymbol(userId, symbol.toUpperCase().trim());
    }

    private WatchlistItemDto enrichItem(WatchlistEntity entity, String regime, String agreement) {
        return new WatchlistItemDto(
                entity.getId(),
                entity.getSymbol(),
                entity.getSymbol(),
                regime,
                agreement,
                entity.getCreatedAt()
        );
    }
}
