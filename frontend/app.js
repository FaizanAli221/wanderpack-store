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
  cart: JSON.parse(localStorage.getItem('wp_cart') || '[]'),
  currentPage: 'home',
  lastPlacedOrderId: ''
};

// DOM Elements
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

const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileDrawer = document.getElementById('mobileDrawer');
const mobileDrawerOverlay = document.getElementById('mobileDrawerOverlay');
const closeMobileDrawer = document.getElementById('closeMobileDrawer');

function formatPKR(amount) {
  return 'Rs. ' + Number(amount).toLocaleString('en-PK');
}

function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

// -------------------------------------------------------------
// COMPREHENSIVE SPA ROUTER (All 11 Pages)
// -------------------------------------------------------------
const pages = {
  home: document.getElementById('homePage'),
  shop: document.getElementById('homePage'),
  track: document.getElementById('trackPage'),
  about: document.getElementById('aboutPage'),
  reviews: document.getElementById('reviewsPage'),
  warranty: document.getElementById('warrantyPage'),
  corporate: document.getElementById('corporatePage'),
  faq: document.getElementById('faqPage'),
  contact: document.getElementById('contactPage'),
  shipping: document.getElementById('shippingPage'),
  privacy: document.getElementById('privacyPage'),
  terms: document.getElementById('termsPage')
};

