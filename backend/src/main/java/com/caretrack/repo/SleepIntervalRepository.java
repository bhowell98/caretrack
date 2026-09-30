package com.caretrack.repo;

import com.caretrack.domain.SleepInterval;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SleepIntervalRepository extends JpaRepository<SleepInterval, Long> {
    List<SleepInterval> findByChildIdOrderByStartedAtDesc(Long childId);

    Optional<SleepInterval> findByIdAndChildId(Long id, Long childId);

    Optional<SleepInterval> findFirstByChildIdAndEndedAtIsNullOrderByStartedAtDesc(Long childId);
}
