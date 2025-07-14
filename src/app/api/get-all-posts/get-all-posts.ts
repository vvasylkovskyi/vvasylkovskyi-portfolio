import type { PostType } from '@/types/post';
import { pool } from '../database/pool';

export const getBlogsData = async (): Promise<PostType[]> => {
  try {
    const result = await pool.query(
      'SELECT slug AS url, title, meta_text AS "metaText", date, categories FROM blogs'
    );

    return result.rows as PostType[];
  } catch (e) {
    throw new Error(`Error While Fetching Posts: ${e}`);
  }
};