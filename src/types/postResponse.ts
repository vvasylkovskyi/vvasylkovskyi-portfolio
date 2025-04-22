import type { PostType } from './post';

interface PostResponse {
  data: {
    post: PostType;
  };
}

export type { PostResponse };
