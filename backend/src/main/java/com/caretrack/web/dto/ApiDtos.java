package com.caretrack.web.dto;

import com.caretrack.domain.Appointment;
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

    public record ChildResponse(Long id, String name, LocalDate dateOfBirth, String notes) {
        public static ChildResponse from(Child child) {
            return new ChildResponse(child.getId(), child.getName(), child.getDateOfBirth(), child.getNotes());
        }
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
            String notes
    ) {
        public static SleepResponse from(SleepInterval sleep) {
            return new SleepResponse(
                    sleep.getId(),
                    sleep.getStartedAt(),
                    sleep.getEndedAt(),
                    sleep.getQuality(),
                    sleep.getNightWakings(),
                    sleep.getNotes()
            );
        }
    }

    public record BowelRequest(
            @NotNull Instant occurredAt,
            @Min(1) @Max(7) Integer bristolType,
            String notes
    ) {
    }

    public record BowelResponse(Long id, Instant occurredAt, Integer bristolType, String notes) {
        public static BowelResponse from(BowelMovement movement) {
            return new BowelResponse(
                    movement.getId(),
                    movement.getOccurredAt(),
                    movement.getBristolType(),
                    movement.getNotes()
            );
        }
    }

    public record MedicationRequest(
            @NotBlank String name,
            String dosageInstructions,
            String scheduleNotes,
            Boolean active
    ) {
    }

    public record MedicationResponse(
            Long id,
            String name,
            String dosageInstructions,
            String scheduleNotes,
            boolean active
    ) {
        public static MedicationResponse from(Medication medication) {
            return new MedicationResponse(
                    medication.getId(),
                    medication.getName(),
                    medication.getDosageInstructions(),
                    medication.getScheduleNotes(),
                    medication.isActive()
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
            String notes
    ) {
        public static DoseResponse from(MedicationDose dose) {
            return new DoseResponse(
                    dose.getId(),
                    dose.getMedication().getId(),
                    dose.getMedication().getName(),
                    dose.getGivenAt(),
                    dose.getAmountGiven(),
                    dose.getNotes()
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
            String notes
    ) {
        public static AppointmentResponse from(Appointment appointment) {
            return new AppointmentResponse(
                    appointment.getId(),
                    appointment.getTitle(),
                    appointment.getStartsAt(),
                    appointment.getEndsAt(),
                    appointment.getProvider(),
                    appointment.getLocation(),
                    appointment.getNotes()
            );
        }
    }

    public record DashboardResponse(
            ChildResponse child,
            SleepResponse latestSleep,
            BowelResponse latestBowel,
            DoseResponse latestDose,
            AppointmentResponse nextAppointment
    ) {
    }
}
