package com.electropro.web;

import com.electropro.domain.Absence;
import com.electropro.domain.AppUser;
import com.electropro.domain.Repositories.AbsenceRepository;
import com.electropro.domain.Repositories.SalaryPaymentRepository;
import com.electropro.domain.Repositories.SalarySettingRepository;
import com.electropro.domain.Repositories.UserRepository;
import com.electropro.domain.SalaryPayment;
import com.electropro.domain.SalarySetting;
import com.electropro.service.AbsenceDays;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Suivi des salaires (dirigeant uniquement) : montant mensuel convenu, paiements versés, reste à payer. */
@RestController
@RequestMapping("/api/salaries")
public class SalaryController {
    /** unpaidAbsenceDays : jours ouvrés d'absence sans solde ou injustifiée du mois (pour information au moment de payer). */
    record Row(Long userId, String fullName, String jobTitle, BigDecimal monthlyAmount, BigDecimal paid, BigDecimal remaining,
               BigDecimal absenceDays, BigDecimal unpaidAbsenceDays) {}

    record AmountInput(@NotNull @PositiveOrZero @Digits(integer = 8, fraction = 2) BigDecimal monthlyAmount) {}

    record PaymentInput(
            @NotBlank @Pattern(regexp = "\\d{4}-(0[1-9]|1[0-2])", message = "Mois attendu au format AAAA-MM") String period,
            @NotNull @Positive @Digits(integer = 8, fraction = 2) BigDecimal amount,
            @NotNull LocalDate paidOn,
            @Size(max = 30) String method,
            @Size(max = 300) String note) {}

    record PaymentView(Long id, String period, BigDecimal amount, LocalDate paidOn, String method, String note) {
        static PaymentView of(SalaryPayment p) {
            return new PaymentView(p.getId(), p.getPeriod(), p.getAmount(), p.getPaidOn(), p.getMethod(), p.getNote());
        }
    }

    private final UserRepository users;
    private final SalarySettingRepository settings;
    private final SalaryPaymentRepository payments;
    private final AbsenceRepository absences;

    SalaryController(UserRepository users, SalarySettingRepository settings, SalaryPaymentRepository payments,
                     AbsenceRepository absences) {
        this.users = users;
        this.settings = settings;
        this.payments = payments;
        this.absences = absences;
    }

    /** Situation du mois (par défaut le mois courant) pour chaque employé et stagiaire actif. */
    @GetMapping
    List<Row> month(@RequestParam(required = false) String month) {
        String period = month == null || month.isBlank() ? YearMonth.now().toString() : parse(month);
        Map<Long, BigDecimal> paidByUser = new HashMap<>();
        for (SalaryPayment p : payments.findByPeriod(period)) {
            paidByUser.merge(p.getUserId(), p.getAmount(), BigDecimal::add);
        }
        Map<Long, BigDecimal> amounts = new HashMap<>();
        settings.findAll().forEach(s -> amounts.put(s.getUserId(), s.getMonthlyAmount()));

        YearMonth ym = YearMonth.parse(period);
        Map<Long, BigDecimal> absent = new HashMap<>();
        Map<Long, BigDecimal> unpaid = new HashMap<>();
        for (Absence a : absences.overlapping(ym.atDay(1), ym.atEndOfMonth())) {
            BigDecimal d = AbsenceDays.within(a, ym.atDay(1), ym.atEndOfMonth());
            absent.merge(a.getUserId(), d, BigDecimal::add);
            if (a.getType() == Absence.Type.UNPAID || a.getType() == Absence.Type.UNJUSTIFIED) {
                unpaid.merge(a.getUserId(), d, BigDecimal::add);
            }
        }

        return users.findAllByOrderByFullNameAsc().stream()
                .filter(u -> u.isActive() && u.getRole() != AppUser.Role.ADMIN)
                .map(u -> {
                    BigDecimal due = amounts.getOrDefault(u.getId(), BigDecimal.ZERO);
                    BigDecimal paid = paidByUser.getOrDefault(u.getId(), BigDecimal.ZERO);
                    return new Row(u.getId(), u.getFullName(), u.getJobTitle(), due, paid, due.subtract(paid),
                            absent.getOrDefault(u.getId(), BigDecimal.ZERO), unpaid.getOrDefault(u.getId(), BigDecimal.ZERO));
                })
                .toList();
    }

    @PutMapping("/{userId}")
    Row setAmount(@PathVariable Long userId, @Valid @RequestBody AmountInput in) {
        requireUser(userId);
        SalarySetting s = settings.findById(userId).orElseGet(() -> {
            SalarySetting n = new SalarySetting();
            n.setUserId(userId);
            return n;
        });
        s.setMonthlyAmount(in.monthlyAmount());
        settings.save(s);
        return month(null).stream().filter(r -> r.userId().equals(userId)).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Compte introuvable."));
    }

    @GetMapping("/{userId}/payments")
    List<PaymentView> history(@PathVariable Long userId) {
        return payments.findByUserIdOrderByPaidOnDescIdDesc(userId).stream().map(PaymentView::of).toList();
    }

    @PostMapping("/{userId}/payments")
    @ResponseStatus(HttpStatus.CREATED)
    PaymentView pay(@PathVariable Long userId, @Valid @RequestBody PaymentInput in) {
        requireUser(userId);
        SalaryPayment p = new SalaryPayment();
        p.setUserId(userId);
        p.setPeriod(in.period());
        p.setAmount(in.amount());
        p.setPaidOn(in.paidOn());
        p.setMethod(in.method() == null || in.method().isBlank() ? null : in.method().trim());
        p.setNote(in.note() == null || in.note().isBlank() ? null : in.note().trim());
        return PaymentView.of(payments.save(p));
    }

    @DeleteMapping("/payments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deletePayment(@PathVariable Long id) {
        if (!payments.existsById(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Paiement introuvable.");
        payments.deleteById(id);
    }

    private void requireUser(Long id) {
        if (!users.existsById(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Compte introuvable.");
    }

    private static String parse(String month) {
        try {
            return YearMonth.parse(month).toString();
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mois attendu au format AAAA-MM.");
        }
    }
}
