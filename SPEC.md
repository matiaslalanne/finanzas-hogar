# Especificación: App de Finanzas Personales y de Hogar (Mati & Sofi)

> Documento para entregar a **Claude Code** como guía de construcción.
> Es la fuente de verdad del proyecto. Guardalo en la raíz del repo como `SPEC.md`.

---

## 1. Objetivo

Construir una **PWA (Progressive Web App) instalable** para que una pareja (Mati y Sofi) gestione sus finanzas compartidas con **mínima fricción en la carga diaria** y **máxima claridad en el análisis** de en qué se gasta la plata.

Principios rectores, en orden de prioridad:

1. **Carga de datos ultrarrápida** (registrar un gasto en 3 taps o menos).
2. **Análisis claro** de gastos por rubro, persona y medio de pago.
3. **Navegación simple**, mobile-first, instalable en el inicio del celular y usable también desde computadora.
4. **Economía 100% compartida**: no hay división de gastos entre personas. Sofi y Mati ven y manejan exactamente lo mismo. El campo "persona" solo sirve para *atribuir quién cargó o a quién corresponde* un movimiento, nunca para dividir cuentas.

Todo el texto de la interfaz va en **español (rioplatense)**.

---

## 2. Stack técnico

- **Frontend:** React + Vite + Tailwind CSS, configurado como **PWA** (manifest + service worker, instalable en iOS/Android/desktop).
- **Backend / Base de datos:** **Supabase** (PostgreSQL + Auth + Storage). Toda la persistencia y el histórico viven acá.
- **IA para resúmenes PDF:** **Netlify Function** (serverless) que recibe el PDF, llama a la **API de Anthropic (Claude)** para extraer y categorizar gastos, y devuelve una tabla editable. **La API key vive solo en variables de entorno de Netlify, nunca en el navegador.**
- **Deploy:** **Netlify** (incluye las Functions). El sitio queda en una URL pública instalable.
- **Almacenamiento de archivos** (PDFs de resúmenes, fotos de tickets): Supabase Storage.

---

## 3. Usuarios y autenticación

- **Un único login compartido del hogar** (email + contraseña vía Supabase Auth). Ambos entran con la misma cuenta.
- Al entrar por primera vez en un dispositivo, un selector **"¿Quién sos? → Sofi / Mati"** que el dispositivo **recuerda** (localStorage). Se puede cambiar desde ajustes.
- Esa identidad se usa como valor por defecto del campo `persona` al cargar, pero siempre es editable en el momento.
- No atar la identidad al hardware del celular (debe funcionar igual desde la compu).

---

## 4. Modelo de datos (Supabase / PostgreSQL)

> Todas las tablas con `id` UUID (default `gen_random_uuid()`) y `created_at` timestamptz default `now()`.
> Activar **Row Level Security**: solo usuarios autenticados del hogar acceden (ver sección 9).

### 4.1 `gastos`
| campo | tipo | notas |
|---|---|---|
| id | uuid | PK |
| fecha | date | fecha del gasto |
| monto | numeric | siempre positivo |
| moneda | text | `ARS` o `USD`, default `ARS` |
| rubro | text | ver datos semilla (sección 11) |
| medio_pago_id | uuid | FK a `medios_pago` (ver 4.10) |
| persona | text | `sofi` / `mati` |
| descripcion | text | opcional |
| foto_url | text | opcional, foto de ticket (Supabase Storage) |
| origen | text | `manual` / `pdf` |
| pdf_import_id | uuid | nullable, FK a `pdf_imports` si vino de un resumen |
| created_at | timestamptz | |

### 4.2 `ingresos`
| campo | tipo | notas |
|---|---|---|
| id | uuid | PK |
| fecha | date | |
| monto | numeric | |
| moneda | text | `ARS` / `USD`, default `ARS` |
| tipo_ingreso | text | FK lógica a `tipos_ingreso` (extensible) |
| persona | text | `sofi` / `mati` / `hogar` |
| descripcion | text | opcional |
| created_at | timestamptz | |

### 4.3 `tipos_ingreso` (editable desde admin)
| campo | tipo | notas |
|---|---|---|
| id | uuid | PK |
| nombre | text | ej: "Sueldo Mati", "Aguinaldo", "Negocio electrónica" |
| moneda_default | text | `ARS` / `USD` |
| activo | boolean | |

