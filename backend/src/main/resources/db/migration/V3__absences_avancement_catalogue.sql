-- V3 : fiche employé complète, absences, avancement des chantiers, catalogue des pièces, paiement des factures

-- Fiche employé
alter table app_users
    add column hire_date     date,
    add column contract_type varchar(20),
    add column address       varchar(300),
    add column notes         varchar(2000);

-- Avancement des chantiers (0 à 100 %) + journal
alter table projects
    add column progress int not null default 0 check (progress between 0 and 100);

create table project_updates (
    id         bigserial primary key,
    project_id bigint      not null references projects (id) on delete cascade,
    author_id  bigint      references app_users (id) on delete set null,
    progress   int         not null check (progress between 0 and 100),
    note       varchar(2000),
    created_at timestamptz not null default now()
);
create index idx_project_updates_project on project_updates (project_id, created_at desc);

-- Absences des employés
create table absences (
    id         bigserial primary key,
    user_id    bigint       not null references app_users (id),
    type       varchar(20)  not null,
    start_date date         not null,
    end_date   date         not null,
    half_day   boolean      not null default false,
    note       varchar(500),
    created_at timestamptz  not null default now(),
    check (end_date >= start_date)
);
create index idx_absences_user_dates on absences (user_id, start_date);
create index idx_absences_dates on absences (start_date, end_date);

-- Catalogue des pièces : prix habituels, pour ne plus les retaper à chaque chantier
create table catalog_items (
    id         bigserial primary key,
    name       varchar(200)  not null,
    reference  varchar(60),
    unit       varchar(20)   not null default 'u',
    unit_price numeric(12,2) check (unit_price >= 0),
    supplier   varchar(150),
    archived   boolean       not null default false,
    created_at timestamptz   not null default now()
);

-- Factures : date d'encaissement
alter table invoices add column paid_on date;

-- Réalisations : lien facultatif vers le chantier
alter table realisations add column project_id bigint references projects (id) on delete set null;
