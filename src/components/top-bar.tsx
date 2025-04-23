'use client';

import { useTheme } from '@/hooks/useTheme';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export const TopBar = () => {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className='top-bar-header z-50 w-full'>
      <div
        className={`topbar-container-wrapper ${pathname === '/about' ? 'topbar-container-wrapper--about' : ''}`}
      >
        <div className='container flex h-14 items-center gap-2 md:gap-4'>
          <div className='mr-4 md:flex'>
            <Link className='mr-4 flex items-center gap-2 lg:mr-6' href='/'>
              <Image
                src={
                  theme === 'dark' ? '/logo-header-dark-mode.svg' : '/logo-header-white-mode.svg'
                }
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
            {/* <nav className='flex items-center gap-4 text-sm xl:gap-6 navigation-menu-item'>
              <Link
                className={`navigation-menu-item navigation-menu-item--blog ${
                  pathname === '/about' ? 'navigation-menu-item--active' : ''
                }`}
                href='/about'
              >
                About
              </Link>
            </nav>
            <nav className='flex items-center gap-4 text-sm xl:gap-6 navigation-menu-item'>
              <Link
                className={`navigation-menu-item navigation-menu-item--blog ${
                  pathname === '/' ? 'navigation-menu-item--active' : ''
                }`}
                href='/'
              >
                Blog
              </Link>
            </nav> */}
            <nav className='flex items-center gap-4 text-sm xl:gap-6 navigation-menu-item'>
              <Link
                href='https://github.com/vvasylkovskyi'
                className='toggle_mode__wraper'
                target='_blank'
              >
                <Image
                  src={
                    theme === 'dark'
                      ? '/github-icon--dark-mode.svg'
                      : '/github-icon--white-mode.svg'
                  }
                  className='navigation-menu-item'
                  alt='Moon'
                  width={20}
                  height={20}
                />
              </Link>
            </nav>
            <nav className='flex items-center gap-4 text-sm xl:gap-6 navigation-menu-item'>
              <button className='toggle_mode__wraper' onClick={toggleTheme}>
                <Image
                  src={theme === 'dark' ? '/moon.svg' : '/sun.svg'}
                  className='navigation-menu-item'
                  alt='Moon'
                  width={20}
                  height={20}
                />
              </button>
            </nav>
            <nav className='flex items-center gap-4 text-sm xl:gap-6 navigation-menu-item'>
              <DropdownMenu>
                <DropdownMenuTrigger className='toggle_mode__wraper'>
                  <Image
                    src={
                      theme === 'dark'
                        ? '/hamburger-menu--dark-mode.svg'
                        : '/hamburger-menu--white-mode.svg'
                    }
                    className='logo-image'
                    alt='Code Logo'
                    width={30}
                    height={30}
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent className='dropdown-menu__content'>
                  {/* <DropdownMenuLabel>My Account</DropdownMenuLabel> */}
                  {/* <DropdownMenuSeparator /> */}
                  <Link href='/'>
                    <DropdownMenuItem className='dropdown-menu-item'>
                      <div
                        className={`navigation-menu-item navigation-menu-item--blog ${
                          pathname === '/' ? 'navigation-menu-item--active' : ''
                        }`}
                      >
                        Blog
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  <Link href='/about'>
                    <DropdownMenuItem className='dropdown-menu-item'>
                      <div
                        className={`navigation-menu-item navigation-menu-item--blog ${
                          pathname === '/about' ? 'navigation-menu-item--active' : ''
                        }`}
                      >
                        About
                      </div>
                    </DropdownMenuItem>
                  </Link>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};
