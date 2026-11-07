-- V4 : factures libres (sans chantier), devis, paiements partiels (acomptes)

-- Une facture peut ne pas être liée à un chantier (dépannage, petite intervention)
alter table invoices alter column project_id drop not null;
alter table invoices add column title varchar(200);   -- objet de la facture

-- Paiements reçus sur une facture (acomptes, solde)
create table invoice_payments (
    id         bigserial primary key,
    invoice_id bigint        not null references invoices (id) on delete cascade,
    amount     numeric(12,2) not null check (amount > 0),
    paid_on    date          not null,
    method     varchar(30),
    note       varchar(300),
    created_at timestamptz   not null default now()
);
create index idx_invoice_payments_invoice on invoice_payments (invoice_id);

-- Reprise : une facture déjà marquée payée reçoit un paiement du montant total
insert into invoice_payments (invoice_id, amount, paid_on, note)
select id, total_ttc, coalesce(paid_on, issue_date, current_date), 'Reprise de l''ancien statut « payée »'
from invoices where status = 'PAID' and total_ttc > 0;

-- Devis
create table quote_counters (
    quote_year  int primary key,
    last_number int not null
);

create table quotes (
    id          bigserial primary key,
    number      varchar(20)   not null unique,
    client_id   bigint        not null references clients (id),
    project_id  bigint        references projects (id) on delete set null,
    title       varchar(200),
    issue_date  date          not null,
    valid_until date,
    status      varchar(20)   not null default 'PENDING',
    vat_rate    numeric(5,2)  not null,
    total_ht    numeric(12,2) not null,
    total_vat   numeric(12,2) not null,
    total_ttc   numeric(12,2) not null,
    notes       varchar(2000),
    invoice_id  bigint        references invoices (id) on delete set null,
    created_at  timestamptz   not null default now()
);

create table quote_lines (
    id          bigserial primary key,
    quote_id    bigint        not null references quotes (id) on delete cascade,
    position    int           not null,
    description varchar(300)  not null,
    unit        varchar(20),
    quantity    numeric(12,2) not null,
    unit_price  numeric(12,2) not null
);

alter table invoices add column quote_id bigint references quotes (id) on delete set null;
