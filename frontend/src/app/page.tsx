'use server';

import { AllPosts } from '@/components/all-posts';
import React from 'react';

export default async function Home() {
  const data = await fetch('http://localhost:3000/get-all-posts');
  const blogs = await data.json();

  return (
    <React.Fragment>
      <div className='greetings-section'>
        <div className='greetings__left'>
          <h1 className='heading-h1'>Hi, I&apos;m Viktor</h1>
          <div className='greeting-flex-wrapper'>
            <h2 className='greeting-heading'>Welcome to my blog!</h2>
          </div>
        </div>
      </div>
      <AllPosts blogs={blogs} />
    </React.Fragment>
  );
}
