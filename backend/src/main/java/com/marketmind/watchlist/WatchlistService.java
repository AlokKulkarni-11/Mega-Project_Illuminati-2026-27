package com.marketmind.watchlist;

import com.marketmind.common.BadRequestException;
import com.marketmind.common.EngineDisabledException;
import com.marketmind.common.EngineUnavailableException;
import com.marketmind.engine.InsightEngine;
import com.marketmind.engine.dto.ComparisonDto;
import com.marketmind.engine.dto.ComparisonRowDto;
import com.marketmind.engine.dto.InstrumentDto;
import com.marketmind.user.UserEntity;
import com.marketmind.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class WatchlistService {

    private static final Logger log = LoggerFactory.getLogger(WatchlistService.class);
    public static final UUID DEFAULT_DEMO_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    private final WatchlistRepository watchlistRepository;
    private final UserRepository userRepository;
    private final InsightEngine engine;
    private final LiveStockQuoteService liveStockQuoteService;

    public WatchlistService(
            WatchlistRepository watchlistRepository,
            UserRepository userRepository,
            InsightEngine engine,
            LiveStockQuoteService liveStockQuoteService
    ) {
        this.watchlistRepository = watchlistRepository;
        this.userRepository = userRepository;
        this.engine = engine;
        this.liveStockQuoteService = liveStockQuoteService;
    }

    private void ensureUserExists(UUID userId) {
        if (!userRepository.existsById(userId)) {
            String email = userId + "@marketmind.local";
            UserEntity user = userRepository.findByEmail(email).orElseGet(() -> {
                UserEntity newUser = new UserEntity();
                newUser.setId(userId);
                newUser.setEmail(email);
                newUser.setPasswordHash("{noop}default");
                newUser.setFullName("MarketMind User");
                return newUser;
            });
            user.setId(userId);
            try {
                userRepository.save(user);
            } catch (Exception ex) {
                log.debug("User could not be saved: {}", ex.getMessage());
            }
        }
    }

    @Transactional
    public WatchlistItemDto addToWatchlist(UUID userId, String symbol) {
        UUID effectiveUserId = userId != null ? userId : DEFAULT_DEMO_USER_ID;
        ensureUserExists(effectiveUserId);
        String cleanSymbol = symbol.toUpperCase().trim();

        if (watchlistRepository.existsByUserIdAndSymbol(effectiveUserId, cleanSymbol)) {
            throw new BadRequestException("Symbol " + cleanSymbol + " is already in your watchlist");
        }

        WatchlistEntity entity = watchlistRepository.save(new WatchlistEntity(effectiveUserId, cleanSymbol));

        // Attempt live engine sentiment enrichment if symbol is part of our core USP
        String regime = null;
        String agreement = null;
        boolean hasUsp = liveStockQuoteService.isCoreSentimentSupported(cleanSymbol);

        if (hasUsp) {
            try {
                ComparisonDto comparison = engine.compare(List.of(cleanSymbol));
                if (comparison != null && comparison.rows() != null && !comparison.rows().isEmpty()) {
                    ComparisonRowDto row = comparison.rows().get(0);
                    regime = row.regime();
                    agreement = row.agreement();
                }
            } catch (EngineDisabledException | EngineUnavailableException e) {
                log.debug("Engine unavailable for symbol {} USP sentiment: {}", cleanSymbol, e.getMessage());
            }
        }

        LiveStockQuoteService.StockQuote quote = liveStockQuoteService.getLiveQuote(cleanSymbol);
        return new WatchlistItemDto(
                entity.getId(),
                entity.getSymbol(),
                quote != null ? quote.name() : cleanSymbol,
                regime,
                agreement,
                entity.getCreatedAt(),
                quote != null ? quote.price() : null,
                quote != null ? quote.change() : null,
                quote != null ? quote.changePercent() : null,
                quote != null ? quote.dayHigh() : null,
                quote != null ? quote.dayLow() : null,
                quote != null ? quote.volume() : null,
                quote != null ? quote.sector() : null,
                hasUsp
        );
    }

    @Transactional(readOnly = true)
    public List<WatchlistItemDto> getWatchlist(UUID userId) {
        UUID effectiveUserId = userId != null ? userId : DEFAULT_DEMO_USER_ID;
        List<WatchlistEntity> entities = watchlistRepository.findByUserIdOrderByCreatedAtDesc(effectiveUserId);
        if (entities.isEmpty()) {
            return Collections.emptyList();
        }

        // Attempt USP engine sentiment enrichment for supported core symbols
        Map<String, ComparisonRowDto> compareMap = new HashMap<>();
        List<String> uspSymbols = entities.stream()
                .map(e -> e.getSymbol().toUpperCase())
                .filter(liveStockQuoteService::isCoreSentimentSupported)
                .collect(Collectors.toList());

        if (!uspSymbols.isEmpty()) {
            try {
                ComparisonDto comparison = engine.compare(uspSymbols);
                if (comparison != null && comparison.rows() != null) {
                    for (ComparisonRowDto row : comparison.rows()) {
                        compareMap.put(row.symbol().toUpperCase(), row);
                    }
                }
            } catch (EngineDisabledException | EngineUnavailableException e) {
                log.debug("Engine inactive for watchlist sentiment enrichment: {}", e.getMessage());
            }
        }

        return entities.stream()
                .map(e -> {
                    String sym = e.getSymbol().toUpperCase();
                    boolean hasUsp = liveStockQuoteService.isCoreSentimentSupported(sym);

                    ComparisonRowDto comp = compareMap.get(sym);
                    String regime = comp != null ? comp.regime() : null;
                    String agreement = comp != null ? comp.agreement() : null;

                    LiveStockQuoteService.StockQuote quote = liveStockQuoteService.getLiveQuote(sym);
                    String name = quote != null ? quote.name() : sym;

                    return new WatchlistItemDto(
                            e.getId(),
                            e.getSymbol(),
                            name,
                            regime,
                            agreement,
                            e.getCreatedAt(),
                            quote != null ? quote.price() : null,
                            quote != null ? quote.change() : null,
                            quote != null ? quote.changePercent() : null,
                            quote != null ? quote.dayHigh() : null,
                            quote != null ? quote.dayLow() : null,
                            quote != null ? quote.volume() : null,
                            quote != null ? quote.sector() : null,
                            hasUsp
                    );
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public void removeFromWatchlist(UUID userId, String symbol) {
        UUID effectiveUserId = userId != null ? userId : DEFAULT_DEMO_USER_ID;
        String cleanSymbol = symbol.toUpperCase().trim();
        watchlistRepository.deleteByUserIdAndSymbol(effectiveUserId, cleanSymbol);
    }

    @Transactional(readOnly = true)
    public boolean isInWatchlist(UUID userId, String symbol) {
        UUID effectiveUserId = userId != null ? userId : DEFAULT_DEMO_USER_ID;
        return watchlistRepository.existsByUserIdAndSymbol(effectiveUserId, symbol.toUpperCase().trim());
    }

    public List<LiveStockQuoteService.FallbackStockInfo> searchDirectory(String query) {
        return liveStockQuoteService.getStockDirectory(query);
    }

    public LiveStockQuoteService.StockQuote getLiveQuote(String symbol) {
        return liveStockQuoteService.getLiveQuote(symbol);
    }
}
