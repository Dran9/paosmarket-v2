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

---

## Endpoints en producción (ya funcionan)

### Públicos
- `GET /api/health` → `{ ok, version, time, node, db, dbError }`. `db`
  es boolean, cacheado 5 segundos.

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
├── client/                      ← solo index.html y main.tsx mínimos de Fase 1
├── server/
│   ├── routes/
│   │   ├── auth.js
│   │   ├── products.js
│   │   └── transactions.js
│   ├── migrations/
│   │   └── 001_init.sql         ← schema completo (10 tablas + _migrations)
│   ├── auth.js                  ← setupAuth + decorators + userToDTO
│   ├── db.js                    ← pool, query, nextId, round2, initDB
│   └── seed.js                  ← admin, esperancita, 6 productos, 2 drivers, 14 settings
├── scripts/
│   └── test-db.js
├── server.js                    ← entry point, registra plugins y rutas
├── PLAN.md                      ← fuente de verdad
├── HANDOFF.md                   ← este archivo
├── .env                         ← gitignored, credenciales DB local
├── .env.example
├── .gitignore
└── package.json
```

---

## Pendientes y notas (la siguiente instancia escribe acá si necesita)

<!-- Si tomas una decisión no obvia o dejas algo a medias, anótalo
     en bullets. No borres lo de arriba. -->

- (vacío)
