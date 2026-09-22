// Dynamic API Base URL logic for Local Server & Cloudflare Pages Functions
const isLocalAltPort = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '5000' && window.location.port !== '';
const isFileProtocol = window.location.protocol === 'file:';

const API_HOST = (isLocalAltPort || isFileProtocol) ? 'http://localhost:5000' : '';
const API_BASE = `${API_HOST}/api/products`;
const ORDERS_API = `${API_HOST}/api/orders`;

// App State
const state = {
  products: [],
  category: 'All',
  search: '',
  maxPrice: '',
  inStockOnly: false,
  onSaleOnly: false,
  sort: 'featured',
  cart: JSON.parse(localStorage.getItem('wp_cart') || '[]'),
  wishlist: JSON.parse(localStorage.getItem('wp_wishlist') || '[]'),
  currentPage: 'home',
  lastPlacedOrderId: ''
};

// DOM Elements
const productGrid = document.getElementById('productGrid');
const bestSellersGrid = document.getElementById('bestSellersGrid');
const emptyState = document.getElementById('emptyState');
const categoryPills = document.getElementById('categoryPills');
const resultCount = document.getElementById('resultCount');
const cartCount = document.getElementById('cartCount');
const wishlistCount = document.getElementById('wishlistCount');
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

const searchInput = document.getElementById('searchInput');
const searchInputMobile = document.getElementById('searchInputMobile');
const sortSelect = document.getElementById('sortSelect');
const maxPriceInput = document.getElementById('maxPriceInput');
const inStockCheck = document.getElementById('inStockCheck');
const onSaleCheck = document.getElementById('onSaleCheck');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');
const emptyStateResetBtn = document.getElementById('emptyStateResetBtn');

function formatPKR(amount) {
  return 'Rs. ' + Number(amount).toLocaleString('en-PK');
}

function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

// -------------------------------------------------------------
// SPA ROUTER
// -------------------------------------------------------------
const pages = {
  home: document.getElementById('homePage'),
  shop: document.getElementById('homePage'),
  track: document.getElementById('trackPage'),
  about: document.getElementById('aboutPage'),
  contact: document.getElementById('contactPage'),
  shipping: document.getElementById('shippingPage'),
  privacy: document.getElementById('privacyPage'),
  terms: document.getElementById('termsPage')
};

function navigateTo(pageName) {
  state.currentPage = pageName;

  Object.keys(pages).forEach(key => {
    const el = pages[key];
    if (el) el.classList.add('hidden');
  });

  const target = pages[pageName] || pages.home;
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === pageName);
  });

  closeMobileMenu();

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

// Mobile Drawer Controls
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
// WISHLIST OPERATIONS
// -------------------------------------------------------------
function toggleWishlist(id) {
  const idx = state.wishlist.indexOf(id);
  if (idx > -1) {
    state.wishlist.splice(idx, 1);
  } else {
    state.wishlist.push(id);
  }
  localStorage.setItem('wp_wishlist', JSON.stringify(state.wishlist));
  updateWishlistBadge();
  renderProducts();
  if (bestSellersGrid) renderBestSellers();
}

function updateWishlistBadge() {
  if (wishlistCount) wishlistCount.textContent = state.wishlist.length;
}

