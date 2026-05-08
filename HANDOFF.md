# HANDOFF — estado del backend al cerrar Fase 2.3

Documento de traspaso para la siguiente instancia de Claude. Léelo después
de `PLAN.md`. No reescribas este archivo salvo en la sección final
("Pendientes y notas").

---

## Fases cerradas

| Fase | Qué quedó | Commit |
|---|---|---|
| 1 | Smoke test Fastify deployado | `f74e8fe` |
| 1.1 | Build via postinstall + guard de static | `3d1b20d` |
| 1.3 | Eliminado top-level await en server.js | `b9c5b26` |
| 2.1 | Pool MySQL + migraciones idempotentes + seed + /api/health.db | `7314dc4` |
| 2.1.1 | /api/health expone dbError code | `9c8964b` |
| 2.1.cierre | Removidos campos de diagnóstico del health | `8c77081` |
| 2.2 | Auth JWT + cookie httpOnly + login/me/logout | `656a18c` |
| 2.3 | Productos CRUD + transacciones atómicas + /sales | `ef6fdcd` |
| 2.4-lite | GET /api/auth/users + GET /api/settings públicos | `15b2761` |
| 3 | Frontend base: SPA, login, AppShell, lib, vistas placeholder | `4e078ed` |
| 4 | SalesView completa con KPIs, filtros y zebra | `4e078ed` |
| 5 (POS) | POSView funcional, carrito, PaymentModal, ReceiptModal print | `a8064de` |
| 5.1 backend | orders + drivers + notifications persistentes + Telegram util + migración 002 | `8e2431a` |
| 5.2 frontend | DeliveryModal en POS, OrdersView editable, BellMenu, "En tienda" | `c527719` |
| 6 | Backend completo + 4 vistas owner-only (Inventory/Dashboard/Accounting/Settings) | `07c5bfa` |
| 6.3 | WhatsApp Business + drivers CRUD + code splitting (540KB→111KB) | `6ebeb56` |
| 6.4 | UX polish: DeliveryModal compacto sin choferes, ProductCard -15% | `<actual>` |

---

## Endpoints en producción (ya funcionan)

### Públicos
- `GET /api/health` → `{ ok, version, time, node, db, dbError }`. `db`
  es boolean, cacheado 5 segundos.
- `GET /api/auth/users` → `[{id,name,role,avatar,color}]` para los avatar
  cards del LoginScreen. Solo `active=1`. Nunca expone `password_hash`.
- `GET /api/settings` → objeto plano con todas las claves de la tabla
  settings. `taxRate` y `lowStockThreshold` casteados a `number`.

### Pedidos (`server/routes/orders.js`) — auth requerido
- `POST /api/orders` body `{items, client_name, client_phone?, client_zone?,
  client_addr, notes?, transport_type?, transport_cost?, driver_id?}`. Crea
  pedido en estado `pendiente`, decrementa stock con FOR UPDATE. **NO crea
  transacción todavía** — eso pasa al marcar entregado. Total = subtotal +
  IVA + (transport_cost si transport_type='incluido'); sino solo subtotal+IVA.
  Genera id `PED-NNNN` desde counter `order` que arranca en 5000.
- `GET /api/orders` → lista todos, items embebidos, sin filtros (límite 500).
- `PUT /api/orders/:id` body con cualquier subset de los campos editables
  (cliente, dirección, transporte, chofer, notas). Recalcula total si tocás
  transport_type o transport_cost.
- `PUT /api/orders/:id/status` body `{status, method?, cancel_reason?,
  transport_settled?}`. Lógica completa:
  - `entregado`: requiere body.method ('QR' o 'Depósito' — efectivo
    bloqueado por diseño). Crea transacción ligada a order_id con
    sale_type='delivery', si no había una. El total de la transacción es
    `order.total` (que ya incluye el transporte si transport_type='incluido').
  - `devuelto`: requiere body.transport_settled ('cliente'|'tienda'|'sin_pago').
    Revierte stock, DELETE de la transacción asociada (cascada borra items),
    guarda transport_settled y cancel_reason si vino.
  - `cancelado`: revierte stock, guarda cancel_reason si vino.
  - `problema`: solo update + crea notificación persistente
    severity='error' y dispara Telegram (si está configurado).
  - Estados terminales `devuelto` y `cancelado` no se pueden cambiar.
  - De `entregado` solo se puede ir a `devuelto`.

