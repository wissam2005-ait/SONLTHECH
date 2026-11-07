-- V6 : paramètres de l'entreprise, modifiables dans l'application (imprimés sur les devis et factures)
create table company_settings (
    id          int primary key check (id = 1),   -- une seule ligne
    name        varchar(150) not null,
    legal_form  varchar(60),
    capital     varchar(60),
    address     varchar(300),
    city        varchar(100),
    phone       varchar(60),
    email       varchar(255),
    rc          varchar(60),
    nif         varchar(60),
    nis         varchar(60),
    ai          varchar(60),
    bank        varchar(300),
    footer      varchar(1000),
    logo        text,          -- image en data URL (réduite par le navigateur)
    updated_at  timestamptz not null default now()
);
insert into company_settings (id, name, city) values (1, 'ElectroPro', 'Alger');
