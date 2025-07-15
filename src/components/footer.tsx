'use client';

import Link from 'next/link';

export const Footer = () => {

  return (
    <footer className='py-6 md:py-0'>
      <div className='container-wrapper'>
        <div className='container'>
          <div className='footer-container text-balance text-center text-sm leading-loose md:text-left'>
            <div>
              Built by
              <Link
                href='https://github.com/vvasylkovskyi'
                target='_blank'
                rel='noreferrer'
                className='font-medium underline underline-offset-4'
                style={{ marginLeft: 5 }}
              >
                Viktor Vasylkovskyi
              </Link>
            </div>
            <div>
              . The source code is available on
              <Link
                href='https://github.com/vvasylkovskyi/vvasylkovskyi-portfolio'
                target='_blank'
                rel='noreferrer'
                className='font-medium underline underline-offset-4'
                style={{ marginLeft: 5 }}
              >
                GitHub
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
