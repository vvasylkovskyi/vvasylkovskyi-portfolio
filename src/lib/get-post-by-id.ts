'use server';

import { getBlogById } from '@/app/api/get-post-by-id/get-post-by-id';

export async function getPostById(id: string) {
  const blogData = getBlogById(id);
  return blogData;
}
