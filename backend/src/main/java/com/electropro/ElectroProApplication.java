package com.electropro;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

@SpringBootApplication
@EnableJpaRepositories(considerNestedRepositories = true)
public class ElectroProApplication {
    public static void main(String[] args) {
        acceptProviderDatabaseUrl(System.getenv("DB_URL"));
        SpringApplication.run(ElectroProApplication.class, args);
    }

    /**
     * Accepte aussi l'adresse telle que la donnent Neon, Render, Supabase… :
     * postgresql://UTILISATEUR:MOT_DE_PASSE@HÔTE/BASE?sslmode=require
     * Elle est convertie au format JDBC ; l'utilisateur et le mot de passe qu'elle contient
     * remplacent DB_USER / DB_PASSWORD s'ils sont présents.
     */
    static void acceptProviderDatabaseUrl(String url) {
        if (url == null) return;
        url = url.trim();
        if (!url.startsWith("postgres://") && !url.startsWith("postgresql://")) return;
        URI uri = URI.create(url);
        String query = uri.getRawQuery() == null || uri.getRawQuery().contains("sslmode=")
                ? "?sslmode=" + (uri.getRawQuery() != null && uri.getRawQuery().contains("sslmode=disable") ? "disable" : "require")
                : "?sslmode=require";
        String port = uri.getPort() > 0 ? ":" + uri.getPort() : "";
        System.setProperty("spring.datasource.url", "jdbc:postgresql://" + uri.getHost() + port + uri.getRawPath() + query);
        String userInfo = uri.getRawUserInfo();
        if (userInfo != null && !userInfo.isEmpty()) {
            int i = userInfo.indexOf(':');
            System.setProperty("spring.datasource.username", decode(i < 0 ? userInfo : userInfo.substring(0, i)));
            if (i >= 0) System.setProperty("spring.datasource.password", decode(userInfo.substring(i + 1)));
        }
    }

    private static String decode(String s) {
        return URLDecoder.decode(s, StandardCharsets.UTF_8);
    }
}
