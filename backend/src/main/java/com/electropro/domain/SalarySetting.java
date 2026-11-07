package com.electropro.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "salary_settings")
@Getter
@Setter
public class SalarySetting {
    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "monthly_amount")
    private BigDecimal monthlyAmount;
}
