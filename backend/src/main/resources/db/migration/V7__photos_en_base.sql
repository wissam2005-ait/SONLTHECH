-- V7 : les photos des réalisations sont stockées dans la base de données.
-- Raison : sur un hébergement cloud (Render…), le disque du serveur est effacé à chaque redémarrage.
-- Les anciennes photos restées sur disque (installation Docker) restent lisibles.
create table photo_file (
    file_name   varchar(64) primary key,
    content     bytea       not null,
    created_at  timestamptz not null default now()
);
