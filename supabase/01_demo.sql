-- D&D Master Hub — demo data for Supabase.
-- Run after 00_schema.sql. Demo password (if auth.users/identities are accepted): Demo12345!
-- If your Supabase Auth schema rejects direct auth.user inserts, create these three users
-- in Authentication → Users and replace the UUIDs below (or rely on the local Drizzle demo).

do $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  )
  select
    '00000000-0000-0000-0000-000000000000'::uuid,
    v.id::uuid, 'authenticated', 'authenticated', v.email,
    extensions.crypt('Demo12345!', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('display_name', v.display_name, 'role', v.role),
    now(), now(), '', '', '', ''
  from (values
    ('11111111-1111-4111-8111-111111111111', 'dm@masterhub.demo', 'Эларион Вещий', 'dm'),
    ('22222222-2222-4222-8222-222222222222', 'liana@masterhub.demo', 'Лиана', 'player'),
    ('33333333-3333-4333-8333-333333333333', 'torin@masterhub.demo', 'Торин', 'player')
  ) as v(id, email, display_name, role)
  where not exists (select 1 from auth.users u where u.id = v.id::uuid)
  on conflict (id) do nothing;

  -- Some Supabase versions require an identity row for email/password sign-in.
  begin
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    select gen_random_uuid(), u.id, u.email, jsonb_build_object('sub', u.id::text, 'email', u.email), 'email', now(), now(), now()
    from auth.users u
    where u.id in (
      '11111111-1111-4111-8111-111111111111'::uuid,
      '22222222-2222-4222-8222-222222222222'::uuid,
      '33333333-3333-4333-8333-333333333333'::uuid
    )
    on conflict do nothing;
  exception when others then
    raise notice 'Identity rows can be created from Supabase Auth admin UI: %', sqlerrm;
  end;
exception when others then
  raise notice 'Create demo users through Supabase Auth if direct auth.users insert is unavailable: %', sqlerrm;
end $$;

insert into public.profiles (id, display_name, role, email) values
  ('11111111-1111-4111-8111-111111111111', 'Эларион Вещий', 'dm', 'dm@masterhub.demo'),
  ('22222222-2222-4222-8222-222222222222', 'Лиана', 'player', 'liana@masterhub.demo'),
  ('33333333-3333-4333-8333-333333333333', 'Торин', 'player', 'torin@masterhub.demo')
on conflict (id) do nothing;

insert into public.campaigns (id, dm_id, title, description, invite_code, status) values
  ('supabase-campaign-1', '11111111-1111-4111-8111-111111111111', 'Тень над Гримхольмом', 'Город гаснущих фонарей, где под мостовой просыпается древняя клятва.', 'GRIMHOLM-7K', 'active'),
  ('supabase-campaign-2', '11111111-1111-4111-8111-111111111111', 'Пепел Драконьего Предела', 'Экспедиция к обсерватории, где последний дракон оставил предупреждение.', 'DRAGON-ASH-42', 'active')
on conflict (id) do nothing;

insert into public.campaign_members (campaign_id, user_id) values
  ('supabase-campaign-1', '11111111-1111-4111-8111-111111111111'),
  ('supabase-campaign-1', '22222222-2222-4222-8222-222222222222'),
  ('supabase-campaign-1', '33333333-3333-4333-8333-333333333333'),
  ('supabase-campaign-2', '11111111-1111-4111-8111-111111111111'),
  ('supabase-campaign-2', '22222222-2222-4222-8222-222222222222')
on conflict do nothing;

insert into public.characters (
  id, campaign_id, owner_id, name, class_key, species, level, hp_current, hp_max, armor_class,
  stats, inventory, spells, conditions
) values
(
  'supabase-char-liana', 'supabase-campaign-1', '22222222-2222-4222-8222-222222222222',
  'Лиана Тенетень', 'rogue', 'Полуэльф', 5, 31, 38, 15,
  '{"abilities":{"str":9,"dex":18,"con":14,"int":13,"wis":12,"cha":16},"proficientSkills":["stealth","sleightOfHand","perception","acrobatics","deception"],"expertiseSkills":["stealth","sleightOfHand"],"savingThrowProficiencies":["dex","int"],"initiativeBonus":2,"spellcastingAbility":null}'::jsonb,
  '[{"id":"item-rapier","name":"Рапира","category":"weapon","quantity":1,"weight":2,"costGp":25,"description":"1d8 колющий, финес.","equipped":true,"damage":"1d8 колющий"},{"id":"item-leather","name":"Кожаный доспех","category":"armor","quantity":1,"weight":10,"costGp":10,"description":"11 + ЛОВ","equipped":true,"armor":{"base":11,"type":"light"}},{"id":"item-potion","name":"Зелье лечения","category":"consumable","quantity":2,"weight":0.5,"costGp":50,"description":"2d4+2 HP","equipped":false}]'::jsonb,
  '{"slots":{},"used":{},"list":[]}'::jsonb,
  '[{"id":"concentration","name":"Концентрация","appliedAt":"2026-02-18T19:15:00Z"}]'::jsonb
),
(
  'supabase-char-torin', 'supabase-campaign-1', '33333333-3333-4333-8333-333333333333',
  'Торин Громомолот', 'cleric', 'Дварф', 5, 42, 43, 18,
  '{"abilities":{"str":16,"dex":10,"con":16,"int":11,"wis":17,"cha":12},"proficientSkills":["insight","medicine","religion","perception"],"expertiseSkills":[],"savingThrowProficiencies":["wis","cha"],"initiativeBonus":0,"spellcastingAbility":"wis"}'::jsonb,
  '[{"id":"item-longsword","name":"Длинный меч","category":"weapon","quantity":1,"weight":3,"costGp":15,"description":"1d8 рубящий","equipped":true,"damage":"1d8 рубящий"},{"id":"item-scale","name":"Чешуйчатый доспех","category":"armor","quantity":1,"weight":45,"costGp":50,"description":"14 + ЛОВ (макс. 2)","equipped":true,"armor":{"base":14,"type":"medium","maxDex":2}},{"id":"item-shield","name":"Щит","category":"shield","quantity":1,"weight":6,"costGp":10,"description":"+2 КД","equipped":true,"armor":{"base":2,"type":"shield"}}]'::jsonb,
  '{"slots":{"1":4,"2":3,"3":2},"used":{"1":1},"list":[{"id":"spell-cure-wounds","name":"Лечащие руки","level":1,"school":"Воплощение","castingTime":"1 действие","range":"Касание","components":"В, С","description":"1d8 + модификатор магии HP.","prepared":true},{"id":"spell-bless","name":"Благословение","level":1,"school":"Очарование","castingTime":"1 действие","range":"30 фт","components":"В, С, М","description":"+1d4 к атакам и спасброскам.","prepared":true}]}'::jsonb,
  '[{"id":"blessed","name":"Благословлён","appliedAt":"2026-02-18T19:15:00Z"}]'::jsonb
),
(
  'supabase-char-serafina', 'supabase-campaign-2', '22222222-2222-4222-8222-222222222222',
  'Серафина Пепельная', 'wizard', 'Человек', 4, 22, 26, 12,
  '{"abilities":{"str":8,"dex":15,"con":13,"int":18,"wis":12,"cha":10},"proficientSkills":["arcana","history","investigation"],"expertiseSkills":[],"savingThrowProficiencies":["int","wis"],"initiativeBonus":0,"spellcastingAbility":"int"}'::jsonb,
  '[{"id":"item-spellbook","name":"Книга заклинаний","category":"gear","quantity":1,"weight":3,"costGp":50,"description":"Формулы волшебника.","equipped":true},{"id":"item-potion","name":"Зелье лечения","category":"consumable","quantity":1,"weight":0.5,"costGp":50,"description":"2d4+2 HP","equipped":false}]'::jsonb,
  '{"slots":{"1":4,"2":3},"used":{"1":2,"2":1},"list":[{"id":"spell-magic-missile","name":"Волшебная стрела","level":1,"school":"Воплощение","castingTime":"1 действие","range":"120 фт","components":"В, С","description":"Три дротика по 1d4+1.","prepared":true},{"id":"spell-shatter","name":"Раскат грома","level":2,"school":"Воплощение","castingTime":"1 действие","range":"60 фт","components":"В, С, М","description":"3d8 урона звуком.","prepared":true}]}'::jsonb,
  '[]'::jsonb
)
on conflict (id) do nothing;

insert into public.sessions (id, campaign_id, author_id, title, notes, is_dm_only, session_date) values
  ('supabase-note-1', 'supabase-campaign-1', '11111111-1111-4111-8111-111111111111', 'Сессия 4: Колокол без языка', 'Партия нашла карту канализации под собором. Стражник Аррен солгал о времени исчезновения картографа. На мосту фонари погасли все разом.', false, '2026-02-14T19:00:00Z'),
  ('supabase-note-2', 'supabase-campaign-1', '22222222-2222-4222-8222-222222222222', 'Заметки Лианы', 'Не доверяю Аррену. Серебряная нить тёплая, будто живая. Нужно вернуться к мосту днём.', false, '2026-02-15T10:00:00Z'),
  ('supabase-note-3', 'supabase-campaign-1', '11111111-1111-4111-8111-111111111111', 'Секретный план Мастера', 'Колокол — печать, а не сигнал. Аррен защищает дочь, ставшую проводником древнего договора. Не раскрывать до третьего акта.', true, '2026-02-16T18:00:00Z'),
  ('supabase-note-4', 'supabase-campaign-2', '11111111-1111-4111-8111-111111111111', 'Хроника экспедиции', 'Через перевал прошли за шесть дней. На четвёртый день пепел выпал против ветра.', false, '2026-01-28T18:00:00Z'),
  ('supabase-note-5', 'supabase-campaign-2', '11111111-1111-4111-8111-111111111111', 'Истинная природа пепла', 'Пепел хранит память дракона и показывает каждому его несостоявшееся будущее.', true, '2026-01-29T18:00:00Z')
on conflict (id) do nothing;

insert into public.encounters (id, campaign_id, state) values
(
  'supabase-encounter-1', 'supabase-campaign-1',
  '{"name":"Мост Гримхольма","active":true,"round":2,"activeId":"combat-liana","combatants":[{"id":"combat-liana","name":"Лиана Тенетень","kind":"character","sourceCharacterId":"supabase-char-liana","initiative":21,"dexModifier":4,"hp":31,"maxHp":38,"ac":15,"conditions":[],"color":"#D4AF37"},{"id":"combat-shade","name":"Тень под мостовой","kind":"monster","sourceCharacterId":null,"initiative":18,"dexModifier":3,"hp":44,"maxHp":68,"ac":15,"conditions":["poisoned"],"color":"#8B0000"},{"id":"combat-torin","name":"Торин Громомолот","kind":"character","sourceCharacterId":"supabase-char-torin","initiative":12,"dexModifier":0,"hp":42,"maxHp":43,"ac":18,"conditions":["blessed"],"color":"#6B8E9F"}],"log":[{"id":"event-1","text":"Бой начался. Первый ход: Лиана Тенетень.","at":"2026-02-18T19:15:00Z"}]}'::jsonb
),
(
  'supabase-encounter-2', 'supabase-campaign-2',
  '{"name":"Засада у обсерватории","active":false,"round":1,"activeId":null,"combatants":[],"log":[]}'::jsonb
)
on conflict (id) do nothing;

insert into public.dice_rolls (id, campaign_id, actor_id, actor_name, expression, result, detail, created_at) values
  ('supabase-roll-1', 'supabase-campaign-1', '22222222-2222-4222-8222-222222222222', 'Лиана', '1d20+7', 23, '{"expression":"1d20+7","total":23,"parts":[{"expression":"1d20","sign":1,"sides":20,"rolls":[16],"kept":[16],"dropped":[],"subtotal":16}],"flatModifier":7,"breakdown":"1d20 [16] = 16 · модификатор +7 · итого 23","critical":false,"fumble":false}'::jsonb, '2026-02-18T19:14:00Z'),
  ('supabase-roll-2', 'supabase-campaign-1', '11111111-1111-4111-8111-111111111111', 'Эларион Вещий', '2d6+3', 11, '{"expression":"2d6+3","total":11,"parts":[{"expression":"2d6","sign":1,"sides":6,"rolls":[5,3],"kept":[5,3],"dropped":[],"subtotal":8}],"flatModifier":3,"breakdown":"2d6 [5, 3] = 8 · модификатор +3 · итого 11","critical":false,"fumble":false}'::jsonb, '2026-02-18T19:17:00Z')
on conflict (id) do nothing;
