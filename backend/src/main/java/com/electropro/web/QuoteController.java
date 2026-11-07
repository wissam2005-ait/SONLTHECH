package com.electropro.web;

import com.electropro.domain.*;
import com.electropro.domain.Repositories.*;
import com.electropro.service.InvoiceService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** Devis (dirigeant uniquement) : saisis ligne par ligne, puis transformés en facture une fois acceptés. */
@RestController
@RequestMapping("/api/quotes")
public class QuoteController {
    /** Pour un titre de lot ou d'article (SECTION, GROUP), quantité et prix sont ignorés. */
    record LineInput(
            LineKind kind,
            @NotBlank @Size(max = 300) String description,
            @Size(max = 20) String unit,
            @PositiveOrZero @Digits(integer = 8, fraction = 2) BigDecimal quantity,
            @PositiveOrZero @Digits(integer = 10, fraction = 2) BigDecimal unitPrice) {}

    record QuoteInput(
            @NotNull Long clientId,
            Long projectId,
            @Size(max = 200) String title,
            @Size(max = 300) String subtitle,
            @PositiveOrZero @DecimalMax("100") @Digits(integer = 3, fraction = 2) BigDecimal vatRate,
            LocalDate validUntil,
            @Size(max = 2000) String notes,
            @NotNull @Size(min = 1, max = 200, message = "Ajoutez au moins une ligne") List<@Valid LineInput> lines) {}

    record StatusInput(@NotNull Quote.Status status) {}

    record LineView(LineKind kind, String description, String unit, BigDecimal quantity, BigDecimal unitPrice, BigDecimal total) {}

    record QuoteView(Long id, String number, Long clientId, Long projectId, String title, String subtitle, LocalDate issueDate,
                     LocalDate validUntil, Quote.Status status, BigDecimal vatRate, BigDecimal totalHt, BigDecimal totalVat,
                     BigDecimal totalTtc, String notes, Long invoiceId, List<LineView> lines) {
        static QuoteView of(Quote q, List<QuoteLine> lines) {
            return new QuoteView(q.getId(), q.getNumber(), q.getClientId(), q.getProjectId(), q.getTitle(), q.getSubtitle(), q.getIssueDate(),
                    q.getValidUntil(), q.getStatus(), q.getVatRate(), q.getTotalHt(), q.getTotalVat(), q.getTotalTtc(),
                    q.getNotes(), q.getInvoiceId(),
                    lines.stream().map(l -> new LineView(l.getKind(), l.getDescription(), l.getUnit(), l.getQuantity(), l.getUnitPrice(),
                            l.getQuantity().multiply(l.getUnitPrice()).setScale(2, RoundingMode.HALF_UP))).toList());
        }
    }

    private final QuoteRepository quotes;
    private final QuoteLineRepository lines;
    private final QuoteCounterRepository counters;
    private final ClientRepository clients;
    private final ProjectRepository projects;
    private final InvoiceService invoices;

    QuoteController(QuoteRepository quotes, QuoteLineRepository lines, QuoteCounterRepository counters,
                    ClientRepository clients, ProjectRepository projects, InvoiceService invoices) {
        this.quotes = quotes;
        this.lines = lines;
        this.counters = counters;
        this.clients = clients;
        this.projects = projects;
        this.invoices = invoices;
    }

    @GetMapping
    List<QuoteView> list(@RequestParam(required = false) Long projectId) {
        List<Quote> found = projectId == null ? quotes.findAllByOrderByIdDesc() : quotes.findByProjectIdOrderByIdDesc(projectId);
        return found.stream().map(q -> QuoteView.of(q, List.of())).toList();
    }

    @GetMapping("/{id}")
    QuoteView get(@PathVariable Long id) {
        return QuoteView.of(find(id), lines.findByQuoteIdOrderByPositionAsc(id));
    }

