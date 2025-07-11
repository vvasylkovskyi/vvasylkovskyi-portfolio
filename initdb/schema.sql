CREATE TABLE IF NOT EXISTS blogs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  meta_text TEXT,
  date TEXT
);

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
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
  slug TEXT NOT NULL,
  content TEXT NOT NULL,
  date TEXT,
  meta_text TEXT,
  title TEXT,
  UNIQUE KEY unique_blog_slug (blog_id, slug),
  FOREIGN KEY (blog_id) REFERENCES blogs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS videos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  timestamp TEXT NOT NULL,
);