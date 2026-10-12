package com.marketmind.history;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface QueryHistoryRepository extends JpaRepository<QueryHistoryEntity, Long> {
    List<QueryHistoryEntity> findByUserIdOrderByCreatedAtDesc(UUID userId);
    void deleteByUserId(UUID userId);
    void deleteByIdAndUserId(Long id, UUID userId);
}
