// Dynamic API base URL: works on Vercel production, local Express (5000), and Live Server (5500)
const isLocalAltPort = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '5000' && window.location.port !== '';
const isFileProtocol = window.location.protocol === 'file:';

const API_HOST = (isLocalAltPort || isFileProtocol)
  ? 'http://localhost:5000'
  : '';

const API_BASE = `${API_HOST}/api/products`;
const ORDERS_API = `${API_HOST}/api/orders`;
const HEALTH_API = `${API_HOST}/api/health`;

const state = {
  products: [],
  category: 'All',
  search: '',
  sort: 'featured',
  cart: JSON.parse(localStorage.getItem('wp_cart') || '[]')
};

const productGrid = document.getElementById('productGrid');
const emptyState = document.getElementById('emptyState');
const categoryPills = document.getElementById('categoryPills');
const resultCount = document.getElementById('resultCount');
const cartCount = document.getElementById('cartCount');
const cartItemsEl = document.getElementById('cartItems');
const cartSubtotalEl = document.getElementById('cartSubtotal');
const cartDrawer = document.getElementById('cartDrawer');
const cartOverlay = document.getElementById('cartOverlay');

const checkoutModal = document.getElementById('checkoutModal');
const closeCheckoutModal = document.getElementById('closeCheckoutModal');
const orderForm = document.getElementById('orderForm');
const productModal = document.getElementById('productModal');
const closeProductModal = document.getElementById('closeProductModal');

function formatPKR(amount) {
  return 'Rs. ' + Number(amount).toLocaleString('en-PK');
}

function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

// Backend Health Check
async function checkBackendHealth() {
  const banner = document.getElementById('connectionBanner');
  const badge = document.getElementById('apiStatusBadge');
  const hostLabel = document.getElementById('apiHostLabel');
  if (hostLabel) hostLabel.textContent = API_HOST || 'localhost:5000';

  try {
    const res = await fetch(HEALTH_API, { method: 'GET', cache: 'no-cache' });
    if (res.ok) {
      if (banner) banner.classList.add('hidden');
      if (badge) {
        badge.classList.remove('hidden');
        badge.className = "hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800";
        badge.innerHTML = '<span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span> API Connected';
      }
      return true;
    }
  } catch (err) {
    // backend is offline
  }

  if (banner) banner.classList.remove('hidden');
  if (badge) {
    badge.classList.remove('hidden');
    badge.className = "hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800";
    badge.innerHTML = '<span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span> API Offline';
  }
  return false;
}

