package com.electropro.domain;

/**
 * Type d'une ligne de devis ou de facture, comme dans un DQE :
 * ITEM = article chiffré ; GROUP = article à sous-lignes (désignation seule) ;
 * SUBITEM = sous-ligne chiffrée (a/, b/…) ; SECTION = titre de lot.
 */
public enum LineKind {
    ITEM, GROUP, SUBITEM, SECTION;

    /** Les lignes qui ont une quantité et un prix. */
    public boolean priced() {
        return this == ITEM || this == SUBITEM;
    }
}
