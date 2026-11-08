package com.electropro.web;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Vérification de santé et maintien en éveil (Render, cron-job.org).
 * Ne lit PAS la base : la base Neon peut se mettre en pause entre deux visites
 * et le quota de calcul gratuit est préservé.
 */
@RestController
public class PingController {
    @GetMapping("/api/public/ping")
    ResponseEntity<String> ping() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body("ok");
    }
}
