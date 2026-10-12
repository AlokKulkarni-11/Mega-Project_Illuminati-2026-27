package com.marketmind.config;

import com.marketmind.user.UserEntity;
import com.marketmind.user.UserPreferenceEntity;
import com.marketmind.user.UserPreferenceRepository;
import com.marketmind.user.UserRepository;
import com.marketmind.watchlist.WatchlistEntity;
import com.marketmind.watchlist.WatchlistRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Initializes a default demo analyst account on startup if it does not already exist.
 * Credentials:
 *   Email: demo@marketmind.app
 *   Password: password123
 */
@Component
public class DemoDataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataInitializer.class);
    public static final String DEMO_EMAIL = "demo@marketmind.app";
    public static final String DEMO_PASSWORD = "password123";

    private final UserRepository userRepository;
    private final UserPreferenceRepository preferenceRepository;
    private final WatchlistRepository watchlistRepository;
    private final PasswordEncoder passwordEncoder;

    public DemoDataInitializer(
            UserRepository userRepository,
            UserPreferenceRepository preferenceRepository,
            WatchlistRepository watchlistRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.preferenceRepository = preferenceRepository;
        this.watchlistRepository = watchlistRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (!userRepository.existsByEmail(DEMO_EMAIL)) {
            UserEntity demoUser = new UserEntity(
                    DEMO_EMAIL,
                    passwordEncoder.encode(DEMO_PASSWORD),
                    "Demo Research Analyst"
            );
            UserEntity savedUser = userRepository.save(demoUser);

            preferenceRepository.save(new UserPreferenceEntity(savedUser.getId(), 60, false));

            // Seed default watchlist entries
            watchlistRepository.save(new WatchlistEntity(savedUser.getId(), "NIFTYBANK"));
            watchlistRepository.save(new WatchlistEntity(savedUser.getId(), "HDFCBANK"));

            log.info("Initialized demo account -> {} / {}", DEMO_EMAIL, DEMO_PASSWORD);
        }
    }
}
