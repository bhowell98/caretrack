package com.caretrack.repo;

import com.caretrack.domain.ChildShare;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ChildShareRepository extends JpaRepository<ChildShare, Long> {
    @Query("""
            select distinct s from ChildShare s
            join fetch s.child c
            join fetch c.caregiver
            where s.user.id = :userId
            """)
    List<ChildShare> findAccessibleByUserId(@Param("userId") Long userId);

    @Query("""
            select s from ChildShare s
            join fetch s.user
            where s.child.id = :childId
            order by s.id
            """)
    List<ChildShare> findByChildIdWithUser(@Param("childId") Long childId);

    Optional<ChildShare> findByChildIdAndUserId(Long childId, Long userId);

    Optional<ChildShare> findByIdAndChildId(Long id, Long childId);
}
