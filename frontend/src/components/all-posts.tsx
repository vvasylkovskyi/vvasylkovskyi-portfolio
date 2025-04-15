import { getAllPosts } from '@/lib/get-all-posts';
import type { PostType } from '../types/post';

import { PostItem } from './post-item';

export const AllPosts = async () => {
  const blogs = await getAllPosts();

  return (
    <div className='my-5'>
      <div>
        {blogs.map((post: PostType) => (
          <PostItem
            key={post.url}
            url={post.url}
            title={post.title}
            date={post.date}
            categories={post.categories}
            metaText={post.metaText}
          />
        ))}
      </div>
    </div>
  );
};
