package com.electropro.web;

import com.electropro.domain.CompanySettings;
import com.electropro.domain.Repositories.CompanySettingsRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.*;

/** Paramètres de l'entreprise : lecture pour toute personne connectée, modification par le dirigeant. */
@RestController
@RequestMapping("/api/settings")
public class SettingsController {
    record SettingsInput(
            @NotBlank @Size(max = 150) String name,
            @Size(max = 60) String legalForm,
            @Size(max = 60) String capital,
            @Size(max = 300) String address,
            @Size(max = 100) String city,
            @Size(max = 60) String phone,
            @Size(max = 255) String email,
            @Size(max = 60) String rc,
            @Size(max = 60) String nif,
            @Size(max = 60) String nis,
            @Size(max = 60) String ai,
            @Size(max = 300) String bank,
            @Size(max = 1000) String footer,
            // Logo : image PNG / JPEG / WebP en data URL, 400 Ko maximum
            @Size(max = 550_000, message = "Logo trop lourd (400 Ko maximum)")
            @Pattern(regexp = "^(data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+)?$", message = "Format de logo non accepté")
            String logo) {}

    private final CompanySettingsRepository settings;

    SettingsController(CompanySettingsRepository settings) {
        this.settings = settings;
    }

    @GetMapping
    CompanySettings get() {
        return settings.findById(1).orElseGet(() -> {
            CompanySettings s = new CompanySettings();
            s.setId(1);
            s.setName("Sonaltech Électrique");
            return settings.save(s);
        });
    }

    @PutMapping
    CompanySettings update(@Valid @RequestBody SettingsInput in) {
        CompanySettings s = get();
        s.setName(in.name().trim());
        s.setLegalForm(blank(in.legalForm()));
        s.setCapital(blank(in.capital()));
        s.setAddress(blank(in.address()));
        s.setCity(blank(in.city()));
        s.setPhone(blank(in.phone()));
        s.setEmail(blank(in.email()));
        s.setRc(blank(in.rc()));
        s.setNif(blank(in.nif()));
        s.setNis(blank(in.nis()));
        s.setAi(blank(in.ai()));
        s.setBank(blank(in.bank()));
        s.setFooter(blank(in.footer()));
        s.setLogo(blank(in.logo()));
        return settings.save(s);
    }

    private static String blank(String v) {
        return v == null || v.isBlank() ? null : v.trim();
    }
}