### Drivers (`server/routes/drivers.js`)
- `GET /api/drivers` (auth) → 4 choferes (D01..D04) seedeados con nombres
  reales. La columna driver_id en orders es opcional.

### Notificaciones (`server/routes/notifications.js`)
- `GET /api/notifications` (auth) → mezcla notifs persistentes (status='unread')
  + notifs derivadas calculadas al vuelo para stock bajo (id sintético
  `low-N`, marcadas con `derived: true`). Las derivadas se recalculan cada
  request, no se persisten para evitar duplicación.
- `PUT /api/notifications/:id/read` (auth) — marca leída una persistida.
  Las derivadas no aceptan read; se "eliminan" al subir el stock.
- `PUT /api/notifications/read-all` (auth).

### Util Telegram (`server/telegram.js`)
- `notifyAdmin(text)` lee `TELEGRAM_BOT_TOKEN` y `TELEGRAM_ADMIN_CHAT_ID`
  del entorno. Si faltan, log warning una sola vez y sigue (no bloquea).
- Solo se dispara para eventos de alta señal (actualmente: `order_problem`).
- Para activarlo en prod: crear bot con @BotFather, pegar token en panel
  Hostinger, hacer /start desde el chat de la admin, leer chat.id de
  `https://api.telegram.org/bot<TOKEN>/getUpdates`, pegar como
  TELEGRAM_ADMIN_CHAT_ID.

### Auth (`server/routes/auth.js`)
- `POST /api/auth/login` body `{id, password}` → `{token, user}`.
  JWT 12h. Setea cookie httpOnly `token` (sameSite: lax, secure en prod).
  Mismo error 401 para "user no existe" y "password mal" (no leak).
- `GET /api/auth/me` (auth) → `{user}` desde DB.
- `POST /api/auth/logout` → `{ok:true}` y limpia cookie.

### Productos (`server/routes/products.js`)
- `GET /api/products` (auth) → lista active=1, ordenada por nombre.
- `POST /api/products` (owner) → crea, retorna 201 con DTO.
- `PUT /api/products/:id` (owner) → update parcial.
- `DELETE /api/products/:id` (owner) → soft delete (active=0).
- `POST /api/products/:id/stock` (owner) body `{qty}` → delta de stock,
  permite negativo intencional.

### Transacciones (`server/routes/transactions.js`)
- `POST /api/transactions` (auth) — ATÓMICO con SELECT...FOR UPDATE.
  Body solo `{items:[{productId,qty}], method, cash_received?, cash_amount?,
  qr_amount?, sale_type?, order_id?}`. **El servidor lee precio/costo de
  la DB e ignora montos del cliente**. Calcula subtotal, IVA 13%, total,
  change. Valida pago server-side:
  - `Efectivo`: `cash_received >= total - 0.01`, sino 400.
  - `Mixto`: `|cash_amount + qr_amount - total| <= 0.01`, sino 400.
  - `QR`/`Tarjeta`: monto igual al total automático.
  Genera id `T-NNNN` via counter `tx`. Inserta tx + items + decrementa
  stock en la misma transacción. `attendedBy` se lee de DB (no del JWT)
  para que sea siempre exacto.
- `GET /api/transactions` (auth) querystring `from`, `to`, `limit` (max
  1000, default 100), `saleType` ('site'|'delivery'|'all'). Items embebidos
  con 2 queries (sin N+1). Default rango: último mes.
- `GET /api/transactions/sales` (auth) querystring `from`, `to`, `saleType`.
  Una fila por producto vendido (no por ticket). Es la fuente directa de
  `SalesView`. Incluye `current_stock` y `product_active` desde JOIN.

---

## DTOs (camelCase, snake_case → camelCase ya mapeado)

### `userToDTO` (en `server/auth.js`)
`{ id, name, role, avatar, color, canDashboard, active, firstName,
   lastName, phone, documentNumber, address }` — sin `password_hash`.

### `toProductDTO` (en `server/routes/products.js`)
`{ id, name, category, barcode, price, cost, stock, unit, active }`.
`price` y `cost` son `Number()` (mysql2 entrega DECIMAL como string).

### `toTransactionDTO` y `toSaleRowDTO` (en `server/routes/transactions.js`)
Ver el archivo. Todos los DECIMAL se convierten con `Number()`.

---

