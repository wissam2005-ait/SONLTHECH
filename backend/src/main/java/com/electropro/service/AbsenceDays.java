package com.electropro.service;

import com.electropro.domain.Absence;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;

/** Compte les jours ouvrés d'une absence (Algérie : du dimanche au jeudi), éventuellement limités à une période. */
public final class AbsenceDays {
    private static final BigDecimal HALF = new BigDecimal("0.5");

    private AbsenceDays() {}

    public static BigDecimal of(Absence a) {
        return within(a, a.getStartDate(), a.getEndDate());
    }

    /** Jours ouvrés de l'absence compris dans [from, to]. */
    public static BigDecimal within(Absence a, LocalDate from, LocalDate to) {
        LocalDate start = a.getStartDate().isBefore(from) ? from : a.getStartDate();
        LocalDate end = a.getEndDate().isAfter(to) ? to : a.getEndDate();
        if (end.isBefore(start)) return BigDecimal.ZERO;
        if (a.isHalfDay()) return isWorkingDay(start) ? HALF : BigDecimal.ZERO;
        long days = 0;
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            if (isWorkingDay(d)) days++;
        }
        return BigDecimal.valueOf(days);
    }

    /** En Algérie, le week-end est le vendredi et le samedi. */
    public static boolean isWorkingDay(LocalDate d) {
        return d.getDayOfWeek() != DayOfWeek.FRIDAY && d.getDayOfWeek() != DayOfWeek.SATURDAY;
    }
}
