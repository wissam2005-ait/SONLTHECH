package com.electropro.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "app_users")
@Getter
@Setter
public class AppUser {
    public enum Role { ADMIN, EMPLOYEE, INTERN }

    public enum ContractType { CDI, CDD, APPRENTICESHIP, INTERNSHIP, TEMPORARY, OTHER }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String email;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "full_name")
    private String fullName;

    @Enumerated(EnumType.STRING)
    private Role role = Role.EMPLOYEE;

    private String phone;

    @Column(name = "job_title")
    private String jobTitle;

    private boolean active = true;

    @Column(name = "hire_date")
    private LocalDate hireDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "contract_type")
    private ContractType contractType;

    private String address;
    private String notes;
}