Semilla: Sueldo Mati (ARS), Sueldo Sofi (ARS), Aguinaldo (ARS), Alquiler cobrado (ARS), Negocio electrónica (USD), Otro / nuevo negocio (ARS). **Debe ser fácil agregar tipos nuevos** desde el admin.

### 4.4 `ubicaciones_ahorro`
| campo | tipo | notas |
|---|---|---|
| id | uuid | PK |
| nombre | text | ej: "ICBC Mati", "Casa/efectivo" |
| moneda | text | `ARS` / `USD` |
| activo | boolean | |

El **saldo de cada ubicación es derivado** (suma de movimientos), no se guarda como número fijo. El saldo inicial se carga como un movimiento tipo `saldo_inicial` desde el admin.

### 4.5 `movimientos_ahorro` (ledger / libro de movimientos)
| campo | tipo | notas |
|---|---|---|
| id | uuid | PK |
| fecha | date | |
| tipo | text | `saldo_inicial`, `deposito`, `retiro`, `transferencia`, `compra_usd`, `venta_usd`, `ingreso_negocio`, `ajuste` |
| ubicacion_origen | uuid | nullable (en depósitos/saldo_inicial puede ser null) |
| ubicacion_destino | uuid | nullable (en retiros puede ser null) |
| monto | numeric | monto en la moneda de la operación |
| moneda | text | `ARS` / `USD` |
| cotizacion | numeric | **solo** para `compra_usd` / `venta_usd` |
| monto_pesos | numeric | calculado = USD × cotización (solo compra/venta) |
| persona | text | quién hizo el movimiento |
| descripcion | text | opcional |
| created_at | timestamptz | |

### 4.6 `metas`
| campo | tipo | notas |
|---|---|---|
| id | uuid | PK |
| nombre | text | ej: "Viaje a Europa", "Fondo de emergencia" |
| monto_objetivo | numeric | |
| moneda | text | `USD` típicamente |
| fecha_objetivo | date | nullable |
| activa | boolean | |
| es_fondo_emergencia | boolean | el fondo es fijo y no se "completa" como meta de gasto |

Semilla: Fondo de emergencia = USD 2.000 (fijo). Viaje a Europa = meta activa hacia la que va el ahorro nuevo.

### 4.7 `gastos_recurrentes`
| campo | tipo | notas |
|---|---|---|
| id | uuid | PK |
| rubro | text | |
| monto | numeric | |
| moneda | text | |
| medio_pago | text | |
| dia_del_mes | int | día en que se genera (ej: 1 = alquiler) |
| descripcion | text | |
| activo | boolean | |

Ej: Alquiler, suscripciones. Se generan automáticamente como filas en `gastos` cada mes (ver flujo 7.6).

### 4.8 `pdf_imports`
| campo | tipo | notas |
|---|---|---|
| id | uuid | PK |
| fecha | date | |
| archivo_url | text | PDF en Supabase Storage |
| estado | text | `pendiente` / `confirmado` |
| raw_json | jsonb | salida cruda de la IA antes de confirmar |
| created_at | timestamptz | |

### 4.9 `presupuestos` *(solo crear tabla, sin UI completa en v1)*
| campo | tipo | notas |
|---|---|---|
| id | uuid | PK |
| rubro | text | |
| monto_mensual | numeric | |
| mes | text | `YYYY-MM` |

Dejar la tabla creada para la v2; **no construir la UI de presupuestos en v1**.

### 4.10 `medios_pago` (cuentas, tarjetas y bancos — gestionable desde admin)
Tanto Mati como Sofi tienen **varios bancos y varias tarjetas**. Esto NO es una lista fija de strings: es una tabla con ABM completo en el panel de administrador.

| campo | tipo | notas |
|---|---|---|
| id | uuid | PK |
| nombre | text | ej: "Visa ICBC Mati", "MP Sofi", "Mastercard Galicia Sofi" |
| tipo | text | `tarjeta_credito`, `tarjeta_debito`, `cuenta_banco`, `billetera`, `efectivo`, `transferencia` |
| banco | text | nullable, ej: "ICBC", "Galicia" |
| titular | text | `mati` / `sofi` / `hogar` |
| moneda | text | `ARS` / `USD` (la mayoría ARS) |
| activo | boolean | |

- Cada **gasto** referencia un `medio_pago_id`.
- Cada **resumen de tarjeta importado** se asocia a un `medio_pago` de tipo `tarjeta_credito` (se elige al subir el PDF).
- Permite agregar/editar/desactivar tarjetas y cuentas sin tocar código.

