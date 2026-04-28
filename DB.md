Below is a production-level PostgreSQL schema tailored exactly to your requirements:

Multi-language (EN / AR / HE)
Unlimited categories
Advanced product variants
Flexible stock modes
Multi-user roles
WhatsApp + orders
SaaS-ready (multi-store)
🧠 Database Design Principles (quick)
Use UUIDs (important for SaaS)
Use translation tables (clean multilingual)
Separate:
product vs variants
attributes vs values
Support multi-store from day 1
🗄️ DATABASE SCHEMA (PostgreSQL)
-- Enable UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
🏪 1. STORES (Multi-tenant ready)
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  whatsapp_number TEXT,
  stock_mode TEXT DEFAULT 'track_visible', -- track_visible | track_hidden | no_stock
  created_at TIMESTAMP DEFAULT NOW()
);
👥 2. USERS & ROLES
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT -- super_admin, owner, manager, staff
);

CREATE TABLE user_store_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id)
);
🌍 3. LANGUAGES
CREATE TABLE languages (
  code TEXT PRIMARY KEY, -- en, ar, he
  name TEXT,
  direction TEXT -- ltr / rtl
);
🗂️ 4. CATEGORIES (Unlimited nesting)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  image TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE category_translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  language_code TEXT REFERENCES languages(code),
  name TEXT,
  slug TEXT
);
📦 5. PRODUCTS
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE product_translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  language_code TEXT REFERENCES languages(code),
  title TEXT,
  description TEXT
);
🖼️ 6. PRODUCT IMAGES
CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  url TEXT,
  is_main BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0
);
⚙️ 7. ATTRIBUTES (Specifications like Color, Size)
CREATE TABLE attributes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE
);

CREATE TABLE attribute_translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attribute_id UUID REFERENCES attributes(id) ON DELETE CASCADE,
  language_code TEXT REFERENCES languages(code),
  name TEXT -- e.g. Color, Size
);
🔘 8. ATTRIBUTE VALUES
CREATE TABLE attribute_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attribute_id UUID REFERENCES attributes(id) ON DELETE CASCADE
);

CREATE TABLE attribute_value_translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  value_id UUID REFERENCES attribute_values(id) ON DELETE CASCADE,
  language_code TEXT REFERENCES languages(code),
  value TEXT -- e.g. Red, Large
);
🔀 9. PRODUCT VARIANTS
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT,
  price NUMERIC,
  stock INT,
  is_active BOOLEAN DEFAULT TRUE
);
🔗 10. VARIANT ATTRIBUTE COMBINATIONS
CREATE TABLE variant_attribute_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  attribute_value_id UUID REFERENCES attribute_values(id)
);

👉 Example:

Variant:
Color = Red
Size = L
🛒 11. CART
CREATE TABLE carts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_id UUID REFERENCES carts(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id),
  quantity INT
);
📦 12. ORDERS
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id),
  status TEXT DEFAULT 'pending',
  total NUMERIC,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id),
  quantity INT,
  price NUMERIC
);
💳 13. PAYMENTS
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id),
  method TEXT, -- stripe, paypal, cash
  status TEXT,
  transaction_id TEXT
);
💬 14. WHATSAPP ORDERS (Optional tracking)
CREATE TABLE whatsapp_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id),
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
⭐ EXTRA FEATURES (Recommended)
🧾 Reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id),
  rating INT,
  comment TEXT
);
❤️ Wishlist
CREATE TABLE wishlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id)
);