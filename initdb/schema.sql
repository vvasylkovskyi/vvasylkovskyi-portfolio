
CREATE TABLE IF NOT EXISTS blogs (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  meta_text TEXT,
  date TEXT,
  categories TEXT[]
);

CREATE TABLE IF NOT EXISTS blog_contents (
  id SERIAL PRIMARY KEY,
  blog_id INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  content TEXT NOT NULL,
  date TEXT,
  meta_text TEXT,
  title TEXT,
  UNIQUE (blog_id, slug)
);

CREATE TABLE IF NOT EXISTS videos (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  timestamp TEXT NOT NULL
);
