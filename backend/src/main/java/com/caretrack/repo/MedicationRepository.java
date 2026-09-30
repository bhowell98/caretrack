package com.caretrack.repo;

import com.caretrack.domain.Medication;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MedicationRepository extends JpaRepository<Medication, Long> {
    List<Medication> findByChildIdOrderByNameAsc(Long childId);

    Optional<Medication> findByIdAndChildId(Long id, Long childId);
}
