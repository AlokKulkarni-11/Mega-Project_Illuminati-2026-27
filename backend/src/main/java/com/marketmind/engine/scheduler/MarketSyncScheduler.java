package com.marketmind.engine.scheduler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.CacheManager;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Scheduled sync service ensuring live market valuation and sentiment data
 * are refreshed daily across the three primary Indian market intervals (NSE/BSE):
 * 1. Market Open: 09:15 AM IST
 * 2. Mid-Day of Market: 12:30 PM IST
 * 3. End of Market / Settlement: 03:30 PM IST
 */
@Service
public class MarketSyncScheduler {

    private static final Logger log = LoggerFactory.getLogger(MarketSyncScheduler.class);
    private static final ZoneId IST_ZONE = ZoneId.of("Asia/Kolkata");

    private final CacheManager cacheManager;

    public MarketSyncScheduler(CacheManager cacheManager) {
        this.cacheManager = cacheManager;
    }

    /**
     * Interval 1: Market Open at 09:15 AM IST (Monday to Friday)
     */
    @Scheduled(cron = "0 15 9 * * MON-FRI", zone = "Asia/Kolkata")
    public void syncMarketOpen() {
        ZonedDateTime now = ZonedDateTime.now(IST_ZONE);
        log.info("[MARKET INTERVAL 1/3] Market Open live sync triggered at {}", now.format(DateTimeFormatter.ISO_ZONED_DATE_TIME));
        evictAndRefreshCaches("MARKET_OPEN");
    }

    /**
     * Interval 2: Mid-Day of Market at 12:30 PM IST (Monday to Friday)
     */
    @Scheduled(cron = "0 30 12 * * MON-FRI", zone = "Asia/Kolkata")
    public void syncMarketMidDay() {
        ZonedDateTime now = ZonedDateTime.now(IST_ZONE);
        log.info("[MARKET INTERVAL 2/3] Mid-Day session live sync triggered at {}", now.format(DateTimeFormatter.ISO_ZONED_DATE_TIME));
        evictAndRefreshCaches("MID_DAY");
    }

    /**
     * Interval 3: End of Market at 03:30 PM IST (Monday to Friday)
     */
    @Scheduled(cron = "0 30 15 * * MON-FRI", zone = "Asia/Kolkata")
    public void syncMarketClose() {
        ZonedDateTime now = ZonedDateTime.now(IST_ZONE);
        log.info("[MARKET INTERVAL 3/3] End of Market live sync triggered at {}", now.format(DateTimeFormatter.ISO_ZONED_DATE_TIME));
        evictAndRefreshCaches("END_OF_MARKET");
    }

    public void evictAndRefreshCaches(String intervalTrigger) {
        if (cacheManager != null) {
            for (String cacheName : cacheManager.getCacheNames()) {
                var cache = cacheManager.getCache(cacheName);
                if (cache != null) {
                    cache.clear();
                }
            }
            log.info("MarketMind caches successfully purged and refreshed for interval: {}", intervalTrigger);
        }
    }
}
