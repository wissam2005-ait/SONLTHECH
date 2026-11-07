package com.electropro.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.time.LocalDate;

/** Un chantier terminé présenté aux clients sur le site public. */
@Entity
@Table(name = "realisations")
@Getter
@Setter
public class Realisation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private String description;
    private String city;

    @Column(name = "completed_on")
    private LocalDate completedOn;

    @Column(name = "author_id")
    private Long authorId;

    private boolean published = true;

    @Column(name = "project_id")
    private Long projectId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
