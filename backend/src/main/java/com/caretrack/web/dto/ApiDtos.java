package com.caretrack.web.dto;

import com.caretrack.domain.Appointment;
import com.caretrack.domain.Behavior;
import com.caretrack.domain.BehaviorEvent;
import com.caretrack.domain.BowelMovement;
import com.caretrack.domain.Child;
import com.caretrack.domain.Medication;
import com.caretrack.domain.MedicationDose;
import com.caretrack.domain.SleepInterval;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.LocalDate;

public final class ApiDtos {
    private ApiDtos() {
    }

    public record RegisterRequest(
            @Email @NotBlank String email,
            @NotBlank @Size(min = 8) String password,
            @NotBlank String displayName
    ) {
    }

    public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {
    }

    public record AuthResponse(String token, UserResponse user) {
    }

    public record UserResponse(Long id, String email, String displayName) {
    }

    public record ChildRequest(
            @NotBlank String name,
            LocalDate dateOfBirth,
            String notes
    ) {
    }

    public record ChildResponse(
            Long id,
            String name,
            LocalDate dateOfBirth,
            String notes,
            String role,
            String ownerName
    ) {
        public static ChildResponse from(Child child) {
            return from(child, "OWNER");
        }

        public static ChildResponse from(Child child, String role) {
            String ownerName = child.getCaregiver() == null ? null : child.getCaregiver().getDisplayName();
            return new ChildResponse(child.getId(), child.getName(), child.getDateOfBirth(), child.getNotes(), role, ownerName);
        }
    }

    public record ShareRequest(@Email @NotBlank String email) {
    }

    public record ShareResponse(Long id, Long userId, String email, String displayName, String role) {
    }

    public record SleepRequest(
            @NotNull Instant startedAt,
            Instant endedAt,
            SleepInterval.Quality quality,
            Integer nightWakings,
            String notes
    ) {
    }

    public record SleepResponse(
            Long id,
            Instant startedAt,
            Instant endedAt,
            SleepInterval.Quality quality,
            Integer nightWakings,
            String notes,
            boolean edited
    ) {
        public static SleepResponse from(SleepInterval sleep) {
            return new SleepResponse(
                    sleep.getId(),
                    sleep.getStartedAt(),
                    sleep.getEndedAt(),
                    sleep.getQuality(),
                    sleep.getNightWakings(),
                    sleep.getNotes(),
                    sleep.isEdited()
            );
        }
    }

    public record BowelRequest(
            @NotNull Instant occurredAt,
            @Min(1) @Max(7) Integer bristolType,
            String notes
    ) {
    }

    public record BowelResponse(Long id, Instant occurredAt, Integer bristolType, String notes, boolean edited) {
        public static BowelResponse from(BowelMovement movement) {
            return new BowelResponse(
                    movement.getId(),
                    movement.getOccurredAt(),
                    movement.getBristolType(),
                    movement.getNotes(),
                    movement.isEdited()
            );
        }
    }

    public record MedicationRequest(
            @NotBlank String name,
            String dosageInstructions,
            String scheduleNotes,
            String buttonLabel,
            String buttonColor,
            Boolean active,
            Boolean promptForDosage
    ) {
    }

    public record MedicationResponse(
            Long id,
            String name,
            String dosageInstructions,
            String scheduleNotes,
            String buttonLabel,
            String buttonColor,
            boolean active,
            boolean promptForDosage
    ) {
        public static MedicationResponse from(Medication medication) {
            return new MedicationResponse(
                    medication.getId(),
                    medication.getName(),
                    medication.getDosageInstructions(),
                    medication.getScheduleNotes(),
                    medication.getButtonLabel(),
                    medication.getButtonColor(),
                    medication.isActive(),
                    medication.isPromptForDosage()
            );
        }
    }

    public record DoseRequest(
            @NotNull Long medicationId,
            @NotNull Instant givenAt,
            String amountGiven,
            String notes
    ) {
    }

    public record DoseResponse(
            Long id,
            Long medicationId,
            String medicationName,
            Instant givenAt,
            String amountGiven,
            String notes,
            boolean edited
    ) {
        public static DoseResponse from(MedicationDose dose) {
            return new DoseResponse(
                    dose.getId(),
                    dose.getMedication().getId(),
                    dose.getMedication().getName(),
                    dose.getGivenAt(),
                    dose.getAmountGiven(),
                    dose.getNotes(),
                    dose.isEdited()
            );
        }
    }

    public record AppointmentRequest(
            @NotBlank String title,
            @NotNull Instant startsAt,
            Instant endsAt,
            String provider,
            String location,
            String notes
    ) {
    }

    public record AppointmentResponse(
            Long id,
            String title,
            Instant startsAt,
            Instant endsAt,
            String provider,
            String location,
            String notes,
            boolean edited
    ) {
        public static AppointmentResponse from(Appointment appointment) {
            return new AppointmentResponse(
                    appointment.getId(),
                    appointment.getTitle(),
                    appointment.getStartsAt(),
                    appointment.getEndsAt(),
                    appointment.getProvider(),
                    appointment.getLocation(),
                    appointment.getNotes(),
                    appointment.isEdited()
            );
        }
    }

    public record BehaviorRequest(
            @NotBlank String name,
            String description,
            String buttonLabel,
            String buttonColor,
            Boolean active
    ) {
    }

    public record BehaviorResponse(
            Long id,
            String name,
            String description,
            String buttonLabel,
            String buttonColor,
            boolean active
    ) {
        public static BehaviorResponse from(Behavior behavior) {
            return new BehaviorResponse(
                    behavior.getId(),
                    behavior.getName(),
                    behavior.getDescription(),
                    behavior.getButtonLabel(),
                    behavior.getButtonColor(),
                    behavior.isActive()
            );
        }
    }

    public record BehaviorEventRequest(
            @NotNull Long behaviorId,
            @NotNull Instant occurredAt,
            @Min(1) @Max(5) Integer intensity,
            String notes
    ) {
    }

    public record BehaviorEventResponse(
            Long id,
            Long behaviorId,
            String behaviorName,
            Instant occurredAt,
            Integer intensity,
            String notes,
            boolean edited
    ) {
        public static BehaviorEventResponse from(BehaviorEvent event) {
            return new BehaviorEventResponse(
                    event.getId(),
                    event.getBehavior().getId(),
                    event.getBehavior().getName(),
                    event.getOccurredAt(),
                    event.getIntensity(),
                    event.getNotes(),
                    event.isEdited()
            );
        }
    }

    public record FieldChange(String field, String from, String to) {
    }

    public record AuditEventResponse(
            Long id,
            String entryType,
            Long entryId,
            String action,
            Instant changedAt,
            String actorName,
            java.util.List<FieldChange> changes
    ) {
    }

    public record DashboardResponse(
            ChildResponse child,
            SleepResponse latestSleep,
            BowelResponse latestBowel,
            DoseResponse latestDose,
            BehaviorEventResponse latestBehavior,
            AppointmentResponse nextAppointment
    ) {
    }

    public record LogEntryResponse(
            String type,
            Long id,
            Instant at,
            String title,
            String detail,
            boolean edited
    ) {
    }
}
