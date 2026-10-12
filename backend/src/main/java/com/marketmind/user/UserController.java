package com.marketmind.user;

import com.marketmind.auth.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/api/user/preferences")
@Tag(name = "User Preferences", description = "User UI and lookback window preferences")
public class UserController {

    private final UserPreferenceRepository preferenceRepository;

    public UserController(UserPreferenceRepository preferenceRepository) {
        this.preferenceRepository = preferenceRepository;
    }

    @GetMapping
    @Operation(summary = "Get current user preferences")
    public ResponseEntity<UserPreferenceDto> getPreferences(@AuthenticationPrincipal UserPrincipal principal) {
        UserPreferenceEntity entity = preferenceRepository.findByUserId(principal.getId())
                .orElseGet(() -> preferenceRepository.save(new UserPreferenceEntity(principal.getId(), 60, false)));
        return ResponseEntity.ok(new UserPreferenceDto(entity.getDefaultLookbackDays(), entity.isReducedMotion()));
    }

    @PutMapping
    @Operation(summary = "Update current user preferences")
    public ResponseEntity<UserPreferenceDto> updatePreferences(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody UserPreferenceDto dto
    ) {
        UserPreferenceEntity entity = preferenceRepository.findByUserId(principal.getId())
                .orElseGet(() -> new UserPreferenceEntity(principal.getId(), 60, false));

        entity.setDefaultLookbackDays(dto.defaultLookbackDays() > 0 ? dto.defaultLookbackDays() : 60);
        entity.setReducedMotion(dto.reducedMotion());
        entity.setUpdatedAt(Instant.now());

        UserPreferenceEntity saved = preferenceRepository.save(entity);
        return ResponseEntity.ok(new UserPreferenceDto(saved.getDefaultLookbackDays(), saved.isReducedMotion()));
    }
}
