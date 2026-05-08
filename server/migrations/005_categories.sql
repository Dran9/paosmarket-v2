CREATE TABLE IF NOT EXISTS categories (
  name VARCHAR(50) PRIMARY KEY,
  icon VARCHAR(50) NOT NULL DEFAULT 'Package',
  sort_order INT NOT NULL DEFAULT 100,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO categories (name, icon, sort_order) VALUES
  ('Bebidas',    'GlassWater',     10),
  ('Lácteos',    'Milk',           20),
  ('Panadería',  'Wheat',          30),
  ('Abarrotes',  'ShoppingBasket', 40),
  ('Snacks',     'Cookie',         50),
  ('Limpieza',   'Sparkles',       60),
  ('Higiene',    'Bath',           70),
  ('Frutas',     'Apple',          80),
  ('Verduras',   'Carrot',         90),
  ('Carnes',     'Beef',          100),
  ('Otros',      'Package',       110)
ON DUPLICATE KEY UPDATE icon = VALUES(icon), sort_order = VALUES(sort_order);
