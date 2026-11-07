package com.electropro.security;

import com.electropro.domain.AppUser;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;

@Component
public class JwtService {
    private final SecretKey key;
    private final Duration validity;

    public JwtService(@Value("${app.jwt-secret}") String secret, @Value("${app.jwt-hours}") long hours) {
        if (secret == null || secret.length() < 32) {
            throw new IllegalStateException("JWT_SECRET est obligatoire et doit faire 32 caractères minimum.");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.validity = Duration.ofHours(hours);
    }

    public String generate(AppUser user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(user.getEmail())
                .claim("role", user.getRole().name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(validity)))
                .signWith(key)
                .compact();
    }

    /** E-mail contenu dans le jeton, ou vide si le jeton est invalide ou expiré. */
    public Optional<String> subject(String token) {
        try {
            return Optional.ofNullable(Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload().getSubject());
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
