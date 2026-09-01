<?php
/**
 * SEVN Minimal — PHP API (products, inventory, orders, stats)
 * Single entry point. Routes on the path after the API prefix.
 *
 * Expected layout (cPanel shared hosting):
 *   public_html/sevn/api/index.php
 *   Requests hit:  https://yourhost/sevn/api/products  (via .htaccess rewrite)
 *
 * All responses are JSON.
 */

// ---- CORS (frontend runs on GitHub Pages / different origin) ----
header('Access-Control-Allow-Origin: ' . (getenv('SEVN_CORS_ORIGIN') ?: '*'));
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$config = require __DIR__ . '/config.php';

try {
    $pdo = new PDO(
        "mysql:host={$config['db_host']};port={$config['db_port']};dbname={$config['db_name']};charset=utf8mb4",
        $config['db_user'],
        $config['db_pass'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
} catch (PDOException $e) {
    json_response(500, ['error' => 'DB connection failed', 'detail' => $e->getMessage()]);
}

// ---- Router ----
$method = $_SERVER['REQUEST_METHOD'];
// Path after the script name, e.g. /products, /products/5, /orders, /stats
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$script = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME']));
if ($script !== '/' && strpos($path, $script) === 0) {
    $path = substr($path, strlen($script));
}
$path = trim($path, '/');
$segments = $path === '' ? [] : explode('/', $path);

// Normalize: allow /api/products or /products
if (isset($segments[0]) && $segments[0] === 'api') array_shift($segments);

$resource = $segments[0] ?? null;
$id       = isset($segments[1]) ? (int)$segments[1] : null;
$action   = isset($segments[2]) ? $segments[2] : null;

function json_response(int $code, $data): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function body(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

// ---------- PRODUCTS ----------
if ($resource === 'products' && $method === 'GET' && $id === null) {
    $q = isset($_GET['q']) ? trim($_GET['q']) : '';
    if ($q !== '') {
        $stmt = $pdo->prepare('SELECT * FROM products WHERE name LIKE :q OR sku LIKE :q ORDER BY name');
        $stmt->execute([':q' => "%$q%"]);
    } else {
        $stmt = $pdo->query('SELECT * FROM products ORDER BY name');
    }
    json_response(200, $stmt->fetchAll());
}

if ($resource === 'products' && $method === 'POST' && $id === null) {
    $b = body();
    $name = trim($b['name'] ?? '');
    $sku  = trim($b['sku'] ?? '');
    if ($name === '' || $sku === '') {
        json_response(400, ['error' => 'name and sku are required']);
    }
    $chk = $pdo->prepare('SELECT id FROM products WHERE sku = ?');
    $chk->execute([$sku]);
    if ($chk->fetch()) json_response(409, ['error' => 'SKU already exists']);

    $price = (float)($b['price'] ?? 0);
    $cost  = (float)($b['cost'] ?? 0);
    $stock = (int)($b['stock'] ?? 0);
    $low   = (int)($b['lowStockAt'] ?? 5);
    $cat   = $b['category'] ?? null;
    $img   = $b['imageUrl'] ?? null;
    $desc  = $b['description'] ?? null;

    $stmt = $pdo->prepare(
        'INSERT INTO products (name, sku, category, price, cost, stock, low_stock_at, image_url, description)
         VALUES (?,?,?,?,?,?,?,?,?)'
    );
    $stmt->execute([$name, $sku, $cat, $price, $cost, $stock, $low, $img, $desc]);
    $pid = (int)$pdo->lastInsertId();

    if ($stock > 0) {
        $m = $pdo->prepare('INSERT INTO stock_movements (product_id, type, quantity, note) VALUES (?, "IN", ?, "Initial stock")');
        $m->execute([$pid, $stock]);
    }
    json_response(201, ['id' => $pid, ...$b]);
}

if ($resource === 'products' && $id !== null && $action === null && $method === 'PUT') {
    $b = body();
    $stmt = $pdo->prepare(
        'UPDATE products SET name=?, category=?, price=?, cost=?, low_stock_at=?, image_url=?, description=? WHERE id=?'
    );
    $stmt->execute([
        trim($b['name'] ?? ''),
        $b['category'] ?? null,
        (float)($b['price'] ?? 0),
        (float)($b['cost'] ?? 0),
        (int)($b['lowStockAt'] ?? 5),
        $b['imageUrl'] ?? null,
        $b['description'] ?? null,
        $id,
    ]);
    json_response(200, ['ok' => true]);
}

if ($resource === 'products' && $id !== null && $action === null && $method === 'DELETE') {
    $pdo->prepare('DELETE FROM products WHERE id = ?')->execute([$id]);
    json_response(200, ['ok' => true]);
}

// ---------- INVENTORY (stock adjustment) ----------
if ($resource === 'products' && $id !== null && $action === 'stock' && $method === 'POST') {
    $b = body();
    $type = $b['type'] ?? '';
    $qty  = (int)($b['quantity'] ?? 0);
    $note = $b['note'] ?? null;
    if (!in_array($type, ['IN', 'OUT', 'ADJUST'], true) || $qty <= 0) {
        json_response(400, ['error' => 'invalid type or quantity']);
    }

    $sel = $pdo->prepare('SELECT * FROM products WHERE id = ?');
    $sel->execute([$id]);
    $p = $sel->fetch();
    if (!$p) json_response(404, ['error' => 'product not found']);

    $stock = (int)$p['stock'];
    if ($type === 'IN') $stock += $qty;
    elseif ($type === 'OUT') {
        if ($qty > $stock) json_response(400, ['error' => 'insufficient stock']);
        $stock -= $qty;
    } else $stock = $qty;

    $pdo->prepare('UPDATE products SET stock = ? WHERE id = ?')->execute([$stock, $id]);
    $pdo->prepare('INSERT INTO stock_movements (product_id, type, quantity, note) VALUES (?,?,?,?)')
        ->execute([$id, $type, $qty, $note]);
    json_response(200, ['ok' => true, 'stock' => $stock]);
}

// ---------- ORDERS ----------
if ($resource === 'orders' && $method === 'GET' && $id === null) {
    $status = $_GET['status'] ?? null;
    if ($status) {
        $stmt = $pdo->prepare('SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC');
        $stmt->execute([$status]);
    } else {
        $stmt = $pdo->query('SELECT * FROM orders ORDER BY created_at DESC');
    }
    $orders = $stmt->fetchAll();
    foreach ($orders as &$o) {
        $it = $pdo->prepare('SELECT * FROM order_items WHERE order_id = ?');
        $it->execute([$o['id']]);
        $o['items'] = $it->fetchAll();
    }
    json_response(200, $orders);
}

if ($resource === 'orders' && $method === 'POST' && $id === null) {
    $b = body();
    $customerName = trim($b['customerName'] ?? '');
    $items = $b['items'] ?? [];
    if ($customerName === '' || !is_array($items) || count($items) === 0) {
        json_response(400, ['error' => 'customerName and items are required']);
    }

    $orderNumber = 'SEVN-' . rand(10000, 99999);
    $pdo->beginTransaction();
    try {
        $orderItems = [];
        $total = 0;
        foreach ($items as $it) {
            $price = (float)($it['price'] ?? 0);
            $pname = $it['productName'] ?? 'Item';
            if (!empty($it['productId'])) {
                $sel = $pdo->prepare('SELECT * FROM products WHERE id = ?');
                $sel->execute([(int)$it['productId']]);
                $p = $sel->fetch();
                if ($p) {
                    $price = (float)$p['price'];
                    $pname = $p['name'];
                    if (empty($it['decrementStock']) || $it['decrementStock'] !== false) {
                        if ((int)$p['stock'] < (int)$it['quantity']) {
                            throw new Exception("Insufficient stock for {$p['name']}");
                        }
                        $pdo->prepare('UPDATE products SET stock = stock - ? WHERE id = ?')
                            ->execute([(int)$it['quantity'], (int)$p['id']]);
                        $pdo->prepare('INSERT INTO stock_movements (product_id, type, quantity, note) VALUES (?, "OUT", ?, ?)')
                            ->execute([(int)$p['id'], (int)$it['quantity'], "Order $orderNumber"]);
                    }
                }
            }
            $lineTotal = $price * (int)$it['quantity'];
            $total += $lineTotal;
            $orderItems[] = [
                'productId' => !empty($it['productId']) ? (int)$it['productId'] : null,
                'productName' => $pname,
                'price' => $price,
                'quantity' => (int)$it['quantity'],
            ];
        }

        $pdo->prepare('INSERT INTO orders (order_number, customer_name, customer_phone, status, payment_method, total)
                       VALUES (?,?,?, "pending", ?, ?)')
            ->execute([$orderNumber, $customerName, $b['customerPhone'] ?? null, $b['paymentMethod'] ?? 'cash', $total]);
        $orderId = (int)$pdo->lastInsertId();

        $ins = $pdo->prepare('INSERT INTO order_items (order_id, product_id, product_name, price, quantity) VALUES (?,?,?,?,?)');
        foreach ($orderItems as $oi) {
            $ins->execute([$orderId, $oi['productId'], $oi['productName'], $oi['price'], $oi['quantity']]);
        }
        $pdo->commit();
        json_response(201, ['id' => $orderId, 'orderNumber' => $orderNumber, 'total' => $total]);
    } catch (Exception $e) {
        $pdo->rollBack();
        json_response(400, ['error' => $e->getMessage()]);
    }
}

if ($resource === 'orders' && $id !== null && $method === 'PUT') {
    $b = body();
    $status = $b['status'] ?? '';
    if (!in_array($status, ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'], true)) {
        json_response(400, ['error' => 'invalid status']);
    }
    $pdo->prepare('UPDATE orders SET status = ? WHERE id = ?')->execute([$status, $id]);
    json_response(200, ['ok' => true]);
}

// ---------- STATS ----------
if ($resource === 'stats' && $method === 'GET') {
    $productCount = (int)$pdo->query('SELECT COUNT(*) c FROM products')->fetch()['c'];
    $totalStock   = (int)$pdo->query('SELECT COALESCE(SUM(stock),0) s FROM products')->fetch()['s'];
    $lowStock     = (int)$pdo->query('SELECT COUNT(*) c FROM products WHERE stock <= low_stock_at')->fetch()['c'];
    $orderCount   = (int)$pdo->query('SELECT COUNT(*) c FROM orders')->fetch()['c'];
    $pendingOrders= (int)$pdo->query("SELECT COUNT(*) c FROM orders WHERE status = 'pending'")->fetch()['c'];
    $revenue      = (float)$pdo->query("SELECT COALESCE(SUM(total),0) s FROM orders WHERE status != 'cancelled'")->fetch()['s'];

    json_response(200, [
        'productCount' => $productCount,
        'totalStock' => $totalStock,
        'lowStock' => $lowStock,
        'orderCount' => $orderCount,
        'pendingOrders' => $pendingOrders,
        'revenue' => $revenue,
    ]);
}

json_response(404, ['error' => 'Not found', 'path' => $path]);
