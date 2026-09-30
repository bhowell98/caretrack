package com.caretrack.service;

import com.caretrack.domain.AppUser;
import com.caretrack.domain.Appointment;
import com.caretrack.domain.BowelMovement;
import com.caretrack.domain.Child;
import com.caretrack.domain.Medication;
import com.caretrack.domain.MedicationDose;
import com.caretrack.domain.SleepInterval;
import com.caretrack.repo.AppointmentRepository;
import com.caretrack.repo.BowelMovementRepository;
import com.caretrack.repo.ChildRepository;
import com.caretrack.repo.MedicationDoseRepository;
import com.caretrack.repo.MedicationRepository;
import com.caretrack.repo.SleepIntervalRepository;
import com.caretrack.web.dto.ApiDtos.AppointmentRequest;
import com.caretrack.web.dto.ApiDtos.AppointmentResponse;
import com.caretrack.web.dto.ApiDtos.BowelRequest;
import com.caretrack.web.dto.ApiDtos.BowelResponse;
import com.caretrack.web.dto.ApiDtos.ChildRequest;
import com.caretrack.web.dto.ApiDtos.ChildResponse;
import com.caretrack.web.dto.ApiDtos.DashboardResponse;
import com.caretrack.web.dto.ApiDtos.DoseRequest;
import com.caretrack.web.dto.ApiDtos.DoseResponse;
import com.caretrack.web.dto.ApiDtos.MedicationRequest;
import com.caretrack.web.dto.ApiDtos.MedicationResponse;
import com.caretrack.web.dto.ApiDtos.SleepRequest;
import com.caretrack.web.dto.ApiDtos.SleepResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class CareService {

    private final ChildRepository children;
    private final SleepIntervalRepository sleeps;
    private final BowelMovementRepository bowels;
    private final MedicationRepository medications;
    private final MedicationDoseRepository doses;
    private final AppointmentRepository appointments;

    public CareService(
            ChildRepository children,
            SleepIntervalRepository sleeps,
            BowelMovementRepository bowels,
            MedicationRepository medications,
            MedicationDoseRepository doses,
            AppointmentRepository appointments
    ) {
        this.children = children;
        this.sleeps = sleeps;
        this.bowels = bowels;
        this.medications = medications;
        this.doses = doses;
        this.appointments = appointments;
    }

    public List<ChildResponse> listChildren(AppUser user) {
        return children.findByCaregiverIdOrderByNameAsc(user.getId()).stream()
                .map(ChildResponse::from)
                .toList();
    }

    @Transactional
    public ChildResponse createChild(AppUser user, ChildRequest request) {
        Child child = new Child();
        child.setCaregiver(user);
        child.setName(request.name().trim());
        child.setDateOfBirth(request.dateOfBirth());
        child.setNotes(request.notes());
        return ChildResponse.from(children.save(child));
    }

    @Transactional
    public ChildResponse updateChild(AppUser user, Long childId, ChildRequest request) {
        Child child = requireChild(user, childId);
        child.setName(request.name().trim());
        child.setDateOfBirth(request.dateOfBirth());
        child.setNotes(request.notes());
        return ChildResponse.from(child);
    }

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
        AppointmentResponse nextAppointment = appointments
                .findByChildIdAndStartsAtGreaterThanEqualOrderByStartsAtAsc(childId, Instant.now())
                .stream()
                .findFirst()
                .map(AppointmentResponse::from)
                .orElse(null);
        return new DashboardResponse(ChildResponse.from(child), latestSleep, latestBowel, latestDose, nextAppointment);
    }

    public List<SleepResponse> listSleep(AppUser user, Long childId) {
        requireChild(user, childId);
        return sleeps.findByChildIdOrderByStartedAtDesc(childId).stream().map(SleepResponse::from).toList();
    }

    @Transactional
    public SleepResponse createSleep(AppUser user, Long childId, SleepRequest request) {
        Child child = requireChild(user, childId);
        validateSleepTimes(request.startedAt(), request.endedAt());
        SleepInterval sleep = new SleepInterval();
        sleep.setChild(child);
        applySleep(sleep, request);
        return SleepResponse.from(sleeps.save(sleep));
    }

    @Transactional
    public SleepResponse updateSleep(AppUser user, Long childId, Long sleepId, SleepRequest request) {
        requireChild(user, childId);
        validateSleepTimes(request.startedAt(), request.endedAt());
        SleepInterval sleep = sleeps.findByIdAndChildId(sleepId, childId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Sleep interval not found"));
        applySleep(sleep, request);
        return SleepResponse.from(sleep);
    }

    @Transactional
    public void deleteSleep(AppUser user, Long childId, Long sleepId) {
        requireChild(user, childId);
        SleepInterval sleep = sleeps.findByIdAndChildId(sleepId, childId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Sleep interval not found"));
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
        return BowelResponse.from(bowels.save(movement));
    }

    @Transactional
    public BowelResponse updateBowel(AppUser user, Long childId, Long bowelId, BowelRequest request) {
        requireChild(user, childId);
        BowelMovement movement = bowels.findByIdAndChildId(bowelId, childId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Bowel movement not found"));
        applyBowel(movement, request);
        return BowelResponse.from(movement);
    }

    @Transactional
    public void deleteBowel(AppUser user, Long childId, Long bowelId) {
        requireChild(user, childId);
        BowelMovement movement = bowels.findByIdAndChildId(bowelId, childId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Bowel movement not found"));
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
        return DoseResponse.from(doses.save(dose));
    }

    @Transactional
    public void deleteDose(AppUser user, Long childId, Long doseId) {
        requireChild(user, childId);
        MedicationDose dose = doses.findByIdAndChildId(doseId, childId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Dose not found"));
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
        return AppointmentResponse.from(appointments.save(appointment));
    }

    @Transactional
    public AppointmentResponse updateAppointment(AppUser user, Long childId, Long appointmentId, AppointmentRequest request) {
        requireChild(user, childId);
        Appointment appointment = appointments.findByIdAndChildId(appointmentId, childId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Appointment not found"));
        applyAppointment(appointment, request);
        return AppointmentResponse.from(appointment);
    }

    @Transactional
    public void deleteAppointment(AppUser user, Long childId, Long appointmentId) {
        requireChild(user, childId);
        Appointment appointment = appointments.findByIdAndChildId(appointmentId, childId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Appointment not found"));
        appointments.delete(appointment);
    }

    private Child requireChild(AppUser user, Long childId) {
        return children.findByIdAndCaregiverId(childId, user.getId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Child not found"));
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
        medication.setDosageInstructions(request.dosageInstructions());
        medication.setScheduleNotes(request.scheduleNotes());
        medication.setActive(request.active() == null || request.active());
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
}
