-- SEVN Minimal — seed data (Men's fashion, matching the ozl.fashion brand)
USE sevn;

INSERT INTO products (name, sku, category, price, cost, stock, low_stock_at)
VALUES
  ('Premium Embroidered Band Collar Shirt – Regular Fit', 'SHIRT-001', 'Men', 2500, 1800, 24, 5),
  ('Premium Cotton Panjabi', 'PANJ-002', 'Men', 2000, 1400, 8, 5),
  ('Classic White Casual Shirt', 'SHIRT-003', 'Men', 1200, 800, 3, 5),
  ('Cotton Kurti – Plain', 'KURTI-001', 'Women', 1500, 950, 40, 8),
  ('Embroidered Cotton Panjabi – Eid Collection', 'PANJ-004', 'Men', 3200, 2200, 12, 5),
  ('Linen Blazer', 'BLZ-001', 'Men', 4500, 3200, 0, 3)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Demo order
INSERT INTO orders (order_number, customer_name, customer_phone, status, payment_method, total)
SELECT 'SEVN-10001', 'Demo Customer', '01XXXXXXXXX', 'pending', 'cash', 2500
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE order_number = 'SEVN-10001');

SET @order_id = (SELECT id FROM orders WHERE order_number = 'SEVN-10001');
INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
SELECT @order_id, id, name, price, 1 FROM products WHERE sku = 'SHIRT-001';
