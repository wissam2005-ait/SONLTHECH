package com.electropro.web;

import com.electropro.domain.Realisation;
import com.electropro.domain.RealisationPhoto;
import com.electropro.domain.Repositories.RealisationPhotoRepository;
import com.electropro.domain.Repositories.RealisationRepository;
import com.electropro.service.PhotoStorage;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** Page d'accueil et page Réalisations du site client : lecture seule, sans connexion. */
@RestController
@RequestMapping("/api/public/realisations")
public class PublicRealisationController {
    record PublicView(Long id, String title, String description, String city, LocalDate completedOn, List<String> photos) {}

    private final RealisationRepository realisations;
    private final RealisationPhotoRepository photos;
    private final PhotoStorage storage;

    PublicRealisationController(RealisationRepository realisations, RealisationPhotoRepository photos, PhotoStorage storage) {
        this.realisations = realisations;
        this.photos = photos;
        this.storage = storage;
    }

    @GetMapping
    List<PublicView> list() {
        List<Realisation> items = realisations.findByPublishedTrueOrderByCompletedOnDescIdDesc();
        if (items.isEmpty()) return List.of();
        Map<Long, List<String>> files = photos
                .findByRealisationIdInOrderByPositionAsc(items.stream().map(Realisation::getId).toList()).stream()
                .collect(Collectors.groupingBy(RealisationPhoto::getRealisationId,
                        Collectors.mapping(RealisationPhoto::getFileName, Collectors.toList())));
        // Seules les réalisations avec au moins une photo sont affichées.
        return items.stream()
                .filter(r -> !files.getOrDefault(r.getId(), List.of()).isEmpty())
                .map(r -> new PublicView(r.getId(), r.getTitle(), r.getDescription(), r.getCity(), r.getCompletedOn(), files.get(r.getId())))
                .toList();
    }

    /** Le nom du fichier est un UUID aléatoire ; le contenu ne change jamais, donc cache long. */
    @GetMapping("/photos/{fileName}")
    ResponseEntity<byte[]> photo(@PathVariable String fileName) {
        byte[] data = storage.read(fileName);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(PhotoStorage.contentType(fileName)))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePublic())
                .header("X-Content-Type-Options", "nosniff")
                .body(data);
    }
}
