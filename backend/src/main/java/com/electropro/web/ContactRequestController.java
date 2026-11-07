package com.electropro.web;

import com.electropro.domain.Client;
import com.electropro.domain.ContactRequest;
import com.electropro.domain.Repositories.ClientRepository;
import com.electropro.domain.Repositories.ContactRequestRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/** Demandes reçues depuis le site (dirigeant uniquement). */
@RestController
@RequestMapping("/api/contact-requests")
public class ContactRequestController {
    record StatusInput(@NotNull ContactRequest.Status status) {}

    private final ContactRequestRepository requests;
    private final ClientRepository clients;

    ContactRequestController(ContactRequestRepository requests, ClientRepository clients) {
        this.requests = requests;
        this.clients = clients;
    }

    @GetMapping
    List<ContactRequest> list(@RequestParam(required = false) ContactRequest.Status status) {
        return status == null ? requests.findAllByOrderByCreatedAtDesc() : requests.findByStatusOrderByCreatedAtDesc(status);
    }

    @PatchMapping("/{id}/status")
    ContactRequest setStatus(@PathVariable Long id, @Valid @RequestBody StatusInput in) {
        ContactRequest r = find(id);
        r.setStatus(in.status());
        return requests.save(r);
    }

    /** Crée la fiche client à partir de la demande et la rattache. */
    @PostMapping("/{id}/client")
    @Transactional
    public ContactRequest createClient(@PathVariable Long id) {
        ContactRequest r = find(id);
        if (r.getClientId() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Un client est déjà rattaché à cette demande.");
        }
        Client c = new Client();
        c.setName(r.getFullName());
        c.setEmail(r.getEmail());
        c.setPhone(r.getPhone());
        c.setAddress(r.getSiteAddress());
        c = clients.save(c);
        r.setClientId(c.getId());
        return requests.save(r);
    }

    private ContactRequest find(Long id) {
        return requests.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Demande introuvable."));
    }
}
