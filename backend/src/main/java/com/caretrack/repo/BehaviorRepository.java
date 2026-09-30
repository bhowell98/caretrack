package com.caretrack.repo;

import com.caretrack.domain.Behavior;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BehaviorRepository extends JpaRepository<Behavior, Long> {
    List<Behavior> findByChildIdOrderByNameAsc(Long childId);

    Optional<Behavior> findByIdAndChildId(Long id, Long childId);
}
