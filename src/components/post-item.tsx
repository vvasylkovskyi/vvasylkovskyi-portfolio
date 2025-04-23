'use client';

import { useJune } from '@/hooks/useJune';
import Link from 'next/link';
import { useCallback } from 'react';

type PostItemProps = {
  url: string;
  title: string;
  date: string;
  metaText: string;
  categories: string[];
};

export const PostItem = ({ url, title, date, metaText, categories }: PostItemProps) => {
  const analytics = useJune();

  const handlePostClicked = useCallback(() => {
    if (analytics) {
      analytics.track(`Post clicked - ${title}`, {
        url,
        title,
        date,
        metaText,
        categories,
      });
    }
  }, [analytics, categories, date, metaText, title, url]);

  return (
    <Link className='post-link post-item__card' href={`/posts/${url}`} onClick={handlePostClicked}>
      <div className='date-container'>{<p>{date}</p>}</div>

      <div className='title-container'>{<p>{title}</p>}</div>

      <div className='meta-text--container'>
        <p className='meta-text'>{metaText}</p>
      </div>

      <div className='post-item-tags__container'>
        {categories.map((category) => (
          <div key={category} className='post-item-tag'>
            {category}
          </div>
        ))}
      </div>
    </Link>
  );
};
