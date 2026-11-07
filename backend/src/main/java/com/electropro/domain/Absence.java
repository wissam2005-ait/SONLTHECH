package com.electropro.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.time.LocalDate;

/** Absence d'un employé, du startDate au endDate inclus. halfDay n'a de sens que sur une seule journée. */
@Entity
@Table(name = "absences")
@Getter
@Setter
public class Absence {
    /** Congé payé, maladie, sans solde, injustifiée, formation, autre. */
    public enum Type { PAID_LEAVE, SICK, UNPAID, UNJUSTIFIED, TRAINING, OTHER }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Enumerated(EnumType.STRING)
    private Type type;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "half_day")
    private boolean halfDay;

    private String note;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