## Reglas de negocio resueltas (no las cuestiones de nuevo sin Daniel)

1. **Stock negativo permitido** en server. La realidad de la tienda
   manda; el sistema ajusta inventario después. UI puede advertir
   visualmente, pero no bloquear.
2. **Permisos por rol hardcoded**: owner=todo, vendedora=ver productos +
   crear transacciones. Si Daniel necesita granularidad, será migración 002
   en otra fase.
3. **JWT 12h**, secret de env (con fallback aleatorio + warning si falta).
   Header `Authorization: Bearer` y cookie `token` httpOnly ambos
   aceptados. Cliente lee/guarda en `localStorage` con key `pos-jwt`.
4. **Server siempre calcula montos**. El cliente solo manda `items` y
   `method` (+ `cash_received`/`cash_amount`/`qr_amount` para validar
   el pago). Esto es no-negociable por seguridad.
5. **Counter `tx`** arranca en 1000 (primer ticket es `T-1000`).

---

## Setup local (Docker MySQL compartido)

Hay un contenedor MySQL compartido con otra app del usuario:

```bash
docker ps  # super-agenda-mysql en :3306
```

DB y user dedicados (creados manualmente con CREATE DATABASE/USER, NO
está en docker-compose):

- DB: `pos_paolitas`
- User: `pos_paolitas` / `pos_paolitas_dev`
- Acceso root: `mysql -uroot -psuper_agenda_root_dev`

