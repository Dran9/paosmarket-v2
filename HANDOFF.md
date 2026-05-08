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
- **Pendiente — Fase 6 backend** (`Fase 2.5` original):
    - `PUT /api/settings` para editar businessName y compañía
    - `/api/users` CRUD (owner only)
    - `/api/expenses` CRUD para AccountingView
    - `/api/dashboard` resumen para DashboardView
- **Pendiente — Fase 6 frontend**: SettingsView, InventoryView (CRUD de
  productos + import Excel), DashboardView (charts), AccountingView
  (gastos + IVA + ganancia neta).
- **Decisión pendiente — costo de transporte cuando devuelto y "tienda
  paga"**: hoy se guarda solo el flag `transport_settled='tienda'` en la
  tabla orders. Cuando se implemente `/api/expenses`, hay que crear
  automáticamente un expense category='transporte_devolución' con monto
  igual a `order.transport_cost` cada vez que un pedido pase a `devuelto`
  con settled='tienda'. Mientras tanto, queda como flag para no perder data.