// Fetch products from backend GET /api/products
async function fetchProducts() {
  try {
    const params = new URLSearchParams();
    if (state.category !== 'All') params.set('category', state.category);
    if (state.search) params.set('search', state.search);
    if (state.sort !== 'featured') params.set('sort', state.sort);

    const res = await fetch(`${API_BASE}?${params.toString()}`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    state.products = data.products || [];
    renderProducts();
  } catch (err) {
    console.error('API Error:', err);
    emptyState.innerHTML = `
      <div class="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 max-w-md mx-auto">
        <p class="font-bold">⚠️ Backend Server Disconnected</p>
        <p class="text-xs mt-1 text-red-600">Could not fetch products from <code class="font-mono bg-red-100 px-1 rounded">${API_BASE}</code>.</p>
        <p class="text-xs mt-1 text-gray-600">Run <code class="font-mono bg-gray-200 px-1 rounded">npm start</code> in terminal, then click below to retry.</p>
        <button onclick="initApp()" class="mt-3 bg-red-700 hover:bg-red-800 text-white text-xs px-4 py-2 rounded-full">Retry Connection</button>
      </div>`;
    emptyState.classList.remove('hidden');
  }
}

// Fetch categories from backend GET /api/products/categories
async function loadCategories() {
  try {
    const res = await fetch(`${API_BASE}/categories`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const cats = await res.json();
    const all = [{ name: 'All', count: cats.reduce((s, c) => s + c.count, 0) }, ...cats];
    categoryPills.innerHTML = all.map(c => `
      <button class="pill ${state.category === c.name ? 'active' : ''}" data-cat="${c.name}">
        ${c.name} (${c.count})
      </button>`).join('');

    categoryPills.querySelectorAll('.pill').forEach(btn => {
      btn.addEventListener('click', () => {
        state.category = btn.dataset.cat;
        loadCategories();
        fetchProducts();
      });
    });
  } catch (err) {
    console.error('Categories error:', err);
  }
}

// Fetch single product details from backend GET /api/products/:id
async function openProductDetails(id) {
  const content = document.getElementById('productModalContent');
  productModal.classList.remove('hidden');
  content.innerHTML = '<div class="py-12 text-center text-gray-500 text-sm">Loading product details from backend...</div>';

  try {
    const res = await fetch(`${API_BASE}/${id}`);
    if (!res.ok) throw new Error('Product not found');
    const p = await res.json();
    content.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
        <img src="${p.image}" alt="${p.name}" class="w-full aspect-square rounded-xl object-cover bg-stone-100">
        <div class="space-y-3">
          <span class="text-xs uppercase tracking-wider font-semibold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-full">${p.category}</span>
          <h3 class="text-xl font-bold text-gray-900">${p.name}</h3>
          <div class="text-sm text-amber-500 font-medium">
            ${'★'.repeat(Math.round(p.rating))}${'☆'.repeat(5 - Math.round(p.rating))} 
            <span class="text-gray-400">(${p.rating} / 5.0)</span>
          </div>
          <p class="text-sm text-gray-600 leading-relaxed">${p.description}</p>
          <div class="text-xs text-gray-500">In Stock: <span class="font-bold text-emerald-700">${p.stock} units available</span></div>
          <div class="text-2xl font-black text-gray-900 pt-2">${formatPKR(p.price)}</div>
          <button id="modalAddBtn" class="w-full bg-blue-800 hover:bg-blue-900 text-white font-medium py-2.5 rounded-full transition shadow">
            Add to Cart
          </button>
        </div>
      </div>
    `;

    document.getElementById('modalAddBtn').addEventListener('click', () => {
      addToCart(p.id);
      productModal.classList.add('hidden');
    });
  } catch (err) {
    content.innerHTML = `<p class="text-red-500 text-center py-6 text-sm">Could not load product details from server.</p>`;
  }
}

function renderProducts() {
  resultCount.textContent = `${state.products.length} products`;
  emptyState.classList.toggle('hidden', state.products.length > 0);

  productGrid.innerHTML = state.products.map(p => `
    <div class="product-card border border-gray-200 rounded-xl p-3 bg-white hover:shadow-lg transition-shadow">
      <img src="${p.image}" alt="${p.name}" class="product-img mb-3 cursor-pointer" data-view-id="${p.id}">
      <div class="text-xs text-gray-500 mb-1">${p.category}</div>
      <div class="text-sm font-semibold line-clamp-2 mb-1 cursor-pointer hover:text-blue-800" data-view-id="${p.id}">${p.name}</div>
      <div class="text-xs text-amber-500 mb-2">${'★'.repeat(Math.round(p.rating))}${'☆'.repeat(5 - Math.round(p.rating))} <span class="text-gray-400">(${p.rating})</span></div>
      <div class="flex items-center justify-between mt-auto pt-2">
        <span class="font-bold text-gray-900">${formatPKR(p.price)}</span>
        <button class="add-btn text-xs bg-gray-900 text-white px-3 py-2 rounded-full hover:bg-blue-800" data-id="${p.id}">Add</button>
      </div>
    </div>
  `).join('');

  // Quick view click
  productGrid.querySelectorAll('[data-view-id]').forEach(el => {
    el.addEventListener('click', () => openProductDetails(Number(el.dataset.viewId)));
  });

  // Add to cart click
  productGrid.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', () => addToCart(Number(btn.dataset.id)));
  });
}

function addToCart(id) {
  const product = state.products.find(p => p.id === id);
  if (!product) return;
  const existing = state.cart.find(i => i.id === id);
  if (existing) existing.qty += 1;
  else state.cart.push({ id: product.id, name: product.name, price: product.price, image: product.image, qty: 1 });
  persistCart();
  renderCart();
  openCart();
}

function updateQty(id, delta) {
  const item = state.cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) state.cart = state.cart.filter(i => i.id !== id);
  persistCart();
  renderCart();
}

function persistCart() {
  localStorage.setItem('wp_cart', JSON.stringify(state.cart));
}

function renderCart() {
  const totalQty = state.cart.reduce((s, i) => s + i.qty, 0);
  cartCount.textContent = totalQty;

  if (state.cart.length === 0) {
    cartItemsEl.innerHTML = `<p class="text-gray-500 text-sm text-center mt-10">Your cart is empty.</p>`;
  } else {
    cartItemsEl.innerHTML = state.cart.map(i => `
      <div class="flex gap-3 items-center">
        <img src="${i.image}" class="w-16 h-16 rounded-lg object-cover bg-gray-100">
        <div class="flex-1">
          <div class="text-sm font-medium line-clamp-2">${i.name}</div>
          <div class="text-sm text-gray-500">${formatPKR(i.price)}</div>
          <div class="flex items-center gap-2 mt-1">
            <button class="qty-btn" data-id="${i.id}" data-delta="-1">-</button>
            <span class="text-sm font-medium">${i.qty}</span>
            <button class="qty-btn" data-id="${i.id}" data-delta="1">+</button>
          </div>
        </div>
      </div>
    `).join('');

    cartItemsEl.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', () => updateQty(Number(btn.dataset.id), Number(btn.dataset.delta)));
    });
  }

  const subtotal = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
  cartSubtotalEl.textContent = formatPKR(subtotal);
}

function openCart() {
  cartDrawer.classList.add('open');
  cartOverlay.classList.remove('hidden');
}

function closeCartFn() {
  cartDrawer.classList.remove('open');
  cartOverlay.classList.add('hidden');
}

// Checkout & Order Placement (POST /api/orders)
function openCheckout() {
  if (state.cart.length === 0) return alert('Your cart is empty.');
  closeCartFn();

  const subtotal = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = subtotal >= 5000 ? 0 : 250;
  const total = subtotal + shipping;
  const count = state.cart.reduce((s, i) => s + i.qty, 0);

  document.getElementById('checkoutItemCount').textContent = count;
  document.getElementById('checkoutSubtotal').textContent = formatPKR(subtotal);
  document.getElementById('checkoutShipping').textContent = shipping === 0 ? 'FREE' : formatPKR(shipping);
  document.getElementById('checkoutTotal').textContent = formatPKR(total);

  document.getElementById('checkoutErrorMsg').classList.add('hidden');
  document.getElementById('checkoutFormView').classList.remove('hidden');
  document.getElementById('orderSuccessView').classList.add('hidden');
  checkoutModal.classList.remove('hidden');
}

function closeCheckout() {
  checkoutModal.classList.add('hidden');
}

async function handleOrderSubmit(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('submitOrderBtn');
  const errorEl = document.getElementById('checkoutErrorMsg');
  errorEl.classList.add('hidden');

  const customer = {
    name: document.getElementById('custName').value.trim(),
    phone: document.getElementById('custPhone').value.trim(),
    city: document.getElementById('custCity').value.trim(),
    address: document.getElementById('custAddress').value.trim()
  };

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting Order to Server...';

  try {
    const res = await fetch(ORDERS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: state.cart,
        customer,
        subtotal: state.cart.reduce((s, i) => s + i.price * i.qty, 0)
      })
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to place order');

    // Show order success view
    document.getElementById('checkoutFormView').classList.add('hidden');
    document.getElementById('orderSuccessView').classList.remove('hidden');
    document.getElementById('successOrderId').textContent = result.orderId;

    // Clear cart
    state.cart = [];
    persistCart();
    renderCart();
    orderForm.reset();
  } catch (err) {
    console.error('Order Submission Error:', err);
    errorEl.textContent = `Order Error: ${err.message}. Please check backend server.`;
    errorEl.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Confirm & Place Order';
  }
}

// Event Listeners
document.getElementById('cartBtn').addEventListener('click', openCart);
document.getElementById('closeCart').addEventListener('click', closeCartFn);
cartOverlay.addEventListener('click', closeCartFn);
document.getElementById('checkoutBtn').addEventListener('click', openCheckout);
closeCheckoutModal.addEventListener('click', closeCheckout);
orderForm.addEventListener('submit', handleOrderSubmit);
document.getElementById('successContinueBtn').addEventListener('click', closeCheckout);

closeProductModal.addEventListener('click', () => productModal.classList.add('hidden'));

const debouncedSearch = debounce((val) => { state.search = val; fetchProducts(); }, 300);
document.getElementById('searchInput').addEventListener('input', e => debouncedSearch(e.target.value));
document.getElementById('searchInputMobile').addEventListener('input', e => debouncedSearch(e.target.value));

document.getElementById('sortSelect').addEventListener('change', e => {
  state.sort = e.target.value;
  fetchProducts();
});

document.querySelectorAll('.hero-card').forEach(card => {
  card.addEventListener('click', () => {
    state.category = card.dataset.category;
    loadCategories();
    fetchProducts();
    window.scrollTo({ top: 400, behavior: 'smooth' });
  });
});

async function initApp() {
  await checkBackendHealth();
  await loadCategories();
  await fetchProducts();
  renderCart();
}

initApp();
