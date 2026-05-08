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
