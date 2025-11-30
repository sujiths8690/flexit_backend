

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(120) UNIQUE,
  password_hash VARCHAR(255),
  role VARCHAR(50) DEFAULT 'admin', -- admin/staff/viewer
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  mobile_number VARCHAR(100),
  email VARCHAR(100),
  is_active BOOLEAN,
  last_login DATETIME
);

CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  key_name VARCHAR(191) UNIQUE NOT NULL,
  value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  position INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(250) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  veg_flag ENUM('veg','non-veg') DEFAULT 'veg',
  category_id INT NULL,
  image_url VARCHAR(1024),
  is_available TINYINT(1) DEFAULT 1,
  position INT DEFAULT 0,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  INDEX(category_id)
);


CREATE TABLE IF NOT EXISTS combo_offer (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  image_url VARCHAR(1024),
  is_active TINYINT(1) DEFAULT 1
);

CREATE TABLE IF NOT EXISTS combo_offer_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  combo_id INT,
  product_id INT,
  quantity INT DEFAULT 1,

  FOREIGN KEY (combo_id) REFERENCES combo_offer(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX(combo_id),
  INDEX(product_id)
);

CREATE TABLE IF NOT EXISTS todays_star(
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT,

  FOREIGN KEY(product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS todays_offer(
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT,
  offer_price DECIMAL(10,2),

  FOREIGN KEY(product_id) REFERENCES products(id),
  INDEX(product_id)
);
