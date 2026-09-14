const express = require('express');
const router = express.Router();

// In-memory orders store
const orders = [];

// POST /api/orders - Create a new order
router.post('/', (req, res) => {
  const { items, customer, notes, subtotal } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty or invalid items provided.' });
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

  res.status(201).json({
    success: true,
    message: 'Order placed successfully! Thank you for shopping with WanderPack.',
    orderId: order.orderId,
    order
  });
});

// GET /api/orders - List placed orders
router.get('/', (req, res) => {
  res.json({ count: orders.length, orders });
});

// GET /api/orders/:id - Get order by ID
router.get('/:id', (req, res) => {
  const order = orders.find(o => o.orderId === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

module.exports = router;
