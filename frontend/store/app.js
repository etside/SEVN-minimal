/* === ozl storefront — ecommerce UI matching ozl.fashion === */
'use strict';

const API = 'https://sevn.hause.ink/api';
const PLACEHOLDER = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 375"><rect fill="%23f0f0f0" width="300" height="375"/><text x="150" y="188" text-anchor="middle" fill="%23999" font-family="Arial" font-size="40">📷</text></svg>';

// ---- Cart state ----
let cart = JSON.parse(localStorage.getItem('ozl_cart') || '[]');
let products = [];
let currentView = 'featured';
let searchQuery = '';

function esc(s) {
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]);
}

function money(n) { return '৳' + (Number(n) || 0).toLocaleString('en-BD'); }

function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast ' + type;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add('hidden'), 3000);
}

function updateCartBadge() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  for (const id of ['cartCount', 'cartCountDrawer', 'floatCount']) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = count;
      el.classList.toggle('hidden', count === 0);
    }
  }
  localStorage.setItem('ozl_cart', JSON.stringify(cart));
}

function renderCartDrawer() {
  const items = document.getElementById('cartItems');
  const empty = document.getElementById('cartEmpty');
  const footer = document.getElementById('cartFooter');
  const total = document.getElementById('cartTotal');

  items.innerHTML = cart.map((item, i) => `
    <div class="cart-item">
      <img src="${esc(item.img || PLACEHOLDER)}" alt="${esc(item.name)}" onerror="this.src='${PLACEHOLDER}'" />
      <div class="cart-item-info">
        <div class="cart-item-name">${esc(item.name)}</div>
        <div class="cart-item-price">${money(item.price)}</div>
        <div class="cart-item-qty">
          <button onclick="cartQty(${i}, -1)">−</button>
          <span>${item.qty}</span>
          <button onclick="cartQty(${i}, 1)">+</button>
        </div>
      </div>
      <button class="cart-item-remove" onclick="cartRemove(${i})">Remove</button>
    </div>`).join('');

  const hasItems = cart.length > 0;
  items.classList.toggle('hidden', !hasItems);
  empty.classList.toggle('hidden', hasItems);
  footer.classList.toggle('hidden', !hasItems);
  total.textContent = money(cart.reduce((s, i) => s + i.price * i.qty, 0));
  updateCartBadge();
}

function cartQty(idx, delta) {
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  renderCartDrawer();
}

function cartRemove(idx) {
  cart.splice(idx, 1);
  renderCartDrawer();
}

function addToCart(product) {
  const existing = cart.find((i) => i.id === product.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id: product.id, name: product.name, price: Number(product.price), img: product.image_url, qty: 1 });
  }
  renderCartDrawer();
  toast('Added to cart');
}

// ---- Cart drawer toggle ----
function openCart() {
  renderCartDrawer();
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('cartOverlay').classList.remove('hidden');
}
function closeCart() {
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('cartOverlay').classList.add('hidden');
}

// ---- Product detail ----
function openDetail(product) {
  document.getElementById('detailBody').innerHTML = `
    <div class="detail-body">
      <img class="detail-img" src="${esc(product.image_url || PLACEHOLDER)}" alt="${esc(product.name)}" onerror="this.src='${PLACEHOLDER}'" />
      <div class="detail-info">
        <div class="detail-cat">${esc(product.category || '')}</div>
        <h2>${esc(product.name)}</h2>
        <div class="detail-price">${money(product.price)}</div>
        <p class="detail-desc">${esc(product.description) || 'Premium quality product from ozl.fashion.'}</p>
        <p style="font-size:13px;color:var(--gray-500);margin-bottom:12px;">SKU: ${esc(product.sku)} ${product.stock > 0 ? '| In Stock: ' + product.stock : '| Out of stock'}</p>
        <button class="btn btn-block" onclick="addToCart(products.find(p=>p.id==${product.id}));closeDetail()" ${product.stock <= 0 ? 'disabled' : ''}>${product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}</button>
      </div>
    </div>`;
  document.getElementById('detailOverlay').classList.remove('hidden');
  document.getElementById('detailModal').classList.remove('hidden');
  document.getElementById('detailModal').style.display = 'block';
}
function closeDetail() {
  document.getElementById('detailOverlay').classList.add('hidden');
  document.getElementById('detailModal').style.display = 'none';
}