### 4.11 `ingresos_recurrentes` (recordatorios de ingreso mensual)
Para ingresos que se repiten todos los meses pero **pueden cambiar de monto** (ej: alquiler cobrado, que varía por aumentos y expensas).

| campo | tipo | notas |
|---|---|---|
| id | uuid | PK |
| tipo_ingreso | text | ej: "Alquiler cobrado" |
| monto_sugerido | numeric | nullable, último monto como referencia |
| dia_del_mes | int | día en que se espera cobrar |
| modo | text | `automatico` (monto fijo) o `recordatorio` (pide confirmar monto) |
| activo | boolean | |

El **alquiler usa modo `recordatorio`**: cada mes la app avisa "¿cobraste el alquiler? cargá el monto", precargando el del mes anterior como sugerencia, pero **sin asumir que es fijo**.

---

## 5. Lógica de doble moneda (importante)

- Ingresos y egresos del **negocio de electrónica son siempre en USD** y **no impactan pesos**.
- Sueldos, aguinaldo y alquiler son en **ARS**.
- **El único cruce ARS↔USD** ocurre al **comprar o vender dólares** (ver flujo 7.4). En ese momento un modal pide **cantidad de USD** y **cotización**, y de ahí se calcula el monto en pesos.
- **No hay cotización automática.** Nunca se consulta un dólar online.
- El patrimonio se muestra **separado por moneda**: total en ARS y total en USD, cada uno por su lado. No mezclarlos en un único número convertido por defecto.
- Si en algún panel conviene un "valor estimado total", usar como referencia la **última cotización registrada** en un `compra_usd`/`venta_usd`, mostrándola claramente como estimación editable. Es opcional y secundario.

### 5.1 Resúmenes de tarjeta con consumos en pesos Y en dólares (stop debit)
Un resumen de tarjeta típicamente trae **un total en ARS y un total en USD** (los USD suelen ser consumos de viajes, suscripciones, etc.). El usuario hace **stop debit**: paga la parte en pesos con pesos, y **cancela la parte en dólares directamente con dólares**, evitando el impuesto PAÍS, percepciones y demás cargos que el banco aplicaría si convirtiera los USD a pesos.

Reglas que la app debe respetar:
- Los consumos en ARS se registran en **ARS**; los consumos en USD se registran en **USD**. Cada uno por su carril.
- **Nunca convertir los consumos en dólares a pesos** ni sumarles impuestos/percepciones. USD 500 de consumo = USD 500, punto.
- Al confirmar el pago de un resumen:
  - El **total ARS** sale de una cuenta/medio en pesos.
  - El **total USD** sale de una **ubicación de ahorro en dólares** (stop debit), a valor nominal, como un movimiento de ahorro tipo `retiro`.
- Esto mantiene los ahorros en USD correctos sin inflar el gasto con impuestos que el usuario no paga.

---

## 6. Pantallas (navegación)

Barra de navegación inferior (mobile-first) con accesos: **Inicio · Cargar · Ahorros · Histórico · Más**. Botón flotante "＋" siempre visible para carga rápida.

### 6.1 Inicio / Dashboard
- Resumen del **mes actual**: total ingresos (ARS), total gastos (ARS), balance del mes.
- **Gastos por rubro** del mes (gráfico de torta o barras + lista ordenada de mayor a menor).
- **Ahorros totales**: card con total en ARS y total en USD (separados), desglosado por ubicación.
- **Metas**: barra de progreso del Viaje a Europa y estado del Fondo de emergencia.
- Comparación rápida vs. mes anterior (gastaron más/menos).

### 6.2 Cargar gasto (la pantalla estrella — máxima velocidad)
- **Teclado numérico grande** para el monto al abrir.
- Selección de **rubro con botones/chips grandes con íconos** (no dropdown).
- **Medio de pago** en chips.
- Persona prellenada con la identidad del dispositivo (editable con un tap).
- Fecha = hoy por defecto (editable).
- Descripción opcional y botón para **adjuntar foto del ticket**.
- Moneda ARS por defecto; toggle a USD disponible.
- Guardar en 1 tap. Confirmación visual breve (toast) y vuelve listo para cargar el siguiente.

### 6.3 Cargar ingreso
- Igual de simple. Selección de **tipo de ingreso** (chips, incluye aguinaldo y "nuevo negocio").
- Monto, moneda (default según el tipo), fecha, persona, descripción.

