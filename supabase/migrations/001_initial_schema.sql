-- ================================================================
-- FINANZAS HOGAR — Migración inicial
-- Ejecutar en: Supabase Dashboard › SQL Editor › New query
-- Es re-ejecutable: usa IF NOT EXISTS y ON CONFLICT DO NOTHING.
-- ================================================================


-- ─────────────────────────────────────────
-- TABLAS
-- ─────────────────────────────────────────

-- Rubros de gasto (ABM desde admin)
CREATE TABLE IF NOT EXISTS rubros (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     text        NOT NULL UNIQUE,
  icono      text,
  activo     boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Medios de pago: tarjetas, cuentas, billeteras (ABM desde admin)
CREATE TABLE IF NOT EXISTS medios_pago (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     text        NOT NULL,
  tipo       text        NOT NULL CHECK (tipo IN ('tarjeta_credito','tarjeta_debito','cuenta_banco','billetera','efectivo','transferencia')),
  banco      text,
  titular    text        CHECK (titular IN ('mati','sofi','hogar')),
  moneda     text        NOT NULL DEFAULT 'ARS' CHECK (moneda IN ('ARS','USD')),
  activo     boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tipos de ingreso (ABM desde admin)
CREATE TABLE IF NOT EXISTS tipos_ingreso (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          text        NOT NULL UNIQUE,
  moneda_default  text        NOT NULL DEFAULT 'ARS' CHECK (moneda_default IN ('ARS','USD')),
  activo          boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Ubicaciones de ahorro (ABM desde admin; saldo siempre derivado de movimientos)
CREATE TABLE IF NOT EXISTS ubicaciones_ahorro (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     text        NOT NULL UNIQUE,
  moneda     text        NOT NULL CHECK (moneda IN ('ARS','USD')),
  activo     boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Importaciones de PDF (creada antes de gastos por la FK)
CREATE TABLE IF NOT EXISTS pdf_imports (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha          date,
  archivo_url    text,
  medio_pago_id  uuid        REFERENCES medios_pago(id),
  estado         text        NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','confirmado')),
  raw_json       jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Gastos (tabla principal de egresos)
CREATE TABLE IF NOT EXISTS gastos (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha          date        NOT NULL,
  monto          numeric     NOT NULL CHECK (monto > 0),
  moneda         text        NOT NULL DEFAULT 'ARS' CHECK (moneda IN ('ARS','USD')),
  rubro          text        NOT NULL,
  medio_pago_id  uuid        REFERENCES medios_pago(id),
  persona        text        NOT NULL CHECK (persona IN ('sofi','mati')),
  descripcion    text,
  foto_url       text,
  origen         text        NOT NULL DEFAULT 'manual' CHECK (origen IN ('manual','pdf')),
  pdf_import_id  uuid        REFERENCES pdf_imports(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Ingresos
CREATE TABLE IF NOT EXISTS ingresos (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha         date        NOT NULL,
  monto         numeric     NOT NULL CHECK (monto > 0),
  moneda        text        NOT NULL DEFAULT 'ARS' CHECK (moneda IN ('ARS','USD')),
  tipo_ingreso  text        NOT NULL,
  persona       text        NOT NULL CHECK (persona IN ('sofi','mati','hogar')),
  descripcion   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Movimientos de ahorro (ledger — el saldo de cada ubicación es la suma de sus movimientos)
CREATE TABLE IF NOT EXISTS movimientos_ahorro (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha              date        NOT NULL,
  tipo               text        NOT NULL CHECK (tipo IN ('saldo_inicial','deposito','retiro','transferencia','compra_usd','venta_usd','ingreso_negocio','ajuste')),
  ubicacion_origen   uuid        REFERENCES ubicaciones_ahorro(id),
  ubicacion_destino  uuid        REFERENCES ubicaciones_ahorro(id),
  monto              numeric     NOT NULL CHECK (monto > 0),
  moneda             text        NOT NULL CHECK (moneda IN ('ARS','USD')),
  cotizacion         numeric,    -- solo compra_usd / venta_usd
  monto_pesos        numeric,    -- calculado: USD × cotizacion
  persona            text        NOT NULL CHECK (persona IN ('sofi','mati','hogar')),
  descripcion        text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- Metas de ahorro
CREATE TABLE IF NOT EXISTS metas (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre              text        NOT NULL,
  monto_objetivo      numeric     NOT NULL CHECK (monto_objetivo > 0),
  moneda              text        NOT NULL DEFAULT 'USD' CHECK (moneda IN ('ARS','USD')),
  fecha_objetivo      date,
  activa              boolean     NOT NULL DEFAULT true,
  es_fondo_emergencia boolean     NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Gastos recurrentes (plantillas para generación automática mensual)
CREATE TABLE IF NOT EXISTS gastos_recurrentes (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  rubro          text        NOT NULL,
  monto          numeric     NOT NULL CHECK (monto > 0),
  moneda         text        NOT NULL DEFAULT 'ARS' CHECK (moneda IN ('ARS','USD')),
  medio_pago_id  uuid        REFERENCES medios_pago(id),
  dia_del_mes    int         NOT NULL CHECK (dia_del_mes BETWEEN 1 AND 31),
  descripcion    text,
  activo         boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Ingresos recurrentes (recordatorios mensuales — el alquiler usa modo 'recordatorio')
CREATE TABLE IF NOT EXISTS ingresos_recurrentes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_ingreso    text        NOT NULL,
  monto_sugerido  numeric,
  dia_del_mes     int         NOT NULL CHECK (dia_del_mes BETWEEN 1 AND 31),
  modo            text        NOT NULL CHECK (modo IN ('automatico','recordatorio')),
  activo          boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Presupuestos (tabla lista para v2, sin UI en v1)
CREATE TABLE IF NOT EXISTS presupuestos (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  rubro           text        NOT NULL,
  monto_mensual   numeric     NOT NULL CHECK (monto_mensual > 0),
  mes             text        NOT NULL, -- formato 'YYYY-MM'
  created_at      timestamptz NOT NULL DEFAULT now()
);


-- ─────────────────────────────────────────
-- ÍNDICES
-- ─────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_gastos_fecha          ON gastos(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_gastos_rubro          ON gastos(rubro);
CREATE INDEX IF NOT EXISTS idx_gastos_persona        ON gastos(persona);
CREATE INDEX IF NOT EXISTS idx_gastos_medio_pago     ON gastos(medio_pago_id);
CREATE INDEX IF NOT EXISTS idx_ingresos_fecha        ON ingresos(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_mov_ahorro_origen     ON movimientos_ahorro(ubicacion_origen);
CREATE INDEX IF NOT EXISTS idx_mov_ahorro_destino    ON movimientos_ahorro(ubicacion_destino);
CREATE INDEX IF NOT EXISTS idx_mov_ahorro_fecha      ON movimientos_ahorro(fecha DESC);


-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────

ALTER TABLE rubros               ENABLE ROW LEVEL SECURITY;
ALTER TABLE medios_pago          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_ingreso        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ubicaciones_ahorro   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_imports          ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingresos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_ahorro   ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas                ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos_recurrentes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingresos_recurrentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos         ENABLE ROW LEVEL SECURITY;

-- DROP previos para re-ejecutabilidad
DROP POLICY IF EXISTS "hogar" ON rubros;
DROP POLICY IF EXISTS "hogar" ON medios_pago;
DROP POLICY IF EXISTS "hogar" ON tipos_ingreso;
DROP POLICY IF EXISTS "hogar" ON ubicaciones_ahorro;
DROP POLICY IF EXISTS "hogar" ON pdf_imports;
DROP POLICY IF EXISTS "hogar" ON gastos;
DROP POLICY IF EXISTS "hogar" ON ingresos;
DROP POLICY IF EXISTS "hogar" ON movimientos_ahorro;
DROP POLICY IF EXISTS "hogar" ON metas;
DROP POLICY IF EXISTS "hogar" ON gastos_recurrentes;
DROP POLICY IF EXISTS "hogar" ON ingresos_recurrentes;
DROP POLICY IF EXISTS "hogar" ON presupuestos;

-- Política única: cualquier usuario autenticado del hogar puede leer y escribir todo.
CREATE POLICY "hogar" ON rubros               FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "hogar" ON medios_pago          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "hogar" ON tipos_ingreso        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "hogar" ON ubicaciones_ahorro   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "hogar" ON pdf_imports          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "hogar" ON gastos               FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "hogar" ON ingresos             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "hogar" ON movimientos_ahorro   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "hogar" ON metas                FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "hogar" ON gastos_recurrentes   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "hogar" ON ingresos_recurrentes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "hogar" ON presupuestos         FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ─────────────────────────────────────────
-- STORAGE (buckets + políticas)
-- ─────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('tickets',       'tickets',       false),
  ('pdf-resumenes', 'pdf-resumenes', false)
ON CONFLICT (id) DO NOTHING;

-- Tickets (fotos de gastos)
DROP POLICY IF EXISTS "tickets_select" ON storage.objects;
DROP POLICY IF EXISTS "tickets_insert" ON storage.objects;
DROP POLICY IF EXISTS "tickets_delete" ON storage.objects;

CREATE POLICY "tickets_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'tickets');
CREATE POLICY "tickets_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tickets');
CREATE POLICY "tickets_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tickets');

-- PDFs de resúmenes de tarjeta
DROP POLICY IF EXISTS "pdf_select" ON storage.objects;
DROP POLICY IF EXISTS "pdf_insert" ON storage.objects;
DROP POLICY IF EXISTS "pdf_delete" ON storage.objects;

CREATE POLICY "pdf_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'pdf-resumenes');
CREATE POLICY "pdf_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pdf-resumenes');
CREATE POLICY "pdf_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'pdf-resumenes');


-- ─────────────────────────────────────────
-- DATOS SEMILLA
-- ─────────────────────────────────────────

-- Rubros de gasto (spec sección 11)
INSERT INTO rubros (nombre, icono) VALUES
  ('Alquiler',            '🏠'),
  ('Supermercado',        '🛒'),
  ('Restaurantes',        '🍽️'),
  ('Delivery',            '🛵'),
  ('Social',              '🎉'),
  ('Salud',               '🏥'),
  ('Auto',                '🚗'),
  ('Limpieza y Hogar',    '🧹'),
  ('Suscripciones',       '📺'),
  ('Ropa e Indumentaria', '👕'),
  ('Oficina',             '💼'),
  ('Deporte',             '⚽'),
  ('Transporte',          '🚌'),
  ('Cancha',              '🏟️'),
  ('Otros',               '📦')
ON CONFLICT (nombre) DO NOTHING;

-- Tipos de ingreso (spec sección 11)
INSERT INTO tipos_ingreso (nombre, moneda_default) VALUES
  ('Sueldo Mati',          'ARS'),
  ('Sueldo Sofi',          'ARS'),
  ('Aguinaldo',            'ARS'),
  ('Alquiler cobrado',     'ARS'),
  ('Negocio electrónica',  'USD'),
  ('Otro / nuevo negocio', 'ARS')
ON CONFLICT (nombre) DO NOTHING;

-- Medios de pago (semilla inicial — agregar tarjetas reales desde el panel admin)
INSERT INTO medios_pago (nombre, tipo, titular, moneda) VALUES
  ('Efectivo',             'efectivo',       'hogar', 'ARS'),
  ('Transferencia',        'transferencia',  'hogar', 'ARS'),
  ('Mercado Pago Mati',    'billetera',      'mati',  'ARS'),
  ('Mercado Pago Sofi',    'billetera',      'sofi',  'ARS'),
  ('Tarjeta Crédito Mati', 'tarjeta_credito','mati',  'ARS'),
  ('Tarjeta Crédito Sofi', 'tarjeta_credito','sofi',  'ARS');

-- Ubicaciones de ahorro (todas USD; agregar en ARS desde admin si se necesita)
INSERT INTO ubicaciones_ahorro (nombre, moneda) VALUES
  ('Encima/billetera', 'USD'),
  ('Casa/efectivo',    'USD'),
  ('ICBC Mati',        'USD'),
  ('Sofi Galicia',     'USD')
ON CONFLICT (nombre) DO NOTHING;

-- Metas iniciales
INSERT INTO metas (nombre, monto_objetivo, moneda, activa, es_fondo_emergencia) VALUES
  ('Fondo de emergencia', 2000, 'USD', true, true),
  ('Viaje a Europa',      5000, 'USD', true, false);

-- Ingreso recurrente: alquiler cobrado (modo recordatorio — ajustar dia_del_mes si es necesario)
INSERT INTO ingresos_recurrentes (tipo_ingreso, dia_del_mes, modo) VALUES
  ('Alquiler cobrado', 10, 'recordatorio');
