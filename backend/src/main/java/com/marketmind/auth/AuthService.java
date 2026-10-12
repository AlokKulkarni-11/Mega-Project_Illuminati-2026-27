package com.marketmind.auth;

import com.marketmind.common.BadRequestException;
import com.marketmind.common.ResourceNotFoundException;
import com.marketmind.common.UnauthorizedException;
import com.marketmind.user.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final UserPreferenceRepository preferenceRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    public AuthService(
            UserRepository userRepository,
            UserPreferenceRepository preferenceRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider tokenProvider
    ) {
        this.userRepository = userRepository;
        this.preferenceRepository = preferenceRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.email().toLowerCase().trim();
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("An account with this email address already exists");
        }

        String hashedPassword = passwordEncoder.encode(request.password());
        UserEntity user = new UserEntity(email, hashedPassword, request.fullName());
        UserEntity savedUser = userRepository.save(user);

        // Create default user preferences
        preferenceRepository.save(new UserPreferenceEntity(savedUser.getId(), 60, false));

        String token = tokenProvider.generateToken(savedUser.getId(), savedUser.getEmail());
        return AuthResponse.of(token, tokenProvider.getExpirationMs(), UserDto.fromEntity(savedUser));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String email = request.email().toLowerCase().trim();
        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid email or password");
        }

        String token = tokenProvider.generateToken(user.getId(), user.getEmail());
        return AuthResponse.of(token, tokenProvider.getExpirationMs(), UserDto.fromEntity(user));
    }

    @Transactional(readOnly = true)
    public UserDto getUserById(UUID userId) {
        return userRepository.findById(userId)
                .map(UserDto::fromEntity)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
    }
}
