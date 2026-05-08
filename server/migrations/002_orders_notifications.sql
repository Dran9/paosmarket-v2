-- Fase 5.1: estados nuevos en orders, columnas para devolución/cancelación,
--           tabla de notificaciones persistentes.
--
-- Esta migración corre una sola vez (la registra _migrations). Por eso uso
-- ALTER TABLE directo sin guards de information_schema.

ALTER TABLE orders
  MODIFY COLUMN status ENUM(
    'pendiente',
    'preparando',
    'en_camino',
    'entregado',
    'problema',
    'devuelto',
    'cancelado'
  ) DEFAULT 'pendiente';

ALTER TABLE orders
  ADD COLUMN transport_settled ENUM('cliente','tienda','sin_pago') DEFAULT NULL,
  ADD COLUMN cancel_reason VARCHAR(255) DEFAULT NULL;

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(40) NOT NULL,
  severity ENUM('info','warning','error') DEFAULT 'info',
  title VARCHAR(200) NOT NULL,
  body TEXT,
  ref_type VARCHAR(40) DEFAULT NULL,
  ref_id VARCHAR(40) DEFAULT NULL,
  status ENUM('unread','read','dismissed') DEFAULT 'unread',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP NULL DEFAULT NULL,
  INDEX idx_status (status),
  INDEX idx_created (created_at),
  INDEX idx_ref (ref_type, ref_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
