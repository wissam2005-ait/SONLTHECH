package com.electropro.web;

import com.electropro.domain.Client;
import com.electropro.domain.Repositories.ClientRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/** Fiches clients (dirigeant uniquement). Un client n'est jamais supprimé : il est archivé. */
@RestController
@RequestMapping("/api/clients")
public class ClientController {
    record ClientInput(
            @NotBlank @Size(max = 200) String name,
            @Email @Size(max = 255) String email,
            @Size(max = 30) String phone,
            @Size(max = 300) String address,
            @Size(max = 10) String postalCode,
            @Size(max = 100) String city,
            @Size(max = 20) String siret,
            @Size(max = 30) String vatNumber,
            @Size(max = 2000) String notes) {}

    private final ClientRepository clients;

    ClientController(ClientRepository clients) {
        this.clients = clients;
    }

    @GetMapping
    List<Client> list(@RequestParam(required = false) String q) {
        return q == null || q.isBlank() ? clients.findByArchivedFalseOrderByNameAsc() : clients.search(q.trim());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    Client create(@Valid @RequestBody ClientInput in) {
        return clients.save(apply(new Client(), in));
    }

    @PutMapping("/{id}")
    Client update(@PathVariable Long id, @Valid @RequestBody ClientInput in) {
        return clients.save(apply(find(id), in));
    }

    @PostMapping("/{id}/archive")
    Client archive(@PathVariable Long id) {
        Client c = find(id);
        c.setArchived(true);
        return clients.save(c);
    }

    private Client find(Long id) {
        return clients.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Client introuvable."));
    }

    static Client apply(Client c, ClientInput in) {
        c.setName(in.name().trim());
        c.setEmail(blank(in.email()));
        c.setPhone(blank(in.phone()));
        c.setAddress(blank(in.address()));
        c.setPostalCode(blank(in.postalCode()));
        c.setCity(blank(in.city()));
        c.setSiret(blank(in.siret()));
        c.setVatNumber(blank(in.vatNumber()));
        c.setNotes(blank(in.notes()));
        return c;
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
