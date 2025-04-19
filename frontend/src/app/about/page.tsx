'use client';

import { Button } from '@/components/atoms/button';
import Image from 'next/image';
import Link from 'next/link';
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
      <div className='landing-page-section d-flex'>
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

          <div className='landing-page__cta-container'>
            <Button hierarchy={'primary'} text='Get Resume' onClick={handleDownload} />
            <Link href='/'>
              <Button hierarchy={'secondary'} text='Read blog' />
            </Link>
          </div>
        </div>
        <div className='landing-page__right w-full'>
          <p>
            As a passionate Full-Stack Software Engineer, I thrive in collaborative environments
            where learning and innovation drive impact. I have extensive experience building and
            scaling web applications, working across the stack with React, TypeScript, Python,
            FastAPI, and Node.js.
          </p>
          <p>
            My background includes contributing to large-scale projects serving millions of users,
            refining my expertise in frontend technologies, backend development, and cloud
            infrastructure. I’ve worked with Kubernetes, Terraform, and Docker, focusing on
            scalability, reliability, and automation.
          </p>
          <p>
            Previously, I worked at Sky, delivering cutting-edge solutions in video engineering,
            WebGL, and embedded systems, shaping video experiences for millions of users. More
            recently, at Rely.io, I embraced the fast-paced startup world, working on AI-driven
            workflows and full-stack product development.
          </p>
          <p>
            Beyond my professional work, I enjoy experimenting with hardware, electronics, and
            robotics, combining software with the physical world. Holding a Master’s in Computer
            Science and Engineering (Software Security) from the University of Lisbon, I believe in
            continuously expanding my technical expertise.
          </p>
        </div>
      </div>
      {/* <AllPosts /> */}
    </React.Fragment>
  );
}
