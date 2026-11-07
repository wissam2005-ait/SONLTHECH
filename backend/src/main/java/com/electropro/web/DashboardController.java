package com.electropro.web;

import com.electropro.domain.*;
import com.electropro.domain.Repositories.*;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

/** Vue d'ensemble du dirigeant : chiffres clés, chantiers en cours, factures en retard, absents du jour. */
@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {
    record ProjectItem(Long id, String name, int progress, LocalDate endDate, boolean late) {}

    record InvoiceItem(Long id, String number, Long clientId, String clientName, BigDecimal totalTtc, LocalDate dueDate) {}

    record AbsentItem(Long userId, String fullName, Absence.Type type, LocalDate endDate, boolean halfDay) {}

    record Summary(long newRequests, long activeProjects, long clients, long activeAccounts, long openTasks,
                   BigDecimal revenueMonthHt, BigDecimal revenueYearHt, BigDecimal unpaidTtc, long overdueCount,
                   BigDecimal salariesRemaining, BigDecimal materialsToBuy,
                   List<ProjectItem> projects, List<InvoiceItem> overdueInvoices, List<AbsentItem> absentToday) {}

    private final ContactRequestRepository requests;
    private final ProjectRepository projects;
    private final ClientRepository clients;
    private final UserRepository users;
    private final TaskRepository tasks;
    private final InvoiceRepository invoices;
    private final AbsenceRepository absences;
    private final SalarySettingRepository salarySettings;
    private final SalaryPaymentRepository salaryPayments;
    private final MaterialRepository materials;
    private final InvoicePaymentRepository invoicePayments;

    DashboardController(ContactRequestRepository requests, ProjectRepository projects, ClientRepository clients,
                        UserRepository users, TaskRepository tasks, InvoiceRepository invoices, AbsenceRepository absences,
                        SalarySettingRepository salarySettings, SalaryPaymentRepository salaryPayments,
                        MaterialRepository materials, InvoicePaymentRepository invoicePayments) {
        this.requests = requests;
        this.projects = projects;
        this.clients = clients;
        this.users = users;
        this.tasks = tasks;
        this.invoices = invoices;
        this.absences = absences;
        this.salarySettings = salarySettings;
        this.salaryPayments = salaryPayments;
        this.materials = materials;
        this.invoicePayments = invoicePayments;
    }

    @GetMapping
    Summary summary() {
        LocalDate today = LocalDate.now();
        YearMonth month = YearMonth.from(today);

        // Chiffre d'affaires HT facturé (factures émises ou payées)
        List<Invoice> all = invoices.findAll();
        Map<Long, BigDecimal> paidByInvoice = new HashMap<>();
        invoicePayments.findAll().forEach(p -> paidByInvoice.merge(p.getInvoiceId(), p.getAmount(), BigDecimal::add));
        BigDecimal revenueMonth = BigDecimal.ZERO;
        BigDecimal revenueYear = BigDecimal.ZERO;
        BigDecimal unpaid = BigDecimal.ZERO;
        List<Invoice> overdue = new ArrayList<>();
        for (Invoice i : all) {
            if (i.getStatus() == Invoice.Status.DRAFT || i.getIssueDate() == null) continue;
            if (i.getIssueDate().getYear() == today.getYear()) revenueYear = revenueYear.add(i.getTotalHt());
            if (YearMonth.from(i.getIssueDate()).equals(month)) revenueMonth = revenueMonth.add(i.getTotalHt());
            if (i.getStatus() == Invoice.Status.SENT) {
                unpaid = unpaid.add(i.getTotalTtc().subtract(paidByInvoice.getOrDefault(i.getId(), BigDecimal.ZERO)).max(BigDecimal.ZERO));
                if (i.getDueDate() != null && i.getDueDate().isBefore(today)) overdue.add(i);
            }
        }
        Map<Long, String> clientNames = clients.findAllById(overdue.stream().map(Invoice::getClientId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Client::getId, Client::getName, (a, b) -> a));
        List<InvoiceItem> overdueItems = overdue.stream()
                .sorted(Comparator.comparing(Invoice::getDueDate))
                .map(i -> new InvoiceItem(i.getId(), i.getNumber(), i.getClientId(), clientNames.getOrDefault(i.getClientId(), ""),
                        i.getTotalTtc().subtract(paidByInvoice.getOrDefault(i.getId(), BigDecimal.ZERO)), i.getDueDate()))
                .toList();

        // Salaires restant à verser ce mois-ci (employés et stagiaires actifs)
        Map<Long, BigDecimal> due = new HashMap<>();
        salarySettings.findAll().forEach(s -> due.put(s.getUserId(), s.getMonthlyAmount()));
        Map<Long, BigDecimal> paid = new HashMap<>();
        salaryPayments.findByPeriod(month.toString()).forEach(p -> paid.merge(p.getUserId(), p.getAmount(), BigDecimal::add));
        List<AppUser> staff = users.findAllByOrderByFullNameAsc();
        BigDecimal salariesRemaining = staff.stream()
                .filter(u -> u.isActive() && u.getRole() != AppUser.Role.ADMIN)
                .map(u -> due.getOrDefault(u.getId(), BigDecimal.ZERO).subtract(paid.getOrDefault(u.getId(), BigDecimal.ZERO)))
                .filter(r -> r.signum() > 0)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Chantiers en cours, du plus urgent au moins urgent
        List<ProjectItem> running = projects.findByStatusOrderByEndDateAscIdAsc(Project.Status.IN_PROGRESS).stream()
                .map(p -> new ProjectItem(p.getId(), p.getName(), p.getProgress(), p.getEndDate(),
                        p.getEndDate() != null && p.getEndDate().isBefore(today)))
                .toList();

        // Absents aujourd'hui
        Map<Long, String> names = staff.stream().collect(Collectors.toMap(AppUser::getId, AppUser::getFullName, (a, b) -> a));
        List<AbsentItem> absent = absences.overlapping(today, today).stream()
                .map(a -> new AbsentItem(a.getUserId(), names.getOrDefault(a.getUserId(), ""), a.getType(), a.getEndDate(), a.isHalfDay()))
                .toList();

        long toBuy = materials.findAll().stream().filter(m -> !m.isPurchased()).count();

        return new Summary(
                requests.countByStatus(ContactRequest.Status.NEW),
                projects.countByStatus(Project.Status.IN_PROGRESS),
                clients.countByArchivedFalse(),
                users.countByActiveTrue(),
                tasks.countByStatusNot(Task.Status.DONE),
                revenueMonth, revenueYear, unpaid, overdue.size(),
                salariesRemaining, BigDecimal.valueOf(toBuy),
                running, overdueItems, absent);
    }
}