`.env` en raíz del proyecto (gitignored):

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=pos_paolitas
DB_PASSWORD=pos_paolitas_dev
DB_NAME=pos_paolitas
JWT_SECRET=dev-secret-cambiar-en-prod
PORT=3000
TIMEZONE=America/La_Paz
```

Probar:

```bash
# desde pos-paolitas-v2/
node --env-file=.env scripts/test-db.js   # verifica DB y seed
node --env-file=.env server.js            # levanta server
curl http://127.0.0.1:3000/api/health
```

---

## Hostinger — env vars en producción

```
DB_HOST=127.0.0.1     ← NO "localhost". Bug de Node 22 + IPv6.
DB_USER=u926460478_posuser
DB_PASSWORD=Paolita2026Mark
DB_NAME=u926460478_pospao
JWT_SECRET=<seteado en panel>
PORT=3000
TIMEZONE=America/La_Paz
```

Hostinger Business shared, framework preset Fastify, branch main, build
`npm run build` (auto via postinstall). Loader es LiteSpeed lsnode.js
con `require()` — por eso no hay top-level await.

---

## Aprendizajes incorporados (no repetir errores)

1. **Node 22 prefiere IPv6 al resolver `localhost`**. Esto causó horas
   de "ER_ACCESS_DENIED_ERROR" hasta que expuse el err.message completo
   en /api/health y vi `'user'@'::1'`. Fix: `DB_HOST=127.0.0.1`.
2. **mysql2 entrega DECIMAL como string**. Siempre `Number(row.price)`
   antes de aritmética, sino concatena.
3. **MySQL no soporta `ADD COLUMN IF NOT EXISTS`** (solo MariaDB). Si
   necesitas migración aditiva idempotente, usa el patrón
   `information_schema.columns` o checa explícitamente.
4. **No usar multipleStatements en el pool de la app**. Solo en una
   conexión efímera para correr migraciones. El pool general queda
   sin esa flag por seguridad.
5. **/api/health** debe cachear el ping. Sin cache, monitor externo +
   DB lenta = endpoint colgado.

---

## Estructura actual del repo

```
pos-paolitas-v2/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AppShell.tsx        ← sidebar + header con BellMenu
│   │   │   ├── BellMenu.tsx        ← centro de avisos (badge + dropdown)
│   │   │   ├── CategoryIcon.tsx
│   │   │   ├── EditableCell.tsx    ← inline edit reusable (text/number/select)
│   │   │   ├── Field.tsx
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── ProductCard.tsx
│   │   ├── lib/
│   │   │   ├── api.ts              ← fetch wrapper + cliente tipado
│   │   │   ├── icons.ts            ← CAT_ICON_MAP normalizado
│   │   │   ├── queries.ts          ← TanStack hooks (con optimistic en update orders)
│   │   │   ├── store.ts            ← Zustand: settings, view, cart, currentUser
│   │   │   ├── types.ts
│   │   │   └── utils.ts            ← fmt, calcTax, fmtDateTime, useDateRange
│   │   ├── views/
│   │   │   ├── OrdersView.tsx      ← tabla editable + mini-modales por status
│   │   │   ├── Placeholder.tsx     ← para vistas sin implementar
│   │   │   ├── POSView.tsx         ← caja + DeliveryModal + Payment + Receipt
│   │   │   └── SalesView.tsx
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css               ← Tailwind + estilos print del recibo
│   ├── index.html, vite.config.ts, tsconfig.json, tailwind.config.js
├── server/
│   ├── routes/
│   │   ├── auth.js
│   │   ├── drivers.js
│   │   ├── notifications.js
│   │   ├── orders.js               ← crea/edita/cambia status con lógica completa
│   │   ├── products.js
│   │   ├── settings.js
│   │   └── transactions.js
│   ├── migrations/
│   │   ├── 001_init.sql            ← schema base (10 tablas)
│   │   └── 002_orders_notifications.sql  ← status nuevos, columnas y notifications
│   ├── auth.js
│   ├── db.js
│   ├── notifications.js            ← createNotification + lowStockNotifications
│   ├── seed.js                     ← 4 drivers reales con ON DUPLICATE KEY UPDATE
│   └── telegram.js                 ← notifyAdmin opt-in via env
├── scripts/test-db.js
├── server.js
├── PLAN.md, HANDOFF.md
├── .env (gitignored), .env.example, .gitignore, package.json
```

---

## Endpoints nuevos en Fase 6

### Settings (`server/routes/settings.js`)
- `PUT /api/settings` (requireOwner) — body con subset de claves de `ALLOWED_KEYS`.
  Claves numéricas (taxRate, lowStockThreshold) se guardan como string; el GET ya castea.

### Users (`server/routes/users.js`) — owner-only excepto PUT self
- `GET /api/users` — todos active=1, sin password_hash.
- `POST /api/users` body `{id, name, password, role, avatar?, color?, firstName?}`.
  bcrypt + can_dashboard=1 si role=owner.
- `PUT /api/users/:id` parcial. Solo owner puede cambiar role. Owner o self puede editar resto.
- `DELETE /api/users/:id` (owner) soft delete. Guard: no eliminar último owner ni a uno mismo.

### Expenses (`server/routes/expenses.js`) — requireOwner
- `GET /api/expenses` ?from=&to= (default último mes).
- `POST /api/expenses` `{date, category, description, amount, notification_id?}`.
  ID `EXP-NNNN` desde counter `expense` (arranca en 1000).
  Si viene `notification_id`, marca esa notif como read (para transport_loss).
- `PUT /api/expenses/:id` parcial.
- `DELETE /api/expenses/:id` físico.
- `GET /api/expenses/categories` → lista estática de categorías sugeridas.

### Dashboard (`server/routes/dashboard.js`) — requireOwner
- `GET /api/dashboard` ?from=&to= (default último mes).
  Retorna: `{totalRevenue, totalCOGS, grossProfit, totalTax, totalExpenses, netProfit,
             txCount, byUser[], byMethod[], bySaleType[], topProducts[], lowStock[]}`.
  `netProfit = totalRevenue - totalCOGS - totalTax - totalExpenses`.

### Orders actualizado
- `devuelto + transport_settled='tienda'`: crea notif `transport_loss` severity='warning'
  con instrucción de registrar el gasto manualmente en Contabilidad.
- POST y PUT (cambio de driver_id): llaman `notifyDriver` async fire-and-forget.

### Drivers CRUD (`server/routes/drivers.js`) — owner para CRUD, auth para list
- `GET /api/drivers` — lista active=1, ordena por nombre. DTO incluye `whatsappId` y `active`.
- `POST /api/drivers` (owner) `{id, name, phone, plate?, whatsappId?}` → 201 con DTO.
- `PUT /api/drivers/:id` (owner) parcial.
- `DELETE /api/drivers/:id` (owner) soft delete.

### WhatsApp Business (`server/whatsapp.js`)
- `notifyDriver(driver, order, log)` usa Cloud API v20.0.
- Env vars requeridos: `WHATSAPP_PHONE_NUMBER_ID` y `WHATSAPP_ACCESS_TOKEN`.
  Si faltan, log warning una sola vez y la función es no-op (no rompe nada).
- Si el driver no tiene `whatsapp_id`, salta el envío.
- Mensaje plano con id, cliente, dirección, total. Sin templates por ahora
  (la app de Meta puede requerir verificación para mensajes proactivos
  fuera de la ventana de 24h).

**Setup en producción para activar:**
1. Crear app en https://developers.facebook.com → WhatsApp Business.
2. Obtener `phone number ID` (no es el número, es un identificador) y un
   `access token` (system user permanente, no temporary).
3. Setear ambos en panel de Hostinger como env vars.
4. Para cada chofer, setear `whatsapp_id` desde Settings → Choferes (formato
   E.164 sin '+', solo dígitos: ej "59178001005").
5. El chofer debe iniciar conversación con el número de la tienda primero
   (sino los mensajes van al "no opt-in" y se rebotan).

---

## Pendientes y notas (la siguiente instancia escribe acá si necesita)

<!-- Si tomas una decisión no obvia o dejas algo a medias, anótalo
     en bullets. No borres lo de arriba. -->

- **2026-05-07 — Fases 2.4-lite + 3 + 4 cerradas.** Frontend SPA monta,
  login con admin/admin123 entra al shell, sidebar respeta `ownerOnly`
  (esperancita ve POS, Ventas y Pedidos; admin ve todo). SalesView
  consume `/api/transactions/sales` con períodos hoy/semana/mes/año y
  filtros site/delivery + búsqueda; ya hay 4 transacciones de ejemplo
  en producción (T-1001..T-1004) con mezcla de tipos y métodos.
- **Decisión menor:** vistas no implementadas (Pedidos, Dashboard,
  Contabilidad, Inventario, Ajustes) usan un componente `Placeholder`
  reutilizable en `client/src/views/Placeholder.tsx`. Cuando se
  implementen sus vistas reales, reemplazar la línea correspondiente
  en `VIEWS` de `client/src/components/AppShell.tsx`.
- **Decisión menor:** `client/src/lib/icons.ts` normaliza la categoría
  (lowercase + strip de diacríticos) para que tanto "Lácteos" como
  "Lacteos" mapeen al mismo icono. Si la BD agrega categorías nuevas,
  basta con agregarla al `RAW_MAP` en su forma sin tilde.
- **2026-05-08 — Fase 5 (POS) cerrada.** POSView vendible con búsqueda,
  grid, carrito, PaymentModal (Efectivo/QR/Tarjeta/Mixto) y ReceiptModal
  imprimible. CSS `@media print` en index.css usa `.receipt-print` para
  aislar el ticket al imprimir.
- **2026-05-08 — Fase 5.1+5.2 (delivery + pedidos + avisos) cerradas.**
  POS toggle delivery → DeliveryModal crea pedido; OrdersView con
  edición inline de cliente/transporte/chofer/notas y dropdowns de
  status; mini-modales para entregar (QR/Depósito), devolver (transport
  settled) y cancelar (razón). BellMenu en header lee notifs
  persistentes + stock bajo derivado.
- **Drivers en stand-by**: el dropdown muestra 4 choferes reales (Jonhy,
  Gerson, Rolando, Felix) pero la operativa real está apagada. Cuando
  Daniel conecte WhatsApp Business + Coexistence, hay que: (1) agregar
  `whatsapp_id` a la tabla `drivers`, (2) en POST /api/orders cuando
  `driver_id` viene set, llamar a un util `notifyDriver(driver, order)`
  similar a notifyAdmin pero usando WhatsApp Business API. El frontend
  ya está listo: el aviso al chofer es transparente desde su punto.
- **Telegram** funciona localmente con env vars. En prod aún no se
  configuró TELEGRAM_BOT_TOKEN ni TELEGRAM_ADMIN_CHAT_ID — la notif de
  problema queda solo en la campana hasta que se setee. Pasos para
  configurar arriba en el bloque "Util Telegram".
- **2026-05-08 — Fase 6 cerrada.** Backend completo: PUT settings, CRUD users/expenses,
  GET dashboard. Frontend: InventoryView (tabla + modal CRUD + ajuste stock + Excel
  import/export), DashboardView (6 KPIs + donut método/tipo + bar top-10 + byUser + lowStock),
  AccountingView (IVA neto + P&L + CRUD gastos), SettingsView (3 tabs).
  AppShell reemplaza todos los Placeholder por las vistas reales.
- **Decisión — transport_loss**: cuando un pedido pasa a devuelto con transport_settled='tienda'
  y tiene transport_cost>0, se crea una notif persistente type='transport_loss' severity='warning'.
  La admin registra el gasto manualmente en AccountingView. POST /api/expenses acepta
  `notification_id` opcional; si viene, marca esa notif como read.
- **2026-05-08 — Fase 6.3 cerrada (commit 6ebeb56).** Migración 003 (drivers.whatsapp_id +
  drivers.active), util `notifyDriver`, integración fire-and-forget en POST y PUT orders,
  CRUD drivers en backend + tab Choferes en SettingsView. Validado en producción.
- **2026-05-08 — Code splitting cerrado (mismo commit).** Bundle inicial 540KB→111KB
  (gzip 29KB). Vendor chunks separados: react/charts/xlsx/query. Vistas owner-only
  cargan bajo demanda con `lazy` + `Suspense`.
- **Pendiente activación WhatsApp en prod**: faltan env vars `WHATSAPP_PHONE_NUMBER_ID` y
  `WHATSAPP_ACCESS_TOKEN` en panel Hostinger. Pasos detallados arriba en el bloque
  "WhatsApp Business". Sin esas vars, `notifyDriver` es no-op (no rompe).
- **Pendiente activación Telegram en prod**: faltan `TELEGRAM_BOT_TOKEN` y
  `TELEGRAM_ADMIN_CHAT_ID`. Pasos en el bloque "Util Telegram" arriba.
- **2026-05-08 — Fase 6.4 UX (commit 236b4a0 + siguiente).**
    - **DeliveryModal sin choferes**: Daniel pidió quitar el selector de chofer
      del wizard de creación. La asignación queda solo en OrdersView (edición
      inline) una vez creado el pedido. POST /api/orders sigue aceptando
      `driver_id` opcional, simplemente el cliente manda `null`.
    - **DeliveryModal compacto**: pasó de `size="lg"` a `"md"`, KPIs
      condensados en una franja, fields con padding chico (py-1.5), notas
      como input simple, botones de transporte tamaño compacto. Componente
      `CompactField` local para labels uppercase de 10px.
    - **ProductCard -15% en POS**: padding p-4→p-3, icono 80px→64px (28→24),
      nombre text-lg→text-base, precio text-2xl→text-xl, stock text-sm→text-xs,
      bordes rounded-2xl→rounded-xl. Grid del POS pasa de
      `minmax(150px,1fr)` a `minmax(128px,1fr)` y `gap-3`→`gap-2.5` para
      aprovechar el card más chico (≈15% más productos por fila).

---

## Prompt para la siguiente instancia

```
Soy Daniel. POS Paolita's Market v2, todas las fases hasta la 6.4 están cerradas.

