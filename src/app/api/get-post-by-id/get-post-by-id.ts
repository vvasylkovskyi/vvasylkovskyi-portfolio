import type { PostType } from '@/types/post';
import { pool } from '../database/pool';

export const getBlogById = async (url: string): Promise<PostType> => {
  try {
    const [rows] = await pool.query(
      `
      SELECT 
        b.slug AS url,
        b.title,
        b.meta_text AS metaText,
        b.date,
        p.content,
        GROUP_CONCAT(c.name) AS categories
      FROM blogs b
      JOIN blog_contents p ON b.id = p.blog_id
      LEFT JOIN blog_categories bc ON bc.blog_id = b.id
      LEFT JOIN categories c ON c.id = bc.category_id
      WHERE b.slug = ?
      GROUP BY b.id, p.content
      `,
      [url]
    );

    if ((rows as PostType[]).length === 0) {
      throw new Error(`Blog with slug ${url} not found`);
    }

    const blog = (rows as any)[0];

    // Transform comma-separated categories string into string array
    return {
      ...blog,
      categories: blog.categories ? blog.categories.split(',') : [],
    };
  } catch (e) {
    throw new Error(`Error While Fetching Post: ${e}`);
  }
};
