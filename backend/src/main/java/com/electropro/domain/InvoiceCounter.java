package com.electropro.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "invoice_counters")
@Getter
@Setter
public class InvoiceCounter {
    @Id
    @Column(name = "invoice_year")
    private Integer invoiceYear;

    @Column(name = "last_number")
    private int lastNumber;
}
