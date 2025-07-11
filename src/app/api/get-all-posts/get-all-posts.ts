import type { PostType } from '@/types/post';
import { pool } from '../database/pool';

export const getBlogsData = async (): Promise<PostType[]> => {
  try {
    const query = `
      SELECT 
        b.slug AS url, 
        b.title, 
        b.meta_text AS metaText, 
        b.date, 
        GROUP_CONCAT(c.name) AS categories
      FROM blogs b
      LEFT JOIN blog_categories bc ON b.id = bc.blog_id
      LEFT JOIN categories c ON bc.category_id = c.id
      GROUP BY b.id, b.slug, b.title, b.meta_text, b.date
    `;

    const [rows] = await pool.query(query);

    // Transform categories string to array
    const posts = (rows as any[]).map(row => ({
      ...row,
      categories: row.categories ? row.categories.split(',') : []
    }));

    return posts as PostType[];
  } catch (e) {
    throw new Error(`Error While Fetching Posts: ${e}`);
  }
};
