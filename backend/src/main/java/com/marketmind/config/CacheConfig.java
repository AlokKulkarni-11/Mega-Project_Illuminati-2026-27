package com.marketmind.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.cache.support.SimpleCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;

@Configuration
public class CacheConfig {

    public static final String CACHE_EXPLANATIONS = "explanations";
    public static final String CACHE_INSTRUMENTS = "instruments";
    public static final String CACHE_PRICES = "prices";
    public static final String CACHE_ANOMALIES = "anomalies";
    public static final String CACHE_PULSE = "pulse";
    public static final String CACHE_SECTORS = "sectors";
    public static final String CACHE_LEADERBOARD = "leaderboard";
    public static final String CACHE_SCOREBOARD = "scoreboard";
    public static final String CACHE_COMPARE = "compare";

    @Bean
    public CacheManager cacheManager() {
        SimpleCacheManager manager = new SimpleCacheManager();

        // 30 minute TTL for LLM/RAG explanations
        CaffeineCache explanationsCache = new CaffeineCache(
                CACHE_EXPLANATIONS,
                Caffeine.newBuilder()
                        .expireAfterWrite(Duration.ofMinutes(30))
                        .maximumSize(1000)
                        .build()
        );

        // 5 minute TTL for other engine data
        List<String> fiveMinuteCaches = Arrays.asList(
                CACHE_INSTRUMENTS,
                CACHE_PRICES,
                CACHE_ANOMALIES,
                CACHE_PULSE,
                CACHE_SECTORS,
                CACHE_LEADERBOARD,
                CACHE_SCOREBOARD,
                CACHE_COMPARE
        );

        List<CaffeineCache> caches = new java.util.ArrayList<>();
        caches.add(explanationsCache);

        for (String name : fiveMinuteCaches) {
            caches.add(new CaffeineCache(
                    name,
                    Caffeine.newBuilder()
                            .expireAfterWrite(Duration.ofMinutes(5))
                            .maximumSize(500)
                            .build()
            ));
        }

        manager.setCaches(caches);
        return manager;
    }
}
