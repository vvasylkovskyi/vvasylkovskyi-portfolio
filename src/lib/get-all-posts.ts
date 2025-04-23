'use server';

import { getBlogsData } from '@/app/api/get-all-posts/get-all-posts';
import type { PostType } from '@/types/post';

export async function getAllPosts() {
  const blogs: PostType[] = await getBlogsData();
  return blogs;
}
