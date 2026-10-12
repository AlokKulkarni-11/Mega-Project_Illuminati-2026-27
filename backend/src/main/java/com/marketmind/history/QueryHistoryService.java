package com.marketmind.history;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class QueryHistoryService {

    private final QueryHistoryRepository queryHistoryRepository;

    public QueryHistoryService(QueryHistoryRepository queryHistoryRepository) {
        this.queryHistoryRepository = queryHistoryRepository;
    }

    @Transactional
    public QueryHistoryDto recordQuery(UUID userId, String rawQuery, String intent, List<String> resolvedSymbols) {
        String[] symbolsArr = resolvedSymbols != null ? resolvedSymbols.toArray(new String[0]) : new String[0];
        QueryHistoryEntity entity = new QueryHistoryEntity(userId, rawQuery, intent, symbolsArr);
        QueryHistoryEntity saved = queryHistoryRepository.save(entity);
        return QueryHistoryDto.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public List<QueryHistoryDto> getHistory(UUID userId) {
        return queryHistoryRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(QueryHistoryDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteEntry(UUID userId, Long id) {
        queryHistoryRepository.deleteByIdAndUserId(id, userId);
    }

    @Transactional
    public void clearHistory(UUID userId) {
        queryHistoryRepository.deleteByUserId(userId);
    }
}
