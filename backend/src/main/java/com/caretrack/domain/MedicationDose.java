package com.caretrack.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "medication_doses")
public class MedicationDose {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "child_id")
    private Child child;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "medication_id")
    private Medication medication;

    @Column(nullable = false)
    private Instant givenAt;

    private String amountGiven;

    @Column(length = 2000)
    private String notes;

    @Column(nullable = false, columnDefinition = "boolean default false not null")
    private boolean edited = false;

    public Long getId() {
        return id;
    }

    public Child getChild() {
        return child;
    }

    public void setChild(Child child) {
        this.child = child;
    }

    public Medication getMedication() {
        return medication;
    }

    public void setMedication(Medication medication) {
        this.medication = medication;
    }

    public Instant getGivenAt() {
        return givenAt;
    }

    public void setGivenAt(Instant givenAt) {
        this.givenAt = givenAt;
    }

    public String getAmountGiven() {
        return amountGiven;
    }

    public void setAmountGiven(String amountGiven) {
        this.amountGiven = amountGiven;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public boolean isEdited() {
        return edited;
    }

    public void setEdited(boolean edited) {
        this.edited = edited;
    }
}
