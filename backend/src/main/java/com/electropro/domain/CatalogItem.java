package com.electropro.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

/** Pièce du catalogue (prix d'achat HT habituel). Sert à pré-remplir le matériel des chantiers. */
@Entity
@Table(name = "catalog_items")
@Getter
@Setter
public class CatalogItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String reference;
    private String unit = "u";

    @Column(name = "unit_price")
    private BigDecimal unitPrice;

    private String supplier;
    private boolean archived;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
