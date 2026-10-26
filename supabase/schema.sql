create table public.retro_boards (
 id uuid primary key,
 access_hash text not null check (length(access_hash)=64),
 data jsonb not null check (octet_length(data::text)<=1048576),
 updated_at timestamptz not null default now()
);
alter table public.retro_boards enable row level security;
revoke all on public.retro_boards from anon, authenticated;
grant select, insert, update on public.retro_boards to anon;
create policy "Un enlace privado permite leer su retro" on public.retro_boards for select to anon
 using (access_hash = encode(extensions.digest(coalesce(current_setting('request.headers',true)::json->>'x-retro-key',''),'sha256'),'hex'));
create policy "Crear una retro con su propia clave" on public.retro_boards for insert to anon
 with check (length(coalesce(current_setting('request.headers',true)::json->>'x-retro-key',''))>=48 and access_hash = encode(extensions.digest(coalesce(current_setting('request.headers',true)::json->>'x-retro-key',''),'sha256'),'hex'));
create policy "Un enlace privado permite actualizar su retro" on public.retro_boards for update to anon
 using (access_hash = encode(extensions.digest(coalesce(current_setting('request.headers',true)::json->>'x-retro-key',''),'sha256'),'hex'))
 with check (access_hash = encode(extensions.digest(coalesce(current_setting('request.headers',true)::json->>'x-retro-key',''),'sha256'),'hex'));
create index retro_boards_access_hash_idx on public.retro_boards(access_hash);
