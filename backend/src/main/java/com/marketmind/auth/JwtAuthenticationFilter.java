package com.marketmind.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.marketmind.user.UserEntity;
import com.marketmind.user.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Base64;
import java.util.UUID;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public JwtAuthenticationFilter(JwtTokenProvider tokenProvider, UserRepository userRepository, ObjectMapper objectMapper) {
        this.tokenProvider = tokenProvider;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        String token = getJwtFromRequest(request);

        if (StringUtils.hasText(token)) {
            if (tokenProvider.validateToken(token)) {
                // Local HMAC signed token
                UUID userId = tokenProvider.getUserIdFromToken(token);
                authenticateUserId(userId, request);
            } else {
                // Check if this is a valid Supabase JWT token
                tryAuthenticateSupabaseToken(token, request);
            }
        }

        filterChain.doFilter(request, response);
    }

    private void authenticateUserId(UUID userId, HttpServletRequest request) {
        String email = userId + "@marketmind.local";
        UserEntity user = userRepository.findById(userId).orElseGet(() -> {
            return userRepository.findByEmail(email).orElseGet(() -> {
                UserEntity newUser = new UserEntity();
                newUser.setId(userId);
                newUser.setEmail(email);
                newUser.setPasswordHash("{noop}local_managed");
                newUser.setFullName("MarketMind User");
                try {
                    return userRepository.save(newUser);
                } catch (Exception e) {
                    return userRepository.findById(userId).orElse(newUser);
                }
            });
        });

        UserPrincipal principal = UserPrincipal.create(user);
        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    private void tryAuthenticateSupabaseToken(String token, HttpServletRequest request) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length >= 2) {
                byte[] decoded = Base64.getUrlDecoder().decode(parts[1]);
                JsonNode payload = objectMapper.readTree(decoded);
                if (payload.has("sub")) {
                    String sub = payload.get("sub").asText();
                    UUID userId = UUID.fromString(sub);

                    String email = payload.has("email") ? payload.get("email").asText() : userId + "@supabase.auth";
                    String fullName = "MarketMind Trader";
                    if (payload.has("user_metadata")) {
                        JsonNode metadata = payload.get("user_metadata");
                        if (metadata.has("full_name") && StringUtils.hasText(metadata.get("full_name").asText())) {
                            fullName = metadata.get("full_name").asText();
                        } else if (metadata.has("fullName") && StringUtils.hasText(metadata.get("fullName").asText())) {
                            fullName = metadata.get("fullName").asText();
                        }
                    }

                    final String userEmail = email;
                    final String userFullName = fullName;

                    UserEntity user = userRepository.findById(userId).orElseGet(() -> {
                        return userRepository.findByEmail(userEmail).map(existing -> {
                            existing.setId(userId);
                            try {
                                return userRepository.save(existing);
                            } catch (Exception ex) {
                                return existing;
                            }
                        }).orElseGet(() -> {
                            UserEntity newUser = new UserEntity();
                            newUser.setId(userId);
                            newUser.setEmail(userEmail);
                            newUser.setPasswordHash("{noop}supabase_managed");
                            newUser.setFullName(userFullName);
                            try {
                                return userRepository.save(newUser);
                            } catch (Exception e) {
                                return userRepository.findById(userId).orElse(newUser);
                            }
                        });
                    });

                    UserPrincipal principal = UserPrincipal.create(user);
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }
        } catch (Exception ex) {
            log.debug("Could not process Supabase token: {}", ex.getMessage());
        }
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
