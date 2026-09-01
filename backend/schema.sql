-- SEVN Minimal — MySQL schema (products, inventory, orders)
CREATE DATABASE IF NOT EXISTS sevn CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sevn;

CREATE TABLE IF NOT EXISTS products (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  sku         VARCHAR(100) NOT NULL UNIQUE,
  category    VARCHAR(100) DEFAULT NULL,
  price       DECIMAL(12,2) DEFAULT 0,
  cost        DECIMAL(12,2) DEFAULT 0,
  stock       INT DEFAULT 0,
  low_stock_at INT DEFAULT 5,
  image_url   VARCHAR(500) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS stock_movements (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  product_id  INT NOT NULL,
  type        ENUM('IN','OUT','ADJUST') NOT NULL,
  quantity    INT NOT NULL,
  note        VARCHAR(255) DEFAULT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stock_product FOREIGN KEY (product_id)
    REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  order_number   VARCHAR(30) NOT NULL UNIQUE,
  customer_name  VARCHAR(150) NOT NULL,
  customer_phone VARCHAR(30) DEFAULT NULL,
  status         ENUM('pending','confirmed','shipped','delivered','cancelled') DEFAULT 'pending',
  payment_method VARCHAR(30) DEFAULT 'cash',
  total          DECIMAL(12,2) DEFAULT 0,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  order_id     INT NOT NULL,
  product_id   INT DEFAULT NULL,
  product_name VARCHAR(255) NOT NULL,
  price        DECIMAL(12,2) NOT NULL,
  quantity     INT NOT NULL,
  CONSTRAINT fk_oi_order FOREIGN KEY (order_id)
    REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_oi_product FOREIGN KEY (product_id)
    REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_movements_product ON stock_movements(product_id);
