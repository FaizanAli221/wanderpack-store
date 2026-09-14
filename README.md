# WanderPack — E-Commerce Store (Luggage / Backpacks / School Bags)

A responsive full-stack e-commerce demo inspired by Pakistani luggage-retailer UI patterns: announcement bar, category hero cards, filterable product grid with PKR pricing, and a slide-out cart.

## Stack
- **Backend:** Node.js + Express REST API, in-memory JSON product data
- **Frontend:** Vanilla JS + Tailwind CSS (CDN) — zero build step

## Setup

You can run the project either from the project root or from `backend/`:

**Option 1: From Project Root**
```bash
npm install
npm start
```

**Option 2: From Backend Directory**
```bash
cd backend
npm install
npm start
```

Open **http://localhost:5000** — the Express backend serves both the REST API and the frontend static storefront.

For auto-reload during development: `npm run dev` (powered by `nodemon`).

## API Documentation

Base URL: `http://localhost:5000`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Server health check and uptime |
| GET | `/api/products` | List products with filtering (`category`, `search`, `minPrice`, `maxPrice`, `sort`) |
| GET | `/api/products/categories` | List categories with product counts |
| GET | `/api/products/:id` | Get single product details by ID |
| POST | `/api/orders` | Place a new order with cart items and customer delivery details |
| GET | `/api/orders` | List submitted orders |
| GET | `/api/orders/:id` | Get order details by order ID |

Example:
```bash
GET /api/products?category=School Bags&sort=price_asc
GET /api/products/1
POST /api/orders
```

## Project Structure
```
backend/
  server.js
  routes/products.js
  data/products.json
  package.json
frontend/
  index.html
  app.js
  style.css
README.md
```

## CV / Portfolio Bullet Points

- Built a full-stack e-commerce web application with a Node.js/Express REST API and a responsive Tailwind CSS storefront, featuring dynamic filtering, search, and sorting across a multi-category product catalog.
- Designed a slide-out shopping cart with persistent state (localStorage), real-time quantity controls, and PKR currency formatting.
- Implemented a RESTful product API supporting category, keyword, price-range, and sort-based querying, consumed by a zero-build vanilla JS frontend.
- Structured the codebase into modular backend routes and a static, framework-free frontend for fast load times and easy deployment.
