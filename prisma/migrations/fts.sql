-- Full-text search setup for the contents table.
--
-- Prisma can't model tsvector natively, so this lives as a hand-written
-- migration applied by bin/migrate-fts. Idempotent: safe to re-run.
--
-- Design:
-- - Use the 'simple' text-search config (no stemming) because the corpus
--   spans 7 languages and we don't want English stemmers mangling Arabic,
--   Persian, or Chinese. Per-language configs would be ideal but
--   Postgres doesn't ship them out of the box.
-- - The vector is built from title, stripped HTML body, and frontmatter
--   title. Weights: title = A, body = B, frontmatter title = A. This
--   gives a meaningful ranking out of the box.
-- - The trigger fires on insert/update and re-computes the vector. The
--   backfill at the bottom is one-shot and only matters on the very
--   first run after the import job has populated the rows.

-- Drop in reverse order so re-runs are clean.
DROP TRIGGER IF EXISTS contents_search_vector_update ON contents;
DROP FUNCTION IF EXISTS contents_search_vector_update();
DROP INDEX IF EXISTS contents_search_vector_idx;

ALTER TABLE contents DROP COLUMN IF EXISTS search_vector;

ALTER TABLE contents ADD COLUMN search_vector tsvector;

CREATE INDEX contents_search_vector_idx ON contents USING GIN (search_vector);

CREATE OR REPLACE FUNCTION contents_search_vector_update() RETURNS trigger AS $$
DECLARE
  fm_title text := '';
  fm_json jsonb;
  -- Naive HTML stripper: drop tags, decode the handful of entities the
  -- upstream markdown→HTML pipeline actually emits, collapse whitespace.
  body_text text;
BEGIN
  -- Frontmatter is stored as JSONB; pull a title field if present.
  BEGIN
    fm_json := NEW.frontmatter::jsonb;
    IF fm_json ? 'title' THEN
      fm_title := coalesce(fm_json->>'title', '');
    END IF;
  EXCEPTION WHEN others THEN
    fm_title := '';
  END;

  body_text := regexp_replace(
    regexp_replace(
      regexp_replace(coalesce(NEW.html, ''), '<[^>]+>', ' ', 'g'),
      '&nbsp;', ' ', 'g'
    ),
    '&[a-zA-Z]+;', ' ', 'g'
  );
  body_text := regexp_replace(body_text, '\s+', ' ', 'g');

  NEW.search_vector :=
      setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A')
   || setweight(to_tsvector('simple', coalesce(fm_title, '')), 'A')
   || setweight(to_tsvector('simple', coalesce(body_text, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contents_search_vector_update
  BEFORE INSERT OR UPDATE OF title, html, frontmatter
  ON contents
  FOR EACH ROW EXECUTE FUNCTION contents_search_vector_update();

-- Backfill: re-compute the vector for every existing row. The trigger
-- also runs on UPDATE so this is a one-liner that handles both the
-- trigger-installed case and the row-populated-first case.
UPDATE contents SET title = title;
