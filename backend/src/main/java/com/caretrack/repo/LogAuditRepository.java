package com.caretrack.repo;

import com.caretrack.domain.LogAuditEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LogAuditRepository extends JpaRepository<LogAuditEntry, Long> {
    List<LogAuditEntry> findByChildIdAndEntryTypeAndEntryIdOrderByChangedAtDesc(
            Long childId,
            LogAuditEntry.EntryType entryType,
            Long entryId
    );
}
