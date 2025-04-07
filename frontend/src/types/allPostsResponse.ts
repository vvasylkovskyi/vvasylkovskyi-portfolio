import type { PostType } from './post';

interface AllPostsResponse {
  data: {
    blogs: Array<PostType>;
  };
}

export type { AllPostsResponse };
