import { PostType } from '@/types/post';
import { pool } from '../database/pool';

export const getBlogById = async (url: string): Promise<PostType> => {
  try {
    const result = await pool.query(
      `SELECT 
        b.slug AS url, 
        b.title, 
        b.meta_text AS "metaText", 
        b.date, 
        b.categories,
        p.content
      FROM blogs b
      JOIN blog_contents p ON b.id = p.blog_id
      WHERE b.slug = $1`,
      [url]
    );
    return result.rows[0] as PostType;
  } catch (e) {
    throw new Error(`Error While Fetching Posts: ${e}`);
  }
};