// ---- Product card ----
function productCard(p) {
  const badge = p.stock <= 0 ? '<span class="product-badge badge-oos">Out of Stock</span>'
    : p.stock <= p.low_stock_at ? '<span class="product-badge badge-low">Low Stock</span>'
    : '<span class="product-badge badge-in">In Stock</span>';
  return `
    <div class="product-card" onclick="openDetail(products.find(x=>x.id==${p.id}))">
      <img class="product-img" src="${esc(p.image_url || PLACEHOLDER)}" alt="${esc(p.name)}" onerror="this.src='${PLACEHOLDER}'" loading="lazy" />
      <div class="product-body">
        ${badge}
        <div class="product-name">${esc(p.name)}</div>
        <div class="product-price">${money(p.price)}</div>
        <button class="add-btn" onclick="event.stopPropagation();addToCart(products.find(x=>x.id==${p.id}))" ${p.stock <= 0 ? 'disabled' : ''}>${p.stock > 0 ? 'Add To Cart' : 'Out of Stock'}</button>
      </div>
    </div>`;
}

// ---- Fetch & render ----
async function loadProducts() {
  try {
    products = await api('/products');
    renderProducts();
  } catch (e) {
    document.querySelectorAll('.grid').forEach((g) => g.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--red)">Could not load products.</p>');
  }
}

function renderProducts() {
  const filtered = searchQuery ? products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery) || p.sku.toLowerCase().includes(searchQuery)
  ) : products;

  // Featured: first 4
  const featured = filtered.slice(0, 4);
  // Popular: shuffled but deterministic (by stock desc)
  const popular = [...filtered].sort((a, b) => b.stock - a.stock).slice(0, 4);
  // Trending: newest (by id desc)
  const trending = [...filtered].sort((a, b) => b.id - a.id).slice(0, 4);
  // Cotton: filter by category containing "Cotton" or category "Men" with cotton items
  const cotton = filtered.filter((p) => p.category === 'Women' || p.name.toLowerCase().includes('kurti') || p.sku.toLowerCase().includes('KURTI')).slice(0, 4);

  const gridIds = ['featuredGrid', 'popularGrid', 'trendingGrid', 'cottonGrid'];
  const datasets = [featured, popular, trending, cotton];
  gridIds.forEach((id, i) => {
    document.getElementById(id).innerHTML = datasets[i].length
      ? datasets[i].map(productCard).join('')
      : '<p style="grid-column:1/-1;text-align:center;color:var(--gray-400)">No products in this collection.</p>';
  });
}

function onSearch() {
  searchQuery = document.getElementById('search').value.trim().toLowerCase();
  renderProducts();
}

async function api(path, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== null) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.detail || res.statusText);
  return data;
}

// ---- Checkout ----
async function checkout() {
  const name = document.getElementById('checkoutName').value.trim();
  const phone = document.getElementById('checkoutPhone').value.trim();
  const pay = document.getElementById('checkoutPay').value;
  if (!name) return toast('Enter your name', 'error');
  if (cart.length === 0) return toast('Cart is empty', 'error');

  const items = cart.map((i) => ({ productId: i.id, quantity: i.qty }));
  try {
    const r = await api('/orders', 'POST', { customerName: name, customerPhone: phone || null, paymentMethod: pay, items });
    cart = [];
    renderCartDrawer();
    closeCart();
    loadProducts();
    toast('Order placed! #' + r.orderNumber);
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ---- Menu toggle ----
function toggleMenu() {
  document.getElementById('navLinks').classList.toggle('open');
}

// ---- Init ----
loadProducts();
renderCartDrawer();
updateCartBadge();