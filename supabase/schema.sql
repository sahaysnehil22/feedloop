-- ============================================================
-- FeedLoop schema — run once in the Supabase SQL editor
-- (Dashboard > SQL > New query). Safe to re-run: uses IF NOT EXISTS.
-- ============================================================

-- ---------- tables ----------
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  name text not null check (char_length(name) between 1 and 80),
  public_key text unique not null default ('pk_' || encode(gen_random_bytes(12), 'hex')),
  accent_color text not null default '#111111',
  widget_position text not null default 'bottom-right'
    check (widget_position in ('bottom-right', 'bottom-left')),
  theme text not null default 'light' check (theme in ('light', 'dark')),
  language text not null default 'en' check (language in ('en', 'es')),
  hide_badge boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists suggestions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade not null,
  title text not null check (char_length(title) between 3 and 140),
  description text not null default '' check (char_length(description) <= 2000),
  status text not null default 'open'
    check (status in ('open', 'planned', 'in_progress', 'launched', 'discarded')),
  votes integer not null default 0 check (votes >= 0),
  voter_email text,
  created_at timestamptz not null default now()
);
create index if not exists suggestions_project_idx on suggestions(project_id, status, votes desc);

create table if not exists votes (
  suggestion_id uuid references suggestions(id) on delete cascade not null,
  voter_id text not null check (char_length(voter_id) between 8 and 128),
  created_at timestamptz not null default now(),
  primary key (suggestion_id, voter_id)
);

create table if not exists changelog_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade not null,
  title text not null check (char_length(title) between 1 and 140),
  body text not null default '' check (char_length(body) <= 10000),
  suggestion_id uuid references suggestions(id) on delete set null,
  published_at timestamptz not null default now()
);
create index if not exists changelog_project_idx on changelog_entries(project_id, published_at desc);

create table if not exists internal_notes (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid references suggestions(id) on delete cascade not null,
  author_id uuid references auth.users(id) on delete cascade not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

-- ---------- keep suggestions.votes in sync ----------
create or replace function feedloop_bump_votes() returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update suggestions set votes = votes + 1 where id = NEW.suggestion_id;
  elsif TG_OP = 'DELETE' then
    update suggestions set votes = greatest(votes - 1, 0) where id = OLD.suggestion_id;
  end if;
  return null;
end;
$$ language plpgsql;

drop trigger if exists feedloop_votes_count on votes;
create trigger feedloop_votes_count
  after insert or delete on votes
  for each row execute function feedloop_bump_votes();

-- ---------- row-level security ----------
alter table projects enable row level security;
alter table suggestions enable row level security;
alter table votes enable row level security;
alter table changelog_entries enable row level security;
alter table internal_notes enable row level security;

-- Public (anonymous) read: the widget's public surface.
-- Writes always go through the API routes with the service-role key.
drop policy if exists "public read projects" on projects;
create policy "public read projects" on projects for select using (true);

drop policy if exists "public read suggestions" on suggestions;
create policy "public read suggestions" on suggestions for select using (true);

drop policy if exists "public read changelog" on changelog_entries;
create policy "public read changelog" on changelog_entries for select using (true);

-- Owners: full access to their own projects and everything under them.
drop policy if exists "owner projects" on projects;
create policy "owner projects" on projects
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "owner suggestions" on suggestions;
create policy "owner suggestions" on suggestions
  for all using (
    exists (select 1 from projects p where p.id = suggestions.project_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from projects p where p.id = suggestions.project_id and p.owner_id = auth.uid())
  );

drop policy if exists "owner changelog" on changelog_entries;
create policy "owner changelog" on changelog_entries
  for all using (
    exists (select 1 from projects p where p.id = changelog_entries.project_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from projects p where p.id = changelog_entries.project_id and p.owner_id = auth.uid())
  );

drop policy if exists "owner notes" on internal_notes;
create policy "owner notes" on internal_notes
  for all using (
    exists (
      select 1 from suggestions s
      join projects p on p.id = s.project_id
      where s.id = internal_notes.suggestion_id and p.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from suggestions s
      join projects p on p.id = s.project_id
      where s.id = internal_notes.suggestion_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "owner votes read" on votes;
create policy "owner votes read" on votes
  for select using (
    exists (
      select 1 from suggestions s
      join projects p on p.id = s.project_id
      where s.id = votes.suggestion_id and p.owner_id = auth.uid()
    )
  );