// -------------------------------------------------------------
// PRODUCTS FETCH & RENDER LOGIC
// -------------------------------------------------------------
async function fetchProducts() {
  try {
    const params = new URLSearchParams();
    if (state.category !== 'All') params.set('category', state.category);
    if (state.search) params.set('search', state.search);
    if (state.maxPrice) params.set('maxPrice', state.maxPrice);
    if (state.inStockOnly) params.set('inStock', 'true');
    if (state.onSaleOnly) params.set('onSale', 'true');
    if (state.sort !== 'featured') params.set('sort', state.sort);

    const res = await fetch(`${API_BASE}?${params.toString()}`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    state.products = data.products || [];
    renderProducts();
    renderBestSellers();
  } catch (err) {
    console.error('API Error:', err);
    if (emptyState) {
      emptyState.innerHTML = `
        <div class="p-8 text-center text-slate-600">
          <p class="font-bold text-base text-slate-900">Unable to load catalog from server</p>
          <p class="text-xs mt-1 text-slate-500">Please check your network connection.</p>
          <button onclick="initApp()" class="mt-4 btn-astra-primary text-xs py-2 px-4">Retry Connection</button>
        </div>`;
      emptyState.classList.remove('hidden');
    }
  }
}

async function loadCategories() {
  try {
    const res = await fetch(`${API_BASE}/categories`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const cats = await res.json();
    const fixedCats = [
      'Backpacks',
      'Laptop Bags',
      'Travel Duffels',
      'Cabin Luggage',
      'Suitcases',
      'School Bags',
      'Travel Accessories'
    ];

    const categoryList = fixedCats.map(cName => {
      const found = cats.find(c => c.name.toLowerCase() === cName.toLowerCase());
      return { name: cName, count: found ? found.count : 0 };
    });

    const totalCount = categoryList.reduce((s, c) => s + c.count, 0);
    const allPills = [{ name: 'All', count: totalCount }, ...categoryList];

    if (categoryPills) {
      categoryPills.innerHTML = allPills.map(c => `
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
    }
  } catch (err) {
    console.error('Categories error:', err);
  }
}

function renderProductCardHTML(p) {
  const isWishlisted = state.wishlist.includes(p.id);
  const secondImage = (p.gallery && p.gallery.length > 1) ? p.gallery[1] : p.image;

  return `
    <div class="product-card">
      <div class="product-img-container cursor-pointer" data-view-id="${p.id}">
        ${p.onSale ? `<span class="badge-discount">${p.discountPercent}% OFF</span>` : ''}
        <button class="wishlist-btn ${isWishlisted ? 'active' : ''}" data-wishlist-id="${p.id}" aria-label="Toggle Wishlist">
          <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </button>
        <img src="${p.image}" alt="${p.name}" class="product-img product-img-primary" loading="lazy">
        <img src="${secondImage}" alt="${p.name} alternate view" class="product-img product-img-secondary" loading="lazy">
      </div>

      <div class="mt-3 flex-1 flex flex-col justify-between">
        <div>
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">${p.category}</span>
          <h3 class="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 mb-1.5 cursor-pointer hover:text-sky-600 transition" data-view-id="${p.id}">
            ${p.name}
          </h3>
        </div>

        <div>
          <div class="text-xs text-amber-400 mb-2 flex items-center gap-1">
            <span>${'★'.repeat(Math.round(p.rating))}${'☆'.repeat(5 - Math.round(p.rating))}</span>
            <span class="text-slate-400 text-[10px]">(${p.rating})</span>
          </div>

          <div class="flex items-center justify-between border-t border-slate-100 pt-2.5">
            <div>
              <span class="font-extrabold text-sm sm:text-base text-slate-900">${formatPKR(p.price)}</span>
              ${p.onSale ? `<span class="text-[11px] text-slate-400 line-through block font-normal">${formatPKR(p.originalPrice)}</span>` : ''}
            </div>

            <div class="flex items-center gap-1.5">
              <button class="quickview-btn text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold p-2 rounded transition" data-view-id="${p.id}" title="Quick View">
                🔍
              </button>
              <button class="add-btn text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-2 rounded transition" data-id="${p.id}">
                + Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderProducts() {
  if (resultCount) resultCount.textContent = `Showing ${state.products.length} products`;
  if (emptyState) emptyState.classList.toggle('hidden', state.products.length > 0);

  if (productGrid) {
    productGrid.innerHTML = state.products.map(p => renderProductCardHTML(p)).join('');
    bindCardEvents(productGrid);
  }
}

function renderBestSellers() {
  if (!bestSellersGrid) return;
  const bestSellers = [...state.products].sort((a, b) => b.rating - a.rating).slice(0, 4);
  bestSellersGrid.innerHTML = bestSellers.map(p => renderProductCardHTML(p)).join('');
  bindCardEvents(bestSellersGrid);
}

function bindCardEvents(container) {
  container.querySelectorAll('[data-view-id]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      openProductDetails(Number(el.dataset.viewId));
    });
  });

  container.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      addToCart(Number(btn.dataset.id));
    });
  });

  container.querySelectorAll('.wishlist-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleWishlist(Number(btn.dataset.wishlistId));
    });
  });
}

