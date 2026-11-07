package com.electropro.web;

import com.electropro.domain.Invoice;
import com.electropro.domain.InvoiceLine;
import com.electropro.domain.InvoicePayment;
import com.electropro.domain.LineKind;
import com.electropro.domain.Repositories.InvoiceLineRepository;
import com.electropro.domain.Repositories.InvoicePaymentRepository;
import com.electropro.domain.Repositories.InvoiceRepository;
import com.electropro.service.InvoiceService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** Factures (dirigeant uniquement) : depuis un chantier, libres ou depuis un devis ; paiements partiels. */
@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {
    /** Pour un titre de lot ou d'article (SECTION, GROUP), quantité et prix sont ignorés. */
    record LineInput(
            LineKind kind,
            @NotBlank @Size(max = 300) String description,
            @Size(max = 20) String unit,
            @PositiveOrZero @Digits(integer = 8, fraction = 2) BigDecimal quantity,
            @PositiveOrZero @Digits(integer = 10, fraction = 2) BigDecimal unitPrice) {
        InvoiceService.Line toLine() {
            return new InvoiceService.Line(kind, description, unit, quantity, unitPrice);
        }
    }

    record GenerateInput(
            @NotNull Long projectId,
            @NotNull @PositiveOrZero @DecimalMax("1000") @Digits(integer = 4, fraction = 2) BigDecimal markupPercent,
            @PositiveOrZero @DecimalMax("100") @Digits(integer = 3, fraction = 2) BigDecimal vatRate,
            LocalDate dueDate,
            @Size(max = 2000) String notes,
            List<@Valid LineInput> extraLines) {}

    /** Facture libre (création) ou modification d'un brouillon. */
    record DraftInput(
            @NotNull Long clientId,
            Long projectId,
            @Size(max = 200) String title,
            @Size(max = 300) String subtitle,
            @PositiveOrZero @DecimalMax("100") @Digits(integer = 3, fraction = 2) BigDecimal vatRate,
            LocalDate dueDate,
            @Size(max = 2000) String notes,
            @NotNull @Size(min = 1, max = 200, message = "Ajoutez au moins une ligne") List<@Valid LineInput> lines) {
        InvoiceService.Draft toDraft() {
            return new InvoiceService.Draft(clientId, projectId, title, subtitle, vatRate, dueDate, notes,
                    lines.stream().map(LineInput::toLine).toList());
        }
    }

    record PaymentInput(
            @NotNull @Positive @Digits(integer = 10, fraction = 2) BigDecimal amount,
            @NotNull LocalDate paidOn,
            @Size(max = 30) String method,
            @Size(max = 300) String note) {}

    record LineView(LineKind kind, String description, String unit, BigDecimal quantity, BigDecimal unitPrice, BigDecimal total) {
        static LineView of(InvoiceLine l) {
            return new LineView(l.getKind(), l.getDescription(), l.getUnit(), l.getQuantity(), l.getUnitPrice(),
                    l.getQuantity().multiply(l.getUnitPrice()).setScale(2, RoundingMode.HALF_UP));
        }
    }

    record PaymentView(Long id, BigDecimal amount, LocalDate paidOn, String method, String note) {
        static PaymentView of(InvoicePayment p) {
            return new PaymentView(p.getId(), p.getAmount(), p.getPaidOn(), p.getMethod(), p.getNote());
        }
    }

    record InvoiceView(Long id, String number, Long projectId, Long clientId, String title, String subtitle, Long quoteId,
                       LocalDate issueDate, LocalDate dueDate, Invoice.Status status, BigDecimal vatRate,
                       BigDecimal totalHt, BigDecimal totalVat, BigDecimal totalTtc, String notes, LocalDate paidOn,
                       BigDecimal paidAmount, BigDecimal remaining, List<LineView> lines, List<PaymentView> payments) {
        static InvoiceView of(Invoice i, List<InvoiceLine> lines, List<InvoicePayment> pays) {
            BigDecimal paid = pays.stream().map(InvoicePayment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal remaining = i.getStatus() == Invoice.Status.DRAFT ? i.getTotalTtc() : i.getTotalTtc().subtract(paid).max(BigDecimal.ZERO);
            return new InvoiceView(i.getId(), i.getNumber(), i.getProjectId(), i.getClientId(), i.getTitle(), i.getSubtitle(), i.getQuoteId(),
                    i.getIssueDate(), i.getDueDate(), i.getStatus(), i.getVatRate(), i.getTotalHt(), i.getTotalVat(),
                    i.getTotalTtc(), i.getNotes(), i.getPaidOn(), paid, remaining,
                    lines.stream().map(LineView::of).toList(), pays.stream().map(PaymentView::of).toList());
        }
    }

    private final InvoiceRepository invoices;
    private final InvoiceLineRepository lines;
    private final InvoicePaymentRepository payments;
    private final InvoiceService service;

    InvoiceController(InvoiceRepository invoices, InvoiceLineRepository lines, InvoicePaymentRepository payments, InvoiceService service) {
        this.invoices = invoices;
        this.lines = lines;
        this.payments = payments;
        this.service = service;
    }

    /** Liste sans le détail des lignes, avec le montant déjà payé. */
    @GetMapping
    List<InvoiceView> list(@RequestParam(required = false) Long projectId) {
        List<Invoice> found = projectId == null ? invoices.findAllByOrderByIdDesc() : invoices.findByProjectIdOrderByIdDesc(projectId);
        if (found.isEmpty()) return List.of();
        Map<Long, List<InvoicePayment>> byInvoice = payments.findByInvoiceIdIn(found.stream().map(Invoice::getId).toList())
                .stream().collect(Collectors.groupingBy(InvoicePayment::getInvoiceId));
        return found.stream().map(i -> InvoiceView.of(i, List.of(), byInvoice.getOrDefault(i.getId(), List.of()))).toList();
    }

    @GetMapping("/{id}")
    InvoiceView get(@PathVariable Long id) {
        Invoice i = invoices.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Facture introuvable."));
        return InvoiceView.of(i, lines.findByInvoiceIdOrderByPositionAsc(id), payments.findByInvoiceIdOrderByPaidOnAscIdAsc(id));
    }

    /** Facture libre (dépannage, intervention ponctuelle…). */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    InvoiceView create(@Valid @RequestBody DraftInput in) {
        return get(service.createFree(in.toDraft()).getId());
    }

    @PostMapping("/generate")
    @ResponseStatus(HttpStatus.CREATED)
    InvoiceView generate(@Valid @RequestBody GenerateInput in) {
        List<InvoiceService.Line> extras = in.extraLines() == null ? List.of() : in.extraLines().stream().map(LineInput::toLine).toList();
        Invoice i = service.generate(new InvoiceService.Command(in.projectId(), in.markupPercent(), in.vatRate(), in.dueDate(), in.notes(), extras));
        return get(i.getId());
    }

    @PutMapping("/{id}")
    InvoiceView update(@PathVariable Long id, @Valid @RequestBody DraftInput in) {
        service.updateDraft(id, in.toDraft());
        return get(id);
    }

    @PostMapping("/{id}/issue")
    InvoiceView issue(@PathVariable Long id) {
        service.issue(id);
        return get(id);
    }

    @PostMapping("/{id}/payments")
    InvoiceView addPayment(@PathVariable Long id, @Valid @RequestBody PaymentInput in) {
        service.addPayment(id, new InvoiceService.Payment(in.amount(), in.paidOn(), in.method(), in.note()));
        return get(id);
    }

    @DeleteMapping("/{id}/payments/{paymentId}")
    InvoiceView deletePayment(@PathVariable Long id, @PathVariable Long paymentId) {
        service.deletePayment(id, paymentId);
        return get(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable Long id) {
        service.deleteDraft(id);
    }
}
