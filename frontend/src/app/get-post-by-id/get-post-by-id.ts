import type { PostType } from '@/types/post';
import fs from 'fs';
import path from 'path';

export const getBlogById = (id: string) => {
  const filePathBlogPostTextDataPath = path.join(process.cwd(), `./blog-content/ready/${id}.md`);

  const filePathForBlogPostJsonDataPath = path.join(
    process.cwd(),
    `./blog-content/data/${id}.json`,
  );

  let blogText: string;
  try {
    blogText = fs.readFileSync(filePathBlogPostTextDataPath, 'utf8');
  } catch (err) {
    throw new Error(`Error fetching blog: ${err}`);
  }

  let blogJsonData: PostType;
  try {
    blogJsonData = JSON.parse(fs.readFileSync(filePathForBlogPostJsonDataPath, 'utf8')) as PostType;
  } catch (err) {
    throw new Error(`Error fetching blog data: ${err}`);
  }

  return {
    content: blogText,
    date: blogJsonData.date,
    meta: blogJsonData.metaText,
    title: blogJsonData.title,
  };
};
