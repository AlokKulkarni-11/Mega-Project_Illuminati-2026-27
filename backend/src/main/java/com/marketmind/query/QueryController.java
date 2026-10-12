package com.marketmind.query;

import com.marketmind.auth.UserPrincipal;
import com.marketmind.history.QueryHistoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/query")
@Tag(name = "Query Resolution", description = "Deterministic query intent and symbol resolution")
public class QueryController {

    private final QueryResolutionService resolutionService;
    private final QueryHistoryService historyService;

    public QueryController(QueryResolutionService resolutionService, QueryHistoryService historyService) {
        this.resolutionService = resolutionService;
        this.historyService = historyService;
    }

    @PostMapping("/resolve")
    @Operation(summary = "Resolve search query into intent and target symbols")
    public ResponseEntity<QueryResolveResponse> resolve(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody QueryResolveRequest request
    ) {
        QueryResolveResponse response = resolutionService.resolve(request.q());

        // Record resolved query in history
        if (principal != null) {
            historyService.recordQuery(
                    principal.getId(),
                    request.q(),
                    response.intent(),
                    response.symbols()
            );
        }

        return ResponseEntity.ok(response);
    }
}
