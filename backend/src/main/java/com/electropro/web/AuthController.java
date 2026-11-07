package com.electropro.web;

import com.electropro.domain.AppUser;
import com.electropro.domain.Repositories.UserRepository;
import com.electropro.security.JwtService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import com.electropro.security.CurrentUser;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    record LoginInput(@NotBlank String email, @NotBlank String password) {}

    record LoginResult(String token, AppUser.Role role, String fullName) {}

    record PasswordChange(@NotBlank String currentPassword,
                          @NotBlank @Size(min = 10, max = 72, message = "10 à 72 caractères") String newPassword) {}

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final String dummyHash;
    private final CurrentUser current;

    AuthController(UserRepository users, PasswordEncoder encoder, JwtService jwt, CurrentUser current) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
        this.current = current;
        this.dummyHash = encoder.encode("not-a-real-password");
    }

    @PostMapping("/login")
    LoginResult login(@Valid @RequestBody LoginInput in) {
        AppUser u = users.findByEmailIgnoreCase(in.email().trim()).orElse(null);
        // Même travail de hachage que le compte existe ou non, et même message : on ne révèle pas quels e-mails existent.
        boolean ok = encoder.matches(in.password(), u != null ? u.getPasswordHash() : dummyHash);
        if (u == null || !ok || !u.isActive()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "E-mail ou mot de passe incorrect.");
        }
        return new LoginResult(jwt.generate(u), u.getRole(), u.getFullName());
    }

    /** Toute personne connectée change son propre mot de passe (l'ancien est exigé). */
    @PostMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void changePassword(@Valid @RequestBody PasswordChange in, Authentication auth) {
        AppUser me = current.of(auth);
        if (!encoder.matches(in.currentPassword(), me.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mot de passe actuel incorrect.");
        }
        if (in.currentPassword().equals(in.newPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le nouveau mot de passe doit être différent de l'actuel.");
        }
        me.setPasswordHash(encoder.encode(in.newPassword()));
        users.save(me);
    }
}
