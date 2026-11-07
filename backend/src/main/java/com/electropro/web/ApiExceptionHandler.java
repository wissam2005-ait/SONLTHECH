package com.electropro.web;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

/** Toutes les erreurs reviennent sous la forme {"message": "..."} : c'est ce que lit le frontend. */
@RestControllerAdvice
public class ApiExceptionHandler {
    record Body(String message) {}

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<Body> status(ResponseStatusException e) {
        String msg = e.getReason() != null ? e.getReason()
                : e.getStatusCode().value() == 401 ? "Connexion requise."
                : e.getStatusCode().value() == 404 ? "Introuvable." : "Requête refusée.";
        return ResponseEntity.status(e.getStatusCode()).body(new Body(msg));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Body> invalid(MethodArgumentNotValidException e) {
        String msg = e.getBindingResult().getFieldErrors().stream().findFirst()
                .map(f -> "Champ invalide (" + f.getField() + ") : " + f.getDefaultMessage())
                .orElse("Données invalides.");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new Body(msg));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<Body> unreadable(HttpMessageNotReadableException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new Body("Requête illisible ou valeur inconnue."));
    }
}
