package com.electropro.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Stockage des photos de réalisations dans la base de données (table photo_file).
 * Ainsi les photos sont sauvegardées avec la base et survivent aux redémarrages d'un hébergement cloud.
 * Les photos des versions précédentes, enregistrées sur disque (app.upload-dir), restent lisibles.
 */
@Component
public class PhotoStorage {
    private static final Pattern SAFE_NAME = Pattern.compile("^[0-9a-f\\-]{36}\\.(jpg|png|webp)$");
    private static final int MAX_BYTES = 3 * 1024 * 1024;

    private final JdbcTemplate jdbc;
    private final Path legacyDir;

    public PhotoStorage(JdbcTemplate jdbc, @Value("${app.upload-dir:./uploads}") String uploadDir) {
        this.jdbc = jdbc;
        this.legacyDir = Path.of(uploadDir).toAbsolutePath().normalize();
    }

    /** Enregistre l'image après avoir vérifié son contenu réel (pas seulement ce que le client déclare). */
    public String save(byte[] data) {
        if (data.length == 0 || data.length > MAX_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chaque photo doit faire 3 Mo au maximum.");
        }
        String ext = detectExtension(data);
        if (ext == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Format de photo non accepté (JPEG, PNG ou WebP).");
        }
        String name = UUID.randomUUID() + "." + ext;
        jdbc.update("insert into photo_file (file_name, content) values (?, ?)", name, data);
        return name;
    }

    public byte[] read(String name) {
        if (!SAFE_NAME.matcher(name).matches()) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        List<byte[]> rows = jdbc.query("select content from photo_file where file_name = ?",
                (rs, i) -> rs.getBytes(1), name);
        if (!rows.isEmpty()) return rows.get(0);
        // Ancienne photo enregistrée sur disque
        try {
            return Files.readAllBytes(legacyDir.resolve(name));
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
    }

    public void delete(String name) {
        if (!SAFE_NAME.matcher(name).matches()) return;
        jdbc.update("delete from photo_file where file_name = ?", name);
        try {
            Files.deleteIfExists(legacyDir.resolve(name));
        } catch (IOException ignored) {
            // un fichier orphelin n'est pas bloquant
        }
    }

    public static String contentType(String name) {
        return name.endsWith(".png") ? "image/png" : name.endsWith(".webp") ? "image/webp" : "image/jpeg";
    }

    private static String detectExtension(byte[] b) {
        if (b.length > 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) return "jpg";
        if (b.length > 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') return "png";
        if (b.length > 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') return "webp";
        return null;
    }
}
