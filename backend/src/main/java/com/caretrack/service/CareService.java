package com.caretrack.service;

import com.caretrack.domain.AppUser;
import com.caretrack.domain.Appointment;
import com.caretrack.domain.Behavior;
import com.caretrack.domain.BehaviorEvent;
import com.caretrack.domain.BowelMovement;
import com.caretrack.domain.Child;
import com.caretrack.domain.ChildShare;
import com.caretrack.domain.LogAuditEntry;
import com.caretrack.domain.Medication;
import com.caretrack.domain.MedicationDose;
import com.caretrack.domain.SleepInterval;
import com.caretrack.repo.AppUserRepository;
import com.caretrack.repo.AppointmentRepository;
import com.caretrack.repo.BehaviorEventRepository;
import com.caretrack.repo.BehaviorRepository;
import com.caretrack.repo.BowelMovementRepository;
import com.caretrack.repo.ChildRepository;
import com.caretrack.repo.ChildShareRepository;
import com.caretrack.repo.LogAuditRepository;
import com.caretrack.repo.MedicationDoseRepository;
import com.caretrack.repo.MedicationRepository;
import com.caretrack.repo.SleepIntervalRepository;
import com.caretrack.web.dto.ApiDtos.AppointmentRequest;
import com.caretrack.web.dto.ApiDtos.AppointmentResponse;
import com.caretrack.web.dto.ApiDtos.AuditEventResponse;
import com.caretrack.web.dto.ApiDtos.BehaviorEventRequest;
import com.caretrack.web.dto.ApiDtos.BehaviorEventResponse;
import com.caretrack.web.dto.ApiDtos.BehaviorRequest;
import com.caretrack.web.dto.ApiDtos.BehaviorResponse;
import com.caretrack.web.dto.ApiDtos.BowelRequest;
import com.caretrack.web.dto.ApiDtos.BowelResponse;
import com.caretrack.web.dto.ApiDtos.ChildRequest;
import com.caretrack.web.dto.ApiDtos.ChildResponse;
import com.caretrack.web.dto.ApiDtos.DashboardResponse;
import com.caretrack.web.dto.ApiDtos.DoseRequest;
import com.caretrack.web.dto.ApiDtos.DoseResponse;
import com.caretrack.web.dto.ApiDtos.FieldChange;
import com.caretrack.web.dto.ApiDtos.LogEntryResponse;
import com.caretrack.web.dto.ApiDtos.MedicationRequest;
import com.caretrack.web.dto.ApiDtos.MedicationResponse;
import com.caretrack.web.dto.ApiDtos.ShareRequest;
import com.caretrack.web.dto.ApiDtos.ShareResponse;
import com.caretrack.web.dto.ApiDtos.SleepRequest;
import com.caretrack.web.dto.ApiDtos.SleepResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class CareService {

    private final ChildRepository children;
    private final ChildShareRepository shares;
    private final AppUserRepository users;
    private final SleepIntervalRepository sleeps;
    private final BowelMovementRepository bowels;
    private final MedicationRepository medications;
    private final MedicationDoseRepository doses;
    private final BehaviorRepository behaviors;
    private final BehaviorEventRepository behaviorEvents;
    private final AppointmentRepository appointments;
    private final LogAuditRepository logAudits;

    public CareService(
            ChildRepository children,
            ChildShareRepository shares,
            AppUserRepository users,
            SleepIntervalRepository sleeps,
            BowelMovementRepository bowels,
            MedicationRepository medications,
            MedicationDoseRepository doses,
            BehaviorRepository behaviors,
            BehaviorEventRepository behaviorEvents,
            AppointmentRepository appointments,
            LogAuditRepository logAudits
    ) {
        this.children = children;
        this.shares = shares;
        this.users = users;
        this.sleeps = sleeps;
        this.bowels = bowels;
        this.medications = medications;
        this.doses = doses;
        this.behaviors = behaviors;
        this.behaviorEvents = behaviorEvents;
        this.appointments = appointments;
        this.logAudits = logAudits;
    }

    @Transactional(readOnly = true)
    public List<ChildResponse> listChildren(AppUser user) {
        Map<Long, Child> unique = new LinkedHashMap<>();
        for (Child child : children.findByCaregiverIdOrderByNameAsc(user.getId())) {
            unique.put(child.getId(), child);
        }
        for (ChildShare share : shares.findAccessibleByUserId(user.getId())) {
            unique.put(share.getChild().getId(), share.getChild());
        }
        return unique.values().stream()
                .sorted(Comparator.comparing(Child::getName, String.CASE_INSENSITIVE_ORDER))
                .map(child -> toChildResponse(user, child))
                .toList();
    }

    @Transactional
    public ChildResponse createChild(AppUser user, ChildRequest request) {
        Child child = new Child();
        child.setCaregiver(user);
        child.setName(request.name().trim());
        child.setDateOfBirth(request.dateOfBirth());
        child.setNotes(request.notes());
        Child saved = children.save(child);
        grantShare(saved, user, ChildShare.Role.OWNER);
        return toChildResponse(user, saved);
    }

    @Transactional
    public ChildResponse updateChild(AppUser user, Long childId, ChildRequest request) {
        Child child = requireOwner(user, childId);
        child.setName(request.name().trim());
        child.setDateOfBirth(request.dateOfBirth());
        child.setNotes(request.notes());
        return toChildResponse(user, child);
    }

    @Transactional(readOnly = true)
    public DashboardResponse dashboard(AppUser user, Long childId) {
        Child child = requireChild(user, childId);
        SleepResponse latestSleep = sleeps.findByChildIdOrderByStartedAtDesc(childId).stream()
                .findFirst()
                .map(SleepResponse::from)
                .orElse(null);
        BowelResponse latestBowel = bowels.findByChildIdOrderByOccurredAtDesc(childId).stream()
                .findFirst()
                .map(BowelResponse::from)
                .orElse(null);
        DoseResponse latestDose = doses.findByChildIdOrderByGivenAtDesc(childId).stream()
                .findFirst()
                .map(DoseResponse::from)
                .orElse(null);
        BehaviorEventResponse latestBehavior = behaviorEvents.findByChildIdOrderByOccurredAtDesc(childId).stream()
                .findFirst()
                .map(BehaviorEventResponse::from)
                .orElse(null);
        AppointmentResponse nextAppointment = appointments
                .findByChildIdAndStartsAtGreaterThanEqualOrderByStartsAtAsc(childId, Instant.now())
                .stream()
                .findFirst()
                .map(AppointmentResponse::from)
                .orElse(null);
        return new DashboardResponse(toChildResponse(user, child), latestSleep, latestBowel, latestDose, latestBehavior, nextAppointment);
    }

    @Transactional(readOnly = true)
    public List<LogEntryResponse> listLogs(AppUser user, Long childId, Instant from, Instant to, String query, String types) {
        requireChild(user, childId);
        Set<String> wanted = parseTypes(types);
        String needle = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        List<LogEntryResponse> entries = new ArrayList<>();
        if (wanted.contains("SLEEP")) {
            sleeps.findByChildIdOrderByStartedAtDesc(childId).forEach(sleep -> {
                if (!inRange(sleep.getStartedAt(), from, to)) {
                    return;
                }
                String title = "Sleep";
                String detail = sleepDuration(sleep.getStartedAt(), sleep.getEndedAt())
                        + " · "
                        + sleep.getQuality().name().toLowerCase(Locale.ROOT)
                        + (sleep.getNotes() == null || sleep.getNotes().isBlank() ? "" : " · " + sleep.getNotes());
                if (matches(needle, title, detail)) {
                    entries.add(new LogEntryResponse("SLEEP", sleep.getId(), sleep.getStartedAt(), title, detail, sleep.isEdited()));
                }
            });
        }
        if (wanted.contains("BOWEL")) {
            bowels.findByChildIdOrderByOccurredAtDesc(childId).forEach(movement -> {
                if (!inRange(movement.getOccurredAt(), from, to)) {
                    return;
                }
                String title = "Bowel movement";
                String detail = (movement.getBristolType() == null ? "Type not recorded" : "Bristol " + movement.getBristolType())
                        + (movement.getNotes() == null || movement.getNotes().isBlank() ? "" : " · " + movement.getNotes());
                if (matches(needle, title, detail)) {
                    entries.add(new LogEntryResponse("BOWEL", movement.getId(), movement.getOccurredAt(), title, detail, movement.isEdited()));
                }
            });
        }
        if (wanted.contains("DOSE")) {
            doses.findByChildIdOrderByGivenAtDesc(childId).forEach(dose -> {
                if (!inRange(dose.getGivenAt(), from, to)) {
                    return;
                }
                String title = "Medication · " + dose.getMedication().getName();
                String detail = (dose.getAmountGiven() == null || dose.getAmountGiven().isBlank() ? "Dose given" : dose.getAmountGiven())
                        + (dose.getNotes() == null || dose.getNotes().isBlank() ? "" : " · " + dose.getNotes());
                if (matches(needle, title, detail, dose.getMedication().getName())) {
                    entries.add(new LogEntryResponse("DOSE", dose.getId(), dose.getGivenAt(), title, detail, dose.isEdited()));
                }
            });
        }
        if (wanted.contains("BEHAVIOR")) {
            behaviorEvents.findByChildIdOrderByOccurredAtDesc(childId).forEach(event -> {
                if (!inRange(event.getOccurredAt(), from, to)) {
                    return;
                }
                String title = "Behavior · " + event.getBehavior().getName();
                String detail = (event.getIntensity() == null ? "Logged" : "Intensity " + event.getIntensity())
                        + (event.getNotes() == null || event.getNotes().isBlank() ? "" : " · " + event.getNotes());
                if (matches(needle, title, detail, event.getBehavior().getName())) {
                    entries.add(new LogEntryResponse("BEHAVIOR", event.getId(), event.getOccurredAt(), title, detail, event.isEdited()));
                }
            });
        }
        if (wanted.contains("APPOINTMENT")) {
            appointments.findByChildIdOrderByStartsAtDesc(childId).forEach(appointment -> {
                if (!inRange(appointment.getStartsAt(), from, to)) {
                    return;
                }
                String title = "Appointment · " + appointment.getTitle();
                String detail = String.join(
                        " · ",
                        java.util.stream.Stream.of(appointment.getProvider(), appointment.getLocation(), appointment.getNotes())
                                .filter(value -> value != null && !value.isBlank())
                                .toList()
                );
                if (detail.isBlank()) {
                    detail = "Scheduled";
                }
                if (matches(needle, title, detail, appointment.getTitle())) {
                    entries.add(new LogEntryResponse("APPOINTMENT", appointment.getId(), appointment.getStartsAt(), title, detail, appointment.isEdited()));
                }
            });
        }
        entries.sort(Comparator.comparing(LogEntryResponse::at).reversed());
        return entries;
    }

    public List<SleepResponse> listSleep(AppUser user, Long childId) {
        requireChild(user, childId);
        return sleeps.findByChildIdOrderByStartedAtDesc(childId).stream().map(SleepResponse::from).toList();
    }

    @Transactional
    public SleepResponse createSleep(AppUser user, Long childId, SleepRequest request) {
        Child child = requireChild(user, childId);
        validateSleepTimes(request.startedAt(), request.endedAt());
        if (request.endedAt() == null
                && sleeps.findByChildIdOrderByStartedAtDesc(childId).stream().anyMatch(s -> s.getEndedAt() == null)) {
            throw new ResponseStatusException(BAD_REQUEST, "Sleep is already in progress. Mark awake first.");
        }
        SleepInterval sleep = new SleepInterval();
        sleep.setChild(child);
        applySleep(sleep, request);
        SleepInterval saved = sleeps.save(sleep);
        recordAudit(user, child, LogAuditEntry.EntryType.SLEEP, saved.getId(), LogAuditEntry.Action.CREATED, List.of());
        return SleepResponse.from(saved);
    }

    @Transactional
    public SleepResponse updateSleep(AppUser user, Long childId, Long sleepId, SleepRequest request) {
        requireChild(user, childId);
        validateSleepTimes(request.startedAt(), request.endedAt());
        SleepInterval sleep = sleeps.findByIdAndChildId(sleepId, childId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Sleep interval not found"));
        List<FieldChange> changes = new ArrayList<>();
        addChange(changes, "startedAt", sleep.getStartedAt(), request.startedAt());
        addChange(changes, "endedAt", sleep.getEndedAt(), request.endedAt());
        addChange(changes, "quality", sleep.getQuality(), request.quality() == null ? SleepInterval.Quality.UNKNOWN : request.quality());
        addChange(changes, "nightWakings", sleep.getNightWakings(), request.nightWakings());
        addChange(changes, "notes", sleep.getNotes(), request.notes());
        boolean completingOpenSleep = sleep.getEndedAt() == null
                && request.endedAt() != null
                && changes.size() == 1
                && "endedAt".equals(changes.getFirst().field());
        if (!changes.isEmpty() && !completingOpenSleep) {
            sleep.setEdited(true);
        }
        applySleep(sleep, request);
        if (!changes.isEmpty()) {
            recordAudit(user, requireChild(user, childId), LogAuditEntry.EntryType.SLEEP, sleep.getId(), LogAuditEntry.Action.UPDATED, changes);
        }
        return SleepResponse.from(sleep);
    }

    @Transactional
    public void deleteSleep(AppUser user, Long childId, Long sleepId) {
        requireChild(user, childId);
        SleepInterval sleep = sleeps.findByIdAndChildId(sleepId, childId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Sleep interval not found"));
        recordAudit(user, requireChild(user, childId), LogAuditEntry.EntryType.SLEEP, sleep.getId(), LogAuditEntry.Action.DELETED, deleteChanges(sleepSnapshot(sleep)));
        sleeps.delete(sleep);
    }

    public List<BowelResponse> listBowel(AppUser user, Long childId) {
        requireChild(user, childId);
        return bowels.findByChildIdOrderByOccurredAtDesc(childId).stream().map(BowelResponse::from).toList();
    }

    @Transactional
    public BowelResponse createBowel(AppUser user, Long childId, BowelRequest request) {
        Child child = requireChild(user, childId);
        BowelMovement movement = new BowelMovement();
        movement.setChild(child);
        applyBowel(movement, request);
        BowelMovement saved = bowels.save(movement);
        recordAudit(user, child, LogAuditEntry.EntryType.BOWEL, saved.getId(), LogAuditEntry.Action.CREATED, List.of());
        return BowelResponse.from(saved);
    }

    @Transactional
    public BowelResponse updateBowel(AppUser user, Long childId, Long bowelId, BowelRequest request) {
        requireChild(user, childId);
        BowelMovement movement = bowels.findByIdAndChildId(bowelId, childId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Bowel movement not found"));
        List<FieldChange> changes = new ArrayList<>();
        addChange(changes, "occurredAt", movement.getOccurredAt(), request.occurredAt());
        addChange(changes, "bristolType", movement.getBristolType(), request.bristolType());
        addChange(changes, "notes", movement.getNotes(), request.notes());
        if (!changes.isEmpty()) {
            movement.setEdited(true);
            recordAudit(user, requireChild(user, childId), LogAuditEntry.EntryType.BOWEL, movement.getId(), LogAuditEntry.Action.UPDATED, changes);
        }
        applyBowel(movement, request);
        return BowelResponse.from(movement);
    }

    @Transactional
    public void deleteBowel(AppUser user, Long childId, Long bowelId) {
        requireChild(user, childId);
        BowelMovement movement = bowels.findByIdAndChildId(bowelId, childId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Bowel movement not found"));
        recordAudit(user, requireChild(user, childId), LogAuditEntry.EntryType.BOWEL, movement.getId(), LogAuditEntry.Action.DELETED, deleteChanges(bowelSnapshot(movement)));
        bowels.delete(movement);
    }

    public List<MedicationResponse> listMedications(AppUser user, Long childId) {
        requireChild(user, childId);
        return medications.findByChildIdOrderByNameAsc(childId).stream().map(MedicationResponse::from).toList();
    }

    @Transactional
    public MedicationResponse createMedication(AppUser user, Long childId, MedicationRequest request) {
        Child child = requireChild(user, childId);
        Medication medication = new Medication();
        medication.setChild(child);
        applyMedication(medication, request);
        return MedicationResponse.from(medications.save(medication));
    }

    @Transactional
    public MedicationResponse updateMedication(AppUser user, Long childId, Long medicationId, MedicationRequest request) {
        requireChild(user, childId);
        Medication medication = medications.findByIdAndChildId(medicationId, childId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Medication not found"));
        applyMedication(medication, request);
        return MedicationResponse.from(medication);
    }

    @Transactional
    public void deleteMedication(AppUser user, Long childId, Long medicationId) {
        requireChild(user, childId);
        Medication medication = medications.findByIdAndChildId(medicationId, childId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Medication not found"));
        doses.deleteByMedicationId(medication.getId());
        medications.delete(medication);
    }

    public List<BehaviorResponse> listBehaviors(AppUser user, Long childId) {
        requireChild(user, childId);
        return behaviors.findByChildIdOrderByNameAsc(childId).stream().map(BehaviorResponse::from).toList();
    }

    @Transactional
    public BehaviorResponse createBehavior(AppUser user, Long childId, BehaviorRequest request) {
        Child child = requireChild(user, childId);
        Behavior behavior = new Behavior();
        behavior.setChild(child);
        applyBehavior(behavior, request);
        return BehaviorResponse.from(behaviors.save(behavior));
    }

    @Transactional
    public BehaviorResponse updateBehavior(AppUser user, Long childId, Long behaviorId, BehaviorRequest request) {
        requireChild(user, childId);
        Behavior behavior = behaviors.findByIdAndChildId(behaviorId, childId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Behavior not found"));
        applyBehavior(behavior, request);
        return BehaviorResponse.from(behavior);
    }

    @Transactional
    public void deleteBehavior(AppUser user, Long childId, Long behaviorId) {
        requireChild(user, childId);
        Behavior behavior = behaviors.findByIdAndChildId(behaviorId, childId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Behavior not found"));
        behaviorEvents.deleteByBehaviorId(behavior.getId());
        behaviors.delete(behavior);
    }

    @Transactional(readOnly = true)
    public List<BehaviorEventResponse> listBehaviorEvents(AppUser user, Long childId) {
        requireChild(user, childId);
        return behaviorEvents.findByChildIdOrderByOccurredAtDesc(childId).stream().map(BehaviorEventResponse::from).toList();
    }

    @Transactional
    public BehaviorEventResponse createBehaviorEvent(AppUser user, Long childId, BehaviorEventRequest request) {
        Child child = requireChild(user, childId);
        Behavior behavior = behaviors.findByIdAndChildId(request.behaviorId(), childId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Behavior not found"));
        BehaviorEvent event = new BehaviorEvent();
        event.setChild(child);
        event.setBehavior(behavior);
        event.setOccurredAt(request.occurredAt());
        event.setIntensity(request.intensity());
        event.setNotes(request.notes());
        BehaviorEvent saved = behaviorEvents.save(event);
        recordAudit(user, child, LogAuditEntry.EntryType.BEHAVIOR, saved.getId(), LogAuditEntry.Action.CREATED, List.of());
        return BehaviorEventResponse.from(saved);
    }

    @Transactional
    public BehaviorEventResponse updateBehaviorEvent(AppUser user, Long childId, Long eventId, BehaviorEventRequest request) {
        Child child = requireChild(user, childId);
        BehaviorEvent event = behaviorEvents.findByIdAndChildId(eventId, childId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Behavior log not found"));
        Behavior behavior = behaviors.findByIdAndChildId(request.behaviorId(), childId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Behavior not found"));
        List<FieldChange> changes = new ArrayList<>();
        addChange(changes, "behavior", event.getBehavior().getName(), behavior.getName());
        addChange(changes, "occurredAt", event.getOccurredAt(), request.occurredAt());
        addChange(changes, "intensity", event.getIntensity(), request.intensity());
        addChange(changes, "notes", event.getNotes(), request.notes());
        if (!changes.isEmpty()) {
            event.setEdited(true);
            recordAudit(user, child, LogAuditEntry.EntryType.BEHAVIOR, event.getId(), LogAuditEntry.Action.UPDATED, changes);
        }
        event.setBehavior(behavior);
        event.setOccurredAt(request.occurredAt());
        event.setIntensity(request.intensity());
        event.setNotes(request.notes());
        return BehaviorEventResponse.from(event);
    }

    @Transactional
    public void deleteBehaviorEvent(AppUser user, Long childId, Long eventId) {
        requireChild(user, childId);
        BehaviorEvent event = behaviorEvents.findByIdAndChildId(eventId, childId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Behavior log not found"));
        recordAudit(user, requireChild(user, childId), LogAuditEntry.EntryType.BEHAVIOR, event.getId(), LogAuditEntry.Action.DELETED, deleteChanges(behaviorEventSnapshot(event)));
        behaviorEvents.delete(event);
    }

    @Transactional(readOnly = true)
    public List<DoseResponse> listDoses(AppUser user, Long childId) {
        requireChild(user, childId);
        return doses.findByChildIdOrderByGivenAtDesc(childId).stream().map(DoseResponse::from).toList();
    }

    @Transactional
    public DoseResponse createDose(AppUser user, Long childId, DoseRequest request) {
        Child child = requireChild(user, childId);
        Medication medication = medications.findByIdAndChildId(request.medicationId(), childId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Medication not found"));
        MedicationDose dose = new MedicationDose();
        dose.setChild(child);
        dose.setMedication(medication);
        dose.setGivenAt(request.givenAt());
        dose.setAmountGiven(request.amountGiven());
        dose.setNotes(request.notes());
        MedicationDose saved = doses.save(dose);
        recordAudit(user, child, LogAuditEntry.EntryType.DOSE, saved.getId(), LogAuditEntry.Action.CREATED, List.of());
        return DoseResponse.from(saved);
    }

    @Transactional
    public DoseResponse updateDose(AppUser user, Long childId, Long doseId, DoseRequest request) {
        Child child = requireChild(user, childId);
        MedicationDose dose = doses.findByIdAndChildId(doseId, childId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Dose not found"));
        Medication medication = medications.findByIdAndChildId(request.medicationId(), childId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Medication not found"));
        List<FieldChange> changes = new ArrayList<>();
        addChange(changes, "medication", dose.getMedication().getName(), medication.getName());
        addChange(changes, "givenAt", dose.getGivenAt(), request.givenAt());
        addChange(changes, "amountGiven", dose.getAmountGiven(), request.amountGiven());
        addChange(changes, "notes", dose.getNotes(), request.notes());
        if (!changes.isEmpty()) {
            dose.setEdited(true);
            recordAudit(user, child, LogAuditEntry.EntryType.DOSE, dose.getId(), LogAuditEntry.Action.UPDATED, changes);
        }
        dose.setMedication(medication);
        dose.setGivenAt(request.givenAt());
        dose.setAmountGiven(request.amountGiven());
        dose.setNotes(request.notes());
        return DoseResponse.from(dose);
    }

    @Transactional
    public void deleteDose(AppUser user, Long childId, Long doseId) {
        requireChild(user, childId);
        MedicationDose dose = doses.findByIdAndChildId(doseId, childId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Dose not found"));
        recordAudit(user, requireChild(user, childId), LogAuditEntry.EntryType.DOSE, dose.getId(), LogAuditEntry.Action.DELETED, deleteChanges(doseSnapshot(dose)));
        doses.delete(dose);
    }

    public List<AppointmentResponse> listAppointments(AppUser user, Long childId) {
        requireChild(user, childId);
        return appointments.findByChildIdOrderByStartsAtDesc(childId).stream().map(AppointmentResponse::from).toList();
    }

    @Transactional
    public AppointmentResponse createAppointment(AppUser user, Long childId, AppointmentRequest request) {
        Child child = requireChild(user, childId);
        Appointment appointment = new Appointment();
        appointment.setChild(child);
        applyAppointment(appointment, request);
        Appointment saved = appointments.save(appointment);
        recordAudit(user, child, LogAuditEntry.EntryType.APPOINTMENT, saved.getId(), LogAuditEntry.Action.CREATED, List.of());
        return AppointmentResponse.from(saved);
    }

    @Transactional
    public AppointmentResponse updateAppointment(AppUser user, Long childId, Long appointmentId, AppointmentRequest request) {
        requireChild(user, childId);
        Appointment appointment = appointments.findByIdAndChildId(appointmentId, childId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Appointment not found"));
        List<FieldChange> changes = new ArrayList<>();
        addChange(changes, "title", appointment.getTitle(), request.title() == null ? null : request.title().trim());
        addChange(changes, "startsAt", appointment.getStartsAt(), request.startsAt());
        addChange(changes, "endsAt", appointment.getEndsAt(), request.endsAt());
        addChange(changes, "provider", appointment.getProvider(), request.provider());
        addChange(changes, "location", appointment.getLocation(), request.location());
        addChange(changes, "notes", appointment.getNotes(), request.notes());
        if (!changes.isEmpty()) {
            appointment.setEdited(true);
            recordAudit(user, requireChild(user, childId), LogAuditEntry.EntryType.APPOINTMENT, appointment.getId(), LogAuditEntry.Action.UPDATED, changes);
        }
        applyAppointment(appointment, request);
        return AppointmentResponse.from(appointment);
    }

    @Transactional
    public void deleteAppointment(AppUser user, Long childId, Long appointmentId) {
        requireChild(user, childId);
        Appointment appointment = appointments.findByIdAndChildId(appointmentId, childId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Appointment not found"));
        recordAudit(user, requireChild(user, childId), LogAuditEntry.EntryType.APPOINTMENT, appointment.getId(), LogAuditEntry.Action.DELETED, deleteChanges(appointmentSnapshot(appointment)));
        appointments.delete(appointment);
    }

    @Transactional(readOnly = true)
    public List<AuditEventResponse> history(AppUser user, Long childId, String entryType, Long entryId) {
        requireChild(user, childId);
        LogAuditEntry.EntryType type = parseEntryType(entryType);
        return logAudits.findByChildIdAndEntryTypeAndEntryIdOrderByChangedAtDesc(childId, type, entryId)
                .stream()
                .map(this::toAuditResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ShareResponse> listShares(AppUser user, Long childId) {
        Child child = requireChild(user, childId);
        Map<Long, ShareResponse> members = new LinkedHashMap<>();
        AppUser owner = child.getCaregiver();
        members.put(owner.getId(), new ShareResponse(null, owner.getId(), owner.getEmail(), owner.getDisplayName(), "OWNER"));
        for (ChildShare share : shares.findByChildIdWithUser(childId)) {
            AppUser member = share.getUser();
            members.putIfAbsent(
                    member.getId(),
                    new ShareResponse(share.getId(), member.getId(), member.getEmail(), member.getDisplayName(), share.getRole().name())
            );
        }
        return List.copyOf(members.values());
    }

    @Transactional
    public ShareResponse inviteShare(AppUser user, Long childId, ShareRequest request) {
        Child child = requireOwner(user, childId);
        String email = request.email().trim();
        if (email.equalsIgnoreCase(user.getEmail())) {
            throw new ResponseStatusException(BAD_REQUEST, "You already have access to this child");
        }
        AppUser invitee = users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "No CareTrack account uses that email. Ask them to create an account first."));
        if (Objects.equals(invitee.getId(), child.getCaregiver().getId())) {
            throw new ResponseStatusException(BAD_REQUEST, "That parent already owns this child");
        }
        if (shares.findByChildIdAndUserId(childId, invitee.getId()).isPresent()) {
            throw new ResponseStatusException(CONFLICT, "That parent already has access");
        }
        ChildShare share = grantShare(child, invitee, ChildShare.Role.SHARED);
        return new ShareResponse(share.getId(), invitee.getId(), invitee.getEmail(), invitee.getDisplayName(), share.getRole().name());
    }

    @Transactional
    public void removeShare(AppUser user, Long childId, Long shareId) {
        requireOwner(user, childId);
        ChildShare share = shares.findByIdAndChildId(shareId, childId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Share not found"));
        if (share.getRole() == ChildShare.Role.OWNER) {
            throw new ResponseStatusException(BAD_REQUEST, "The owner cannot be removed");
        }
        shares.delete(share);
    }

    @Transactional
    public void leaveShare(AppUser user, Long childId) {
        Child child = requireChild(user, childId);
        if (isOwner(user, child)) {
            throw new ResponseStatusException(BAD_REQUEST, "The owner cannot leave. Transfer is not supported yet.");
        }
        ChildShare share = shares.findByChildIdAndUserId(childId, user.getId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Share not found"));
        shares.delete(share);
    }

    private Child requireChild(AppUser user, Long childId) {
        Child child = children.findById(childId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Child not found"));
        if (children.findByIdAndCaregiverId(childId, user.getId()).isPresent()
                || shares.findByChildIdAndUserId(childId, user.getId()).isPresent()) {
            return child;
        }
        throw new ResponseStatusException(NOT_FOUND, "Child not found");
    }

    private Child requireOwner(AppUser user, Long childId) {
        Child child = requireChild(user, childId);
        if (children.findByIdAndCaregiverId(childId, user.getId()).isEmpty()) {
            throw new ResponseStatusException(FORBIDDEN, "Only the child's owner can do that");
        }
        return child;
    }

    private boolean isOwner(AppUser user, Child child) {
        return children.findByIdAndCaregiverId(child.getId(), user.getId()).isPresent();
    }

    private ChildResponse toChildResponse(AppUser user, Child child) {
        return ChildResponse.from(child, isOwner(user, child) ? "OWNER" : "SHARED");
    }

    private ChildShare grantShare(Child child, AppUser user, ChildShare.Role role) {
        return shares.findByChildIdAndUserId(child.getId(), user.getId()).orElseGet(() -> {
            ChildShare share = new ChildShare();
            share.setChild(child);
            share.setUser(user);
            share.setRole(role);
            return shares.save(share);
        });
    }

    private void applySleep(SleepInterval sleep, SleepRequest request) {
        sleep.setStartedAt(request.startedAt());
        sleep.setEndedAt(request.endedAt());
        sleep.setQuality(request.quality() == null ? SleepInterval.Quality.UNKNOWN : request.quality());
        sleep.setNightWakings(request.nightWakings());
        sleep.setNotes(request.notes());
    }

    private void applyBowel(BowelMovement movement, BowelRequest request) {
        movement.setOccurredAt(request.occurredAt());
        movement.setBristolType(request.bristolType());
        movement.setNotes(request.notes());
    }

    private void applyMedication(Medication medication, MedicationRequest request) {
        medication.setName(request.name().trim());
        medication.setDosageInstructions(blankToNull(request.dosageInstructions()));
        medication.setScheduleNotes(blankToNull(request.scheduleNotes()));
        medication.setButtonLabel(blankToNull(request.buttonLabel()));
        medication.setButtonColor(normalizeColor(request.buttonColor()));
        medication.setActive(request.active() == null || request.active());
        medication.setPromptForDosage(Boolean.TRUE.equals(request.promptForDosage()));
    }

    private void applyBehavior(Behavior behavior, BehaviorRequest request) {
        behavior.setName(request.name().trim());
        behavior.setDescription(blankToNull(request.description()));
        behavior.setButtonLabel(blankToNull(request.buttonLabel()));
        behavior.setButtonColor(normalizeColor(request.buttonColor()));
        behavior.setActive(request.active() == null || request.active());
    }

    private void applyAppointment(Appointment appointment, AppointmentRequest request) {
        if (request.endsAt() != null && request.endsAt().isBefore(request.startsAt())) {
            throw new ResponseStatusException(BAD_REQUEST, "Appointment cannot end before it starts");
        }
        appointment.setTitle(request.title().trim());
        appointment.setStartsAt(request.startsAt());
        appointment.setEndsAt(request.endsAt());
        appointment.setProvider(request.provider());
        appointment.setLocation(request.location());
        appointment.setNotes(request.notes());
    }

    private void validateSleepTimes(Instant startedAt, Instant endedAt) {
        if (endedAt != null && endedAt.isBefore(startedAt)) {
            throw new ResponseStatusException(BAD_REQUEST, "Sleep cannot end before it starts");
        }
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static String normalizeColor(String value) {
        String color = blankToNull(value);
        if (color == null) {
            return null;
        }
        if (!color.matches("^#[0-9A-Fa-f]{6}$")) {
            throw new ResponseStatusException(BAD_REQUEST, "Button color must be a hex value like #3d6b5a");
        }
        return color.toLowerCase();
    }

    private void recordAudit(
            AppUser user,
            Child child,
            LogAuditEntry.EntryType type,
            Long entryId,
            LogAuditEntry.Action action,
            List<FieldChange> changes
    ) {
        LogAuditEntry entry = new LogAuditEntry();
        entry.setChild(child);
        entry.setEntryType(type);
        entry.setEntryId(entryId);
        entry.setAction(action);
        entry.setChangedAt(Instant.now());
        entry.setActorId(user.getId());
        entry.setActorName(user.getDisplayName());
        entry.setChangesJson(writeJson(changes));
        logAudits.save(entry);
    }

    private AuditEventResponse toAuditResponse(LogAuditEntry entry) {
        return new AuditEventResponse(
                entry.getId(),
                entry.getEntryType().name(),
                entry.getEntryId(),
                entry.getAction().name(),
                entry.getChangedAt(),
                entry.getActorName(),
                readChanges(entry.getChangesJson())
        );
    }

    private static void addChange(List<FieldChange> changes, String field, Object from, Object to) {
        String left = stringify(from);
        String right = stringify(to);
        if (!Objects.equals(left, right)) {
            changes.add(new FieldChange(field, left, right));
        }
    }

    private static List<FieldChange> deleteChanges(Map<String, String> snapshot) {
        List<FieldChange> changes = new ArrayList<>();
        snapshot.forEach((field, value) -> changes.add(new FieldChange(field, value, "(deleted)")));
        return changes;
    }

    private static Map<String, String> sleepSnapshot(SleepInterval sleep) {
        Map<String, String> snapshot = new LinkedHashMap<>();
        snapshot.put("startedAt", stringify(sleep.getStartedAt()));
        snapshot.put("endedAt", stringify(sleep.getEndedAt()));
        snapshot.put("quality", stringify(sleep.getQuality()));
        snapshot.put("nightWakings", stringify(sleep.getNightWakings()));
        snapshot.put("notes", stringify(sleep.getNotes()));
        return snapshot;
    }

    private static Map<String, String> bowelSnapshot(BowelMovement movement) {
        Map<String, String> snapshot = new LinkedHashMap<>();
        snapshot.put("occurredAt", stringify(movement.getOccurredAt()));
        snapshot.put("bristolType", stringify(movement.getBristolType()));
        snapshot.put("notes", stringify(movement.getNotes()));
        return snapshot;
    }

    private static Map<String, String> doseSnapshot(MedicationDose dose) {
        Map<String, String> snapshot = new LinkedHashMap<>();
        snapshot.put("medication", stringify(dose.getMedication().getName()));
        snapshot.put("givenAt", stringify(dose.getGivenAt()));
        snapshot.put("amountGiven", stringify(dose.getAmountGiven()));
        snapshot.put("notes", stringify(dose.getNotes()));
        return snapshot;
    }

    private static Map<String, String> appointmentSnapshot(Appointment appointment) {
        Map<String, String> snapshot = new LinkedHashMap<>();
        snapshot.put("title", stringify(appointment.getTitle()));
        snapshot.put("startsAt", stringify(appointment.getStartsAt()));
        snapshot.put("endsAt", stringify(appointment.getEndsAt()));
        snapshot.put("provider", stringify(appointment.getProvider()));
        snapshot.put("location", stringify(appointment.getLocation()));
        snapshot.put("notes", stringify(appointment.getNotes()));
        return snapshot;
    }

    private static Map<String, String> behaviorEventSnapshot(BehaviorEvent event) {
        Map<String, String> snapshot = new LinkedHashMap<>();
        snapshot.put("behavior", stringify(event.getBehavior().getName()));
        snapshot.put("occurredAt", stringify(event.getOccurredAt()));
        snapshot.put("intensity", stringify(event.getIntensity()));
        snapshot.put("notes", stringify(event.getNotes()));
        return snapshot;
    }

    private static String stringify(Object value) {
        if (value == null) {
            return "";
        }
        if (value instanceof Instant instant) {
            return instant.toString();
        }
        return String.valueOf(value);
    }

    private static String writeJson(List<FieldChange> changes) {
        StringBuilder json = new StringBuilder("[");
        for (int i = 0; i < changes.size(); i++) {
            FieldChange change = changes.get(i);
            if (i > 0) {
                json.append(',');
            }
            json.append("{\"field\":").append(quote(change.field()))
                    .append(",\"from\":").append(quote(change.from()))
                    .append(",\"to\":").append(quote(change.to()))
                    .append('}');
        }
        return json.append(']').toString();
    }

    private static List<FieldChange> readChanges(String json) {
        List<FieldChange> changes = new ArrayList<>();
        if (json == null || json.isBlank() || "[]".equals(json)) {
            return changes;
        }
        int cursor = 0;
        while (true) {
            int fieldKey = json.indexOf("\"field\"", cursor);
            if (fieldKey < 0) {
                break;
            }
            String field = readQuoted(json, json.indexOf(':', fieldKey) + 1);
            int fromKey = json.indexOf("\"from\"", fieldKey);
            String from = readQuoted(json, json.indexOf(':', fromKey) + 1);
            int toKey = json.indexOf("\"to\"", fromKey);
            String to = readQuoted(json, json.indexOf(':', toKey) + 1);
            changes.add(new FieldChange(field, from, to));
            cursor = toKey + 1;
        }
        return changes;
    }

    private static String quote(String value) {
        String text = value == null ? "" : value;
        StringBuilder json = new StringBuilder("\"");
        for (int i = 0; i < text.length(); i++) {
            char ch = text.charAt(i);
            switch (ch) {
                case '\\' -> json.append("\\\\");
                case '"' -> json.append("\\\"");
                case '\n' -> json.append("\\n");
                case '\r' -> json.append("\\r");
                default -> json.append(ch);
            }
        }
        return json.append('"').toString();
    }

    private static String readQuoted(String json, int start) {
        int open = json.indexOf('"', start);
        StringBuilder value = new StringBuilder();
        for (int i = open + 1; i < json.length(); i++) {
            char ch = json.charAt(i);
            if (ch == '\\' && i + 1 < json.length()) {
                char next = json.charAt(i + 1);
                value.append(next == 'n' ? '\n' : next == 'r' ? '\r' : next);
                i++;
                continue;
            }
            if (ch == '"') {
                return value.toString();
            }
            value.append(ch);
        }
        return value.toString();
    }

    private static Set<String> parseTypes(String types) {
        if (types == null || types.isBlank()) {
            return Set.of("SLEEP", "BOWEL", "DOSE", "BEHAVIOR", "APPOINTMENT");
        }
        Set<String> wanted = new java.util.HashSet<>();
        for (String part : types.split(",")) {
            String value = part.trim().toUpperCase(Locale.ROOT);
            if (!value.isBlank()) {
                wanted.add(value);
            }
        }
        return wanted.isEmpty() ? Set.of("SLEEP", "BOWEL", "DOSE", "BEHAVIOR", "APPOINTMENT") : wanted;
    }

    private static boolean inRange(Instant at, Instant from, Instant to) {
        if (at == null) {
            return false;
        }
        if (from != null && at.isBefore(from)) {
            return false;
        }
        if (to != null && at.isAfter(to)) {
            return false;
        }
        return true;
    }

    private static boolean matches(String needle, String... parts) {
        if (needle.isBlank()) {
            return true;
        }
        for (String part : parts) {
            if (part != null && part.toLowerCase(Locale.ROOT).contains(needle)) {
                return true;
            }
        }
        return false;
    }

    private static String sleepDuration(Instant startedAt, Instant endedAt) {
        if (endedAt == null) {
            return "In progress";
        }
        Duration duration = Duration.between(startedAt, endedAt);
        long hours = duration.toHours();
        long minutes = duration.toMinutesPart();
        return hours + "h " + minutes + "m";
    }

    private static LogAuditEntry.EntryType parseEntryType(String value) {
        try {
            return LogAuditEntry.EntryType.valueOf(value.trim().toUpperCase());
        } catch (Exception ex) {
            throw new ResponseStatusException(BAD_REQUEST, "Unknown log type");
        }
    }
}