// -------------------------------------------------------------
// DETAILED PRODUCT MODAL WITH SPECS & GALLERY
// -------------------------------------------------------------
async function openProductDetails(id) {
  const content = document.getElementById('productModalContent');
  productModal.classList.remove('hidden');
  content.innerHTML = '<div class="py-16 text-center text-slate-400 text-sm">Loading product details...</div>';

  try {
    const res = await fetch(`${API_BASE}/${id}`);
    if (!res.ok) throw new Error('Product not found');
    const p = await res.json();
    const isWishlisted = state.wishlist.includes(p.id);
    const galleryImages = (p.gallery && p.gallery.length > 0) ? p.gallery : [p.image];
    const specs = p.specs || {};

    content.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        <!-- Image Gallery & Preview -->
        <div class="space-y-3">
          <div class="rounded-xl overflow-hidden bg-slate-100 border border-slate-200 aspect-square relative shadow-sm">
            <img id="mainGalleryImg" src="${galleryImages[0]}" alt="${p.name}" class="w-full h-full object-cover transition-all duration-300">
            ${p.onSale ? `<span class="badge-discount top-3 left-3">${p.discountPercent}% OFF</span>` : ''}
          </div>
          <div class="flex gap-2 overflow-x-auto pb-1">
            ${galleryImages.map((img, i) => `
              <div class="gallery-thumb ${i === 0 ? 'active' : ''}" data-thumb-src="${img}">
                <img src="${img}" alt="Thumbnail ${i+1}" class="w-full h-full object-cover">
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Details & Specifications -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-xs uppercase tracking-wider font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded border border-sky-100">${p.category}</span>
            <button class="wishlist-btn relative top-0 right-0 ${isWishlisted ? 'active' : ''}" id="modalWishlistBtn">
              <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </button>
          </div>

          <h3 class="text-xl font-bold text-slate-900 heading-font leading-snug">${p.name}</h3>
          
          <div class="flex items-center gap-3">
            <div class="text-sm text-amber-400 font-medium">
              ${'★'.repeat(Math.round(p.rating))}${'☆'.repeat(5 - Math.round(p.rating))}
              <span class="text-slate-400 text-xs font-normal">(${p.rating} / 5.0)</span>
            </div>
            <span class="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
              In Stock (${p.stock} units ready)
            </span>
          </div>

          <div class="flex items-baseline gap-3 py-1">
            <span class="text-2xl font-extrabold text-slate-900">${formatPKR(p.price)}</span>
            ${p.onSale ? `<span class="text-sm text-slate-400 line-through">${formatPKR(p.originalPrice)}</span>` : ''}
          </div>

          <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">${p.description}</p>

          <!-- Specifications Table -->
          <div class="border border-slate-200 rounded-lg p-3 bg-slate-50 text-xs space-y-1.5">
            <div class="font-bold text-slate-900 mb-1 heading-font uppercase tracking-wider text-[11px]">Product Specifications</div>
            <div class="grid grid-cols-2 gap-1 text-slate-600">
              <div>• <strong>Dimensions:</strong> ${specs.dimensions || 'Standard'}</div>
              <div>• <strong>Capacity:</strong> ${specs.capacity || 'N/A'}</div>
              <div>• <strong>Weight:</strong> ${specs.weight || 'N/A'}</div>
              <div>• <strong>Material:</strong> ${specs.material || 'Waterproof Nylon'}</div>
              <div>• <strong>Laptop Fit:</strong> ${specs.laptopFit || 'N/A'}</div>
              <div>• <strong>Compartments:</strong> ${specs.compartments || 'Multiple'}</div>
            </div>
          </div>

          <!-- Trust Badges -->
          <div class="text-[11px] text-slate-500 flex flex-wrap gap-3 pt-1">
            <span>🚚 Free Shipping > Rs. 5,000</span>
            <span>🛡️ 1-Year Warranty</span>
            <span>💵 Cash on Delivery</span>
          </div>

          <!-- Actions -->
          <div class="flex gap-3 pt-2">
            <button id="modalAddBtn" class="btn-astra-primary flex-1">Add to Cart</button>
            <button id="modalBuyNowBtn" class="btn-astra-outline flex-1 text-slate-900 border-slate-900 hover:bg-slate-900 hover:text-white">Buy Now</button>
          </div>
        </div>
      </div>
    `;

    // Thumbnail click logic
    content.querySelectorAll('.gallery-thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        content.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
        document.getElementById('mainGalleryImg').src = thumb.dataset.thumbSrc;
      });
    });

    document.getElementById('modalWishlistBtn').addEventListener('click', () => {
      toggleWishlist(p.id);
      openProductDetails(p.id);
    });

    document.getElementById('modalAddBtn').addEventListener('click', () => {
      addToCart(p.id);
      productModal.classList.add('hidden');
    });

    document.getElementById('modalBuyNowBtn').addEventListener('click', () => {
      addToCart(p.id);
      productModal.classList.add('hidden');
      openCheckoutModal();
    });

  } catch (err) {
    content.innerHTML = `<p class="text-red-500 text-center py-8 text-sm">Could not load product details.</p>`;
  }
}

