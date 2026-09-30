package com.caretrack.repo;

import com.caretrack.domain.BowelMovement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BowelMovementRepository extends JpaRepository<BowelMovement, Long> {
    List<BowelMovement> findByChildIdOrderByOccurredAtDesc(Long childId);

    Optional<BowelMovement> findByIdAndChildId(Long id, Long childId);
}
