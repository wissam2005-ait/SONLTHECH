create table app_users (
    id            bigserial primary key,
    email         varchar(255) not null,
    password_hash varchar(100) not null,
    full_name     varchar(150) not null,
    role          varchar(20)  not null,
    phone         varchar(30),
    job_title     varchar(100),
    active        boolean      not null default true,
    created_at    timestamptz  not null default now()
);
create unique index uq_app_users_email on app_users (lower(email));

create table clients (
    id          bigserial primary key,
    name        varchar(200) not null,
    email       varchar(255),
    phone       varchar(30),
    address     varchar(300),
    postal_code varchar(10),
    city        varchar(100),
    siret       varchar(20),
    vat_number  varchar(30),
    notes       varchar(2000),
    archived    boolean     not null default false,
    created_at  timestamptz not null default now()
);

create table contact_requests (
    id           bigserial primary key,
    kind         varchar(20)  not null,
    full_name    varchar(150) not null,
    phone        varchar(30),
    email        varchar(255),
    work_type    varchar(100),
    site_address varchar(300),
    message      varchar(5000) not null,
    status       varchar(20)  not null default 'NEW',
    client_id    bigint references clients (id) on delete set null,
    created_at   timestamptz  not null default now()
);

create table projects (
    id          bigserial primary key,
    name        varchar(200) not null,
    client_id   bigint       not null references clients (id),
    address     varchar(300),
    description varchar(5000),
    start_date  date,
    end_date    date,
    status      varchar(20)  not null default 'TO_PLAN',
    budget      numeric(12,2),
    created_at  timestamptz  not null default now(),
    updated_at  timestamptz  not null default now()
);

create table project_members (
    project_id bigint not null references projects (id) on delete cascade,
    user_id    bigint not null references app_users (id),
    primary key (project_id, user_id)
);

create table tasks (
    id          bigserial primary key,
    project_id  bigint       not null references projects (id) on delete cascade,
    title       varchar(200) not null,
    description varchar(5000),
    assignee_id bigint       not null references app_users (id),
    due_date    date,
    status      varchar(20)  not null default 'TODO',
    created_at  timestamptz  not null default now()
);
create index idx_tasks_assignee on tasks (assignee_id);
