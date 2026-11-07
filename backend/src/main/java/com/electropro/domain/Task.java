package com.electropro.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "tasks")
@Getter
@Setter
public class Task {
    public enum Status { TODO, IN_PROGRESS, DONE }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id")
    private Long projectId;

    private String title;
    private String description;

    @Column(name = "assignee_id")
    private Long assigneeId;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    private Status status = Status.TODO;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