function navigateTo(pageName) {
  state.currentPage = pageName;

  // Hide all page containers
  Object.keys(pages).forEach(key => {
    const el = pages[key];
    if (el) el.classList.add('hidden');
  });

  // Show selected page container
  const target = pages[pageName] || pages.home;
  if (target) target.classList.remove('hidden');

  // Update active state in nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === pageName);
  });

  // Close mobile drawer if open
  closeMobileMenu();

  // Special handling for shop anchor
  if (pageName === 'shop') {
    const shopSec = document.getElementById('shopSection');
    if (shopSec) shopSec.scrollIntoView({ behavior: 'smooth' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function handleHashChange() {
  const hash = window.location.hash.replace('#', '').toLowerCase();
  if (hash && pages[hash]) {
    navigateTo(hash);
  } else {
    navigateTo('home');
  }
}

window.addEventListener('hashchange', handleHashChange);

document.querySelectorAll('.nav-target').forEach(link => {
  link.addEventListener('click', (e) => {
    const page = link.dataset.page;
    const cat = link.dataset.category;
    if (cat) {
      state.category = cat;
      loadCategories();
      fetchProducts();
      navigateTo('shop');
    } else if (page) {
      navigateTo(page);
    }
  });
});

// Mobile Drawer controls
function openMobileMenu() {
  mobileDrawer.classList.remove('-translate-x-full');
  mobileDrawerOverlay.classList.remove('hidden');
}
function closeMobileMenu() {
  mobileDrawer.classList.add('-translate-x-full');
  mobileDrawerOverlay.classList.add('hidden');
}
if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openMobileMenu);
if (closeMobileDrawer) closeMobileDrawer.addEventListener('click', closeMobileMenu);
if (mobileDrawerOverlay) mobileDrawerOverlay.addEventListener('click', closeMobileMenu);


// -------------------------------------------------------------
// PRODUCTS CATALOG & STORE LOGIC
// -------------------------------------------------------------
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
      <div class="p-8 bg-stone-100 rounded-2xl text-gray-700 max-w-md mx-auto text-center">
        <p class="font-bold text-base text-gray-900">Unable to load bags from server</p>
        <p class="text-xs mt-1 text-gray-500">Please make sure backend server is running.</p>
        <button onclick="initApp()" class="mt-4 bg-blue-900 text-white text-xs font-bold px-5 py-2.5 rounded-full hover:bg-blue-800">Retry Connection</button>
      </div>`;
    emptyState.classList.remove('hidden');
  }
}

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

function renderProducts() {
  resultCount.textContent = `${state.products.length} products available`;
  emptyState.classList.toggle('hidden', state.products.length > 0);

  productGrid.innerHTML = state.products.map(p => `
    <div class="product-card border border-gray-200 rounded-2xl p-3 sm:p-4 bg-white hover:shadow-xl transition-all flex flex-col">
      <div class="overflow-hidden rounded-xl bg-stone-100 mb-3 cursor-pointer" data-view-id="${p.id}">
        <img src="${p.image}" alt="${p.name}" class="product-img w-full aspect-square object-cover" loading="lazy">
      </div>
      <div class="text-[11px] font-bold uppercase tracking-wider text-blue-800 mb-1">${p.category}</div>
      <h3 class="text-xs sm:text-sm font-bold text-gray-900 line-clamp-2 mb-1 cursor-pointer hover:text-blue-900" data-view-id="${p.id}">
        ${p.name}
      </h3>
      <div class="text-xs text-amber-500 mb-3 flex items-center gap-1">
        <span>${'★'.repeat(Math.round(p.rating))}${'☆'.repeat(5 - Math.round(p.rating))}</span>
        <span class="text-gray-400 text-[11px]">(${p.rating})</span>
      </div>
      <div class="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
        <span class="font-extrabold text-sm sm:text-base text-gray-900">${formatPKR(p.price)}</span>
        <button class="add-btn text-xs bg-gray-950 text-white font-semibold px-3.5 py-1.5 rounded-full hover:bg-blue-900 transition" data-id="${p.id}">
          + Add
        </button>
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

// -------------------------------------------------------------
// PRODUCT DETAILS MODAL (GET /api/products/:id)
// -------------------------------------------------------------
async function openProductDetails(id) {
  const content = document.getElementById('productModalContent');
  productModal.classList.remove('hidden');
  content.innerHTML = '<div class="py-16 text-center text-gray-400 text-sm">Loading authentic product details...</div>';

  try {
    const res = await fetch(`${API_BASE}/${id}`);
    if (!res.ok) throw new Error('Product not found');
    const p = await res.json();
    content.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
        <div class="rounded-xl overflow-hidden bg-stone-100 shadow-sm">
          <img src="${p.image}" alt="${p.name}" class="w-full aspect-square object-cover">
        </div>
        <div class="space-y-3">
          <span class="text-xs uppercase tracking-wider font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-full">${p.category}</span>
          <h3 class="text-lg sm:text-xl font-black text-gray-900 leading-snug">${p.name}</h3>
          <div class="text-sm text-amber-500 font-medium">
            ${'★'.repeat(Math.round(p.rating))}${'☆'.repeat(5 - Math.round(p.rating))} 
            <span class="text-gray-400 text-xs">(${p.rating} / 5.0 Rating)</span>
          </div>
          <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">${p.description}</p>
          <div class="text-xs text-gray-500 flex items-center gap-2">
            <span>Stock Status:</span>
            <span class="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">${p.stock} units ready to ship</span>
          </div>
          <div class="text-2xl font-black text-gray-900 pt-2">${formatPKR(p.price)}</div>
          <div class="pt-2">
            <button id="modalAddBtn" class="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 rounded-full transition shadow-md text-sm">
              Add to Shopping Cart
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('modalAddBtn').addEventListener('click', () => {
      addToCart(p.id);
      productModal.classList.add('hidden');
    });
  } catch (err) {
    content.innerHTML = `<p class="text-red-500 text-center py-8 text-sm">Could not load product details.</p>`;
  }
}

// -------------------------------------------------------------
// CART OPERATIONS
// -------------------------------------------------------------
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
    cartItemsEl.innerHTML = `
      <div class="text-center py-16 text-gray-400">
        <div class="text-4xl mb-2">🛍</div>
        <p class="text-sm font-medium">Your shopping cart is empty.</p>
        <button onclick="closeCartFn(); navigateTo('shop');" class="mt-4 bg-gray-900 text-white text-xs font-bold px-5 py-2 rounded-full hover:bg-blue-900">Browse Store</button>
      </div>`;
  } else {
    cartItemsEl.innerHTML = state.cart.map(i => `
      <div class="flex gap-3 items-center border-b border-gray-100 pb-3">
        <img src="${i.image}" class="w-16 h-16 rounded-xl object-cover bg-stone-100 shrink-0">
        <div class="flex-1 min-w-0">
          <div class="text-xs sm:text-sm font-bold text-gray-900 truncate">${i.name}</div>
          <div class="text-xs text-blue-900 font-extrabold mt-0.5">${formatPKR(i.price)}</div>
          <div class="flex items-center gap-2 mt-2">
            <button class="qty-btn" data-id="${i.id}" data-delta="-1">-</button>
            <span class="text-xs font-bold px-1">${i.qty}</span>
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

// -------------------------------------------------------------
// CHECKOUT & COD ORDERS (POST /api/orders)
// -------------------------------------------------------------
function openCheckout() {
  if (state.cart.length === 0) return alert('Your cart is empty. Please add bags to checkout.');
  closeCartFn();

  const subtotal = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = subtotal >= 5000 ? 0 : 250;
  const total = subtotal + shipping;
  const count = state.cart.reduce((s, i) => s + i.qty, 0);

  document.getElementById('checkoutItemCount').textContent = count;
  document.getElementById('checkoutSubtotal').textContent = formatPKR(subtotal);
  document.getElementById('checkoutShipping').textContent = shipping === 0 ? 'FREE (Special Offer)' : formatPKR(shipping);
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
  submitBtn.textContent = 'Processing Cash on Delivery Order...';

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

    state.lastPlacedOrderId = result.orderId;

    document.getElementById('checkoutFormView').classList.add('hidden');
    document.getElementById('orderSuccessView').classList.remove('hidden');
    document.getElementById('successOrderId').textContent = result.orderId;

    state.cart = [];
    persistCart();
    renderCart();
    orderForm.reset();
  } catch (err) {
    console.error('Order Error:', err);
    errorEl.textContent = `Order Error: ${err.message}.`;
    errorEl.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Confirm & Place Order';
  }
}

// -------------------------------------------------------------
// LIVE ORDER TRACKING (GET /api/orders/:id)
// -------------------------------------------------------------
const trackOrderForm = document.getElementById('trackOrderForm');
const trackOrderIdInput = document.getElementById('trackOrderIdInput');
const trackingResult = document.getElementById('trackingResult');
const trackErrorMsg = document.getElementById('trackErrorMsg');

async function trackOrderById(orderId) {
  if (!orderId) return;
  trackOrderIdInput.value = orderId;
  trackErrorMsg.classList.add('hidden');
  trackingResult.classList.add('hidden');

  try {
    const res = await fetch(`${ORDERS_API}/${encodeURIComponent(orderId)}`);
    if (!res.ok) throw new Error('Order ID not found. Please verify your reference number.');
    const order = await res.json();

    document.getElementById('trackResultId').textContent = order.orderId;
    document.getElementById('trackResultStatus').textContent = order.status || 'Confirmed';
    document.getElementById('trackCustomerName').textContent = order.customer.name || 'Valued Customer';
    document.getElementById('trackCustomerPhone').textContent = `Phone: ${order.customer.phone || 'N/A'}`;
    document.getElementById('trackCustomerAddress').textContent = `Delivery: ${order.customer.address}, ${order.customer.city}`;
    document.getElementById('trackOrderTotal').textContent = formatPKR(order.total);

    const itemsContainer = document.getElementById('trackItemsList');
    itemsContainer.innerHTML = (order.items || []).map(item => `
      <div class="flex items-center gap-3 py-1">
        <img src="${item.image}" class="w-10 h-10 rounded-lg object-cover bg-stone-100">
        <div class="flex-1 text-xs">
          <span class="font-bold text-gray-900">${item.name}</span>
          <span class="text-gray-500"> × ${item.qty}</span>
        </div>
        <div class="font-extrabold text-xs text-gray-900">${formatPKR(item.price * item.qty)}</div>
      </div>
    `).join('');

    trackingResult.classList.remove('hidden');
  } catch (err) {
    trackErrorMsg.textContent = err.message;
    trackErrorMsg.classList.remove('hidden');
  }
}

if (trackOrderForm) {
  trackOrderForm.addEventListener('submit', (e) => {
    e.preventDefault();
    trackOrderById(trackOrderIdInput.value.trim().toUpperCase());
  });
}

const trackMyOrderBtn = document.getElementById('trackMyOrderBtn');
if (trackMyOrderBtn) {
  trackMyOrderBtn.addEventListener('click', () => {
    closeCheckout();
    navigateTo('track');
    if (state.lastPlacedOrderId) {
      trackOrderById(state.lastPlacedOrderId);
    }
  });
}

// -------------------------------------------------------------
// INTERACTIVE FORMS & ACCORDIONS
// -------------------------------------------------------------
// FAQ Accordion
document.querySelectorAll('.faq-item').forEach(item => {
  item.addEventListener('click', () => {
    const isActive = item.classList.contains('active');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
    if (!isActive) item.classList.add('active');
  });
});

// Contact Form
const inquiryForm = document.getElementById('inquiryForm');
if (inquiryForm) {
  inquiryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    document.getElementById('inquirySuccessMsg').classList.remove('hidden');
    inquiryForm.reset();
  });
}

// Corporate & School Bulk Quote Form
const bulkQuoteForm = document.getElementById('bulkQuoteForm');
if (bulkQuoteForm) {
  bulkQuoteForm.addEventListener('submit', (e) => {
    e.preventDefault();
    document.getElementById('bulkSuccessMsg').classList.remove('hidden');
    bulkQuoteForm.reset();
  });
}

// -------------------------------------------------------------
// EVENT LISTENERS & INITIALIZATION
// -------------------------------------------------------------
document.getElementById('cartBtn').addEventListener('click', openCart);
document.getElementById('closeCart').addEventListener('click', closeCartFn);
cartOverlay.addEventListener('click', closeCartFn);
document.getElementById('checkoutBtn').addEventListener('click', openCheckout);
closeCheckoutModal.addEventListener('click', closeCheckout);
orderForm.addEventListener('submit', handleOrderSubmit);
document.getElementById('successContinueBtn').addEventListener('click', closeCheckout);

closeProductModal.addEventListener('click', () => productModal.classList.add('hidden'));

const debouncedSearch = debounce((val) => { 
  state.search = val; 
  navigateTo('shop');
  fetchProducts(); 
}, 300);

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
    navigateTo('shop');
  });
});

async function initApp() {
  handleHashChange();
  await loadCategories();
  await fetchProducts();
  renderCart();
}

initApp();