### 6.4 Import de resumen de tarjeta (PDF + IA)
- Botón "Subir resumen" → **elegir a qué tarjeta corresponde** (medio de pago tipo `tarjeta_credito`) → adjuntar PDF.
- Se sube a Storage y se manda a la Netlify Function que llama a Claude.
- Claude devuelve filas estructuradas separando **consumos en ARS** y **consumos en USD**: fecha, descripción, monto, moneda, **rubro sugerido**.
- Se muestra una **tabla editable de revisión** (con los ARS y los USD claramente diferenciados) donde Mati ajusta rubros, corrige montos y descarta filas antes de confirmar.
- **Detección de duplicados** (ver flujo 7.5): marcar filas que coincidan con gastos ya cargados a mano.
- **Stop debit (ver 5.1):** los consumos USD se registran en USD sin convertir ni sumar impuestos. Al confirmar, ofrecer registrar el pago del resumen: total ARS desde una cuenta en pesos, total USD desde una ubicación de ahorro en dólares.
- Al confirmar, se insertan en `gastos` con `origen='pdf'`, el `medio_pago_id` de la tarjeta elegida y `pdf_import_id`.

### 6.5 Ahorros
- Lista de **ubicaciones** con su saldo actual (derivado), agrupadas por moneda.
- Total ARS y total USD arriba.
- Botón "Nuevo movimiento" → elegir tipo: depósito, retiro, **transferencia entre ubicaciones**, **compra USD**, **venta USD**, ingreso del negocio.
- Historial de movimientos de ahorro, filtrable.

### 6.6 Metas
- Lista de metas con barra de progreso, monto actual vs objetivo, y **fecha estimada de cumplimiento** calculada según el ritmo de ahorro reciente.
- Fondo de emergencia mostrado como objetivo fijo cumplido/no cumplido.

### 6.7 Histórico
- Lista unificada de gastos e ingresos con **filtros potentes**: rango de fechas, rubro, persona, medio de pago, moneda, origen (manual/pdf).
- Buscador por texto en descripción.
- **Export a CSV** para backup.
- Editar / borrar cualquier registro.

### 6.8 Cierre de mes
- Acción "Cerrar mes" que toma un snapshot del resumen (ingresos, gastos, ahorro neto, balances por ubicación) y lo guarda como histórico mensual consultable.
- Muestra el resumen del mes comparado con el anterior.

### 6.9 Más / Administrador
- **Panel de administrador** (clave para arrancar sin migración y para manejar todo el sistema):
  - Cargar/ajustar **saldos iniciales** de cada ubicación de ahorro.
  - ABM de **medios de pago**: bancos, tarjetas de crédito/débito, cuentas, billeteras (Mati y Sofi tienen varios). Ver 4.10.
  - ABM de **ubicaciones de ahorro** (ARS y USD).
  - ABM de **tipos de ingreso** e **ingresos recurrentes** (incluye el alquiler en modo recordatorio).
  - ABM de **rubros**.
  - ABM de **gastos recurrentes**.
  - Ajustes manuales puntuales (movimiento tipo `ajuste`).
- Ajustes: cambiar identidad del dispositivo (Sofi/Mati), tema, etc.

---

## 7. Flujos clave (detallados)

### 7.1 Carga rápida de gasto
Abrir "＋" → teclear monto → tap en rubro → tap en medio de pago → Guardar. (Persona, fecha y moneda ya vienen con default razonable.) Objetivo: **≤ 3 taps + monto**.

### 7.2 Carga de ingreso
Igual, eligiendo tipo de ingreso. El tipo define la moneda por defecto (ej: "Negocio electrónica" → USD).

### 7.3 Transferencia entre ubicaciones de ahorro
Elegir origen y destino (misma moneda), monto. Se crea un movimiento `transferencia`. Los saldos se recalculan solos.

### 7.4 Compra / venta de dólares (el cruce ARS↔USD)
Al elegir **"Compra USD"** o **"Venta USD"** se abre un **modal** que pide:
- Cantidad de **USD**.
- **Cotización** (precio del dólar en ese momento, manual).
- Ubicación destino (compra) u origen (venta) en USD.
- (Opcional) ubicación ARS afectada.

La app calcula `monto_pesos = USD × cotización` y crea el movimiento con ambos valores. En **compra**: sube el saldo USD, baja el ARS. En **venta**: al revés.

### 7.5 Import de PDF con deduplicación
1. Subir PDF → Function → Claude extrae filas.
2. Para cada fila extraída, comparar contra gastos ya existentes en un rango de ±3 días con **monto igual o muy cercano**; marcar como "posible duplicado" para que Mati decida.
3. Tabla de revisión editable → confirmar → insertar solo las filas aprobadas.

