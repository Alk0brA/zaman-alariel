-- زمن الأريل — إعداد قاعدة البيانات في Supabase
-- انسخ هذا الملف كامل في: Supabase → SQL Editor → New query → Run

-- ١) جدول الذكريات
create table if not exists public.memories (
  id           uuid primary key default gen_random_uuid(),
  title        text check (char_length(title) <= 70),
  text         text not null check (char_length(text) between 5 and 3000),
  cat          text not null default 'other' check (cat in ('tv','kids','ball','chips','video','family','school','eid','games','other')),
  year         int  check (year between 1970 and 2015),
  city         text check (char_length(city) <= 30),
  prompt       text check (char_length(prompt) <= 200),
  photo_url    text check (photo_url is null or photo_url like 'https://%'),
  author_id    text not null check (char_length(author_id) <= 64),
  author_name  text not null check (char_length(author_name) between 1 and 30),
  delete_token text not null,
  created_at   timestamptz not null default now()
);

-- ٢) جدول "أتذكرها"
create table if not exists public.remembers (
  memory_id  uuid not null references public.memories(id) on delete cascade,
  device_id  text not null check (char_length(device_id) <= 64),
  created_at timestamptz not null default now(),
  primary key (memory_id, device_id)
);

-- ٣) الحماية (RLS)
alter table public.memories  enable row level security;
alter table public.remembers enable row level security;

drop policy if exists "read memories"   on public.memories;
drop policy if exists "add memories"    on public.memories;
drop policy if exists "read remembers"  on public.remembers;
drop policy if exists "add remembers"   on public.remembers;
drop policy if exists "undo remembers"  on public.remembers;

create policy "read memories"  on public.memories  for select to anon, authenticated using (true);
create policy "add memories"   on public.memories  for insert to anon, authenticated with check (true);
create policy "read remembers" on public.remembers for select to anon, authenticated using (true);
create policy "add remembers"  on public.remembers for insert to anon, authenticated with check (true);
create policy "undo remembers" on public.remembers for delete to anon, authenticated using (true);

-- رمز الحذف ما ينقرأ من الموقع: نخفي العمود عن الزوار
revoke select on public.memories from anon, authenticated;
grant  select (id, title, text, cat, year, city, prompt, photo_url, author_id, author_name, created_at)
  on public.memories to anon, authenticated;

-- ٤) حذف الذكرى: صاحبها بس (اللي عنده رمز الحذف في جهازه)
create or replace function public.delete_memory(p_id uuid, p_token text)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from public.memories where id = p_id and delete_token = p_token;
  get diagnostics n = row_count;
  return n > 0;
end $$;
revoke all on function public.delete_memory(uuid, text) from public;
grant execute on function public.delete_memory(uuid, text) to anon, authenticated;

-- ٥) التحديث المباشر (الذكريات تطلع عند الكل فوراً)
do $$ begin
  begin alter publication supabase_realtime add table public.memories;  exception when others then null; end;
  begin alter publication supabase_realtime add table public.remembers; exception when others then null; end;
end $$;

-- ٦) تخزين الصور
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "upload photos" on storage.objects;
create policy "upload photos" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'photos');
