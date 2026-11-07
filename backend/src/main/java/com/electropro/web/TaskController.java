package com.electropro.web;

import com.electropro.domain.AppUser;
import com.electropro.domain.Project;
import com.electropro.domain.Repositories.ProjectRepository;
import com.electropro.domain.Repositories.TaskRepository;
import com.electropro.domain.Repositories.UserRepository;
import com.electropro.domain.Task;
import com.electropro.security.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {
    record TaskInput(
            @NotNull Long projectId,
            @NotBlank @Size(max = 200) String title,
            @Size(max = 5000) String description,
            @NotNull Long assigneeId,
            LocalDate dueDate) {}

    record StatusInput(@NotNull Task.Status status) {}

    private final TaskRepository tasks;
    private final ProjectRepository projects;
    private final UserRepository users;
    private final CurrentUser current;

    TaskController(TaskRepository tasks, ProjectRepository projects, UserRepository users, CurrentUser current) {
        this.tasks = tasks;
        this.projects = projects;
        this.users = users;
        this.current = current;
    }

    /** Dirigeant : toutes les tâches. */
    @GetMapping
    List<Task> all() {
        return tasks.findAllByOrderByDueDateAscIdAsc();
    }

    /** Tout utilisateur connecté : ses propres tâches. */
    @GetMapping("/mine")
    List<Task> mine(Authentication auth) {
        return tasks.findByAssigneeIdOrderByDueDateAscIdAsc(current.of(auth).getId());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    Task create(@Valid @RequestBody TaskInput in) {
        return tasks.save(apply(new Task(), in));
    }

    @PutMapping("/{id}")
    Task update(@PathVariable Long id, @Valid @RequestBody TaskInput in) {
        return tasks.save(apply(find(id), in));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable Long id) {
        tasks.delete(find(id));
    }

    /** Le dirigeant ou la personne à qui la tâche est attribuée peut en changer l'avancement. */
    @PatchMapping("/{id}/status")
    Task setStatus(@PathVariable Long id, @Valid @RequestBody StatusInput in, Authentication auth) {
        Task t = find(id);
        AppUser me = current.of(auth);
        if (me.getRole() != AppUser.Role.ADMIN && !me.getId().equals(t.getAssigneeId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cette tâche ne vous est pas attribuée.");
        }
        t.setStatus(in.status());
        return tasks.save(t);
    }

    private Task find(Long id) {
        return tasks.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tâche introuvable."));
    }

    private Task apply(Task t, TaskInput in) {
        Project p = projects.findById(in.projectId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chantier inconnu."));
        AppUser a = users.findById(in.assigneeId())
                .filter(AppUser::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Compte inconnu ou désactivé."));
        if (!p.getMemberIds().contains(a.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Affectez d'abord cette personne au chantier.");
        }
        t.setProjectId(p.getId());
        t.setTitle(in.title().trim());
        t.setDescription(in.description() == null || in.description().isBlank() ? null : in.description().trim());
        t.setAssigneeId(a.getId());
        t.setDueDate(in.dueDate());
        return t;
    }
}
