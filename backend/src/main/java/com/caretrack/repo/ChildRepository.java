package com.caretrack.repo;

import com.caretrack.domain.Child;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ChildRepository extends JpaRepository<Child, Long> {
    List<Child> findByCaregiverIdOrderByNameAsc(Long caregiverId);

    Optional<Child> findByIdAndCaregiverId(Long id, Long caregiverId);
}