Proyecto local: /Users/dran/Documents/Codex openai/POS PAO/pos-paolitas-v2/
GitHub: https://github.com/Dran9/paosmarket-v2 (branch main)
Producción: https://mediumaquamarine-curlew-407592.hostingersite.com

PRIMERA ACCIÓN: lee PLAN.md ENTERO y HANDOFF.md ENTERO antes de tocar nada.
Después dame plan corto (3-5 bullets) de lo que vas a hacer y procedé sin
esperar OK (modo autónomo, igual que las instancias anteriores).

# ESTADO REAL AL 2026-05-08

Funcional end-to-end y desplegado:
- POSView con búsqueda, scanner, carrito, PaymentModal (Efectivo/QR/Tarjeta/Mixto),
  ReceiptModal imprimible, toggle delivery → DeliveryModal compacto.
- SalesView, OrdersView (edición inline + status workflow + asignación de chofer),
  InventoryView (CRUD + import/export Excel + ajuste stock),
  DashboardView (6 KPIs + 2 donuts + bar top10 + 2 tablas),
  AccountingView (resumen IVA + P&L + CRUD gastos),
  SettingsView (4 tabs: Negocio, General, Empleados, Choferes con WhatsApp ID).
- Backend completo (auth, products, transactions, orders, drivers CRUD, expenses,
  users, settings PUT, dashboard, notifications, whatsapp util).
