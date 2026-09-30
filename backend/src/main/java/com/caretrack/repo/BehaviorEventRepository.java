package com.caretrack.repo;

import com.caretrack.domain.BehaviorEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BehaviorEventRepository extends JpaRepository<BehaviorEvent, Long> {
    List<BehaviorEvent> findByChildIdOrderByOccurredAtDesc(Long childId);

    Optional<BehaviorEvent> findByIdAndChildId(Long id, Long childId);

    void deleteByBehaviorId(Long behaviorId);
}
