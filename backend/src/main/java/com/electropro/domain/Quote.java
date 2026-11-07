package com.electropro.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/** Devis envoyé à un client, transformable en facture une fois accepté. */
@Entity
@Table(name = "quotes")
@Getter
@Setter
public class Quote {
    /** En attente de réponse, accepté, refusé, transformé en facture. */
    public enum Status { PENDING, ACCEPTED, REFUSED, INVOICED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String number;

    @Column(name = "client_id")
    private Long clientId;

    @Column(name = "project_id")
    private Long projectId;

    private String title;

    /** Sous-titre du document (ex. « 02- BÂTIMENT »). */
    private String subtitle;

    @Column(name = "issue_date")
    private LocalDate issueDate;

    @Column(name = "valid_until")
    private LocalDate validUntil;

    @Enumerated(EnumType.STRING)
    private Status status = Status.PENDING;

    @Column(name = "vat_rate")
    private BigDecimal vatRate;

    @Column(name = "total_ht")
    private BigDecimal totalHt;

    @Column(name = "total_vat")
    private BigDecimal totalVat;

    @Column(name = "total_ttc")
    private BigDecimal totalTtc;

    private String notes;

    @Column(name = "invoice_id")
    private Long invoiceId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
