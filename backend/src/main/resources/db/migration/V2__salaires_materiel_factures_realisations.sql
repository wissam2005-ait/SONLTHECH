-- Salaires, matériel, factures et réalisations

-- Salaires : montant mensuel convenu + paiements réellement versés
create table salary_settings (
    user_id        bigint primary key references app_users (id),
    monthly_amount numeric(10,2) not null check (monthly_amount >= 0)
);

create table salary_payments (
    id         bigserial primary key,
    user_id    bigint        not null references app_users (id),
    period     varchar(7)    not null,           -- mois concerné, ex. 2026-10
    amount     numeric(10,2) not null check (amount > 0),
    paid_on    date          not null,
    method     varchar(30),
    note       varchar(300),
    created_at timestamptz   not null default now()
);
create index idx_salary_payments_user_period on salary_payments (user_id, period);

-- Matériel d'un chantier
create table materials (
    id           bigserial primary key,
    project_id   bigint        not null references projects (id) on delete cascade,
    name         varchar(200)  not null,
    unit         varchar(20)   not null default 'u',
    quantity     numeric(12,2) not null check (quantity > 0),
    supplier     varchar(150),
    unit_cost    numeric(12,2) check (unit_cost >= 0),   -- prix d'achat HT, renseigné à l'achat
    purchased_on date,                                    -- non nul = acheté
    invoice_id   bigint,
    added_by     bigint references app_users (id) on delete set null,
    created_at   timestamptz   not null default now()
);
create index idx_materials_project on materials (project_id);

-- Factures
create table invoice_counters (
    invoice_year int primary key,
    last_number  int not null
);

create table invoices (
    id         bigserial primary key,
    number     varchar(20) unique,                        -- attribué à l'émission (numérotation sans trou)
    project_id bigint        not null references projects (id),
    client_id  bigint        not null references clients (id),
    issue_date date,
    due_date   date,
    status     varchar(20)   not null default 'DRAFT',
    vat_rate   numeric(5,2)  not null,
    total_ht   numeric(12,2) not null,
    total_vat  numeric(12,2) not null,
    total_ttc  numeric(12,2) not null,
    notes      varchar(2000),
    created_at timestamptz   not null default now()
);

create table invoice_lines (
    id          bigserial primary key,
    invoice_id  bigint        not null references invoices (id) on delete cascade,
    position    int           not null,
    description varchar(300)  not null,
    unit        varchar(20),
    quantity    numeric(12,2) not null,
    unit_price  numeric(12,2) not null
);

alter table materials
    add constraint fk_materials_invoice foreign key (invoice_id) references invoices (id) on delete set null;

-- Réalisations affichées sur le site public
create table realisations (
    id           bigserial primary key,
    title        varchar(150) not null,
    description  varchar(3000),
    city         varchar(100),
    completed_on date,
    author_id    bigint       not null references app_users (id),
    published    boolean      not null default true,
    created_at   timestamptz  not null default now()
);

create table realisation_photos (
    id             bigserial primary key,
    realisation_id bigint      not null references realisations (id) on delete cascade,
    position       int         not null,
    file_name      varchar(80) not null
);
create index idx_realisation_photos_real on realisation_photos (realisation_id);
