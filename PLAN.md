# Plan de implementación — POS Paolita's Market v2

Documento autocontenido para construir desde cero un sistema POS para tienda de barrio. Diseñado para ejecutarse linealmente, fase por fase, sin contexto previo. Cada fase tiene criterio de aceptación verificable antes de pasar a la siguiente.

---

## 1. Stack tecnológico

| Capa | Librería | Versión | Por qué |
|---|---|---|---|
| Build cliente | Vite | ^5.4 | SPA puro, builds rápidos, sin sorpresas como `next export` |
| UI | React | ^18.3 | Estable, ecosistema maduro |
| Tipos | TypeScript | ^5.4 | Estricto en client y server |
| Estilos | Tailwind CSS | ^3.4 | Igual que la app actual |
| Iconos | lucide-react | ^0.460 | Igual que la app actual |
| Estado UI | Zustand | ^4.5 | Carrito, vista activa, filtros |
| Estado servidor | @tanstack/react-query | ^5.59 | Cache, retries, optimistic updates |
| Forms | react-hook-form | ^7.53 | Validación declarativa |
| Toasts | react-hot-toast | ^2.4 | Notificaciones |
| Charts | chart.js + react-chartjs-2 | ^4.4 / ^5.2 | Igual que la app actual |
| Excel | xlsx | ^0.18 | Import/export inventario |
| Servidor | Fastify | ^5.0 | Más rápido y robusto que Express |
| Plugins | @fastify/static, @fastify/jwt, @fastify/multipart, @fastify/cookie | latest | Auth + serving + uploads |
| DB driver | mysql2 | ^3.11 | Pool de conexiones, prepared statements |
| Auth | bcrypt + jsonwebtoken | ^5.1 / ^9.0 | Hash de passwords + tokens |

**No usar:** Next.js, Express 5 (path-to-regexp v8 cambia sintaxis), React Router (basta un router de estado), Redux.

---

## 2. Estructura de carpetas

```
pos-paolitas-v2/
├── client/
│   ├── src/
│   │   ├── views/
│   │   │   ├── POSView.tsx
│   │   │   ├── InventoryView.tsx
│   │   │   ├── OrdersView.tsx
│   │   │   ├── SalesView.tsx          ← NUEVA: lista de ventas
│   │   │   ├── DashboardView.tsx
│   │   │   ├── AccountingView.tsx
│   │   │   └── SettingsView.tsx
│   │   ├── components/
│   │   │   ├── AppShell.tsx
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Field.tsx
│   │   │   ├── CategoryIcon.tsx
│   │   │   ├── ProductCard.tsx        ← componente del card POS
│   │   │   └── EditableCell.tsx
│   │   ├── lib/
│   │   │   ├── api.ts                 ← cliente fetch + JWT
│   │   │   ├── store.ts               ← Zustand: carrito, view, settings
│   │   │   ├── queries.ts             ← TanStack Query hooks
│   │   │   ├── types.ts               ← interfaces compartidas
│   │   │   ├── utils.ts               ← fmt, round2, calcTax, fmtDate
│   │   │   └── icons.ts               ← CAT_ICON_MAP
│   │   ├── hooks/
│   │   │   └── useBarcode.ts          ← listener global de scanner
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css                  ← Tailwind imports
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── tsconfig.json
│
├── server/
│   ├── routes/
│   │   ├── auth.js
│   │   ├── products.js
│   │   ├── transactions.js
│   │   ├── orders.js
│   │   ├── expenses.js
│   │   ├── users.js
│   │   ├── drivers.js
│   │   └── dashboard.js
│   ├── migrations/
│   │   ├── 001_init.sql
│   │   └── 002_seed.sql
│   ├── db.js                          ← pool + runner de migraciones
│   ├── auth.js                        ← middleware JWT
│   └── seed.js
│
├── server.js                          ← entry point Fastify
├── package.json
├── .gitignore
├── .env.example
└── README.md
```

**Importante:** un solo `package.json` en la raíz con todas las dependencias. Un solo proceso Node.js sirve API y archivos estáticos.

---

## 3. Configuración base

### `package.json`

```json
{
  "name": "pos-paolitas",
  "version": "2.0.0",
  "private": true,
  "scripts": {
    "dev:server": "node --watch server.js",
    "dev:client": "vite --config client/vite.config.ts",
    "dev": "npm run dev:server & npm run dev:client",
    "build": "rm -rf client/dist && vite build --config client/vite.config.ts",
    "start": "node server.js"
  },
  "dependencies": {
    "@fastify/cookie": "^11.0.1",
    "@fastify/jwt": "^9.0.1",
    "@fastify/multipart": "^9.0.1",
    "@fastify/static": "^8.0.2",
    "bcrypt": "^5.1.1",
    "fastify": "^5.1.0",
    "mysql2": "^3.11.4",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@tanstack/react-query": "^5.59.0",
    "@types/node": "^22.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "chart.js": "^4.4.0",
    "lucide-react": "^0.460.0",
    "postcss": "^8.4.0",
    "react": "^18.3.0",
    "react-chartjs-2": "^5.2.0",
    "react-dom": "^18.3.0",
    "react-hook-form": "^7.53.0",
    "react-hot-toast": "^2.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0",
    "vite": "^5.4.0",
    "zustand": "^4.5.0"
  }
}
```

