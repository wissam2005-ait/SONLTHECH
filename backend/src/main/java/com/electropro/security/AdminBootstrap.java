package com.electropro.security;

import com.electropro.domain.AppUser;
import com.electropro.domain.Repositories.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Crée le premier compte dirigeant au tout premier démarrage (base vide). */
@Component
public class AdminBootstrap implements ApplicationRunner {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final String email;
    private final String password;

    public AdminBootstrap(UserRepository users, PasswordEncoder encoder,
                          @Value("${app.admin-email:}") String email, @Value("${app.admin-password:}") String password) {
        this.users = users;
        this.encoder = encoder;
        this.email = email;
        this.password = password;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (users.count() > 0) return;
        if (email.isBlank() || password.length() < 10) {
            throw new IllegalStateException("Base vide : définissez ADMIN_EMAIL et ADMIN_PASSWORD (10 caractères minimum).");
        }
        AppUser admin = new AppUser();
        admin.setEmail(email.trim().toLowerCase());
        admin.setPasswordHash(encoder.encode(password));
        admin.setFullName("Dirigeant");
        admin.setRole(AppUser.Role.ADMIN);
        users.save(admin);
    }
}
