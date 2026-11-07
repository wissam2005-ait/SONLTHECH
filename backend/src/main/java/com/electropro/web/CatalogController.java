package com.electropro.web;

import com.electropro.domain.AppUser;
import com.electropro.domain.CatalogItem;
import com.electropro.domain.Repositories.CatalogItemRepository;
import com.electropro.security.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

/**
 * Catalogue des pièces et de leur prix d'achat habituel (remplace l'onglet « tarifs » du tableur).
 * Lecture par toute l'équipe (sans les prix), modification par le dirigeant.
 */
@RestController
@RequestMapping("/api/catalog")
public class CatalogController {
    record ItemInput(
            @NotBlank @Size(max = 200) String name,
            @Size(max = 60) String reference,
            @NotBlank @Size(max = 20) String unit,
            @PositiveOrZero @Digits(integer = 10, fraction = 2) BigDecimal unitPrice,
            @Size(max = 150) String supplier) {}

    record ItemView(Long id, String name, String reference, String unit, BigDecimal unitPrice, String supplier) {
        static ItemView of(CatalogItem i, boolean admin) {
            return new ItemView(i.getId(), i.getName(), i.getReference(), i.getUnit(),
                    admin ? i.getUnitPrice() : null, admin ? i.getSupplier() : null);
        }
    }

    private final CatalogItemRepository items;
    private final CurrentUser current;

    CatalogController(CatalogItemRepository items, CurrentUser current) {
        this.items = items;
        this.current = current;
    }

    @GetMapping
    List<ItemView> list(Authentication auth) {
        boolean admin = current.of(auth).getRole() == AppUser.Role.ADMIN;
        return items.findByArchivedFalseOrderByNameAsc().stream().map(i -> ItemView.of(i, admin)).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ItemView create(@Valid @RequestBody ItemInput in) {
        return ItemView.of(items.save(apply(new CatalogItem(), in)), true);
    }

    @PutMapping("/{id}")
    ItemView update(@PathVariable Long id, @Valid @RequestBody ItemInput in) {
        return ItemView.of(items.save(apply(find(id), in)), true);
    }

    /** Les pièces ne sont jamais supprimées physiquement : elles sont retirées du catalogue. */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void archive(@PathVariable Long id) {
        CatalogItem i = find(id);
        i.setArchived(true);
        items.save(i);
    }

    private CatalogItem find(Long id) {
        return items.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pièce introuvable."));
    }

    private static CatalogItem apply(CatalogItem i, ItemInput in) {
        i.setName(in.name().trim());
        i.setReference(in.reference() == null || in.reference().isBlank() ? null : in.reference().trim());
        i.setUnit(in.unit().trim());
        i.setUnitPrice(in.unitPrice());
        i.setSupplier(in.supplier() == null || in.supplier().isBlank() ? null : in.supplier().trim());
        return i;
    }
}
