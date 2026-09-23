# Supabase live baseline

Read-only snapshot of project `emzuynfrgmfbetfvptlp`, captured on 2026-09-23
after the project was restored. This is a re-entry reference, not an executable
migration. No production schema or data was changed while collecting it.

The live `handle_new_user` function contains user-specific fit guidance. Its
body is intentionally not copied into this repository. Keep personal profile
content in the database, not in source control.

## Data and storage inventory

- `public.garments`: 27 rows
- Garments with a cover-photo URL: 27
- `garments` Storage bucket: public, 27 objects, 1,012,977 bytes
- Distinct database photo references: 27
- Missing referenced objects: 0
- Unreferenced Storage objects: 0
- Gallery (`photos[]`) references: 0

## Public tables

All six tables have Row Level Security enabled (not forced).

### `profiles`

- `user_id uuid` primary key, not null, foreign key to `auth.users(id)`
- `display_name text`
- `height text` with a user-specific live default (value intentionally omitted)
- `fit_notes text`
- `sizes jsonb` not null, default `{}`
- `updated_at timestamptz` not null, default `now()`

### `garments`

- `id uuid` primary key, default `gen_random_uuid()`
- `user_id uuid` not null, default `auth.uid()`, foreign key to `auth.users(id)`
- `name text`, `category text` (both not null)
- `brand text`, `size text`, `color text`, `pattern text`, `material text`
- `location text` not null, default `dc`, checked to `dc` or `howell`
- `formality text` not null, default `casual`, checked to `formal`,
  `business_casual`, or `casual`
- `warmth text` not null, default `all`, checked to `light`, `mid`, `warm`, or `all`
- `status text` not null, default `active`, checked to `active`, `laundry`,
  `tailor`, or `archived`
- `photo_url text`, `photos text[]` not null default `{}`
- `notes text`, `fit_notes text`
- `times_worn integer` not null default `0`, `last_worn date`
- `created_at timestamptz`, `updated_at timestamptz` (both not null, default `now()`)

### `outfits`

- `id uuid` primary key, default `gen_random_uuid()`
- `user_id uuid` not null, default `auth.uid()`, foreign key to `auth.users(id)`
- `name text` not null
- `occasion text`, checked to `formal`, `business_casual`, or `casual`
- `location text`, checked to `dc` or `howell`
- `notes text`
- `created_at timestamptz` not null, default `now()`

### `outfit_items`

- `id uuid` primary key, default `gen_random_uuid()`
- `outfit_id uuid` not null, foreign key to `outfits(id)`
- `garment_id uuid` not null, foreign key to `garments(id)`
- `slot text`
- `position integer` not null, default `0`

The live foreign keys use PostgreSQL's default `NO ACTION` delete behavior.

### `wishlist`

- `id uuid` primary key, default `gen_random_uuid()`
- `user_id uuid` not null, default `auth.uid()`, foreign key to `auth.users(id)`
- `name text` not null
- `category text`, `brand text`, `size text`, `color text`
- `priority text` not null, default `soon`, checked to `soon` or `someday`
- `status text` not null, default `to_buy`, checked to `to_buy`, `ordered`, or `purchased`
- `location text` default `dc`, checked to `dc` or `howell`
- `url text`, `notes text`
- `created_at timestamptz` not null, default `now()`

### `private_settings`

- `user_id uuid` primary key, default `auth.uid()`, foreign key to `auth.users(id)`
- `anthropic_api_key text`
- `updated_at timestamptz` not null, default `now()`

## RLS policies

All policies are permissive.

| Schema/table | Policy | Role | Command | USING | WITH CHECK |
| --- | --- | --- | --- | --- | --- |
| `public.garments` | `own garments` | `public` | ALL | `auth.uid() = user_id` | same |
| `public.outfits` | `own outfits` | `public` | ALL | `auth.uid() = user_id` | same |
| `public.outfit_items` | `own outfit items` | `public` | ALL | owning outfit has `user_id = auth.uid()` | same |
| `public.private_settings` | `own settings` | `public` | ALL | `auth.uid() = user_id` | same |
| `public.profiles` | `own profile` | `public` | ALL | `auth.uid() = user_id` | same |
| `public.wishlist` | `own wishlist` | `public` | ALL | `auth.uid() = user_id` | same |
| `storage.objects` | `garment photos read` | `public` | SELECT | `bucket_id = 'garments'` | — |
| `storage.objects` | `garment photos insert` | `authenticated` | INSERT | — | bucket is `garments`; first folder is `auth.uid()` |
| `storage.objects` | `garment photos update` | `authenticated` | UPDATE | bucket is `garments`; first folder is `auth.uid()` | — |
| `storage.objects` | `garment photos delete` | `authenticated` | DELETE | bucket is `garments`; first folder is `auth.uid()` | — |

The public Storage SELECT policy explains the dashboard warning that clients can
list all objects in the bucket. The object names are UUID-based, but the bucket
is not private.

## Functions and auth triggers

- `public.block_new_signups()` — `SECURITY DEFINER`, fixed `search_path=public`;
  raises an exception. Called by `block_signups`, a `BEFORE INSERT` trigger on
  `auth.users`.
- `public.handle_new_user()` — `SECURITY DEFINER`, fixed `search_path=public`;
  inserts the new user's profile. Called by `on_auth_user_created`, an
  `AFTER INSERT` trigger on `auth.users`. User-specific default fit text is
  intentionally omitted here.

## Indexes

- Primary-key indexes on all six public tables
- `garments_user_idx` on `garments (user_id, location, category)`