if (closeProductModal) {
  closeProductModal.addEventListener('click', () => productModal.classList.add('hidden'));
}

// -------------------------------------------------------------
// CART OPERATIONS & LOCALSTORAGE
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

function removeFromCart(id) {
  state.cart = state.cart.filter(i => i.id !== id);
  persistCart();
  renderCart();
}

function persistCart() {
  localStorage.setItem('wp_cart', JSON.stringify(state.cart));
}

function renderCart() {
  const totalItems = state.cart.reduce((s, i) => s + i.qty, 0);
  if (cartCount) cartCount.textContent = totalItems;

  const subtotal = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
  if (cartSubtotalEl) cartSubtotalEl.textContent = formatPKR(subtotal);

  if (cartItemsEl) {
    if (state.cart.length === 0) {
      cartItemsEl.innerHTML = `
        <div class="text-center py-12 text-slate-400">
          <div class="text-4xl mb-2">🛍️</div>
          <p class="font-bold text-sm text-slate-700">Your cart is currently empty</p>
          <p class="text-xs mt-1 text-slate-400">Browse our collections to add travel gear.</p>
        </div>`;
    } else {
      cartItemsEl.innerHTML = state.cart.map(item => `
        <div class="flex items-center gap-3 pb-3 border-b border-slate-100">
          <img src="${item.image}" alt="${item.name}" class="w-14 h-14 object-cover rounded bg-slate-100 border border-slate-200">
          <div class="flex-1 min-w-0">
            <h4 class="text-xs font-bold text-slate-900 truncate">${item.name}</h4>
            <div class="text-xs text-slate-600 font-semibold mt-0.5">${formatPKR(item.price)}</div>
            <div class="flex items-center gap-2 mt-1">
              <button class="qty-btn" onclick="updateQty(${item.id}, -1)">-</button>
              <span class="text-xs font-bold">${item.qty}</span>
              <button class="qty-btn" onclick="updateQty(${item.id}, 1)">+</button>
            </div>
          </div>
          <button class="text-slate-400 hover:text-red-600 text-lg p-1" onclick="removeFromCart(${item.id})" title="Remove Item">&times;</button>
        </div>
      `).join('');
    }
  }
}

