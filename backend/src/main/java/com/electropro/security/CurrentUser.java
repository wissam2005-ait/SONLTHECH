package com.electropro.security;

import com.electropro.domain.AppUser;
import com.electropro.domain.Repositories.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class CurrentUser {
    private final UserRepository users;

    public CurrentUser(UserRepository users) {
        this.users = users;
    }

    public AppUser of(Authentication auth) {
        return users.findByEmailIgnoreCase(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }
}
