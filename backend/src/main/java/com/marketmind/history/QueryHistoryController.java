package com.marketmind.history;

import com.marketmind.auth.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/history")
@Tag(name = "Query History", description = "User research desk search history")
public class QueryHistoryController {

    private final QueryHistoryService queryHistoryService;

    public QueryHistoryController(QueryHistoryService queryHistoryService) {
        this.queryHistoryService = queryHistoryService;
    }

    @GetMapping
    @Operation(summary = "Get user query history")
    public ResponseEntity<List<QueryHistoryDto>> getHistory(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(queryHistoryService.getHistory(principal.getId()));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete single query history entry")
    public ResponseEntity<Map<String, String>> deleteEntry(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        queryHistoryService.deleteEntry(principal.getId(), id);
        return ResponseEntity.ok(Map.of("message", "History entry deleted", "id", id.toString()));
    }

    @DeleteMapping
    @Operation(summary = "Clear all query history for current user")
    public ResponseEntity<Map<String, String>> clearHistory(@AuthenticationPrincipal UserPrincipal principal) {
        queryHistoryService.clearHistory(principal.getId());
        return ResponseEntity.ok(Map.of("message", "All query history cleared"));
    }
}
