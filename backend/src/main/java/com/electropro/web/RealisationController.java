package com.electropro.web;

import com.electropro.domain.AppUser;
import com.electropro.domain.Realisation;
import com.electropro.domain.RealisationPhoto;
import com.electropro.domain.Project;
import com.electropro.domain.Repositories.ProjectRepository;
import com.electropro.domain.Repositories.RealisationPhotoRepository;
import com.electropro.domain.Repositories.RealisationRepository;
import com.electropro.domain.Repositories.UserRepository;
import com.electropro.security.CurrentUser;
import com.electropro.service.PhotoStorage;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Réalisations ajoutées par l'équipe depuis son espace. Elles sont publiées tout de suite sur le site public
 * (le dirigeant peut les masquer ou les supprimer). Les photos arrivent en base64 dans le JSON : le navigateur
 * les a déjà réduites, ce qui convient aux photos prises sur chantier avec un téléphone.
 */
@RestController
@RequestMapping("/api/realisations")
public class RealisationController {
    record CreateInput(
            @NotBlank @Size(max = 150) String title,
            @Size(max = 3000) String description,
            @Size(max = 100) String city,
            LocalDate completedOn,
            Long projectId,
            @NotNull @Size(min = 1, max = 8, message = "Ajoutez de 1 à 8 photos") List<@NotBlank @Size(max = 4_500_000) String> photos) {}

    record UpdateInput(
            @NotBlank @Size(max = 150) String title,
            @Size(max = 3000) String description,
            @Size(max = 100) String city,
            LocalDate completedOn,
            Long projectId) {}

    record PublishedInput(boolean published) {}

    record View(Long id, String title, String description, String city, LocalDate completedOn, boolean published,
                String authorName, Long authorId, Long projectId, List<String> photos, Instant createdAt) {}

    private final RealisationRepository realisations;
    private final RealisationPhotoRepository photos;
    private final UserRepository users;
    private final CurrentUser current;
    private final PhotoStorage storage;
    private final ProjectRepository projects;

    RealisationController(RealisationRepository realisations, RealisationPhotoRepository photos, UserRepository users,
                          CurrentUser current, PhotoStorage storage, ProjectRepository projects) {
        this.realisations = realisations;
        this.photos = photos;
        this.users = users;
        this.current = current;
        this.storage = storage;
        this.projects = projects;
    }

    /** Dirigeant : toutes les réalisations. Employé ou stagiaire : les siennes. */
    @GetMapping
    List<View> list(Authentication auth) {
        AppUser me = current.of(auth);
        List<Realisation> items = me.getRole() == AppUser.Role.ADMIN
                ? realisations.findAllByOrderByIdDesc()
                : realisations.findByAuthorIdOrderByIdDesc(me.getId());
        return views(items);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public View create(@Valid @RequestBody CreateInput in, Authentication auth) {
        AppUser me = current.of(auth);
        checkProject(in.projectId(), me);
        List<byte[]> decoded = new ArrayList<>();
        for (String p : in.photos()) {
            decoded.add(decode(p));
        }
        List<String> saved = new ArrayList<>();
        try {
            for (byte[] d : decoded) saved.add(storage.save(d));

            Realisation r = new Realisation();
            r.setTitle(in.title().trim());
            r.setDescription(blank(in.description()));
            r.setCity(blank(in.city()));
            r.setCompletedOn(in.completedOn());
            r.setAuthorId(me.getId());
            r.setProjectId(in.projectId());
            r = realisations.save(r);

            List<RealisationPhoto> rows = new ArrayList<>();
            for (int i = 0; i < saved.size(); i++) {
                RealisationPhoto ph = new RealisationPhoto();
                ph.setRealisationId(r.getId());
                ph.setPosition(i);
                ph.setFileName(saved.get(i));
                rows.add(ph);
            }
            photos.saveAll(rows);
            return views(List.of(r)).get(0);
        } catch (RuntimeException e) {
            saved.forEach(storage::delete); // pas de fichiers orphelins si l'enregistrement échoue
            throw e;
        }
    }

    /** L'auteur ou le dirigeant : modifier le titre, la description, la ville, la date ou le chantier lié. */
    @PutMapping("/{id}")
    View update(@PathVariable Long id, @Valid @RequestBody UpdateInput in, Authentication auth) {
        AppUser me = current.of(auth);
        Realisation r = find(id);
        if (me.getRole() != AppUser.Role.ADMIN && !me.getId().equals(r.getAuthorId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cette réalisation n'est pas la vôtre.");
        }
        checkProject(in.projectId(), me);
        r.setTitle(in.title().trim());
        r.setDescription(blank(in.description()));
        r.setCity(blank(in.city()));
        r.setCompletedOn(in.completedOn());
        r.setProjectId(in.projectId());
        return views(List.of(realisations.save(r))).get(0);
    }

    /** Dirigeant : afficher ou masquer sur le site public. */
    @PatchMapping("/{id}/published")
    View setPublished(@PathVariable Long id, @RequestBody PublishedInput in) {
        Realisation r = find(id);
        r.setPublished(in.published());
        return views(List.of(realisations.save(r))).get(0);
    }

    /** L'auteur ou le dirigeant. */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void delete(@PathVariable Long id, Authentication auth) {
        AppUser me = current.of(auth);
        Realisation r = find(id);
        if (me.getRole() != AppUser.Role.ADMIN && !me.getId().equals(r.getAuthorId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cette réalisation n'est pas la vôtre.");
        }
        List<String> files = photos.findByRealisationIdOrderByPositionAsc(id).stream().map(RealisationPhoto::getFileName).toList();
        realisations.delete(r); // les lignes de photos partent en cascade (base)
        realisations.flush();
        files.forEach(storage::delete);
    }

    /** Un employé ne peut lier qu'un chantier auquel il est affecté. */
    private void checkProject(Long projectId, AppUser me) {
        if (projectId == null) return;
        Project p = projects.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chantier inconnu."));
        if (me.getRole() != AppUser.Role.ADMIN && !p.getMemberIds().contains(me.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chantier inconnu.");
        }
    }

    private Realisation find(Long id) {
        return realisations.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Réalisation introuvable."));
    }

    private List<View> views(List<Realisation> items) {
        if (items.isEmpty()) return List.of();
        Map<Long, List<String>> files = photos
                .findByRealisationIdInOrderByPositionAsc(items.stream().map(Realisation::getId).toList()).stream()
                .collect(Collectors.groupingBy(RealisationPhoto::getRealisationId,
                        Collectors.mapping(RealisationPhoto::getFileName, Collectors.toList())));
        Map<Long, String> names = users.findAllById(items.stream().map(Realisation::getAuthorId).collect(Collectors.toSet())).stream()
                .collect(Collectors.toMap(AppUser::getId, AppUser::getFullName));
        return items.stream()
                .map(r -> new View(r.getId(), r.getTitle(), r.getDescription(), r.getCity(), r.getCompletedOn(), r.isPublished(),
                        names.getOrDefault(r.getAuthorId(), ""), r.getAuthorId(), r.getProjectId(),
                        files.getOrDefault(r.getId(), List.of()), r.getCreatedAt()))
                .toList();
    }

    private static byte[] decode(String b64) {
        String raw = b64.contains(",") ? b64.substring(b64.indexOf(',') + 1) : b64; // accepte aussi "data:image/jpeg;base64,..."
        try {
            return Base64.getDecoder().decode(raw);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Photo illisible.");
        }
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
