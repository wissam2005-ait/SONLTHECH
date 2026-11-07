package com.electropro.security;

import com.electropro.domain.Repositories.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, JwtService jwt, UserRepository users) throws Exception {
        http
            .csrf(csrf -> csrf.disable()) // API sans session ni cookie : le jeton est envoyé dans l'en-tête Authorization
            .cors(Customizer.withDefaults())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/public/**", "/api/auth/login").permitAll()
                // Les autorisations sont vérifiées ici, côté serveur, pour chaque requête.
                // Employés et stagiaires : leurs tâches et les chantiers auxquels ils sont affectés (filtrés côté contrôleur).
                .requestMatchers(HttpMethod.GET, "/api/tasks/mine").authenticated()
                .requestMatchers(HttpMethod.PATCH, "/api/tasks/*/status").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/projects", "/api/projects/*", "/api/projects/*/updates").authenticated()
                // Avancement : la personne affectée peut le déclarer depuis le chantier (vérifié dans le contrôleur).
                .requestMatchers(HttpMethod.PATCH, "/api/projects/*/progress").authenticated()
                // Catalogue des pièces : lecture pour tous (sans les prix), modification = dirigeant.
                .requestMatchers(HttpMethod.GET, "/api/catalog").authenticated()
                // Paramètres de l'entreprise : lus par tous (documents), modifiés par le dirigeant.
                .requestMatchers(HttpMethod.GET, "/api/settings").authenticated()
                .requestMatchers("/api/settings").hasRole("ADMIN")
                // Réalisations : tout utilisateur connecté ajoute les siennes ; afficher/masquer = dirigeant (le reste est vérifié dans le contrôleur).
                .requestMatchers("/api/realisations/*/published").hasRole("ADMIN")
                .requestMatchers("/api/realisations", "/api/realisations/**").authenticated()
                // Matériel : les personnes affectées au chantier saisissent le besoin ; l'achat et les prix = dirigeant.
                .requestMatchers("/api/materials/*/purchase").hasRole("ADMIN")
                .requestMatchers("/api/materials", "/api/materials/**").authenticated()
                // Tout le reste de la gestion est réservé au dirigeant.
                .requestMatchers("/api/tasks/**", "/api/projects/**", "/api/users/**", "/api/clients/**",
                        "/api/contact-requests/**", "/api/dashboard/**", "/api/salaries/**", "/api/invoices/**",
                        "/api/absences/**", "/api/catalog/**", "/api/quotes/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            .exceptionHandling(e -> e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
            .addFilterBefore(new JwtAuthFilter(jwt, users), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(@Value("${app.cors-origin}") String origin) {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOrigins(List.of(origin));
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", cfg);
        return source;
    }
}
