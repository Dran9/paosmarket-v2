import { query } from '../db.js';

function toDriverDTO(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    plate: row.plate || '',
  };
}

export default async function driverRoutes(app) {
  app.get('/', { preHandler: [app.authenticate] }, async () => {
    const rows = await query('SELECT * FROM drivers ORDER BY name ASC');
    return rows.map(toDriverDTO);
  });
}
