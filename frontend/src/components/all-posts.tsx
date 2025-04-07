import React from 'react';

import type { PostType } from '../types/post';

import { PostItem } from './post-item';

type AllPostsProps = {
  blogs: PostType[];
};

export const AllPosts = ({ blogs }: AllPostsProps) => {
  return (
    <React.Fragment>
      <div className='my-5'>
        <div>
          {blogs.map((post: PostType) => (
            <PostItem
              key={post.url}
              url={post.url}
              title={post.title}
              date={post.date}
              category={post.category}
              metaText={post.metaText}
            />
          ))}
        </div>
      </div>
    </React.Fragment>
  );
};
