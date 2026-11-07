package com.electropro.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "invoice_lines")
@Getter
@Setter
public class InvoiceLine {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "invoice_id")
    private Long invoiceId;

    private int position;

    @Enumerated(EnumType.STRING)
    private LineKind kind = LineKind.ITEM;
    private String description;
    private String unit;
    private BigDecimal quantity;

    @Column(name = "unit_price")
    private BigDecimal unitPrice;
}
