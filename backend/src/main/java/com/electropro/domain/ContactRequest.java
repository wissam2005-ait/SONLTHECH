package com.electropro.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/** Demande de devis ou message envoyé depuis le site public. */
@Entity
@Table(name = "contact_requests")
@Getter
@Setter
public class ContactRequest {
    public enum Kind { QUOTE, CONTACT }

    public enum Status { NEW, IN_PROGRESS, QUOTE_SENT, ACCEPTED, REFUSED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private Kind kind;

    @Column(name = "full_name")
    private String fullName;

    private String phone;
    private String email;

    @Column(name = "work_type")
    private String workType;

    @Column(name = "site_address")
    private String siteAddress;

    private String message;

    @Enumerated(EnumType.STRING)
    private Status status = Status.NEW;

    @Column(name = "client_id")
    private Long clientId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
