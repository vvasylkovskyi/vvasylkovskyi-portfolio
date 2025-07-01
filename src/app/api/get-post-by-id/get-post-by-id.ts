import type { PostType } from '@/types/post';
import { pool } from '../database/pool';

export const getBlogById = async (url: string): Promise<PostType> => {
  // NextJS hack - https://github.com/vercel/next.js/discussions/46544#discussioncomment-11136615
  if (process.env.NEXT_PHASE === 'phase-production-build') return {} as PostType;



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