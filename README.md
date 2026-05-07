# POS Paolita's Market — v2

Sistema POS para tienda de barrio en La Paz, Bolivia.

## Stack

- **Cliente:** Vite + React 18 + TypeScript + Tailwind
- **Servidor:** Fastify + MySQL (mysql2)
- **Auth:** JWT + bcrypt
- **Estado:** Zustand + TanStack Query

Un solo proceso Node.js sirve API y archivos estáticos. Misma URL, sin CORS.

## Setup

```bash
npm install
cp .env.example .env  # editar con credenciales reales
npm run build
npm start
```

Health check: `GET /api/health`

## Despliegue

Hostinger Business — Node.js shared hosting.

- Entry: `server.js`
- Build: `npm run build`
- Node: 22.x

## Plan

Ver `PLAN.md` para arquitectura, schema y plan de fases.
