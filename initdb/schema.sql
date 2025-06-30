
CREATE TABLE blogs (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  meta_text TEXT,
  date TEXT,
  categories TEXT[]
);

CREATE TABLE blog_contents (
  id SERIAL PRIMARY KEY,
  blog_id INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  content TEXT NOT NULL,
  date TEXT,
  meta_text TEXT,
  title TEXT,
  UNIQUE (blog_id, slug)
);