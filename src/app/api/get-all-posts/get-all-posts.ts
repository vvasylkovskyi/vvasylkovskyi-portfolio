import type { PostType } from '@/types/post';
import { pool } from '../database/pool';

export const getBlogsData = async (): Promise<PostType[]> => {
  // NextJS hack - https://github.com/vercel/next.js/discussions/46544#discussioncomment-11136615

  console.log(">>> Running in NEXT_PHASE: ", process.env.NEXT_PHASE);

  if (process.env.NEXT_PHASE === 'phase-production-build') return [];

  console.log(">>> Currently the pool is operational: ", pool);
  try {
    const result = await pool.query(
      'SELECT slug AS url, title, meta_text AS "metaText", date, categories FROM blogs'
    );

    console.log(">>> the results are: ", result.rows);
    return result.rows as PostType[];
  } catch (e) {
    throw new Error(`Error While Fetching Posts: ${e}`);
  }
};