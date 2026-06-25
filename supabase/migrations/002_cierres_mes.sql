-- ================================================================
-- FINANZAS HOGAR — Migración 002: tabla cierres_mes
-- Ejecutar en: Supabase Dashboard › SQL Editor › New query
-- ================================================================

CREATE TABLE IF NOT EXISTS cierres_mes (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  mes                   text        NOT NULL UNIQUE,  -- formato 'YYYY-MM'
  total_ingresos_ars    numeric     NOT NULL DEFAULT 0,
  total_ingresos_usd    numeric     NOT NULL DEFAULT 0,
  total_gastos_ars      numeric     NOT NULL DEFAULT 0,
  total_gastos_usd      numeric     NOT NULL DEFAULT 0,
  ahorro_neto_ars       numeric     NOT NULL DEFAULT 0,
  ahorro_neto_usd       numeric     NOT NULL DEFAULT 0,
  snapshot_ubicaciones  jsonb,
  created_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cierres_mes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hogar" ON cierres_mes;
CREATE POLICY "hogar" ON cierres_mes FOR ALL TO authenticated USING (true) WITH CHECK (true);
