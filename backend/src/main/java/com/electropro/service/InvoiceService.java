package com.electropro.service;

import com.electropro.domain.*;
import com.electropro.domain.Repositories.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class InvoiceService {
    /** Une ligne saisie (facture ou devis). Les titres (GROUP, SECTION) n'ont ni quantité ni prix. */
    public record Line(LineKind kind, String description, String unit, BigDecimal quantity, BigDecimal unitPrice) {
        public Line {
            if (kind == null) kind = LineKind.ITEM;
            if (kind.priced()) {
                if (quantity == null || quantity.signum() <= 0) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantité manquante pour « " + description + " ».");
                }
                if (unitPrice == null || unitPrice.signum() < 0) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Prix unitaire manquant pour « " + description + " ».");
                }
            } else {
                unit = null;
                quantity = BigDecimal.ZERO;
                unitPrice = BigDecimal.ZERO;
            }
        }

        public static Line item(String description, String unit, BigDecimal quantity, BigDecimal unitPrice) {
            return new Line(LineKind.ITEM, description, unit, quantity, unitPrice);
        }
    }

    /** Génération depuis un chantier : matériel acheté non facturé (+ marge) et lignes libres. */
    public record Command(Long projectId, BigDecimal markupPercent, BigDecimal vatRate, LocalDate dueDate,
                          String notes, List<Line> extraLines) {}

    /** Facture libre, ou modification d'un brouillon : toutes les lignes sont fournies. */
    public record Draft(Long clientId, Long projectId, String title, String subtitle, BigDecimal vatRate, LocalDate dueDate,
                        String notes, List<Line> lines) {}

    public record Payment(BigDecimal amount, LocalDate paidOn, String method, String note) {}

    public record Totals(BigDecimal ht, BigDecimal vat, BigDecimal ttc) {}

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private final InvoiceRepository invoices;
    private final InvoiceLineRepository lines;
    private final InvoiceCounterRepository counters;
    private final InvoicePaymentRepository payments;
    private final MaterialRepository materials;
    private final ProjectRepository projects;
    private final ClientRepository clients;

    public InvoiceService(InvoiceRepository invoices, InvoiceLineRepository lines, InvoiceCounterRepository counters,
                          InvoicePaymentRepository payments, MaterialRepository materials, ProjectRepository projects,
                          ClientRepository clients) {
        this.invoices = invoices;
        this.lines = lines;
        this.counters = counters;
        this.payments = payments;
        this.materials = materials;
        this.projects = projects;
        this.clients = clients;
    }

    /** Totaux HT / TVA / TTC, arrondis ligne par ligne au centime. */
    /** Sans TVA par défaut (entreprise non assujettie) : taux absent = 0. */
    public static BigDecimal rate(BigDecimal vatRate) {
        return vatRate == null ? BigDecimal.ZERO : vatRate;
    }

    public static Totals totals(List<Line> items, BigDecimal vatRate) {
        vatRate = rate(vatRate);
        BigDecimal ht = items.stream()
                .filter(l -> l.kind().priced())
                .map(l -> l.quantity().multiply(l.unitPrice().setScale(2, RoundingMode.HALF_UP)).setScale(2, RoundingMode.HALF_UP))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal vat = ht.multiply(vatRate).divide(HUNDRED, 2, RoundingMode.HALF_UP);
        return new Totals(ht, vat, ht.add(vat));
    }

    /** Crée un brouillon à partir du matériel acheté et pas encore facturé du chantier, plus des lignes libres. */
    @Transactional
    public Invoice generate(Command c) {
        Project project = projects.findById(c.projectId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chantier inconnu."));
        List<Material> billable = materials.findByProjectIdAndPurchasedOnIsNotNullAndInvoiceIdIsNullOrderByIdAsc(project.getId());
        List<Line> extras = c.extraLines() == null ? List.of() : c.extraLines();
        if (billable.isEmpty() && extras.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Aucun matériel acheté et non facturé sur ce chantier, et aucune ligne ajoutée.");
        }
        BigDecimal factor = BigDecimal.ONE.add(c.markupPercent().divide(HUNDRED, 6, RoundingMode.HALF_UP));
        List<Line> all = new ArrayList<>();
        for (Material m : billable) {
            all.add(Line.item(m.getName(), m.getUnit(), m.getQuantity(), m.getUnitCost().multiply(factor).setScale(2, RoundingMode.HALF_UP)));
        }
        all.addAll(extras);

        Invoice inv = new Invoice();
        inv.setProjectId(project.getId());
        inv.setClientId(project.getClientId());
        inv.setTitle(project.getName());
        inv = saveDraft(inv, all, c.vatRate(), c.dueDate(), c.notes());

        for (Material m : billable) m.setInvoiceId(inv.getId());
        materials.saveAll(billable);
        return inv;
    }

    /** Facture libre : n'importe quel client, chantier facultatif, lignes saisies à la main. */
    @Transactional
    public Invoice createFree(Draft d) {
        Invoice inv = new Invoice();
        applyHeader(inv, d);
        return saveDraft(inv, d.lines(), d.vatRate(), d.dueDate(), d.notes());
    }

    /** Un brouillon reste entièrement modifiable. */
    @Transactional
    public Invoice updateDraft(Long id, Draft d) {
        Invoice inv = find(id);
        if (inv.getStatus() != Invoice.Status.DRAFT) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Une facture émise ne peut plus être modifiée.");
        }
        // Le matériel déjà rattaché reste lié à son chantier d'origine
        if (!materials.findByInvoiceId(id).isEmpty() && d.projectId() != null && !d.projectId().equals(inv.getProjectId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette facture reprend le matériel d'un chantier : le chantier ne peut pas changer.");
        }
        applyHeader(inv, d);
        lines.deleteByInvoiceId(id);
        lines.flush();
        return saveDraft(inv, d.lines(), d.vatRate(), d.dueDate(), d.notes());
    }

    /** Copie un devis en brouillon de facture. */
    @Transactional
    public Invoice fromQuote(Quote q, List<QuoteLine> qLines) {
        Invoice inv = new Invoice();
        inv.setClientId(q.getClientId());
        inv.setProjectId(q.getProjectId());
        inv.setTitle(q.getTitle());
        inv.setQuoteId(q.getId());
        inv.setSubtitle(q.getSubtitle());
        List<Line> l = qLines.stream().map(x -> new Line(x.getKind(), x.getDescription(), x.getUnit(), x.getQuantity(), x.getUnitPrice())).toList();
        String notes = "Selon notre devis n° " + q.getNumber() + (q.getNotes() != null ? "\n" + q.getNotes() : "");
        return saveDraft(inv, l, q.getVatRate(), LocalDate.now().plusDays(30), notes);
    }

    /** Émet la facture : date du jour + prochain numéro de la série de l'année (sans trou). */
    @Transactional
    public Invoice issue(Long id) {
        Invoice inv = find(id);
        if (inv.getStatus() != Invoice.Status.DRAFT) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette facture est déjà émise.");
        }
        LocalDate today = LocalDate.now();
        InvoiceCounter counter = counters.lockByYear(today.getYear()).orElseGet(() -> {
            InvoiceCounter n = new InvoiceCounter();
            n.setInvoiceYear(today.getYear());
            n.setLastNumber(0);
            return n;
        });
        counter.setLastNumber(counter.getLastNumber() + 1);
        counters.save(counter);

        inv.setNumber(String.format("FA-%d-%04d", today.getYear(), counter.getLastNumber()));
        inv.setIssueDate(today);
        if (inv.getDueDate() != null && inv.getDueDate().isBefore(today)) inv.setDueDate(today);
        inv.setStatus(Invoice.Status.SENT);
        return invoices.save(inv);
    }

    /** Enregistre un acompte ou le solde. La facture passe « payée » quand le total TTC est atteint. */
    @Transactional
    public Invoice addPayment(Long id, Payment p) {
        Invoice inv = find(id);
        if (inv.getStatus() == Invoice.Status.DRAFT) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Émettez d'abord la facture.");
        }
        BigDecimal remaining = inv.getTotalTtc().subtract(paidAmount(id));
        if (p.amount().compareTo(remaining) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le montant dépasse le reste à payer (" + remaining.toPlainString() + " DA).");
        }
        InvoicePayment row = new InvoicePayment();
        row.setInvoiceId(id);
        row.setAmount(p.amount());
        row.setPaidOn(p.paidOn());
        row.setMethod(blank(p.method()));
        row.setNote(blank(p.note()));
        payments.save(row);
        return refreshStatus(inv);
    }

    @Transactional
    public Invoice deletePayment(Long id, Long paymentId) {
        Invoice inv = find(id);
        InvoicePayment row = payments.findById(paymentId)
                .filter(x -> x.getInvoiceId().equals(id))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Paiement introuvable."));
        payments.delete(row);
        payments.flush();
        return refreshStatus(inv);
    }

    public BigDecimal paidAmount(Long invoiceId) {
        return payments.findByInvoiceIdOrderByPaidOnAscIdAsc(invoiceId).stream()
                .map(InvoicePayment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /** Seul un brouillon peut être supprimé ; son matériel redevient facturable. */
    @Transactional
    public void deleteDraft(Long id) {
        Invoice inv = find(id);
        if (inv.getStatus() != Invoice.Status.DRAFT) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Une facture émise ne peut pas être supprimée.");
        }
        List<Material> linked = materials.findByInvoiceId(id);
        linked.forEach(m -> m.setInvoiceId(null));
        materials.saveAll(linked);
        lines.deleteByInvoiceId(id);
        invoices.delete(inv);
    }

    private Invoice refreshStatus(Invoice inv) {
        List<InvoicePayment> all = payments.findByInvoiceIdOrderByPaidOnAscIdAsc(inv.getId());
        BigDecimal paid = all.stream().map(InvoicePayment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (paid.compareTo(inv.getTotalTtc()) >= 0 && !all.isEmpty()) {
            inv.setStatus(Invoice.Status.PAID);
            inv.setPaidOn(all.get(all.size() - 1).getPaidOn());
        } else {
            inv.setStatus(Invoice.Status.SENT);
            inv.setPaidOn(null);
        }
        return invoices.save(inv);
    }

    private void applyHeader(Invoice inv, Draft d) {
        if (d.clientId() == null || !clients.existsById(d.clientId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Client inconnu.");
        }
        if (d.projectId() != null) {
            Project p = projects.findById(d.projectId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chantier inconnu."));
            if (!p.getClientId().equals(d.clientId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ce chantier appartient à un autre client.");
            }
        }
        inv.setClientId(d.clientId());
        inv.setProjectId(d.projectId());
        inv.setTitle(blank(d.title()));
        inv.setSubtitle(blank(d.subtitle()));
    }

    private Invoice saveDraft(Invoice inv, List<Line> items, BigDecimal vatRate, LocalDate dueDate, String notes) {
        if (items == null || items.stream().noneMatch(l -> l.kind().priced())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La facture doit contenir au moins une ligne chiffrée.");
        }
        Totals t = totals(items, vatRate);
        inv.setVatRate(rate(vatRate));
        inv.setTotalHt(t.ht());
        inv.setTotalVat(t.vat());
        inv.setTotalTtc(t.ttc());
        inv.setDueDate(dueDate);
        inv.setNotes(blank(notes));
        inv = invoices.save(inv);

        List<InvoiceLine> built = new ArrayList<>();
        int pos = 0;
        for (Line x : items) {
            InvoiceLine l = new InvoiceLine();
            l.setInvoiceId(inv.getId());
            l.setPosition(pos++);
            l.setKind(x.kind());
            l.setDescription(x.description().trim());
            l.setUnit(blank(x.unit()));
            l.setQuantity(x.quantity());
            l.setUnitPrice(x.unitPrice().setScale(2, RoundingMode.HALF_UP));
            built.add(l);
        }
        lines.saveAll(built);
        return inv;
    }

    private Invoice find(Long id) {
        return invoices.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Facture introuvable."));
    }

    static String blank(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
