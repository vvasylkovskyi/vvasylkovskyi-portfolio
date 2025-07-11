CREATE TABLE IF NOT EXISTS blogs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  meta_text TEXT,
  date VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS blog_categories (
  blog_id INT NOT NULL,
  category_id INT NOT NULL,
  PRIMARY KEY (blog_id, category_id),
  FOREIGN KEY (blog_id) REFERENCES blogs(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS blog_contents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  blog_id INT NOT NULL,
  slug VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  date VARCHAR(50),
  meta_text TEXT,
  title VARCHAR(255),
  UNIQUE KEY unique_blog_slug (blog_id, slug),
  FOREIGN KEY (blog_id) REFERENCES blogs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS videos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  url VARCHAR(255) NOT NULL,
  timestamp VARCHAR(50) NOT NULL
);
