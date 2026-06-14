ALTER TABLE "Widget"
  ADD COLUMN "config" JSONB,
  ADD COLUMN "publishedSnapshot" JSONB;

UPDATE "Widget"
SET "config" = jsonb_build_object(
  'schemaVersion', 1,
  'kind', CASE
    WHEN "kind"::text = 'WALL_OF_LOVE' THEN 'wall'
    ELSE 'embed'
  END,
  'layout', jsonb_build_object(
    'preset', CASE
      WHEN "layout"::text = 'GRID' THEN 'grid'
      WHEN "layout"::text = 'MASONRY' THEN 'masonry'
      WHEN "layout"::text = 'LIST' THEN 'list'
      WHEN "layout"::text = 'WALL' THEN 'wall'
      WHEN "kind"::text = 'WALL_OF_LOVE' THEN 'wall'
      ELSE 'carousel'
    END
  ),
  'content', jsonb_build_object(
    'mode', CASE
      WHEN "contentMode"::text = 'HANDPICKED' THEN 'handpicked'
      ELSE 'all'
    END,
    'pickedIds', to_jsonb("pickedIds"),
    'order', CASE
      WHEN "contentMode"::text = 'HANDPICKED' THEN 'manual'
      ELSE 'recent'
    END,
    'minRating', NULL,
    'maxItems', "maxItems"
  ),
  'display', jsonb_build_object(
    'showRating', "showRating",
    'showAvatar', "showAvatar",
    'showCompany', "showCompany",
    'showDate', "showDate",
    'showSource', "showSource"
  ),
  'behavior', jsonb_build_object(
    'autoRotate', "autoRotate",
    'rotateInterval', "rotateInterval"
  ),
  'theme', jsonb_build_object(
    'brandColor', "accent",
    'appearance', CASE
      WHEN "theme"::text = 'DARK' THEN 'dark'
      WHEN "theme"::text = 'AUTO' THEN 'system'
      ELSE 'light'
    END,
    'radius', CASE
      WHEN "radius" <= 3 THEN 0
      WHEN "radius" <= 9 THEN 1
      WHEN "radius" <= 15 THEN 2
      WHEN "radius" <= 22 THEN 3
      ELSE 4
    END,
    'density', CASE
      WHEN "density"::text = 'COMPACT' THEN 'compact'
      WHEN "density"::text = 'COZY' THEN 'spacious'
      ELSE 'cozy'
    END,
    'typePairing', CASE
      WHEN lower("fontFamily") LIKE '%fraunces%' OR lower("fontFamily") LIKE '%georgia%' THEN 'serif-editorial'
      WHEN lower("fontFamily") LIKE '%inter%' THEN 'inter'
      WHEN lower("fontFamily") LIKE '%system%' THEN 'system'
      ELSE 'geist'
    END,
    'surfaceStyle', CASE
      WHEN "cardStyle"::text = 'FLAT' THEN 'flat'
      WHEN "cardStyle"::text IN ('SHADOW', 'ELEVATED') THEN 'elevated'
      ELSE 'bordered'
    END,
    'accentIntensity', 'balanced',
    'neutralTone', 'auto',
    'buttonStyle', 'solid'
  ),
  'branding', jsonb_build_object(
    'logoUrl', NULL,
    'watermark', "showBranding"
  ),
  'wall', CASE
    WHEN "kind"::text = 'WALL_OF_LOVE' OR "layout"::text = 'WALL' THEN
      jsonb_build_object(
        'slug', COALESCE("wallSlug", 'wall-of-love'),
        'title', COALESCE("wallTitle", "name"),
        'subhead', COALESCE("wallSubhead", '')
      )
    ELSE NULL
  END
)
WHERE "config" IS NULL;

ALTER TABLE "Widget"
  ALTER COLUMN "config" SET NOT NULL;
