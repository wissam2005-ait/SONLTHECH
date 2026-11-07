package com.electropro.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "realisation_photos")
@Getter
@Setter
public class RealisationPhoto {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "realisation_id")
    private Long realisationId;

    private int position;

    /** Nom aléatoire (UUID) du fichier sur le disque : sert aussi d'identifiant dans l'URL publique. */
    @Column(name = "file_name")
    private String fileName;
}
