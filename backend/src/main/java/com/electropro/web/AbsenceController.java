package com.electropro.web;

import com.electropro.domain.Absence;
import com.electropro.domain.AppUser;
import com.electropro.domain.Repositories.AbsenceRepository;
import com.electropro.domain.Repositories.UserRepository;
import com.electropro.service.AbsenceDays;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Year;
import java.util.*;
import java.util.stream.Collectors;

/** Suivi des absences (dirigeant uniquement) : congés, maladie, sans solde, injustifiées… */
@RestController
@RequestMapping("/api/absences")
public class AbsenceController {
    record AbsenceInput(
            @NotNull Long userId,
            @NotNull Absence.Type type,
            @NotNull LocalDate startDate,
            @NotNull LocalDate endDate,
            boolean halfDay,
            @Size(max = 500) String note) {}

    record AbsenceView(Long id, Long userId, String userName, Absence.Type type, LocalDate startDate, LocalDate endDate,
                       boolean halfDay, String note, BigDecimal days) {}

    /** Jours ouvrés d'absence d'une personne sur l'année, par type. */
    record SummaryRow(Long userId, String fullName, boolean active, Map<Absence.Type, BigDecimal> days, BigDecimal total) {}

    private final AbsenceRepository absences;
    private final UserRepository users;

    AbsenceController(AbsenceRepository absences, UserRepository users) {
        this.absences = absences;
        this.users = users;
    }

    /** Filtres facultatifs : personne, période. Sans période : toutes les absences. */
    @GetMapping
    List<AbsenceView> list(@RequestParam(required = false) Long userId,
                           @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                           @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        List<Absence> found;
        if (from != null || to != null) {
            LocalDate f = from != null ? from : LocalDate.of(1900, 1, 1);
            LocalDate t = to != null ? to : LocalDate.of(2999, 12, 31);
            found = userId != null ? absences.overlappingForUser(userId, f, t) : absences.overlapping(f, t);
        } else {
            found = userId != null ? absences.findByUserIdOrderByStartDateDescIdDesc(userId) : absences.findAllByOrderByStartDateDescIdDesc();
        }
        return views(found);
    }

    @GetMapping("/summary")
    List<SummaryRow> summary(@RequestParam(required = false) Integer year) {
        int y = year != null ? year : Year.now().getValue();
        LocalDate from = LocalDate.of(y, 1, 1);
        LocalDate to = LocalDate.of(y, 12, 31);
        Map<Long, Map<Absence.Type, BigDecimal>> byUser = new HashMap<>();
        for (Absence a : absences.overlapping(from, to)) {
            byUser.computeIfAbsent(a.getUserId(), k -> new EnumMap<>(Absence.Type.class))
                    .merge(a.getType(), AbsenceDays.within(a, from, to), BigDecimal::add);
        }
        return users.findAllByOrderByFullNameAsc().stream()
                .filter(u -> u.getRole() != AppUser.Role.ADMIN || byUser.containsKey(u.getId()))
                .filter(u -> u.isActive() || byUser.containsKey(u.getId()))
                .map(u -> {
                    Map<Absence.Type, BigDecimal> d = byUser.getOrDefault(u.getId(), new EnumMap<>(Absence.Type.class));
                    BigDecimal total = d.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
                    return new SummaryRow(u.getId(), u.getFullName(), u.isActive(), d, total);
                })
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    AbsenceView create(@Valid @RequestBody AbsenceInput in) {
        return views(List.of(absences.save(apply(new Absence(), in)))).get(0);
    }

    @PutMapping("/{id}")
    AbsenceView update(@PathVariable Long id, @Valid @RequestBody AbsenceInput in) {
        return views(List.of(absences.save(apply(find(id), in)))).get(0);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable Long id) {
        absences.delete(find(id));
    }

    private Absence find(Long id) {
        return absences.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Absence introuvable."));
    }

    private Absence apply(Absence a, AbsenceInput in) {
        if (!users.existsById(in.userId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Employé inconnu.");
        }
        if (in.endDate().isBefore(in.startDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La date de fin précède la date de début.");
        }
        if (in.halfDay() && !in.endDate().equals(in.startDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Une demi-journée ne peut porter que sur un seul jour.");
        }
        boolean overlaps = absences.overlappingForUser(in.userId(), in.startDate(), in.endDate()).stream()
                .anyMatch(o -> !o.getId().equals(a.getId()));
        if (overlaps) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette personne a déjà une absence sur cette période.");
        }
        a.setUserId(in.userId());
        a.setType(in.type());
        a.setStartDate(in.startDate());
        a.setEndDate(in.endDate());
        a.setHalfDay(in.halfDay());
        a.setNote(in.note() == null || in.note().isBlank() ? null : in.note().trim());
        return a;
    }

    private List<AbsenceView> views(List<Absence> items) {
        if (items.isEmpty()) return List.of();
        Map<Long, String> names = users.findAllById(items.stream().map(Absence::getUserId).collect(Collectors.toSet())).stream()
                .collect(Collectors.toMap(AppUser::getId, AppUser::getFullName, (x, y) -> x));
        return items.stream()
                .map(a -> new AbsenceView(a.getId(), a.getUserId(), names.getOrDefault(a.getUserId(), ""), a.getType(),
                        a.getStartDate(), a.getEndDate(), a.isHalfDay(), a.getNote(), AbsenceDays.of(a)))
                .toList();
    }

}
