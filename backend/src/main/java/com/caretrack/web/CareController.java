package com.caretrack.web;

import com.caretrack.domain.AppUser;
import com.caretrack.security.CurrentUser;
import com.caretrack.service.CareService;
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
import com.caretrack.web.dto.ApiDtos.LogEntryResponse;
import com.caretrack.web.dto.ApiDtos.MedicationRequest;
import com.caretrack.web.dto.ApiDtos.MedicationResponse;
import com.caretrack.web.dto.ApiDtos.ShareRequest;
import com.caretrack.web.dto.ApiDtos.ShareResponse;
import com.caretrack.web.dto.ApiDtos.SleepRequest;
import com.caretrack.web.dto.ApiDtos.SleepResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/children")
public class CareController {

    private final CareService careService;
    private final CurrentUser currentUser;

    public CareController(CareService careService, CurrentUser currentUser) {
        this.careService = careService;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<ChildResponse> children() {
        return careService.listChildren(user());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ChildResponse createChild(@Valid @RequestBody ChildRequest request) {
        return careService.createChild(user(), request);
    }

    @PutMapping("/{childId}")
    public ChildResponse updateChild(@PathVariable Long childId, @Valid @RequestBody ChildRequest request) {
        return careService.updateChild(user(), childId, request);
    }

    @GetMapping("/{childId}/shares")
    public List<ShareResponse> shares(@PathVariable Long childId) {
        return careService.listShares(user(), childId);
    }

    @PostMapping("/{childId}/shares")
    @ResponseStatus(HttpStatus.CREATED)
    public ShareResponse inviteShare(@PathVariable Long childId, @Valid @RequestBody ShareRequest request) {
        return careService.inviteShare(user(), childId, request);
    }

    @DeleteMapping("/{childId}/shares/{shareId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeShare(@PathVariable Long childId, @PathVariable Long shareId) {
        careService.removeShare(user(), childId, shareId);
    }

    @PostMapping("/{childId}/leave")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void leaveShare(@PathVariable Long childId) {
        careService.leaveShare(user(), childId);
    }

    @GetMapping("/{childId}/dashboard")
    public DashboardResponse dashboard(@PathVariable Long childId) {
        return careService.dashboard(user(), childId);
    }

    @GetMapping("/{childId}/logs")
    public List<LogEntryResponse> logs(
            @PathVariable Long childId,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String types
    ) {
        return careService.listLogs(user(), childId, from, to, q, types);
    }

    @GetMapping("/{childId}/sleep")
    public List<SleepResponse> sleep(@PathVariable Long childId) {
        return careService.listSleep(user(), childId);
    }

    @PostMapping("/{childId}/sleep")
    @ResponseStatus(HttpStatus.CREATED)
    public SleepResponse createSleep(@PathVariable Long childId, @Valid @RequestBody SleepRequest request) {
        return careService.createSleep(user(), childId, request);
    }

    @PutMapping("/{childId}/sleep/{sleepId}")
    public SleepResponse updateSleep(
            @PathVariable Long childId,
            @PathVariable Long sleepId,
            @Valid @RequestBody SleepRequest request
    ) {
        return careService.updateSleep(user(), childId, sleepId, request);
    }

    @DeleteMapping("/{childId}/sleep/{sleepId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSleep(@PathVariable Long childId, @PathVariable Long sleepId) {
        careService.deleteSleep(user(), childId, sleepId);
    }

    @GetMapping("/{childId}/bowel")
    public List<BowelResponse> bowel(@PathVariable Long childId) {
        return careService.listBowel(user(), childId);
    }

    @PostMapping("/{childId}/bowel")
    @ResponseStatus(HttpStatus.CREATED)
    public BowelResponse createBowel(@PathVariable Long childId, @Valid @RequestBody BowelRequest request) {
        return careService.createBowel(user(), childId, request);
    }

    @PutMapping("/{childId}/bowel/{bowelId}")
    public BowelResponse updateBowel(
            @PathVariable Long childId,
            @PathVariable Long bowelId,
            @Valid @RequestBody BowelRequest request
    ) {
        return careService.updateBowel(user(), childId, bowelId, request);
    }

    @DeleteMapping("/{childId}/bowel/{bowelId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBowel(@PathVariable Long childId, @PathVariable Long bowelId) {
        careService.deleteBowel(user(), childId, bowelId);
    }

    @GetMapping("/{childId}/medications")
    public List<MedicationResponse> medications(@PathVariable Long childId) {
        return careService.listMedications(user(), childId);
    }

    @PostMapping("/{childId}/medications")
    @ResponseStatus(HttpStatus.CREATED)
    public MedicationResponse createMedication(@PathVariable Long childId, @Valid @RequestBody MedicationRequest request) {
        return careService.createMedication(user(), childId, request);
    }

    @PutMapping("/{childId}/medications/{medicationId}")
    public MedicationResponse updateMedication(
            @PathVariable Long childId,
            @PathVariable Long medicationId,
            @Valid @RequestBody MedicationRequest request
    ) {
        return careService.updateMedication(user(), childId, medicationId, request);
    }

    @DeleteMapping("/{childId}/medications/{medicationId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMedication(@PathVariable Long childId, @PathVariable Long medicationId) {
        careService.deleteMedication(user(), childId, medicationId);
    }

    @GetMapping("/{childId}/behaviors")
    public List<BehaviorResponse> behaviors(@PathVariable Long childId) {
        return careService.listBehaviors(user(), childId);
    }

    @PostMapping("/{childId}/behaviors")
    @ResponseStatus(HttpStatus.CREATED)
    public BehaviorResponse createBehavior(
            @PathVariable Long childId,
            @Valid @RequestBody BehaviorRequest request
    ) {
        return careService.createBehavior(user(), childId, request);
    }

    @PutMapping("/{childId}/behaviors/{behaviorId}")
    public BehaviorResponse updateBehavior(
            @PathVariable Long childId,
            @PathVariable Long behaviorId,
            @Valid @RequestBody BehaviorRequest request
    ) {
        return careService.updateBehavior(user(), childId, behaviorId, request);
    }

    @DeleteMapping("/{childId}/behaviors/{behaviorId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBehavior(@PathVariable Long childId, @PathVariable Long behaviorId) {
        careService.deleteBehavior(user(), childId, behaviorId);
    }

    @GetMapping("/{childId}/behavior-events")
    public List<BehaviorEventResponse> behaviorEvents(@PathVariable Long childId) {
        return careService.listBehaviorEvents(user(), childId);
    }

    @PostMapping("/{childId}/behavior-events")
    @ResponseStatus(HttpStatus.CREATED)
    public BehaviorEventResponse createBehaviorEvent(
            @PathVariable Long childId,
            @Valid @RequestBody BehaviorEventRequest request
    ) {
        return careService.createBehaviorEvent(user(), childId, request);
    }

    @PutMapping("/{childId}/behavior-events/{eventId}")
    public BehaviorEventResponse updateBehaviorEvent(
            @PathVariable Long childId,
            @PathVariable Long eventId,
            @Valid @RequestBody BehaviorEventRequest request
    ) {
        return careService.updateBehaviorEvent(user(), childId, eventId, request);
    }

    @DeleteMapping("/{childId}/behavior-events/{eventId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBehaviorEvent(@PathVariable Long childId, @PathVariable Long eventId) {
        careService.deleteBehaviorEvent(user(), childId, eventId);
    }

    @GetMapping("/{childId}/doses")
    public List<DoseResponse> doses(@PathVariable Long childId) {
        return careService.listDoses(user(), childId);
    }

    @PostMapping("/{childId}/doses")
    @ResponseStatus(HttpStatus.CREATED)
    public DoseResponse createDose(@PathVariable Long childId, @Valid @RequestBody DoseRequest request) {
        return careService.createDose(user(), childId, request);
    }

    @DeleteMapping("/{childId}/doses/{doseId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDose(@PathVariable Long childId, @PathVariable Long doseId) {
        careService.deleteDose(user(), childId, doseId);
    }

    @PutMapping("/{childId}/doses/{doseId}")
    public DoseResponse updateDose(
            @PathVariable Long childId,
            @PathVariable Long doseId,
            @Valid @RequestBody DoseRequest request
    ) {
        return careService.updateDose(user(), childId, doseId, request);
    }

    @GetMapping("/{childId}/history/{entryType}/{entryId}")
    public List<AuditEventResponse> history(
            @PathVariable Long childId,
            @PathVariable String entryType,
            @PathVariable Long entryId
    ) {
        return careService.history(user(), childId, entryType, entryId);
    }

    @GetMapping("/{childId}/appointments")
    public List<AppointmentResponse> appointments(@PathVariable Long childId) {
        return careService.listAppointments(user(), childId);
    }

    @PostMapping("/{childId}/appointments")
    @ResponseStatus(HttpStatus.CREATED)
    public AppointmentResponse createAppointment(
            @PathVariable Long childId,
            @Valid @RequestBody AppointmentRequest request
    ) {
        return careService.createAppointment(user(), childId, request);
    }

    @PutMapping("/{childId}/appointments/{appointmentId}")
    public AppointmentResponse updateAppointment(
            @PathVariable Long childId,
            @PathVariable Long appointmentId,
            @Valid @RequestBody AppointmentRequest request
    ) {
        return careService.updateAppointment(user(), childId, appointmentId, request);
    }

    @DeleteMapping("/{childId}/appointments/{appointmentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAppointment(@PathVariable Long childId, @PathVariable Long appointmentId) {
        careService.deleteAppointment(user(), childId, appointmentId);
    }

    private AppUser user() {
        return currentUser.require();
    }
}