- Code splitting activo: bundle inicial 108KB (gzip 29KB).
- Migraciones 001+002+003 corridas en prod.

# QUÉ NO HACER

- No reintroducir el selector de choferes en DeliveryModal (Daniel lo quitó
  explícitamente). La asignación va solo desde OrdersView una vez creado el
  pedido.
- No instalar deps nuevas. xlsx, chart.js, react-chartjs-2, react-hook-form,
  react-hot-toast, lucide-react ya están.
- No hardcodear "Paolita's Market". Siempre desde settings.businessName.
- No usar Next.js, Express, Redux, ORMs, React Router. Stack fijado en PLAN.md.
- No commitear client/dist/ ni .env.
- DB_HOST=127.0.0.1 en prod (NO "localhost", IPv6 bug en Node 22).
- No top-level await en server.js (Hostinger lsnode require()).

# PENDIENTES DE ACTIVACIÓN (no son de código, son de configuración)

1. **WhatsApp Business**: agregar en panel Hostinger:
   - WHATSAPP_PHONE_NUMBER_ID (de Meta developer console)
   - WHATSAPP_ACCESS_TOKEN (system user permanente, no temporary)
   Después poblar `whatsapp_id` por chofer desde Settings → Choferes.
   Util `server/whatsapp.js` ya hace fire-and-forget en POST/PUT orders.