function openCart() {
  if (cartDrawer) cartDrawer.classList.add('open');
  if (cartOverlay) cartOverlay.classList.remove('hidden');
}

function closeCart() {
  if (cartDrawer) cartDrawer.classList.remove('open');
  if (cartOverlay) cartOverlay.classList.add('hidden');
}

const cartBtn = document.getElementById('cartBtn');
const closeCartBtn = document.getElementById('closeCart');
if (cartBtn) cartBtn.addEventListener('click', openCart);
if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

// -------------------------------------------------------------
// CHECKOUT FLOW
// -------------------------------------------------------------
function openCheckoutModal() {
  if (state.cart.length === 0) {
    alert('Your shopping cart is empty.');
    return;
  }
  closeCart();
  const subtotal = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = subtotal >= 5000 ? 0 : 250;
  const total = subtotal + shipping;

  document.getElementById('checkoutItemCount').textContent = state.cart.reduce((s, i) => s + i.qty, 0);
  document.getElementById('checkoutSubtotal').textContent = formatPKR(subtotal);
  document.getElementById('checkoutShipping').textContent = shipping === 0 ? 'FREE' : formatPKR(shipping);
  document.getElementById('checkoutTotal').textContent = formatPKR(total);

  document.getElementById('checkoutFormView').classList.remove('hidden');
  document.getElementById('orderSuccessView').classList.add('hidden');
  checkoutModal.classList.remove('hidden');
}

const checkoutBtn = document.getElementById('checkoutBtn');
if (checkoutBtn) checkoutBtn.addEventListener('click', openCheckoutModal);
if (closeCheckoutModal) closeCheckoutModal.addEventListener('click', () => checkoutModal.classList.add('hidden'));

if (orderForm) {
  orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submitOrderBtn');
    const errorMsg = document.getElementById('checkoutErrorMsg');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing Order...';
    errorMsg.classList.add('hidden');

    const customer = {
      name: document.getElementById('custName').value,
      phone: document.getElementById('custPhone').value,
      city: document.getElementById('custCity').value,
      address: document.getElementById('custAddress').value
    };

    try {
      const res = await fetch(ORDERS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: state.cart, customer })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');

      state.lastPlacedOrderId = data.orderId;
      state.cart = [];
      persistCart();
      renderCart();

      document.getElementById('checkoutFormView').classList.add('hidden');
      document.getElementById('successOrderId').textContent = data.orderId;
      document.getElementById('orderSuccessView').classList.remove('hidden');

    } catch (err) {
      errorMsg.textContent = err.message || 'Error placing order. Please try again.';
      errorMsg.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirm & Place Order';
    }
  });
}

const trackMyOrderBtn = document.getElementById('trackMyOrderBtn');
if (trackMyOrderBtn) {
  trackMyOrderBtn.addEventListener('click', () => {
    checkoutModal.classList.add('hidden');
    if (state.lastPlacedOrderId) {
      document.getElementById('trackOrderIdInput').value = state.lastPlacedOrderId;
    }
    navigateTo('track');
    const form = document.getElementById('trackOrderForm');
    if (form) form.dispatchEvent(new Event('submit'));
  });
}

const successContinueBtn = document.getElementById('successContinueBtn');
if (successContinueBtn) {
  successContinueBtn.addEventListener('click', () => {
    checkoutModal.classList.add('hidden');
    navigateTo('home');
  });
}

// -------------------------------------------------------------
// DEMO ORDER TRACKING LOGIC
// -------------------------------------------------------------
const trackOrderForm = document.getElementById('trackOrderForm');
const trySampleOrderBtn = document.getElementById('trySampleOrderBtn');

