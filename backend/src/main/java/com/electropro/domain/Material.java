package com.electropro.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/** Une ligne de matériel nécessaire à un chantier. Acheté = purchasedOn renseignée. */
@Entity
@Table(name = "materials")
@Getter
@Setter
public class Material {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id")
    private Long projectId;

    private String name;
    private String unit = "u";
    private BigDecimal quantity;
    private String supplier;

    /** Prix d'achat HT à l'unité. */
    @Column(name = "unit_cost")
    private BigDecimal unitCost;

    @Column(name = "purchased_on")
    private LocalDate purchasedOn;

    @Column(name = "invoice_id")
    private Long invoiceId;

    @Column(name = "added_by")
    private Long addedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    public boolean isPurchased() {
        return purchasedOn != null;
    }
}
