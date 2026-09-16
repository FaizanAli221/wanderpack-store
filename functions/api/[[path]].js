import products from '../../backend/data/products.json';

// In-memory orders store for Cloudflare Pages Functions
const orders = [];

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const pathname = url.pathname;
  const method = context.request.method;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // CORS Preflight
  if (method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    // GET /api/health
    if (pathname === '/api/health' || pathname === '/api/health/') {
      return new Response(JSON.stringify({ status: 'ok', platform: 'Cloudflare Pages Functions' }), { headers });
    }

    // GET /api/products/categories
    if (pathname === '/api/products/categories' || pathname === '/api/products/categories/') {
      const cats = [...new Set(products.map(p => p.category))];
      const withCount = cats.map(c => ({ name: c, count: products.filter(p => p.category === c).length }));
      return new Response(JSON.stringify(withCount), { headers });
    }

    // GET /api/products/:id
    const productMatch = pathname.match(/^\/api\/products\/(\d+)$/);
    if (method === 'GET' && productMatch) {
      const id = Number(productMatch[1]);
      const product = products.find(p => p.id === id);
      if (!product) {
        return new Response(JSON.stringify({ error: 'Product not found' }), { status: 404, headers });
      }
      return new Response(JSON.stringify(product), { headers });
    }

    // GET /api/products
    if (method === 'GET' && (pathname === '/api/products' || pathname === '/api/products/')) {
      let result = [...products];
      const category = url.searchParams.get('category');
      const search = url.searchParams.get('search');
      const minPrice = url.searchParams.get('minPrice');
      const maxPrice = url.searchParams.get('maxPrice');
      const sort = url.searchParams.get('sort');

      if (category && category !== 'All') {
        result = result.filter(p => p.category.toLowerCase() === category.toLowerCase());
      }
      if (search) {
        const q = search.toLowerCase();
        result = result.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
      }
      if (minPrice) result = result.filter(p => p.price >= Number(minPrice));
      if (maxPrice) result = result.filter(p => p.price <= Number(maxPrice));

      if (sort === 'price_asc') result.sort((a, b) => a.price - b.price);
      if (sort === 'price_desc') result.sort((a, b) => b.price - a.price);
      if (sort === 'rating') result.sort((a, b) => b.rating - a.rating);

      return new Response(JSON.stringify({ count: result.length, products: result }), { headers });
    }

    // GET /api/orders/:id
    const orderGetMatch = pathname.match(/^\/api\/orders\/([^\/]+)$/);
    if (method === 'GET' && orderGetMatch) {
      const orderId = decodeURIComponent(orderGetMatch[1]);
      const order = orders.find(o => o.orderId === orderId);
      if (!order) {
        return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404, headers });
      }
      return new Response(JSON.stringify(order), { headers });
    }

    // POST /api/orders
    if (method === 'POST' && (pathname === '/api/orders' || pathname === '/api/orders/')) {
      const body = await context.request.json();
      const { items, customer, notes } = body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return new Response(JSON.stringify({ error: 'Cart is empty or invalid items provided.' }), { status: 400, headers });
      }

      const calculatedSubtotal = items.reduce((acc, item) => acc + (Number(item.price) * Number(item.qty || 1)), 0);
      const shipping = calculatedSubtotal >= 5000 ? 0 : 250;
      const total = calculatedSubtotal + shipping;

      const order = {
        orderId: 'WP-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 5).toUpperCase(),
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          qty: item.qty || 1,
          image: item.image
        })),
        customer: customer || { name: 'Valued Customer' },
        notes: notes || '',
        subtotal: calculatedSubtotal,
        shipping,
        total,
        status: 'Confirmed',
        createdAt: new Date().toISOString()
      };

      orders.unshift(order);

      return new Response(JSON.stringify({
        success: true,
        message: 'Order placed successfully! Thank you for shopping with WanderPack.',
        orderId: order.orderId,
        order
      }), { status: 201, headers });
    }

    return new Response(JSON.stringify({ error: 'Endpoint not found' }), { status: 404, headers });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