if (trySampleOrderBtn) {
  trySampleOrderBtn.addEventListener('click', () => {
    document.getElementById('trackOrderIdInput').value = 'WP-DEMO101';
    if (trackOrderForm) trackOrderForm.dispatchEvent(new Event('submit'));
  });
}

if (trackOrderForm) {
  trackOrderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const idInput = document.getElementById('trackOrderIdInput').value.trim();
    const errorMsg = document.getElementById('trackErrorMsg');
    const resultDiv = document.getElementById('trackingResult');
    errorMsg.classList.add('hidden');
    resultDiv.classList.add('hidden');

    if (!idInput) return;

    try {
      const res = await fetch(`${ORDERS_API}/${encodeURIComponent(idInput)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Order tracking details unavailable');

      document.getElementById('trackResultId').textContent = data.orderId;
      document.getElementById('trackResultStatus').textContent = data.status || 'Confirmed';
      document.getElementById('trackCustomerName').textContent = data.customer?.name || 'Valued Customer';
      document.getElementById('trackCustomerPhone').textContent = `📞 ${data.customer?.phone || '03212212321'}`;
      document.getElementById('trackCustomerAddress').textContent = `📍 ${data.customer?.address || 'Pakistan Delivery Address'}`;
      document.getElementById('trackOrderTotal').textContent = formatPKR(data.total || 5300);

      resultDiv.classList.remove('hidden');

    } catch (err) {
      errorMsg.textContent = 'Could not find details for this Order ID. Please try WP-DEMO101.';
      errorMsg.classList.remove('hidden');
    }
  });
}

// -------------------------------------------------------------
// NEWSLETTER & FILTER EVENT BINDINGS
// -------------------------------------------------------------
const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
  newsletterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = document.getElementById('newsletterMsg');
    msg.textContent = 'Thank you for subscribing to WanderPack updates!';
    msg.classList.remove('hidden');
    document.getElementById('newsletterEmail').value = '';
    setTimeout(() => msg.classList.add('hidden'), 4000);
  });
}

// Search input listeners
if (searchInput) searchInput.addEventListener('input', debounce((e) => {
  state.search = e.target.value.trim();
  fetchProducts();
}, 300));

if (searchInputMobile) searchInputMobile.addEventListener('input', debounce((e) => {
  state.search = e.target.value.trim();
  fetchProducts();
}, 300));

// Filter controls
if (maxPriceInput) maxPriceInput.addEventListener('input', debounce((e) => {
  state.maxPrice = e.target.value;
  fetchProducts();
}, 400));

if (inStockCheck) inStockCheck.addEventListener('change', (e) => {
  state.inStockOnly = e.target.checked;
  fetchProducts();
});

if (onSaleCheck) onSaleCheck.addEventListener('change', (e) => {
  state.onSaleOnly = e.target.checked;
  fetchProducts();
});

if (sortSelect) sortSelect.addEventListener('change', (e) => {
  state.sort = e.target.value;
  fetchProducts();
});

function resetFilters() {
  state.search = '';
  state.maxPrice = '';
  state.inStockOnly = false;
  state.onSaleOnly = false;
  state.sort = 'featured';
  if (searchInput) searchInput.value = '';
  if (searchInputMobile) searchInputMobile.value = '';
  if (maxPriceInput) maxPriceInput.value = '';
  if (inStockCheck) inStockCheck.checked = false;
  if (onSaleCheck) onSaleCheck.checked = false;
  if (sortSelect) sortSelect.value = 'featured';
  fetchProducts();
}

if (resetFiltersBtn) resetFiltersBtn.addEventListener('click', resetFilters);
if (emptyStateResetBtn) emptyStateResetBtn.addEventListener('click', resetFilters);

// -------------------------------------------------------------
// APP INITIALIZATION
// -------------------------------------------------------------
function initApp() {
  updateWishlistBadge();
  renderCart();
  loadCategories();
  fetchProducts();
  handleHashChange();
}

document.addEventListener('DOMContentLoaded', initApp);