2. **Telegram (admin notifs)**: agregar TELEGRAM_BOT_TOKEN y TELEGRAM_ADMIN_CHAT_ID.
   Pasos completos en HANDOFF.md sección "Util Telegram".

# POSIBLES TAREAS PARA ESTA INSTANCIA

(elegir según lo que pida Daniel, NO inventar trabajo)

A. **F2/F3/ESC atajos de teclado** en POSView (cobrar/delivery/cerrar modal).
   Mencionado como deseable en PLAN.md sección Fase 6 polish.

B. **Recibo imprimible mejorado** — el ReceiptModal ya imprime con CSS
   @media print, pero podría agregarse logo, NIT, dirección desde settings.

C. **Service Worker** para cache de JS/CSS/HTML offline (no de API). Mencionado
   en PLAN.md Fase 6 polish.

D. **Bulk import endpoint** — actualmente Excel import dispara N requests POST
   /api/products. Si Paola importa 500 filas se hacen 500 requests. Podría
   agregarse POST /api/products/bulk que acepte array.

E. **Refinamientos UX que Daniel descubra al usar la app real** — Daniel
   prueba en navegador y suele pedir compactar, agrandar, reordenar cosas.
   Prioridad: hacer exactamente lo que pide, no extender alcance.

F. **Bugs si aparecen** — diagnosticar con root cause, no parchear con
   try/catch genérico.

# REGLAS DE TRABAJO

- IVA 13% Bolivia, server siempre calcula montos
- Soft delete (active=0). Excepción: tx asociada a pedido devuelto sí se
  elimina (ya implementado).
- bcrypt + JWT secret de env. Prepared statements.
- Migraciones idempotentes (la 002 y 003 usan ALTER directo, registradas
  en _migrations).
- Stock negativo permitido en server.
- Permisos: owner=todo, vendedora=POS+Ventas+Pedidos.
- UI y commits en español.

# ARCHIVOS QUE PROBABLEMENTE TENGAS QUE TOCAR

Backend: server/routes/{products,transactions,orders,users,expenses,
  dashboard,settings,drivers,notifications,auth}.js, server/{db,auth,
  notifications,telegram,whatsapp}.js

Frontend: client/src/lib/{api,queries,store,types,utils,icons}.ts,
  client/src/views/{POSView,SalesView,OrdersView,InventoryView,
  DashboardView,AccountingView,SettingsView}.tsx,
  client/src/components/{AppShell,LoginScreen,BellMenu,Modal,Field,
  EditableCell,CategoryIcon,ProductCard}.tsx

# FLUJO ESPERADO

1. Plan corto (3-5 bullets) en chat
2. Implementar
3. npm run build (debe pasar limpio)
4. Probar local con node --env-file=.env server.js + curl
5. Commit en español + push origin main
6. Esperar deploy Hostinger (~90s) — pollear /api/health hasta db:true
   Y verificar bundle nuevo si tocaste frontend (grep del nombre del chunk
   en index.html servido)
7. Validar endpoint nuevo o feature en producción
8. Actualizar HANDOFF.md sección "Pendientes y notas" si dejaste algo
9. Actualizar el prompt al final de HANDOFF.md si la siguiente instancia
   necesita contexto distinto al actual
```

