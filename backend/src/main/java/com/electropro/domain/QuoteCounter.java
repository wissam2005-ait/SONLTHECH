package com.electropro.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "quote_counters")
@Getter
@Setter
public class QuoteCounter {
    @Id
    @Column(name = "quote_year")
    private Integer quoteYear;

    @Column(name = "last_number")
    private int lastNumber;
}
