package com.electropro.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

/** Coordonnées de l'entreprise imprimées sur les devis et factures (une seule ligne, id = 1). */
@Entity
@Table(name = "company_settings")
@Getter
@Setter
public class CompanySettings {
    @Id
    private Integer id;

    private String name;

    @Column(name = "legal_form")
    private String legalForm;

    private String capital;
    private String address;
    private String city;
    private String phone;
    private String email;
    private String rc;
    private String nif;
    private String nis;
    private String ai;
    private String bank;
    private String footer;

    @Column(columnDefinition = "text")
    private String logo;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
