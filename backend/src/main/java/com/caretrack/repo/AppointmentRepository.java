package com.caretrack.repo;

import com.caretrack.domain.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findByChildIdOrderByStartsAtDesc(Long childId);

    List<Appointment> findByChildIdAndStartsAtGreaterThanEqualOrderByStartsAtAsc(Long childId, Instant from);

    Optional<Appointment> findByIdAndChildId(Long id, Long childId);
}
