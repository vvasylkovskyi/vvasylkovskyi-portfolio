import { AllPosts } from '@/components/all-posts';
import React from 'react';

export default async function Posts() {
  return (
    <React.Fragment>
      <div className='greetings-section'>
        <div className='greetings__left'>
          <h1 className='heading-h1'>Viktor&apos;s Notes</h1>
          <div className='greeting-flex-wrapper'>
            <h2 className='greeting-heading'>Feel free to explore my notes</h2>
          </div>
        </div>
      </div>
      <AllPosts />
    </React.Fragment>
  );
}
