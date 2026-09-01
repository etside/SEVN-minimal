/* === ozl storefront — ecommerce UI matching ozl.fashion === */
'use strict';

const API = 'https://sevn.hause.ink/api';
const PLACEHOLDER = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 375"><rect fill="%23f4f4f2" width="300" height="375"/><g fill="none" stroke="%23c9c7c2" stroke-width="2"><rect x="105" y="150" width="90" height="110" rx="4"/><path d="M105 160l45-28 45 28"/><path d="M105 205l38 38 14-20 38 42"/></g></svg>';

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
const CART_ICON = '<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.4"/><circle cx="19" cy="20" r="1.4"/><path d="M2 3h3l2.6 12.4a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 2-1.6L22 7H6"/></svg>';
const TBAG_ICON = '<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12l1 13H5L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>';

function openDetail(product) {
  const oos = product.stock <= 0;
  document.getElementById('detailBody').innerHTML = `
    <div class="detail-body">
      <div class="detail-media">
        <img class="detail-img" src="${esc(product.image_url || PLACEHOLDER)}" alt="${esc(product.name)}" onerror="this.src='${PLACEHOLDER}'" />
      </div>
      <div class="detail-info">
        <div class="detail-eyebrow">${esc(product.category || 'New Collection')}</div>
        <h2 class="detail-title">${esc(product.name)}</h2>
        <div class="detail-price">${money(product.price)}</div>
        <div class="detail-meta">
          <span class="meta-chip">${TBAG_ICON} SKU ${esc(product.sku)}</span>
          <span class="meta-chip ${oos ? 'chip-oos' : 'chip-in'}">${oos ? 'Pre-order' : 'In Stock · ' + product.stock}</span>
        </div>
        <p class="detail-desc">${esc(product.description) || 'Premium quality product, cut for a refined fit and crafted to last.'}</p>
        ${oos ? `<div class="ship-line">Ships ${shipDate()}</div>` : ''}
        <button class="btn btn-block btn-lg" onclick="addToCart(products.find(p=>p.id==${product.id}));closeDetail()" ${oos ? 'disabled' : ''}>${oos ? 'Out of Stock' : CART_ICON + ' Add to Cart'}</button>
        <div class="detail-note">Free delivery over ৳1,000 · 7-day returns</div>
      </div>
    </div>`;
  const ov = document.getElementById('detailOverlay');
  const md = document.getElementById('detailModal');
  ov.classList.remove('hidden');
  ov.classList.add('fade-in');
  md.classList.remove('hidden');
  md.classList.add('anim-in');
  document.body.style.overflow = 'hidden';
}
function closeDetail() {
  const ov = document.getElementById('detailOverlay');
  const md = document.getElementById('detailModal');
  md.classList.remove('anim-in');
  md.classList.add('anim-out');
  setTimeout(() => {
    ov.classList.add('hidden');
    ov.classList.remove('fade-in');
    md.classList.add('hidden');
    md.classList.remove('anim-out');
    document.body.style.overflow = '';
  }, 240);
}

// ---- Product card (matches ozl.fashion: photo, Pre-order badge, name, price, Ships date) ----
function shipDate() {
  // Deterministic "ships on" date ~8 days out, fixed per session
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function productCard(p) {
  const oos = p.stock <= 0;
  const badge = oos ? '<span class="product-badge badge-oos">Pre-order</span>'
    : p.stock <= p.low_stock_at ? '<span class="product-badge badge-low">Low Stock</span>'
    : '<span class="product-badge badge-in">In Stock</span>';
  const ships = oos ? `<div class="ship-date">Ships ${shipDate()}</div>` : '';
  const btn = oos
    ? '<button class="add-btn" disabled>Pre-order</button>'
    : `<button class="add-btn" onclick="event.stopPropagation();addToCart(products.find(x=>x.id==${p.id}))">Add To Cart</button>`;
  return `
    <div class="product-card" onclick="openDetail(products.find(x=>x.id==${p.id}))">
      <div class="product-img-wrap">
        <img class="product-img" src="${esc(p.image_url || PLACEHOLDER)}" alt="${esc(p.name)}" onerror="this.src='${PLACEHOLDER}'" loading="lazy" />
      </div>
      <div class="product-body">
        ${badge}
        <div class="product-name">${esc(p.name)}</div>
        <div class="product-price">${money(p.price)}</div>
        ${ships}
        <div class="card-action">${btn}</div>
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
    const grid = document.getElementById(id);
    grid.innerHTML = datasets[i].length
      ? datasets[i].map(productCard).join('')
      : '<p style="grid-column:1/-1;text-align:center;color:var(--gray-400)">No products in this collection.</p>';
    // stagger reveal
    grid.querySelectorAll('.product-card').forEach((card, idx) => {
      card.classList.add('reveal');
      card.style.transitionDelay = (idx % 4) * 60 + 'ms';
    });
  });
  observeReveals();
}

// ---- Scroll reveal ----
let revealObserver = null;
function observeReveals() {
  if (!('IntersectionObserver' in window)) return;
  if (!revealObserver) {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in-view');
          revealObserver.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
  }
  document.querySelectorAll('.reveal:not(.in-view)').forEach((el) => revealObserver.observe(el));
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