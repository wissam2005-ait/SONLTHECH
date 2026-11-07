package com.electropro.web;

import com.electropro.domain.AppUser;
import com.electropro.domain.Material;
import com.electropro.domain.Project;
import com.electropro.domain.Repositories.MaterialRepository;
import com.electropro.domain.Repositories.ProjectRepository;
import com.electropro.security.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Matériel utilisé par chantier : désignation, nombre de pièces, prix unitaire HT (remplace le tableur).
 * Les personnes affectées au chantier saisissent le matériel ; seul le dirigeant voit et renseigne les prix.
 * Un prix renseigné = matériel acheté (facturable).
 */
@RestController
@RequestMapping("/api/materials")
public class MaterialController {
    record MaterialInput(
            @NotNull Long projectId,
            @NotBlank @Size(max = 200) String name,
            @NotBlank @Size(max = 20) String unit,
            @NotNull @Positive @Digits(integer = 8, fraction = 2) BigDecimal quantity,
            @PositiveOrZero @Digits(integer = 8, fraction = 2) BigDecimal unitCost,
            LocalDate purchasedOn,
            @Size(max = 150) String supplier) {}

    /** Modification complète. Les champs de prix ne sont pris en compte que pour le dirigeant. */
    record UpdateInput(
            @NotBlank @Size(max = 200) String name,
            @NotBlank @Size(max = 20) String unit,
            @NotNull @Positive @Digits(integer = 8, fraction = 2) BigDecimal quantity,
            @PositiveOrZero @Digits(integer = 8, fraction = 2) BigDecimal unitCost,
            LocalDate purchasedOn,
            @Size(max = 150) String supplier) {}

    record PurchaseInput(
            @NotNull @PositiveOrZero @Digits(integer = 8, fraction = 2) BigDecimal unitCost,
            @NotNull LocalDate purchasedOn,
            @Size(max = 150) String supplier) {}

    /** unitCost et supplier sont masqués (null) pour les non-dirigeants. */
    record MaterialView(Long id, Long projectId, String name, String unit, BigDecimal quantity, String supplier,
                        BigDecimal unitCost, LocalDate purchasedOn, Long invoiceId) {
        static MaterialView of(Material m, boolean admin) {
            return new MaterialView(m.getId(), m.getProjectId(), m.getName(), m.getUnit(), m.getQuantity(),
                    admin ? m.getSupplier() : null, admin ? m.getUnitCost() : null, m.getPurchasedOn(), m.getInvoiceId());
        }
    }

    private final MaterialRepository materials;
    private final ProjectRepository projects;
    private final CurrentUser current;

    MaterialController(MaterialRepository materials, ProjectRepository projects, CurrentUser current) {
        this.materials = materials;
        this.projects = projects;
        this.current = current;
    }

    /** Sans projectId : tout le matériel de tous les chantiers (dirigeant uniquement). */
    @GetMapping
    List<MaterialView> list(@RequestParam(required = false) Long projectId, Authentication auth) {
        AppUser me = current.of(auth);
        boolean admin = isAdmin(me);
        if (projectId == null) {
            if (!admin) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choisissez un chantier.");
            return materials.findAllByOrderByProjectIdAscIdAsc().stream().map(m -> MaterialView.of(m, true)).toList();
        }
        checkAccess(projectId, me);
        return materials.findByProjectIdOrderByIdAsc(projectId).stream().map(m -> MaterialView.of(m, admin)).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    MaterialView add(@Valid @RequestBody MaterialInput in, Authentication auth) {
        AppUser me = current.of(auth);
        checkAccess(in.projectId(), me);
        Material m = new Material();
        m.setProjectId(in.projectId());
        m.setName(in.name().trim());
        m.setUnit(in.unit().trim());
        m.setQuantity(in.quantity());
        m.setAddedBy(me.getId());
        if (isAdmin(me)) applyPrice(m, in.unitCost(), in.purchasedOn(), in.supplier());
        return MaterialView.of(materials.save(m), isAdmin(me));
    }

    @PutMapping("/{id}")
    MaterialView update(@PathVariable Long id, @Valid @RequestBody UpdateInput in, Authentication auth) {
        AppUser me = current.of(auth);
        Material m = find(id);
        checkAccess(m.getProjectId(), me);
        if (m.getInvoiceId() != null) throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce matériel figure sur une facture.");
        boolean admin = isAdmin(me);
        if (m.isPurchased() && !admin) throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce matériel est déjà acheté.");
        m.setName(in.name().trim());
        m.setUnit(in.unit().trim());
        m.setQuantity(in.quantity());
        if (admin) applyPrice(m, in.unitCost(), in.purchasedOn(), in.supplier());
        return MaterialView.of(materials.save(m), admin);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable Long id, Authentication auth) {
        AppUser me = current.of(auth);
        Material m = find(id);
        checkAccess(m.getProjectId(), me);
        if (m.getInvoiceId() != null) throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce matériel figure sur une facture.");
        if (m.isPurchased() && !isAdmin(me)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Ce matériel est déjà acheté.");
        }
        materials.delete(m);
    }

    /** Dirigeant : enregistre l'achat (prix HT à l'unité, date, fournisseur). */
    @PostMapping("/{id}/purchase")
    MaterialView purchase(@PathVariable Long id, @Valid @RequestBody PurchaseInput in) {
        Material m = find(id);
        if (m.getInvoiceId() != null) throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce matériel figure sur une facture.");
        applyPrice(m, in.unitCost(), in.purchasedOn(), in.supplier());
        return MaterialView.of(materials.save(m), true);
    }

    /** Dirigeant : annule un achat saisi par erreur (impossible une fois facturé). */
    @DeleteMapping("/{id}/purchase")
    MaterialView cancelPurchase(@PathVariable Long id) {
        Material m = find(id);
        if (m.getInvoiceId() != null) throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce matériel figure sur une facture.");
        applyPrice(m, null, null, null);
        return MaterialView.of(materials.save(m), true);
    }

    /** Prix renseigné = acheté (date du jour par défaut). Prix vide = à acheter. */
    private static void applyPrice(Material m, BigDecimal unitCost, LocalDate purchasedOn, String supplier) {
        if (unitCost == null) {
            m.setUnitCost(null);
            m.setPurchasedOn(null);
            m.setSupplier(null);
            return;
        }
        m.setUnitCost(unitCost);
        m.setPurchasedOn(purchasedOn != null ? purchasedOn : m.getPurchasedOn() != null ? m.getPurchasedOn() : LocalDate.now());
        m.setSupplier(supplier == null || supplier.isBlank() ? null : supplier.trim());
    }

    private static boolean isAdmin(AppUser u) {
        return u.getRole() == AppUser.Role.ADMIN;
    }

    private Material find(Long id) {
        return materials.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Matériel introuvable."));
    }

    private void checkAccess(Long projectId, AppUser me) {
        Project p = projects.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chantier introuvable."));
        if (!isAdmin(me) && !p.getMemberIds().contains(me.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Chantier introuvable.");
        }
    }
}
