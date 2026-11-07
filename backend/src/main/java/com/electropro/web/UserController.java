package com.electropro.web;

import com.electropro.domain.AppUser;
import com.electropro.domain.Repositories.SalarySettingRepository;
import com.electropro.domain.Repositories.UserRepository;
import com.electropro.domain.SalarySetting;
import com.electropro.security.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Gestion des employés (dirigeant uniquement). Le hash du mot de passe n'est jamais renvoyé. */
@RestController
@RequestMapping("/api/users")
public class UserController {
    record UserView(Long id, String email, String fullName, AppUser.Role role, String phone, String jobTitle,
                    boolean active, LocalDate hireDate, AppUser.ContractType contractType, String address, String notes,
                    BigDecimal monthlySalary) {
        static UserView of(AppUser u, BigDecimal salary) {
            return new UserView(u.getId(), u.getEmail(), u.getFullName(), u.getRole(), u.getPhone(), u.getJobTitle(),
                    u.isActive(), u.getHireDate(), u.getContractType(), u.getAddress(), u.getNotes(), salary);
        }
    }

    record CreateInput(
            @NotBlank @Email @Size(max = 255) String email,
            @NotBlank @Size(max = 150) String fullName,
            @NotNull AppUser.Role role,
            @Size(max = 30) String phone,
            @Size(max = 100) String jobTitle,
            LocalDate hireDate,
            AppUser.ContractType contractType,
            @Size(max = 300) String address,
            @Size(max = 2000) String notes,
            @PositiveOrZero @Digits(integer = 8, fraction = 2) BigDecimal monthlySalary,
            @NotBlank @Size(min = 10, max = 72, message = "10 à 72 caractères") String password) {}

    record UpdateInput(
            @NotBlank @Size(max = 150) String fullName,
            @NotNull AppUser.Role role,
            @Size(max = 30) String phone,
            @Size(max = 100) String jobTitle,
            LocalDate hireDate,
            AppUser.ContractType contractType,
            @Size(max = 300) String address,
            @Size(max = 2000) String notes,
            @PositiveOrZero @Digits(integer = 8, fraction = 2) BigDecimal monthlySalary) {}

    record ActiveInput(boolean active) {}

    record PasswordInput(@NotBlank @Size(min = 10, max = 72, message = "10 à 72 caractères") String password) {}

    private final UserRepository users;
    private final SalarySettingRepository salaries;
    private final PasswordEncoder encoder;
    private final CurrentUser current;

    UserController(UserRepository users, SalarySettingRepository salaries, PasswordEncoder encoder, CurrentUser current) {
        this.users = users;
        this.salaries = salaries;
        this.encoder = encoder;
        this.current = current;
    }

    @GetMapping
    List<UserView> list() {
        Map<Long, BigDecimal> amounts = new HashMap<>();
        salaries.findAll().forEach(s -> amounts.put(s.getUserId(), s.getMonthlyAmount()));
        return users.findAllByOrderByFullNameAsc().stream().map(u -> UserView.of(u, amounts.get(u.getId()))).toList();
    }

    @GetMapping("/{id}")
    UserView get(@PathVariable Long id) {
        return view(find(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public UserView create(@Valid @RequestBody CreateInput in) {
        String email = in.email().trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Un compte existe déjà avec cet e-mail.");
        }
        AppUser u = new AppUser();
        u.setEmail(email);
        u.setPasswordHash(encoder.encode(in.password()));
        apply(u, in.fullName(), in.role(), in.phone(), in.jobTitle(), in.hireDate(), in.contractType(), in.address(), in.notes());
        u = users.save(u);
        saveSalary(u.getId(), in.monthlySalary());
        return view(u);
    }

    @PutMapping("/{id}")
    @Transactional
    public UserView update(@PathVariable Long id, @Valid @RequestBody UpdateInput in) {
        AppUser u = find(id);
        if (u.getRole() == AppUser.Role.ADMIN && in.role() != AppUser.Role.ADMIN) {
            ensureAnotherAdmin(u);
        }
        apply(u, in.fullName(), in.role(), in.phone(), in.jobTitle(), in.hireDate(), in.contractType(), in.address(), in.notes());
        users.save(u);
        saveSalary(u.getId(), in.monthlySalary());
        return view(u);
    }

    @PostMapping("/{id}/active")
    UserView setActive(@PathVariable Long id, @RequestBody ActiveInput in, Authentication auth) {
        AppUser u = find(id);
        if (!in.active()) {
            if (u.getId().equals(current.of(auth).getId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Vous ne pouvez pas désactiver votre propre compte.");
            }
            ensureAnotherAdmin(u);
        }
        u.setActive(in.active());
        return view(users.save(u));
    }

    @PostMapping("/{id}/password")
    UserView resetPassword(@PathVariable Long id, @Valid @RequestBody PasswordInput in) {
        AppUser u = find(id);
        u.setPasswordHash(encoder.encode(in.password()));
        return view(users.save(u));
    }

    private UserView view(AppUser u) {
        return UserView.of(u, salaries.findById(u.getId()).map(SalarySetting::getMonthlyAmount).orElse(null));
    }

    /** null = on ne touche pas au salaire enregistré. */
    private void saveSalary(Long userId, BigDecimal amount) {
        if (amount == null) return;
        SalarySetting s = salaries.findById(userId).orElseGet(() -> {
            SalarySetting n = new SalarySetting();
            n.setUserId(userId);
            return n;
        });
        s.setMonthlyAmount(amount);
        salaries.save(s);
    }

    private AppUser find(Long id) {
        return users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Compte introuvable."));
    }

    private void ensureAnotherAdmin(AppUser target) {
        if (target.getRole() == AppUser.Role.ADMIN && target.isActive()
                && users.countByRoleAndActiveTrue(AppUser.Role.ADMIN) <= 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Il doit rester au moins un dirigeant actif.");
        }
    }

    private static void apply(AppUser u, String fullName, AppUser.Role role, String phone, String jobTitle,
                              LocalDate hireDate, AppUser.ContractType contract, String address, String notes) {
        u.setFullName(fullName.trim());
        u.setRole(role);
        u.setPhone(blank(phone));
        u.setJobTitle(blank(jobTitle));
        u.setHireDate(hireDate);
        u.setContractType(contract);
        u.setAddress(blank(address));
        u.setNotes(blank(notes));
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
