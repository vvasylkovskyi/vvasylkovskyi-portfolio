'use client';

import { ContactsSection } from '@/components/contacts-section';
import { ProjectsSection } from '@/components/projects-section';
import React from 'react';

export default function Home() {
  return (
    <React.Fragment>
      <div className='landing-page-section'>
        <div className='landing-page__left'>
          {/* <div>
            <Image
              src='/logo-header.svg'
              className='logo-image-about'
              alt='Code Logo'
              width={200}
              height={41}
            />
          </div> */}
          <h1 className='landing-heading-h1'>
            Full-Stack Engineer building reliable, scalable software
          </h1>
          <div className='landing-flex-wrapper'>
            <h2 className='landing-subheading'>
              passionate about open knowledge, dev tools, and creative engineering.
            </h2>
          </div>
          {/* 
          <div className='landing-page__cta-container'>
            <Button hierarchy={'primary'} text='Get Resume' onClick={handleDownload} />
            <Link href='/'>
              <Button hierarchy={'secondary'} text='Read blog' />
            </Link>
          </div> */}
        </div>

        <div className='separator-line'></div>

        <div className='landing-page__right w-full'>
          <p>
            I am an accomplished Senior Product Engineer with a solid background in developing
            scalable solutions. At Sky, I contributed to significant projects such as the launch of
            Peacock in the US and its expansion to SkyShowtime in Europe, marking important
            milestones in my career. Transitioning into the startup world at Rely.io, has allowed me
            to leverage my engineering expertise alongside agile problem-solving and a strong focus
            on delivering product value. As a full-stack engineer with a keen product sense, I
            transform concepts into scalable solutions across frontend (React), backend (Python,
            PostgreSQL), AI (LLM integrations), and infrastructure (Kubernetes). I have a strong
            product sense and can quickly sketch low-fidelity concepts and translate them into
            high-fidelity Figma designs when needed. I love tackling hard problems, shipping
            solutions, and making tech that actually works.
          </p>
        </div>

        <div className='separator-line'></div>

        <div className='project__section-outer-wrapper'>
          <ProjectsSection />
        </div>

        <div className='separator-line'></div>

        <div className='contacts-outer-wrapper'>
          <ContactsSection />
        </div>
      </div>
      {/* <AllPosts /> */}
    </React.Fragment>
  );
}
