/* === SEVN Admin — static frontend for the PHP API === */
'use strict';

// ---- Config ----
const STORAGE_KEY = 'sevn_api_base';
let API = localStorage.getItem(STORAGE_KEY) || 'https://sevn.hause.ink/api';

const state = {
  products: [],
  orders: [],
};

// ---- Helpers ----
const $ = (sel) => document.querySelector(sel);

function money(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
}
function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
function toast(msg, type = 'success') {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'toast ' + type;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add('hidden'), 3000);
}

async function api(path, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== null) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.detail || res.statusText);
  return data;
}

function setApiStatus(ok) {
  const el = $('#apiStatus');
  el.textContent = ok ? 'Connected' : 'Not connected';
  el.className = 'api-status' + (ok ? ' connected' : '');
}

// ---- Navigation ----
function go(view) {
  document.querySelectorAll('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  $('#view-' + view).classList.add('active');
  if (view === 'dashboard') loadDashboard();
  if (view === 'products') loadProducts();
  if (view === 'inventory') loadProducts(true);
  if (view === 'orders') loadOrders();
}

function saveApiBase() {
  const v = $('#apiBase').value.trim().replace(/\/+$/, '');
  if (!v) return toast('Enter an API base URL', 'error');
  API = v;
  localStorage.setItem(STORAGE_KEY, v);
  toast('API saved: ' + v);
  loadDashboard();
}

// ---- Dashboard ----
async function loadDashboard() {
  try {
    setApiStatus(true);
    const s = await api('/stats');
    const grid = $('#statsGrid');
    const cards = [
      ['productCount', 'Products'],
      ['totalStock', 'Total Stock'],
      ['lowStock', 'Low Stock'],
      ['orderCount', 'Orders'],
      ['pendingOrders', 'Pending'],
      ['revenue', 'Revenue'],
    ];
    grid.innerHTML = cards.map(([k, label]) => `
      <div class="stat-card">
        <div class="stat-num">${k === 'revenue' ? money(s[k]) : esc(s[k])}</div>
        <div class="stat-label">${label}</div>
      </div>`).join('');

    const products = await api('/products');
    const low = products.filter((p) => Number(p.stock) <= Number(p.low_stock_at));
    const tbody = $('#lowStockTable tbody');
    tbody.innerHTML = low.length
      ? low.map((p) => `
          <tr>
            <td>${esc(p.sku)}</td>
            <td>${esc(p.name)}</td>
            <td>${esc(p.category || '—')}</td>
            <td><span class="badge ${p.stock <= 0 ? 'badge-danger' : 'badge-warn'}">${esc(p.stock)}</span></td>
            <td>${esc(p.low_stock_at)}</td>
          </tr>`).join('')
      : '<tr><td colspan="5" class="ta-r" style="text-align:center;color:var(--gray-400)">All good — no low stock items.</td></tr>';
  } catch (e) {
    setApiStatus(false);
    $('#statsGrid').innerHTML = `<div class="stat-card" style="grid-column:1/-1;color:var(--red)">Could not reach API at ${esc(API)}. Set the correct base URL above. <br><small>${esc(e.message)}</small></div>`;
    $('#lowStockTable tbody').innerHTML = '';
  }
}

// ---- Products ----
async function loadProducts(renderInventory = false) {
  const q = renderInventory ? $('#invSearch').value.trim() : $('#productSearch').value.trim();
  const url = q ? '/products?q=' + encodeURIComponent(q) : '/products';
  try {
    const products = await api(url);
    state.products = products;
    if (renderInventory) renderInventoryTable(products);
    else renderProductsTable(products);
  } catch (e) {
    toast('Failed to load products: ' + e.message, 'error');
  }
}

function statusBadge(p) {
  const s = Number(p.stock);
  if (s <= 0) return '<span class="badge badge-danger">Out of stock</span>';
  if (s <= Number(p.low_stock_at)) return '<span class="badge badge-warn">Low stock</span>';
  return '<span class="badge badge-ok">In stock</span>';
}

function renderProductsTable(products) {
  const tbody = $('#productsTable tbody');
  tbody.innerHTML = products.length ? products.map((p) => `
    <tr>
      <td><strong>${esc(p.sku)}</strong></td>
      <td>${esc(p.name)}</td>
      <td>${esc(p.category || '—')}</td>
      <td>${money(p.price)}</td>
      <td>${esc(p.stock)}</td>
      <td>${statusBadge(p)}</td>
      <td class="ta-r">
        <button class="btn btn-outline btn-sm" onclick="openProductModal(${p.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id})">Delete</button>
      </td>
    </tr>`).join('')
    : '<tr><td colspan="7" style="text-align:center;color:var(--gray-400)">No products found.</td></tr>';
}

function renderInventoryTable(products) {
  const tbody = $('#inventoryTable tbody');
  tbody.innerHTML = products.length ? products.map((p) => `
    <tr>
      <td><strong>${esc(p.sku)}</strong></td>
      <td>${esc(p.name)}</td>
      <td>${esc(p.stock)}</td>
      <td>${esc(p.low_stock_at)}</td>
      <td class="ta-r">
        <button class="btn btn-outline btn-sm" onclick="openStockModal(${p.id}, '${esc(p.name).replace(/'/g, "\\'")}')">Adjust</button>
      </td>
    </tr>`).join('')
    : '<tr><td colspan="5" style="text-align:center;color:var(--gray-400)">No products found.</td></tr>';
}

// ---- Product modal (add / edit) ----
function openProductModal(id = null) {
  const p = id ? state.products.find((x) => x.id === id) : null;
  $('#modalBox').innerHTML = `
    <h2>${p ? 'Edit Product' : 'Add Product'}</h2>
    <div class="form-group"><label>Name *</label><input id="f-name" value="${esc(p ? p.name : '')}" placeholder="e.g. Premium Cotton Panjabi" /></div>
    <div class="form-row">
      <div class="form-group"><label>SKU *</label><input id="f-sku" value="${esc(p ? p.sku : '')}" placeholder="e.g. PANJ-002" ${p ? 'disabled' : ''} /></div>
      <div class="form-group"><label>Category</label><input id="f-cat" value="${esc(p ? p.category : '')}" placeholder="Men / Women" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Price</label><input id="f-price" type="number" step="0.01" value="${p ? p.price : ''}" /></div>
      <div class="form-group"><label>Cost</label><input id="f-cost" type="number" step="0.01" value="${p ? p.cost : ''}" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Initial Stock</label><input id="f-stock" type="number" value="${p ? p.stock : ''}" ${p ? 'disabled' : ''} /></div>
      <div class="form-group"><label>Low Stock Alert At</label><input id="f-low" type="number" value="${p ? p.low_stock_at : 5}" /></div>
    </div>
    <div class="form-group"><label>Image URL</label><input id="f-img" value="${esc(p ? p.image_url : '')}" placeholder="https://cdn.ozl.fashion/..." /></div>
    <div class="form-group"><label>Description</label><textarea id="f-desc">${esc(p ? p.description : '')}</textarea></div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveProduct(${p ? p.id : 'null'})">Save</button>
    </div>`;
  openModal();
}

async function saveProduct(id) {
  const payload = {
    name: $('#f-name').value.trim(),
    sku: $('#f-sku').value.trim(),
    category: $('#f-cat').value.trim() || null,
    price: parseFloat($('#f-price').value) || 0,
    cost: parseFloat($('#f-cost').value) || 0,
    stock: parseInt($('#f-stock').value, 10) || 0,
    lowStockAt: parseInt($('#f-low').value, 10) || 5,
    imageUrl: $('#f-img').value.trim() || null,
    description: $('#f-desc').value.trim() || null,
  };
  if (!payload.name || !payload.sku) return toast('Name and SKU are required', 'error');
  try {
    if (id) {
      await api('/products/' + id, 'PUT', payload);
      toast('Product updated');
    } else {
      await api('/products', 'POST', payload);
      toast('Product created');
    }
    closeModal();
    loadProducts();
    loadProducts(true);
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function deleteProduct(id) {
  if (!confirm('Delete this product? Its stock movements will also be removed.')) return;
  try {
    await api('/products/' + id, 'DELETE');
    toast('Product deleted');
    loadProducts();
    loadProducts(true);
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ---- Stock adjustment ----
function openStockModal(id, name) {
  $('#modalBox').innerHTML = `
    <h2>Adjust Stock — ${esc(name)}</h2>
    <div class="form-group"><label>Operation</label>
      <select id="s-type">
        <option value="IN">Stock In (+)</option>
        <option value="OUT">Stock Out (−)</option>
        <option value="ADJUST">Set exact quantity</option>
      </select>
    </div>
    <div class="form-group"><label>Quantity</label><input id="s-qty" type="number" min="1" value="1" /></div>
    <div class="form-group"><label>Note</label><input id="s-note" placeholder="e.g. Restock from supplier" /></div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveStock(${id})">Apply</button>
    </div>`;
  openModal();
}

async function saveStock(id) {
  const type = $('#s-type').value;
  const quantity = parseInt($('#s-qty').value, 10);
  const note = $('#s-note').value.trim() || null;
  if (!quantity || quantity <= 0) return toast('Quantity must be positive', 'error');
  try {
    const r = await api('/products/' + id + '/stock', 'POST', { type, quantity, note });
    toast('Stock updated — now ' + r.stock);
    closeModal();
    loadProducts(true);
    loadProducts();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ---- Orders ----
async function loadOrders() {
  const status = $('#orderStatusFilter').value;
  const url = status ? '/orders?status=' + encodeURIComponent(status) : '/orders';
  try {
    const orders = await api(url);
    state.orders = orders;
    const tbody = $('#ordersTable tbody');
    tbody.innerHTML = orders.length ? orders.map((o) => {
      const items = (o.items || []).map((i) => `${i.quantity}× ${esc(i.product_name)}`).join('<br>');
      return `
      <tr>
        <td><strong>${esc(o.order_number)}</strong></td>
        <td>${esc(o.customer_name)}</td>
        <td>${esc(o.customer_phone || '—')}</td>
        <td>${items || '—'}</td>
        <td>${money(o.total)}</td>
        <td><span class="badge badge-${esc(o.status)}">${esc(o.status)}</span></td>
        <td>${esc((o.created_at || '').slice(0, 10))}</td>
        <td class="ta-r">
          <button class="btn btn-outline btn-sm" onclick="openStatusModal(${o.id}, '${esc(o.status)}')">Status</button>
        </td>
      </tr>`;
    }).join('')
    : '<tr><td colspan="8" style="text-align:center;color:var(--gray-400)">No orders found.</td></tr>';
  } catch (e) {
    toast('Failed to load orders: ' + e.message, 'error');
  }
}

function openStatusModal(id, current) {
  $('#modalBox').innerHTML = `
    <h2>Update Order Status</h2>
    <div class="form-group"><label>Status</label>
      <select id="st-status">
        ${['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map((s) =>
          `<option ${s === current ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveStatus(${id})">Update</button>
    </div>`;
  openModal();
}

async function saveStatus(id) {
  const status = $('#st-status').value;
  try {
    await api('/orders/' + id, 'PUT', { status });
    toast('Order status updated');
    closeModal();
    loadOrders();
  } catch (e) {
    toast(e.message, 'error');
  }
}

function openOrderModal() {
  $('#modalBox').innerHTML = `
    <h2>New Order</h2>
    <div class="form-row">
      <div class="form-group"><label>Customer Name *</label><input id="o-name" placeholder="Full name" /></div>
      <div class="form-group"><label>Phone</label><input id="o-phone" placeholder="01XXXXXXXXX" /></div>
    </div>
    <div class="form-group"><label>Payment</label>
      <select id="o-pay"><option>cash</option><option>card</option><option>bkash</option><option>nagad</option></select>
    </div>
    <div class="form-group"><label>Items *</label>
      <div id="o-items"></div>
      <button class="btn btn-outline btn-sm" onclick="addOrderItem()">+ Add item</button>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveOrder()">Create Order</button>
    </div>`;
  addOrderItem();
  openModal();
}

function addOrderItem() {
  const wrap = $('#o-items');
  const row = document.createElement('div');
  row.className = 'order-item-row';
  row.innerHTML = `
    <select class="oi-product">
      <option value="">— select product —</option>
      ${state.products.map((p) => `<option value="${p.id}" data-name="${esc(p.name)}" data-price="${p.price}">${esc(p.name)} (${money(p.price)})</option>`).join('')}
    </select>
    <input type="number" class="oi-qty" min="1" value="1" placeholder="Qty" />
    <span class="oi-line"></span>
    <button class="order-item-remove" title="Remove" onclick="this.parentElement.remove()">×</button>`;
  row.querySelector('.oi-product').addEventListener('change', (e) => {
    const opt = e.target.selectedOptions[0];
    row.querySelector('.oi-line').textContent = opt && opt.value ? money(opt.dataset.price * row.querySelector('.oi-qty').value) : '';
  });
  row.querySelector('.oi-qty').addEventListener('input', (e) => {
    const sel = row.querySelector('.oi-product');
    const opt = sel.selectedOptions[0];
    if (opt && opt.value) row.querySelector('.oi-line').textContent = money(opt.dataset.price * e.target.value);
  });
  wrap.appendChild(row);
}

async function saveOrder() {
  const name = $('#o-name').value.trim();
  const items = [];
  document.querySelectorAll('#o-items .order-item-row').forEach((row) => {
    const sel = row.querySelector('.oi-product');
    const qty = parseInt(row.querySelector('.oi-qty').value, 10);
    if (sel.value && qty > 0) {
      items.push({ productId: parseInt(sel.value, 10), quantity: qty });
    }
  });
  if (!name) return toast('Customer name is required', 'error');
  if (!items.length) return toast('Add at least one item', 'error');
  try {
    const r = await api('/orders', 'POST', {
      customerName: name,
      customerPhone: $('#o-phone').value.trim() || null,
      paymentMethod: $('#o-pay').value,
      items,
    });
    toast('Order created: ' + r.orderNumber);
    closeModal();
    loadOrders();
    loadProducts();
    loadProducts(true);
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ---- Modal open/close ----
function openModal() {
  $('#modalOverlay').classList.remove('hidden');
}
function closeModal() {
  $('#modalOverlay').classList.add('hidden');
}
$('#modalOverlay').addEventListener('click', (e) => {
  if (e.target === $('#modalOverlay')) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ---- Init ----
(function init() {
  $('#apiBase').value = API;
  loadDashboard();
})();
