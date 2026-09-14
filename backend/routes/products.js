const express = require('express');
const router = express.Router();
const products = require('../data/products.json');

// GET /api/products?category=&search=&minPrice=&maxPrice=&sort=
router.get('/', (req, res) => {
  let result = [...products];
  const { category, search, minPrice, maxPrice, sort } = req.query;

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

  res.json({ count: result.length, products: result });
});

// GET /api/products/categories
router.get('/categories', (req, res) => {
  const cats = [...new Set(products.map(p => p.category))];
  const withCount = cats.map(c => ({ name: c, count: products.filter(p => p.category === c).length }));
  res.json(withCount);
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  const product = products.find(p => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

module.exports = router;
