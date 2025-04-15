'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TopBarContainerWrapper } from './ui/styles/styles';
export const TopBar = () => {
  const pathname = usePathname();
  return (
    <div className='top-bar-header z-50 w-full backdrop-blur supports-[backdrop-filter]:bg-background/60 bg-background/95'>
      <TopBarContainerWrapper className='container-wrapper'>
        <div className='container flex h-14 items-center gap-2 md:gap-4'>
          <div className='mr-4 md:flex'>
            <Link className='mr-4 flex items-center gap-2 lg:mr-6' href='/'>
              <Image
                src='/logo-header.svg'
                className='logo-image'
                alt='Code Logo'
                width={200}
                height={41}
              />
            </Link>
          </div>
          <div className='ml-auto flex items-center gap-2 md:flex-1 md:justify-end'>
            {/* <nav className='flex items-center gap-4 text-sm xl:gap-6 navigation-menu-item'>
              <Link
                className={`navigation-menu-item navigation-menu-item--blog ${
                  pathname === '/ai-chat' ? 'navigation-menu-item--blog-active' : ''
                }`}
                href='/ai-chat'
              >
                AI Chat
              </Link>
            </nav> */}
            <nav className='flex items-center gap-4 text-sm xl:gap-6 navigation-menu-item'>
              <Link
                className={`navigation-menu-item navigation-menu-item--blog ${
                  pathname !== '/ai-chat' ? 'navigation-menu-item--blog-active' : ''
                }`}
                href='/posts'
              >
                Blog
              </Link>
            </nav>
            <nav className='flex items-center gap-4 text-sm xl:gap-6 navigation-menu-item'>
              <Link
                href='https://github.com/vvasylkovskyi'
                className='navigation-menu-item navigation-menu-item--github'
                target='_blank'
              >
                Github
              </Link>
            </nav>
          </div>
        </div>
      </TopBarContainerWrapper>
    </div>
  );
};