### 7.6 Generación de gastos recurrentes
Al abrir la app (o vía un job mensual), revisar `gastos_recurrentes` activos cuyo `dia_del_mes` ya pasó en el mes actual y que no se hayan generado todavía; crear las filas correspondientes en `gastos`. Evitar duplicar si ya se generó ese mes.

### 7.7 Carga offline
Si no hay señal, permitir registrar el gasto localmente (cola en IndexedDB/localStorage) y **sincronizar con Supabase** cuando vuelve la conexión.

---

## 8. PWA y deploy

- `manifest.json` con nombre, íconos (varios tamaños), `display: standalone`, color de tema.
- Service worker para cache de la app shell + cola de sincronización offline.
- Instalable desde el navegador (Agregar a inicio) en celular y desktop.
- Deploy en **Netlify**; las **Netlify Functions** alojan el endpoint de la IA.
- Variables de entorno en Netlify: `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` (y `SUPABASE_SERVICE_ROLE` solo en la function si hace falta).

---

## 9. Seguridad

- **API key de Anthropic exclusivamente en la Netlify Function**, nunca en el bundle del cliente.
- **Supabase RLS activado**: solo el usuario autenticado del hogar lee/escribe. Como es una cuenta compartida, ambos ven todo.
- Validación de inputs en cliente y servidor.
- Los PDFs y fotos en Storage con acceso restringido a usuarios autenticados.

---

## 10. Diseño / UX

- **Mobile-first**, targets táctiles grandes, pensado para usar con una mano.
- Estética limpia y moderna, buena jerarquía visual, íconos por rubro.
- Feedback inmediato en cada acción (toasts, estados de carga).
- Modo claro y, si es viable, oscuro.
- Idioma: español rioplatense en toda la UI.

---

## 11. Datos semilla (usar EXACTAMENTE estos)

**Rubros de gasto:** Alquiler, Supermercado, Restaurantes, Delivery, Social, Salud, Auto, Limpieza y Hogar, Suscripciones, Ropa e Indumentaria, Oficina, Deporte, Transporte, Cancha, Otros.

**Medios de pago (semilla inicial, ampliable desde admin — son cuentas/tarjetas reales):** Efectivo, Transferencia, Mercado Pago Mati, Mercado Pago Sofi, Tarjeta Crédito Mati, Tarjeta Crédito Sofi. *(Mati y Sofi tienen varios bancos y tarjetas: agregar cada tarjeta/cuenta real con su banco y titular desde el panel de admin, ej: "Visa ICBC Mati", "Mastercard Galicia Sofi".)*

**Ubicaciones de ahorro (USD salvo que se indique):** Encima/billetera, Casa/efectivo, ICBC Mati, Sofi Galicia. *(Permitir agregar ubicaciones en ARS desde el admin para los pesos de los sueldos.)*

**Tipos de ingreso:** Sueldo Mati (ARS), Sueldo Sofi (ARS), Aguinaldo (ARS), Alquiler cobrado (ARS), Negocio electrónica (USD), Otro / nuevo negocio (ARS).

**Metas iniciales:** Fondo de emergencia = USD 2.000 (fijo). Viaje a Europa = meta activa.

---

## 12. Fuera de alcance v1 (roadmap v2)

- UI completa de **presupuestos por rubro** con alertas (tabla ya creada).
- Cotización de dólar automática (descartada por decisión del usuario).
- Multi-hogar / múltiples cuentas.
- Notificaciones push.

---

## 13. Orden sugerido de construcción

1. Setup: repo, Vite + React + Tailwind + PWA base, conexión a Supabase, Auth + selector Sofi/Mati.
2. Esquema de base de datos completo + datos semilla + RLS.
3. **Carga de gasto** (pantalla estrella) y **carga de ingreso**.
4. Histórico con filtros + export CSV.
5. Panel de **Ahorros** con movimientos, transferencias y modal de compra/venta USD.
6. **Dashboard** con resumen y gráficos.
7. **Metas** y **gastos recurrentes**.
8. **Import de PDF con IA** (Netlify Function + tabla de revisión + dedup).
9. **Cierre de mes** y **panel de administrador**.
10. Pulido de PWA (offline, instalación) y deploy en Netlify.

Construir y dejar **funcionando y probado cada bloque antes de pasar al siguiente**.