    /** Le numéro est attribué dès la création : DE-2026-0001, DE-2026-0002… */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public QuoteView create(@Valid @RequestBody QuoteInput in) {
        LocalDate today = LocalDate.now();
        QuoteCounter counter = counters.lockByYear(today.getYear()).orElseGet(() -> {
            QuoteCounter n = new QuoteCounter();
            n.setQuoteYear(today.getYear());
            n.setLastNumber(0);
            return n;
        });
        counter.setLastNumber(counter.getLastNumber() + 1);
        counters.save(counter);

        Quote q = new Quote();
        q.setNumber(String.format("DE-%d-%04d", today.getYear(), counter.getLastNumber()));
        q.setIssueDate(today);
        q = save(q, in);
        return get(q.getId());
    }

    @PutMapping("/{id}")
    @Transactional
    public QuoteView update(@PathVariable Long id, @Valid @RequestBody QuoteInput in) {
        Quote q = find(id);
        if (q.getStatus() == Quote.Status.INVOICED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce devis a déjà été transformé en facture.");
        }
        lines.deleteByQuoteId(id);
        lines.flush();
        save(q, in);
        return get(id);
    }

    @PatchMapping("/{id}/status")
    QuoteView setStatus(@PathVariable Long id, @Valid @RequestBody StatusInput in) {
        Quote q = find(id);
        if (q.getStatus() == Quote.Status.INVOICED || in.status() == Quote.Status.INVOICED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Utilisez « Transformer en facture ».");
        }
        q.setStatus(in.status());
        quotes.save(q);
        return get(id);
    }

    /** Crée un brouillon de facture identique au devis ; le devis passe « transformé en facture ». */
    @PostMapping("/{id}/invoice")
    @Transactional
    public QuoteView toInvoice(@PathVariable Long id) {
        Quote q = find(id);
        if (q.getStatus() == Quote.Status.INVOICED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce devis a déjà été transformé en facture.");
        }
        if (q.getStatus() == Quote.Status.REFUSED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce devis a été refusé.");
        }
        Invoice inv = invoices.fromQuote(q, lines.findByQuoteIdOrderByPositionAsc(id));
        q.setStatus(Quote.Status.INVOICED);
        q.setInvoiceId(inv.getId());
        quotes.save(q);
        return get(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void delete(@PathVariable Long id) {
        Quote q = find(id);
        if (q.getStatus() == Quote.Status.INVOICED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce devis a été facturé : il ne peut pas être supprimé.");
        }
        lines.deleteByQuoteId(id);
        quotes.delete(q);
    }

    private Quote save(Quote q, QuoteInput in) {
        if (!clients.existsById(in.clientId())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Client inconnu.");
        if (in.projectId() != null) {
            Project p = projects.findById(in.projectId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chantier inconnu."));
            if (!p.getClientId().equals(in.clientId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ce chantier appartient à un autre client.");
            }
        }
        // Le constructeur de Line valide et normalise chaque ligne (titres sans quantité ni prix)
        List<InvoiceService.Line> l = in.lines().stream()
                .map(x -> new InvoiceService.Line(x.kind(), x.description(), x.unit(), x.quantity(), x.unitPrice())).toList();
        if (l.stream().noneMatch(x -> x.kind().priced())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le devis doit contenir au moins une ligne chiffrée.");
        }
        InvoiceService.Totals t = InvoiceService.totals(l, in.vatRate());
        q.setClientId(in.clientId());
        q.setProjectId(in.projectId());
        q.setTitle(blank(in.title()));
        q.setSubtitle(blank(in.subtitle()));
        q.setValidUntil(in.validUntil());
        q.setVatRate(InvoiceService.rate(in.vatRate()));
        q.setTotalHt(t.ht());
        q.setTotalVat(t.vat());
        q.setTotalTtc(t.ttc());
        q.setNotes(blank(in.notes()));
        q = quotes.save(q);

        List<QuoteLine> rows = new ArrayList<>();
        int pos = 0;
        for (InvoiceService.Line x : l) {
            QuoteLine r = new QuoteLine();
            r.setQuoteId(q.getId());
            r.setPosition(pos++);
            r.setKind(x.kind());
            r.setDescription(x.description().trim());
            r.setUnit(blank(x.unit()));
            r.setQuantity(x.quantity());
            r.setUnitPrice(x.unitPrice().setScale(2, RoundingMode.HALF_UP));
            rows.add(r);
        }
        lines.saveAll(rows);
        return q;
    }

    private Quote find(Long id) {
        return quotes.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Devis introuvable."));
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
