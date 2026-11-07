-- V5 : présentation « Devis quantitatif et estimatif » (DQE)
-- Types de lignes : ITEM (article chiffré), GROUP (article à sous-lignes, sans quantité),
-- SUBITEM (sous-ligne a/, b/… d'un article), SECTION (titre de lot, ex. « LOT 03 : ÉLECTRICITÉ »)
alter table quote_lines   add column kind varchar(10) not null default 'ITEM';
alter table invoice_lines add column kind varchar(10) not null default 'ITEM';

-- Sous-titre du document (ex. « 02- BÂTIMENT »)
alter table quotes   add column subtitle varchar(300);
alter table invoices add column subtitle varchar(300);
