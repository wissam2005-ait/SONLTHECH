package com.electropro.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/** Une entrée du journal d'avancement d'un chantier (pourcentage + commentaire). */
@Entity
@Table(name = "project_updates")
@Getter
@Setter
public class ProjectUpdate {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id")
    private Long projectId;

    @Column(name = "author_id")
    private Long authorId;

    private int progress;
    private String note;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
