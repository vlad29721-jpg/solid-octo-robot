# D&D Master Hub

Премиальный рабочий стол Мастера D&D 5e: листы персонажей, трекер инициативы, общие броски, журнал сессий, кодекс предметов/заклинаний и ИИ-помощник **только через API DeepSeek**.

## Быстрый запуск

```bash
npm install
cp .env.local.example .env.local   # заполните нужные ключи
npx drizzle-kit push               # при необходимости создать таблицы вручную
npm run dev
```

Приложение также **самовосстанавливает базу**: `src/db/seed.ts` в транзакции с advisory lock создаёт таблицы `CREATE TABLE IF NOT EXISTS` и один раз засевает демо-данные. Health-check доступен на `/api/health` и тоже инициализирует БД.

### Демо-доступ

- Профиль Мастера выбран по умолчанию: **Эларион Вещий**.
- В диалоге аккаунта можно переключиться на игроков **Лиана** и **Торин** и увидеть ограничения доступа.
- Две кампании: «Тень над Гримхольмом» (`GRIMHOLM-7K`) и «Пепел Драконьего Предела» (`DRAGON-ASH-42`).
- Засеяны 3 персонажа, 5 заметок (включая скрытые DM), 2 столкновения и журнал бросков.

## Переменные окружения

| Переменная | Где используется | Назначение |
| --- | --- | --- |
| `DATABASE_URL` | сервер / Drizzle | PostgreSQL. Локально: `postgresql://postgres:postgres@127.0.0.1:5432/app_db`. Для Supabase укажите строку подключения к её Postgres. |
| `NEXT_PUBLIC_SUPABASE_URL` | клиент и сервер | Supabase Auth, Realtime, Storage. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | клиент и сервер | Публичный anon key; RLS ограничивает данные. |
| `DEEPSEEK_API_KEY` | **только сервер** | Прокси `/api/deepseek`. Никогда не добавляйте `NEXT_PUBLIC_`. |

Файл `.env.local` содержит закомментированные placeholders и работает без внешних сервисов. `.env.local.example` — полный шаблон.

## Supabase

1. Выполните `supabase/00_schema.sql` в SQL Editor: таблицы, триггер профиля, helper-функции, RLS, RPC `join_campaign_by_code`, bucket `avatars` и publication Realtime.
2. Выполните `supabase/01_demo.sql`: 2 кампании, 3 персонажа, заметки, encounter state и броски. Скрипт пытается создать демо-пользователей Auth; если конкретная версия Auth запрещает прямой insert, создайте их через Dashboard/Admin API с указанными UUID/e-mail.
3. Включите Email Auth и Realtime для таблиц `dice_rolls`, `encounters`, `characters`, `sessions`.

### Правила доступа

- Игрок видит **только свои** `characters`.
- Игрок видит `sessions` только с `is_dm_only = false`.
- DM видит всё в кампаниях, где он `dm_id`.
- Броски и состояние боя доступны всем участникам кампании.
- Storage: аватар загружается в `avatars/{user_id}/...`; запись разрешена только владельцу папки.

Эти же правила дублируются на сервере (`src/lib/server/access.ts`), поскольку API работает через Drizzle-подключение и проверяет `Supabase Auth` bearer token или локальный демо-профиль. Это позволяет демо работать без Supabase и сохранять корректную авторизацию в production.

## Архитектура

- **Next.js App Router + TypeScript**: client-страницы и Route Handlers.
- **Drizzle ORM**: единая типизированная схема `src/db/schema.ts`; все запросы API идут через `db`.
- **Supabase JS**: Auth (`signInWithPassword`, `getUser(token)`), Realtime (`postgres_changes`), Storage (`avatars`). Когда переменные не заданы, включается прозрачный fallback: локальный селектор профилей и polling каждые 4 секунды.
- **TanStack Query**: снимок хаба, invalidation после мутаций, оптимистичные HP/удаление/состояние боя с rollback при ошибке.
- **Zustand**: активная кампания, профиль, auth token и глобальные диалоги.
- **React Hook Form + Zod**: одни и те же схемы валидируют формы на клиенте и тела запросов на сервере.
- **Framer Motion / Tailwind CSS**: liquid-glass панели, карточки, пружинные HP-бары, d20 анимация; desktop sidebar и мобильный bottom tab bar.

## Глубокая логика D&D

- Модификаторы `⌊(score − 10)/2⌋`, бонус владения по уровню, экспертиза, спасброски, пассивная внимательность с поправкой состояний, инициатива `1d20 + ЛОВ`.
- Каталог 12 классов: кость хитов, спасброски, предлагаемые навыки, таблицы ячеек full/half/third/pact кастеров.
- Инвентарь с весом, лимитом `СИЛ × 15`, вариантом правил нагрузки, расчётом КД от экипированной брони/щита.
- 18 состояний с механическими эффектами; при 0 HP трекер автоматически накладывает «Без сознания».
- Парсер кубиков: `2d6+3`, `4d6kh3`, `2d20kl1`, отрицательные модификаторы, ограничения и криптографический RNG.
- Трекер: сортировка по инициативе/ЛОВ, раунды, предыдущий/следующий ход, журнал событий, транзакционная синхронизация HP монстра и листа героя.

## DeepSeek

`POST /api/deepseek` принимает `{ kind, prompt, context, conversation }`, добавляет `process.env.DEEPSEEK_API_KEY` и обращается **только** к `https://api.deepseek.com/v1/chat/completions`.

- `deepseek-chat`: NPC, предыстория, события, свободный запрос.
- `deepseek-reasoner`: спорные правила.
- Ключ никогда не попадает в браузер; нет OpenAI/Anthropic/других провайдеров и локальных «ИИ-заменителей».
- Обработаны `401` (ключ), `402` (баланс), `429` (лимит), `5xx`, таймаут, пустой ответ и локальный rate limit 12 запросов/мин.
- Если ключ отсутствует, UI показывает понятное сообщение и инструкцию; ответ не подделывается.

## Основные API

| Маршрут | Назначение |
| --- | --- |
| `GET /api/hub?campaignId=...` | Полный снимок с учётом прав |
| `POST /api/campaigns`, `/api/campaigns/join` | Создание и вход по invite code |
| `POST /api/characters`, `PATCH|DELETE /api/characters/[id]` | Листы персонажей |
| `POST /api/sessions` | Заметки и DM-only флаг |
| `POST /api/encounters`, `PATCH /api/encounters/[id]`, `POST /api/encounters/[id]/hp` | Бой и HP |
| `POST /api/dice-rolls` | Бросок и общий лог |
| `POST /api/deepseek` | Серверный ИИ-прокси |
| `PATCH /api/profile` | Имя, роль и аватар |
| `GET /api/health` | Проверка БД и capability flags |

## Проверка

```bash
npx next typegen
npm exec tsc -- --noEmit --pretty false
npm run build
npx drizzle-kit push
```

Откройте приложение на ПК и телефоне, выберите одну кампанию и проверьте общий журнал бросков/инициативу. При настроенном Supabase синхронизация идёт через Realtime; без него — через интервальный refetch и invalidation TanStack Query.