### `client/vite.config.ts`

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
```

### `.env.example`

```
DB_HOST=localhost
DB_USER=u926460478_srapao
DB_PASSWORD=
DB_NAME=u926460478_paosmarket
JWT_SECRET=cambiame-en-produccion-string-largo-aleatorio
PORT=3000
TIMEZONE=America/La_Paz
```

### `.gitignore`

```
node_modules/
client/dist/
.env
.env.local
.DS_Store
*.log
config.json
tmp/
```

---

## 4. Schema de base de datos

### `server/migrations/001_init.sql`

```sql
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('owner','vendedora') DEFAULT 'vendedora',
  avatar VARCHAR(10) DEFAULT '',
  color VARCHAR(20) DEFAULT '#6366f1',
  can_dashboard TINYINT(1) DEFAULT 0,
  active TINYINT(1) DEFAULT 1,
  first_name VARCHAR(100) DEFAULT NULL,
  last_name VARCHAR(100) DEFAULT NULL,
  phone VARCHAR(30) DEFAULT NULL,
  document_number VARCHAR(30) DEFAULT NULL,
  address VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL,
  barcode VARCHAR(50) DEFAULT '',
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  unit VARCHAR(10) DEFAULT 'pza',
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_barcode (barcode),
  INDEX idx_category (category),
  INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(20) PRIMARY KEY,
  date DATETIME NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  tax DECIMAL(12,2) NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  method VARCHAR(20) NOT NULL,
  cash_received DECIMAL(12,2) DEFAULT 0,
  cash_amount DECIMAL(12,2) DEFAULT 0,
  qr_amount DECIMAL(12,2) DEFAULT 0,
  change_amount DECIMAL(12,2) DEFAULT 0,
  user_id VARCHAR(50) NOT NULL,
  attended_by VARCHAR(100) NOT NULL,
  order_id VARCHAR(20) DEFAULT NULL,
  sale_type ENUM('site','delivery') DEFAULT 'site',
  INDEX idx_date (date),
  INDEX idx_user (user_id),
  INDEX idx_order (order_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS transaction_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id VARCHAR(20) NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  category VARCHAR(50) DEFAULT '',
  price DECIMAL(10,2) NOT NULL,
  cost DECIMAL(10,2) NOT NULL,
  qty INT NOT NULL,
  INDEX idx_tx (transaction_id),
  INDEX idx_product (product_id),
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(20) PRIMARY KEY,
  date DATETIME NOT NULL,
  category VARCHAR(50) NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(20) PRIMARY KEY,
  date DATETIME NOT NULL,
  client_name VARCHAR(150) NOT NULL,
  client_phone VARCHAR(30) DEFAULT '',
  client_zone VARCHAR(100) DEFAULT '',
  client_addr VARCHAR(255) DEFAULT '',
  notes TEXT DEFAULT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  tax DECIMAL(12,2) NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  delivery_type VARCHAR(20) DEFAULT 'delivery',
  transport_type VARCHAR(20) DEFAULT 'incluido',
  transport_cost DECIMAL(10,2) DEFAULT 0,
  driver_id VARCHAR(10) DEFAULT NULL,
  status ENUM('pendiente','preparando','en_camino','entregado','cancelado') DEFAULT 'pendiente',
  user_id VARCHAR(50) NOT NULL,
  attended_by VARCHAR(100) NOT NULL,
  INDEX idx_status (status),
  INDEX idx_date (date),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(20) NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  category VARCHAR(50) DEFAULT '',
  price DECIMAL(10,2) NOT NULL,
  cost DECIMAL(10,2) NOT NULL,
  qty INT NOT NULL,
  INDEX idx_order (order_id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS drivers (
  id VARCHAR(10) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  plate VARCHAR(20) DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS counters (
  `key` VARCHAR(30) PRIMARY KEY,
  value INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS settings (
  `key` VARCHAR(50) PRIMARY KEY,
  `value` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Notas críticas sobre el schema

- **`category` se duplica en `transaction_items` y `order_items`** intencionalmente. Permite la página "Ventas" sin JOINs costosos a productos (el producto puede haber cambiado de categoría después).
- **`sale_type`** en `transactions` distingue compra in-situ vs delivery (la página "Ventas" lo necesita).
- Usar **utf8mb4** siempre (soporta emoji y caracteres especiales).

---

## 5. Backend — Fastify

### `server.js` (entry point)

```js
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import { initDB } from './server/db.js';
import authRoutes from './server/routes/auth.js';
import productRoutes from './server/routes/products.js';
import transactionRoutes from './server/routes/transactions.js';
import orderRoutes from './server/routes/orders.js';
import expenseRoutes from './server/routes/expenses.js';
import userRoutes from './server/routes/users.js';
import driverRoutes from './server/routes/drivers.js';
import dashboardRoutes from './server/routes/dashboard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VERSION = '2.0.0';

const app = Fastify({ logger: { level: 'info' } });

await app.register(fastifyCookie);
await app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex'),
});
await app.register(fastifyMultipart);

// Health check
app.get('/api/health', async () => ({
  ok: true,
  version: VERSION,
  time: new Date().toISOString(),
  node: process.version,
}));

// API routes
await app.register(authRoutes, { prefix: '/api/auth' });
await app.register(productRoutes, { prefix: '/api/products' });
await app.register(transactionRoutes, { prefix: '/api/transactions' });
await app.register(orderRoutes, { prefix: '/api/orders' });
await app.register(expenseRoutes, { prefix: '/api/expenses' });
await app.register(userRoutes, { prefix: '/api/users' });
await app.register(driverRoutes, { prefix: '/api/drivers' });
await app.register(dashboardRoutes, { prefix: '/api/dashboard' });

// Static SPA serving
const distDir = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(distDir)) {
  await app.register(fastifyStatic, { root: distDir });
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api/')) {
      return reply.code(404).send({ error: 'API endpoint not found' });
    }
    return reply.sendFile('index.html');
  });
} else {
  app.log.warn(`Build no encontrado en ${distDir}`);
}

const port = parseInt(process.env.PORT) || 3000;
app.listen({ port, host: '0.0.0.0' })
  .then(() => initDB().catch(err => app.log.error('DB error:', err)));
```

### `server/db.js`

- Crea pool con `mysql2/promise`.
- Función `initDB()`: lee `migrations/*.sql` ordenadas, ejecuta las que no estén en una tabla `_migrations` (id, name, applied_at).
- Si la tabla `users` está vacía, ejecuta seed (usuarios admin/esperancita, productos de ejemplo, drivers).
- Exporta `pool` y helper `nextId(key)` para counters.

### `server/auth.js`

- Decorator `app.authenticate`: middleware que verifica JWT del header `Authorization: Bearer xxx` o cookie `token`.
- Decorator `app.requireOwner`: solo permite si `req.user.role === 'owner'`.

### Endpoints (lista completa)

```
POST   /api/auth/login           { id, password } → { token, user }
POST   /api/auth/logout          → { ok: true }
GET    /api/auth/me              → { user }

GET    /api/products             → Product[]
POST   /api/products             body: { ...product } → { id }
PUT    /api/products/:id         body: { ...partial } → { ok }
DELETE /api/products/:id         (soft delete: active=0) → { ok }
POST   /api/products/:id/stock   { qty } → { ok }
POST   /api/products/import      multipart Excel → { imported }

GET    /api/transactions         ?from=&to=&limit=&saleType= → Transaction[] (con items)
POST   /api/transactions         { items, method, cash_received, ... } → { id, ... }
GET    /api/transactions/sales   ?from=&to= → SaleRow[] (filas planas para vista Ventas)

GET    /api/orders               → Order[] (con items)
POST   /api/orders               { ... } → { id, ... }
PUT    /api/orders/:id/status    { status } → { ok } (si entregado: crea transaction)

GET    /api/expenses             → Expense[]
POST   /api/expenses             { ... } → { id }
PUT    /api/expenses/:id         { ...partial } → { ok }
DELETE /api/expenses/:id         → { ok }

GET    /api/users                (owner only) → User[]
POST   /api/users                (owner) { ...user, password } → { ok }
PUT    /api/users/:id            (owner o self) { ...partial } → { ok }
DELETE /api/users/:id            (owner) → { ok } (soft)

GET    /api/drivers              → Driver[]

GET    /api/dashboard            ?from=&to= → { totalRevenue, totalCOGS, grossProfit, netProfit, byUser, byMethod, topProducts, lowStock }

GET    /api/settings             → AppSettings
PUT    /api/settings             { ...partial } → { ok }
GET    /api/export/excel         → xlsx download
```

### Endpoint clave nuevo: `/api/transactions/sales`

Devuelve **una fila por cada producto vendido** (no una fila por transacción). Esta es la fuente de la nueva vista "Ventas":

```sql
SELECT 
  ti.id              AS line_id,
  t.id               AS ticket_id,
  t.date             AS sold_at,
  ti.product_id,
  ti.product_name,
  ti.category,
  ti.price,
  ti.cost,
  ti.qty,
  (ti.price * ti.qty) AS line_total,
  ((ti.price - ti.cost) * ti.qty) AS line_profit,
  t.method           AS payment_method,
  t.sale_type        AS sale_type,        -- 'site' o 'delivery'
  t.attended_by,
  t.user_id,
  p.stock            AS current_stock,
  p.active           AS product_active
FROM transaction_items ti
JOIN transactions t ON ti.transaction_id = t.id
LEFT JOIN products p ON ti.product_id = p.id
WHERE t.date >= ? AND t.date <= ?
ORDER BY t.date DESC, ti.id DESC
LIMIT 1000
```

Validar `from` y `to` con defaults sensatos (último mes si no vienen).

### Validación

Usar el schema validator de Fastify para inputs críticos. Ejemplo:

```js
app.post('/api/transactions', {
  schema: {
    body: {
      type: 'object',
      required: ['items', 'method'],
      properties: {
        items: { type: 'array', minItems: 1 },
        method: { type: 'string', enum: ['Efectivo', 'QR', 'Tarjeta', 'Mixto'] },
        cash_received: { type: 'number' },
        cash_amount: { type: 'number' },
        qr_amount: { type: 'number' },
        order_id: { type: ['string', 'null'] },
        sale_type: { type: 'string', enum: ['site', 'delivery'] },
      },
    },
  },
  preHandler: [app.authenticate],
}, handler);
```

### Reglas de negocio

- IVA: **13%** (Bolivia). Subtotal + IVA = total.
- En transacción: `change_amount = cash_received - total` solo si method=Efectivo.
- En orden con `transport_type='incluido'`: total incluye `transport_cost`. Si es `pago_entrega`: no se incluye.
- Status `entregado` en una orden: crea transaction automáticamente con method='QR' (asumiendo pago digital al recibir) y `sale_type='delivery'`.
- Eliminar producto: soft delete (`active=0`). Nunca borrar físicamente.
- Stock se decrementa al crear transaction o al crear order.

---

## 6. Frontend — React

### `client/src/lib/types.ts`

```ts
export interface User {
  id: string;
  name: string;
  role: 'owner' | 'vendedora';
  avatar: string;
  color: string;
  canDashboard: boolean;
  active?: boolean;
  firstName?: string;
  lastName?: string;
  phone?: string;
  documentNumber?: string;
  address?: string;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  unit: string;
  barcode: string;
  active?: boolean;
}

export interface CartItem {
  productId: number;
  name: string;
  category: string;
  price: number;
  cost: number;
  qty: number;
}

export interface Transaction {
  id: string;
  date: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  method: string;
  cashReceived: number;
  cashAmount: number;
  qrAmount: number;
  change: number;
  attendedBy: string;
  userId: string;
  orderId?: string;
  saleType: 'site' | 'delivery';
}

// Nueva interfaz para vista Ventas
export interface SaleRow {
  lineId: number;
  ticketId: string;
  soldAt: string;
  productId: number;
  productName: string;
  category: string;
  price: number;
  cost: number;
  qty: number;
  lineTotal: number;
  lineProfit: number;
  paymentMethod: string;
  saleType: 'site' | 'delivery';
  attendedBy: string;
  userId: string;
  currentStock: number;
  productActive: boolean;
}

export interface Order { /* igual que app actual */ }
export interface Expense { id: string; date: string; category: string; description: string; amount: number; }
export interface Driver { id: string; name: string; phone: string; plate: string; }

export interface AppSettings {
  businessName: string;        // EDITABLE: "Paolita's Market"
  businessTagline: string;
  businessNIT: string;
  businessPhone: string;
  businessAddress: string;
  businessCity: string;
  businessEmail: string;
  currency: string;
  currencySymbol: string;      // 'Bs'
  timezone: string;            // 'America/La_Paz'
  taxRate: number;             // 13
  ticketPrefix: string;        // 'T-'
  orderPrefix: string;         // 'PED-'
  lowStockThreshold: number;
}
```

### `client/src/lib/api.ts`

Cliente fetch que:
- Lee JWT desde `localStorage.getItem('pos-jwt')`.
- Envía `Authorization: Bearer xxx` en cada llamada.
- Hace `JSON.stringify` y `JSON.parse` automáticos.
- Lanza error con mensaje del servidor si `!res.ok`.
- Métodos: `api.auth.login(id, pwd)`, `api.products.list()`, `api.products.create(p)`, `api.transactions.list(params)`, `api.transactions.sales(params)`, etc.

### `client/src/lib/queries.ts` — TanStack Query hooks

```ts
export const useProducts = () => useQuery({
  queryKey: ['products'],
  queryFn: () => api.products.list(),
  staleTime: 60_000,
});

export const useSales = (params: { from: string; to: string }) => useQuery({
  queryKey: ['sales', params],
  queryFn: () => api.transactions.sales(params),
});

export const useCreateTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.transactions.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};
```

Hacer hooks similares para products, orders, expenses, dashboard, sales.

### `client/src/hooks/useBarcode.ts`

```ts
// Listener global. Si el usuario teclea ≥4 chars rápido (cada uno <50ms aparte) y termina con Enter, es scanner.
// Llama callback con el código.
// Ignora si hay <input>/<textarea>/<select> con focus.
```

### Vistas

#### POSView — cards de producto (cambios pedidos)

```tsx
<div className="bg-white rounded-2xl border-2 border-slate-200 p-4 hover:border-indigo-400 cursor-pointer transition-all">
  <div className="flex justify-center mb-3">
    <div className="w-20 h-20 rounded-full flex items-center justify-center" 
         style={{ background: catColor + '15' }}>
      <CategoryIcon category={p.category} size={28} className="text-indigo-500" />
    </div>
  </div>
  
  {/* Nombre del producto: 2pt MÁS GRANDE que actual (de text-base→text-lg) */}
  <div className="text-lg font-bold text-center text-slate-800 mb-2 leading-tight">
    {p.name}
  </div>
  
  {/* Precio: 2pt MÁS CHICO que actual (de text-3xl→text-2xl) pero font-black para peso */}
  <div className="text-2xl font-black text-center text-indigo-500 mb-2">
    {settings.currencySymbol} {p.price.toFixed(2)}
  </div>
  
  {/* Stock info: 2pt MÁS GRANDE (de text-xs→text-sm) */}
  <div className="text-sm text-center text-slate-500 font-medium">
    {p.stock} {p.unit === 'kg' ? 'kg' : 'pzas'}
  </div>
</div>
```

**Mapeo exacto pedido por el cliente:**
- Nombre producto: actualmente `text-base` (16px) → `text-lg` (18px) ✓ +2pt
- Precio: actualmente `text-3xl` (30px) → `text-2xl` (24px) + `font-black` ✓ -2pt pero más pesado
- Stock "36 pzas": actualmente `text-xs` (12px) → `text-sm` (14px) ✓ +2pt

#### NUEVA: SalesView (página "Ventas")

Vista dedicada a ver cada producto vendido como fila individual, NO como ticket consolidado.

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│  Ventas                                  [Hoy][Sem][Mes][⌄]│
├─────────────────────────────────────────────────────────────┤
│  Total filas: 124    Ingresos: Bs 4,025.06    Ganancia: Bs 1,853.56 │
├─────────────────────────────────────────────────────────────┤
│ FECHA    │TICKET│PRODUCTO    │CAT  │TIPO │PRECIO│COSTO│CANT│TOTAL│GANANCIA│PAGO│ATIENDE  │STOCK│
├──────────┼──────┼────────────┼─────┼─────┼──────┼─────┼────┼─────┼────────┼────┼─────────┼─────┤
│ 06feb 4pm│T-1000│Coca-Cola 600ml│Beb│ 🛒  │ 8.00 │5.00 │ 2  │16.00│ 6.00   │💵  │Sra.Paola│ 46  │ ← zebra blanco
│ 06feb 4pm│T-1000│Pan Blanco  │Pan  │ 🛒  │16.00 │9.00 │ 1  │16.00│ 7.00   │💵  │Sra.Paola│ 21  │ ← zebra slate-50
│ 06feb 4pm│T-1001│Leche 1L    │Lac  │ 🚚  │10.00 │6.00 │ 3  │30.00│12.00   │📱  │Esperancita│ 53│
│ ...                                                                                       │
└─────────────────────────────────────────────────────────────┘
```

**Especificaciones detalladas:**

```tsx
'use client';
import { useState, useMemo } from 'react';
import { useSales } from '@/lib/queries';
import { useStore } from '@/lib/store';
import { fmt, fmtDateTime } from '@/lib/utils';
import { Store, Truck, Banknote, QrCode, CreditCard, AlertCircle } from 'lucide-react';

const PERIODS = [
  ['today', 'Hoy'], ['week', 'Semana'], ['month', 'Mes'], ['year', 'Año']
] as const;

export default function SalesView() {
  const [period, setPeriod] = useState<string>('month');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all'|'site'|'delivery'>('all');
  const range = useDateRange(period);
  const { data: sales = [], isLoading } = useSales(range);
  const { settings } = useStore();
  
  const filtered = useMemo(() => sales.filter(s => {
    const ms = !search || s.productName.toLowerCase().includes(search.toLowerCase()) 
            || s.ticketId.toLowerCase().includes(search.toLowerCase());
    const mt = filterType === 'all' || s.saleType === filterType;
    return ms && mt;
  }), [sales, search, filterType]);
  
  const totals = useMemo(() => ({
    rows: filtered.length,
    revenue: filtered.reduce((s, r) => s + r.lineTotal, 0),
    profit: filtered.reduce((s, r) => s + r.lineProfit, 0),
    units: filtered.reduce((s, r) => s + r.qty, 0),
  }), [filtered]);
  
  return (
    <div>
      {/* HEADER */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-extrabold">Ventas</h2>
        <div className="flex gap-1">
          {PERIODS.map(([k, l]) => (
            <button key={k} onClick={() => setPeriod(k)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                period === k 
                  ? 'bg-indigo-500 text-white' 
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-indigo-50'
              }`}>{l}</button>
          ))}
        </div>
      </div>
      
      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Card label="Filas" value={totals.rows} color="text-slate-700" />
        <Card label="Unidades" value={totals.units} color="text-indigo-600" />
        <Card label="Ingresos" value={fmt(totals.revenue)} color="text-emerald-600" />
        <Card label="Ganancia" value={fmt(totals.profit)} color={totals.profit >= 0 ? 'text-emerald-700' : 'text-red-600'} />
      </div>
      
      {/* FILTERS */}
      <div className="flex gap-3 mb-3">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar producto o ticket..."
          className="flex-1 px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none" />
        <div className="flex gap-1">
          {[['all','Todas'],['site','In situ'],['delivery','Delivery']].map(([k,l]) => (
            <button key={k} onClick={() => setFilterType(k as any)}
              className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                filterType === k ? 'bg-indigo-500 text-white' : 'bg-white border border-slate-200 hover:bg-indigo-50'
              }`}>{l}</button>
          ))}
        </div>
      </div>
      
      {/* TABLA ZEBRA */}
      <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100 border-b-2 border-slate-200 sticky top-0">
              <tr className="text-xs font-bold uppercase text-slate-600">
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-3 py-3 text-left">Ticket</th>
                <th className="px-4 py-3 text-left">Producto</th>
                <th className="px-3 py-3 text-left">Categoría</th>
                <th className="px-3 py-3 text-center">Tipo</th>
                <th className="px-3 py-3 text-right">Precio</th>
                <th className="px-3 py-3 text-right">Costo</th>
                <th className="px-3 py-3 text-center">Cant.</th>
                <th className="px-3 py-3 text-right">Total</th>
                <th className="px-3 py-3 text-right">Ganancia</th>
                <th className="px-3 py-3 text-center">Pago</th>
                <th className="px-4 py-3 text-left">Atiende</th>
                <th className="px-3 py-3 text-right">Stock actual</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => (
                <tr key={row.lineId} 
                    className={`text-sm border-b border-slate-100 hover:bg-indigo-50/40 transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                    }`}>
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{fmtDateTime(row.soldAt)}</td>
                  <td className="px-3 py-3 font-bold text-slate-800">{row.ticketId}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{row.productName}</td>
                  <td className="px-3 py-3 text-slate-600">{row.category}</td>
                  <td className="px-3 py-3 text-center">
                    {row.saleType === 'site' 
                      ? <Store size={18} className="inline text-indigo-500" />
                      : <Truck size={18} className="inline text-amber-500" />}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold">{fmt(row.price)}</td>
                  <td className="px-3 py-3 text-right text-slate-500">{fmt(row.cost)}</td>
                  <td className="px-3 py-3 text-center font-bold">{row.qty}</td>
                  <td className="px-3 py-3 text-right font-bold text-emerald-600">{fmt(row.lineTotal)}</td>
                  <td className={`px-3 py-3 text-right font-bold ${row.lineProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {fmt(row.lineProfit)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <PaymentIcon method={row.paymentMethod} />
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.attendedBy}</td>
                  <td className={`px-3 py-3 text-right font-semibold ${
                    row.currentStock <= 5 ? 'text-red-600' 
                    : row.currentStock <= 15 ? 'text-amber-600' 
                    : 'text-slate-700'
                  }`}>
                    {row.currentStock}
                    {row.currentStock <= 5 && <AlertCircle size={14} className="inline ml-1" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && !isLoading && (
          <div className="text-center py-12 text-slate-400">
            No hay ventas en este período
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div className="bg-white rounded-xl p-4 border-2 border-slate-200 shadow-sm">
      <div className="text-[11px] font-semibold text-slate-500 uppercase mb-1">{label}</div>
      <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
    </div>
  );
}

function PaymentIcon({ method }: { method: string }) {
  if (method === 'Efectivo') return <Banknote size={18} className="inline text-emerald-500" />;
  if (method === 'QR') return <QrCode size={18} className="inline text-indigo-500" />;
  if (method === 'Tarjeta') return <CreditCard size={18} className="inline text-blue-500" />;
  return <span className="text-xs">{method}</span>;
}
```

**Checklist de la vista Ventas:**
- [x] Una fila = un producto vendido (no un ticket completo)
- [x] Zebra striping (filas alternadas blanco/slate-50)
- [x] Fonts grandes y legibles (text-sm en datos, text-xl en KPIs)
- [x] Distingue in-situ (`Store` icon índigo) vs delivery (`Truck` icon ámbar)
- [x] Muestra precio, costo, cantidad, ganancia por fila
- [x] Stock actual con código de color (rojo si ≤5, ámbar si ≤15)
- [x] Quién atendió (vendedor)
- [x] Filtros por período (hoy/semana/mes/año) y por tipo de venta
- [x] Búsqueda por producto o ticket
- [x] KPIs sumados arriba (filas, unidades, ingresos, ganancia)

#### Otras vistas

Copiar la lógica de la app actual (la base v1 está en `/Users/dran/Documents/Codex openai/POS PAO/pos-pao/src/components/`):

- **POSView**: tres aplicar cambios de tamaños de card descritos arriba. Resto idéntico.
- **InventoryView**: idéntico.
- **OrdersView**: idéntico (drivers desde API).
- **DashboardView**: usa `/api/dashboard`. Igual al actual.
- **AccountingView**: idéntico, pero quita la duplicación con SalesView (ahora es resumen + IVA + edición de gastos).
- **SettingsView**: 3 tabs (Negocio, General, Empleados). El campo "Nombre del Negocio" es editable y se guarda en `/api/settings`. Toda la app lee `settings.businessName` desde el store.

### Navegación (NAV en AppShell)

```ts
const NAV = [
  { key: 'pos',       icon: ShoppingCart,  label: 'Punto de Venta' },
  { key: 'sales',     icon: Receipt,       label: 'Ventas' },           // ← NUEVA
  { key: 'orders',    icon: Truck,         label: 'Pedidos' },
  { key: 'dashboard', icon: BarChart3,     label: 'Dashboard',    ownerOnly: true },
  { key: 'accounting',icon: Calculator,    label: 'Contabilidad', ownerOnly: true },
  { key: 'inventory', icon: Package,       label: 'Inventario',   ownerOnly: true },
  { key: 'settings',  icon: Settings,      label: 'Ajustes',      ownerOnly: true },
];
```

### Configuración del nombre del negocio

- Sembrar en `settings` table al inicializar:
  ```sql
  INSERT IGNORE INTO settings (`key`, `value`) VALUES 
    ('businessName', 'Paolita\'s Market'),
    ('businessTagline', 'Tu tienda de confianza'),
    ('currencySymbol', 'Bs'),
    ('timezone', 'America/La_Paz'),
    ('taxRate', '13');
  ```
- Endpoint `GET /api/settings` devuelve todo como objeto.
- El frontend lo carga al hacer login y lo guarda en Zustand persist.
- En SettingsView → tab "Negocio" hay un input "Nombre del negocio" que llama `PUT /api/settings { businessName: 'Nuevo Nombre' }`.
- Todos los lugares (LoginScreen, AppShell header, recibo) leen `useStore(s => s.settings.businessName)`.

### Usuarios sembrados

```js
// server/seed.js
const adminHash = await bcrypt.hash('admin123', 10);
const espeHash = await bcrypt.hash('esperanza123', 10);

await pool.execute(
  'INSERT IGNORE INTO users (id, name, password_hash, role, avatar, color, can_dashboard, first_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ['admin', 'Admin', adminHash, 'owner', 'A', '#ec4899', 1, 'Admin']
);
await pool.execute(
  'INSERT IGNORE INTO users (id, name, password_hash, role, avatar, color, can_dashboard, first_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ['esperancita', 'Esperancita', espeHash, 'vendedora', 'E', '#f59e0b', 0, 'Esperanza']
);
```

---

## 7. Plan de ejecución por fases

**Cada fase tiene un criterio de aceptación. NO avanzar sin verificarlo.**

### Fase 0 — Setup base (30 min)

1. Crear directorio `pos-paolitas-v2/`.
2. Inicializar `package.json` con el contenido especificado.
3. Crear estructura de carpetas vacía (`client/src/`, `server/routes/`, etc.).
4. Configurar `tsconfig.json`, `tailwind.config.js`, `vite.config.ts`.
5. Crear `.gitignore` y `.env.example`.

✅ **Aceptación:** `npm install` corre sin errores.

### Fase 1 — Smoke test deployable (1 hora) ⚠️ CRÍTICA

Esta fase **NO se salta**. Confirma que el stack funciona en Hostinger antes de invertir trabajo.

1. `server.js` minimal con Fastify que sirve `/api/health` y `client/dist/index.html`.
2. `client/src/main.tsx` minimal: `<h1>Paolita's POS — v2.0 OK</h1>`.
3. `npm run build` genera `client/dist/index.html`.
4. `npm start` arranca el servidor.
5. `curl localhost:3000/api/health` retorna `{ ok: true, version: "2.0.0" }`.
6. `curl localhost:3000/` retorna HTML con el `<h1>`.
7. Inicializar repo git, push a GitHub.
8. **Configurar Hostinger:** Framework: Node.js · Entry: `server.js` · Build: `npm run build`.
9. Deploy y abrir el sitio en navegador.
10. Verificar que se ve el `<h1>` y que `/api/health` responde JSON.

✅ **Aceptación:** El sitio en Hostinger muestra "Paolita's POS — v2.0 OK" y `/api/health` retorna JSON.

❌ **Si falla:** detener. Diagnosticar. Pedir logs completos del deploy a Hostinger antes de seguir.

### Fase 2 — Backend completo (2-3 horas)

1. `server/db.js` con pool MySQL y migrations runner.
2. `server/migrations/001_init.sql` con todas las tablas.
3. `server/seed.js` con admin/esperancita + productos + drivers.
4. `server/auth.js` middleware.
5. Implementar todas las rutas listadas en sección 5.
6. Probar cada endpoint con curl o Postman.
7. Deploy a Hostinger con env vars (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET).
8. Verificar `/api/health` muestra `db: true`.

✅ **Aceptación:** todos los endpoints responden correctamente. Login con admin/admin123 retorna token. `GET /api/products` con token retorna lista. La DB tiene los seeds.

### Fase 3 — Frontend base (1-2 horas)

1. `client/src/main.tsx` con `<QueryClientProvider>` y `<App>`.
2. `App.tsx`: lee JWT, si no hay → LoginScreen; si hay → AppShell.
3. `LoginScreen.tsx`: avatar cards + password input + llamada a `/api/auth/login`.
4. `AppShell.tsx`: sidebar con NAV + área de contenido.
5. `lib/store.ts`, `lib/api.ts`, `lib/queries.ts`, `lib/types.ts`, `lib/utils.ts`.
6. `react-hot-toast` con Toaster en App.

✅ **Aceptación:** Login funcional. Después de login se ve el shell con la sidebar. Las queries de TanStack se ven en React Query Devtools.

### Fase 4 — Vista Ventas (NUEVA — prioridad alta) (1-2 horas)

1. Implementar endpoint `/api/transactions/sales`.
2. Hook `useSales(params)`.
3. `views/SalesView.tsx` con la spec exacta de la sección 6.
4. Agregar al NAV.
5. Insertar transacciones de ejemplo en la DB para probar.

✅ **Aceptación:** la página Ventas muestra una fila por producto vendido, zebra-stripe, con todas las columnas pedidas. Filtros funcionan.

### Fase 5 — Vistas restantes (3-4 horas)

En este orden:
1. **InventoryView** — base para ProductCard, modal de edición, import Excel.
2. **POSView** — con los tamaños de card pedidos (text-lg / text-2xl font-black / text-sm). Hook `useBarcode`. Modales de pago y delivery.
3. **OrdersView** — drivers desde API.
4. **DashboardView** — `/api/dashboard` + chart.js.
5. **AccountingView** — resumen + tabs (sin duplicar la lista de ventas que ya está en SalesView).
6. **SettingsView** — 3 tabs. Edición del nombre del negocio que persiste en `/api/settings` y se refleja en toda la app.

✅ **Aceptación:** Todas las vistas funcionales. Cambiar "Paolita's Market" por otro nombre en Ajustes y verificar que cambia en LoginScreen, header, y recibo.

### Fase 6 — Polish + offline (1-2 horas)

1. Loading states (skeletons o spinners) en cada query.
2. Error boundaries por vista.
3. Optimistic updates en `addToCart`, `updateProduct`, `addExpense`.
4. Service Worker básico (cache de JS/CSS/HTML, no de API).
5. Recibo imprimible: `window.print()` con CSS `@media print`.
6. Atajos de teclado: F2 = cobrar, F3 = pedido delivery, ESC = cerrar modal.

✅ **Aceptación:** App siente fluida. Imprimir recibo funciona. Cargar sin internet muestra UI cacheada.

---

## 8. Configuración de Hostinger Business (Node.js)

| Campo | Valor |
|---|---|
| Framework preset | **Node.js** (NO Next.js) |
| Entry file | `server.js` |
| Build command | `npm run build` |
| Output directory | *vacío* |
| Package manager | npm |
| Node version | 22.x |
| Branch | main |

**Environment Variables:**
```
DB_HOST=localhost
DB_USER=u926460478_srapao
DB_PASSWORD=<password real>
DB_NAME=u926460478_paosmarket
JWT_SECRET=<generar string aleatorio largo>
PORT=3000
TIMEZONE=America/La_Paz
```

---

## 9. Checklist de calidad antes de "done"

### Funcionalidad
- [ ] Login con admin/admin123 funciona
- [ ] Login con esperancita/esperanza123 funciona
- [ ] esperancita NO ve Dashboard, Contabilidad, Inventario, Ajustes
- [ ] Crear venta in-situ aparece en Ventas con tipo "site"
- [ ] Crear pedido delivery aparece en Ventas con tipo "delivery" cuando se marca entregado
- [ ] Stock se descuenta al vender
- [ ] Recibo se imprime correctamente
- [ ] Scanner de barras agrega producto al carrito
- [ ] Excel import/export en Inventario
- [ ] Cambio de nombre de negocio en Ajustes se refleja en toda la app
- [ ] Empleados CRUD funciona

### Datos correctos
- [ ] IVA 13% aplicado correctamente
- [ ] Cambio en pago Efectivo bien calculado
- [ ] Pago Mixto suma exacta
- [ ] Costo de transporte solo se suma al total si "incluido"
- [ ] COGS = SUM(cost * qty) de transaction_items
- [ ] Ganancia neta = ingresos - IVA - COGS - gastos

### UI/UX
- [ ] Cards de producto con tamaños pedidos (lg/2xl-black/sm)
- [ ] Vista Ventas con zebra striping
- [ ] Iconos Lucide en categorías
- [ ] Sidebar navegable, estados activos visibles
- [ ] Responsive en pantalla 1366x768 (laptop típica de POS)
- [ ] Sin overflow horizontal accidental
- [ ] Sin Font Awesome (solo Lucide)

### Performance
- [ ] Carga inicial <2s en 4G
- [ ] Lista de 1000 productos no se traba
- [ ] Búsqueda con debounce 200ms
- [ ] TanStack Query cachea correctamente

### Seguridad
- [ ] Passwords con bcrypt
- [ ] JWT con secret aleatorio si no hay env
- [ ] Endpoints protegidos por `app.authenticate`
- [ ] Rutas owner-only por `app.requireOwner`
- [ ] Inputs validados con schema Fastify
- [ ] SQL con prepared statements (mysql2 hace esto automático con `?`)

### Deploy
- [ ] `/api/health` retorna `{ ok: true, db: true, version: '2.0.0' }`
- [ ] Build limpio cada deploy (`rm -rf client/dist`)
- [ ] No hay archivos de build commiteados al repo
- [ ] `.env` NO está en git
- [ ] `node_modules/` NO está en git

---

## 10. Notas importantes para el implementador

1. **No usar Next.js bajo ninguna circunstancia.** El plan está diseñado para Vite SPA.
2. **No usar Express.** Fastify tiene mejor DX, mejor performance, validación nativa.
3. **No commitear `client/dist/`.** Hostinger lo construye en cada deploy.
4. **No hardcodear "Paolita's Market".** Siempre leer de `settings.businessName`.
5. **No hacer `process.exit()` en server.js.** El servidor debe arrancar siempre, aunque la DB falle. Reportar el estado en `/api/health`.
6. **No mezclar capas:** server/ es JS puro (Fastify ESM), client/ es TS con React. No compartir código entre ambos.
7. **Migraciones idempotentes:** todas con `IF NOT EXISTS` o checks previos. Pueden correr en cada arranque sin romper nada.
8. **Primero Fase 1, después todo lo demás.** Si Fase 1 no deploya, las otras tampoco lo harán.
9. **Validar cada fase antes de seguir.** No acumular deuda.
10. **El usuario final no es técnico.** Errores deben mostrarse en español, claros, con acción sugerida.

---

## Referencia: app actual (v1)

Ubicación local: `/Users/dran/Documents/Codex openai/POS PAO/pos-pao/`

Esa app tiene la lógica de negocio funcional pero arquitectura comprometida (Next.js export + Express separado). Úsala como referencia visual y de lógica, **no como código a copiar**. Reescribir limpio es el objetivo.

Repositorio v1: https://github.com/Dran9/paosmarket
