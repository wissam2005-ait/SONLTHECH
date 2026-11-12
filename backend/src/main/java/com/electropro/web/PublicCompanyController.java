package com.electropro.web;

import com.electropro.domain.CompanySettings;
import com.electropro.domain.Repositories.CompanySettingsRepository;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

/**
 * Coordonnées affichées sur le site vitrine (en-tête, pied de page, page Contact).
 * Elles viennent de « Réglages → Paramètres » : le dirigeant les modifie sans toucher au code.
 * Seules les informations publiques sont exposées (pas le RIB, le NIF, etc.).
 */
@RestController
@RequestMapping("/api/public/company")
public class PublicCompanyController {
    record PublicCompany(String name, String address, String city, String phone, String email, String logo) {}

    private final CompanySettingsRepository settings;

    PublicCompanyController(CompanySettingsRepository settings) {
        this.settings = settings;
    }

    @GetMapping
    ResponseEntity<PublicCompany> get() {
        CompanySettings s = settings.findById(1).orElse(null);
        PublicCompany body = s == null
                ? new PublicCompany("Sonaltech Électrique", null, "Béjaïa", "0770 33 79 63", null, null)
                : new PublicCompany(s.getName(), s.getAddress(), s.getCity(), s.getPhone(), s.getEmail(), s.getLogo());
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofMinutes(5)).cachePublic())
                .body(body);
    }
}
