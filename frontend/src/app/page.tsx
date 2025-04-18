'use client';

import { Button } from '@/components/atoms/button';
import Image from 'next/image';
import React, { useCallback } from 'react';

export default function Home() {
  const handleDownload = useCallback(async () => {
    const response = await fetch('/get-resume');

    if (!response.ok) {
      throw new Error('Failed to fetch the PDF');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'viktor_vasylkovskyi_cv.pdf';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }, []);

  return (
    <React.Fragment>
      <div className='landing-page-section'>
        <div className='landing-page__left'>
          <div>
            <Image
              src='/logo-header.svg'
              className='logo-image-about'
              alt='Code Logo'
              width={200}
              height={41}
            />
          </div>
          <h1 className='landing-heading-h1'>
            Full-Stack Engineer building reliable, scalable software
          </h1>
          <div className='landing-flex-wrapper'>
            <h2 className='landing-subheading'>
              passionate about open knowledge, dev tools, and creative engineering.
            </h2>
          </div>
        </div>
        <div className='landing-page__cta-container'>
          <Button text='Get Resume' onClick={handleDownload} />
        </div>
      </div>
      {/* <AllPosts /> */}
    </React.Fragment>
  );
}
