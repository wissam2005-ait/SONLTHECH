package com.electropro.web;

import com.electropro.domain.ContactRequest;
import com.electropro.domain.Repositories.ContactRequestRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/** Formulaires Contact et Devis du site public (sans connexion). */
@RestController
@RequestMapping("/api/public/contact-requests")
public class PublicContactController {
    record Input(
            @NotNull ContactRequest.Kind kind,
            @NotBlank @Size(max = 150) String fullName,
            @Size(max = 30) String phone,
            @Email @Size(max = 255) String email,
            @Size(max = 100) String workType,
            @Size(max = 300) String siteAddress,
            @NotBlank @Size(max = 5000) String message,
            @Size(max = 200) String website) {} // champ piège : invisible pour une personne, rempli par les robots

    private final ContactRequestRepository requests;

    PublicContactController(ContactRequestRepository requests) {
        this.requests = requests;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    void submit(@Valid @RequestBody Input in) {
        if (in.website() != null && !in.website().isBlank()) return; // robot : on fait semblant que c'est passé
        boolean noPhone = in.phone() == null || in.phone().isBlank();
        boolean noEmail = in.email() == null || in.email().isBlank();
        if (noPhone && noEmail) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indiquez un téléphone ou un e-mail pour que nous puissions vous répondre.");
        }
        ContactRequest r = new ContactRequest();
        r.setKind(in.kind());
        r.setFullName(in.fullName().trim());
        r.setPhone(noPhone ? null : in.phone().trim());
        r.setEmail(noEmail ? null : in.email().trim());
        r.setWorkType(in.workType() == null || in.workType().isBlank() ? null : in.workType().trim());
        r.setSiteAddress(in.siteAddress() == null || in.siteAddress().isBlank() ? null : in.siteAddress().trim());
        r.setMessage(in.message().trim());
        requests.save(r);
    }
}
