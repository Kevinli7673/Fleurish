-- Deleting your own sighting always failed with a foreign key violation.
--
-- feed_events.find_id references finds(id) with no delete action, so it defaults to
-- NO ACTION. Every find gets a feed_events row from the on_find_created trigger, so every
-- find has a referencing row and every delete is refused. likes.find_id and
-- list_items.find_id were both declared `on delete cascade`; this one was missed.
--
-- Cascade is the right action rather than `set null`: the feed policy treats an event with
-- a null find_id as a streak milestone, so nulling the column here would turn a deleted
-- sighting into a phantom milestone in everyone's feed.

do $$
declare
  fk_name text;
begin
  -- Look the constraint up rather than assuming the default name, so this still works if
  -- it was ever created or restored under a different one.
  select con.conname
    into fk_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace ns on ns.oid = rel.relnamespace
  where ns.nspname = 'public'
    and rel.relname = 'feed_events'
    and con.contype = 'f'
    and con.confrelid = 'public.finds'::regclass;

  if fk_name is not null then
    execute format('alter table public.feed_events drop constraint %I', fk_name);
  end if;
end $$;

alter table public.feed_events
  add constraint feed_events_find_id_fkey
  foreign key (find_id) references public.finds(id) on delete cascade;
