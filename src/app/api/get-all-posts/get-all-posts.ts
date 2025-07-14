import type { PostType } from '@/types/post';
import { pool } from '../database/pool';

export const getBlogsData = async (): Promise<PostType[]> => {
  try {
    const [rows] = await pool.query(
      'SELECT slug AS url, title, meta_text AS metaText, date, categories FROM blogs'
    );

    return rows as PostType[];
  } catch (e) {
    throw new Error(`Error While Fetching Posts: ${e}`);
  }
};
