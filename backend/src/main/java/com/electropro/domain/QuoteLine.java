package com.electropro.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "quote_lines")
@Getter
@Setter
public class QuoteLine {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "quote_id")
    private Long quoteId;

    private int position;

    @Enumerated(EnumType.STRING)
    private LineKind kind = LineKind.ITEM;
    private String description;
    private String unit;
    private BigDecimal quantity;

    @Column(name = "unit_price")
    private BigDecimal unitPrice;
}
