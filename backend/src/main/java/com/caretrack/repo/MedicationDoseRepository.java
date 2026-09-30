package com.caretrack.repo;

import com.caretrack.domain.MedicationDose;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MedicationDoseRepository extends JpaRepository<MedicationDose, Long> {
    List<MedicationDose> findByChildIdOrderByGivenAtDesc(Long childId);

    Optional<MedicationDose> findByIdAndChildId(Long id, Long childId);

    void deleteByMedicationId(Long medicationId);
}
