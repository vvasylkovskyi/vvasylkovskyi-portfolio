'use client';

import { useWindowWidth } from '@/hooks/useWindowWidth';
import Image from 'next/image';
import Link from 'next/link';
import type { FC } from 'react';

interface CardProps {
  iconPath: string;
  title: string;
  subtitle?: string;
  url: string;
  iconClassName?: string;
  width: number;
  height: number;
  date?: string;
  role?: string;
  isSmallCard?: boolean;
  onClick?: () => void;
}

export const Card: FC<CardProps> = ({
  iconPath,
  title,
  subtitle,
  url,
  iconClassName,
  width,
  height,
  date,
  role,
  isSmallCard,
  onClick,
}) => {
  const windowWidth = useWindowWidth();

  if ((!windowWidth || windowWidth < 600) && !isSmallCard) {
    return (
      <Link
        href={url}
        className={`card__wrapper ${isSmallCard ? 'card__wrapper--small' : ''}`}
        onClick={onClick}
      >
        <div className='card__inner-wrapper'>
          <div className={'card__icon-wrapper ' + iconClassName}>
            <Image src={iconPath} alt={title} width={width} height={height} />
          </div>
          <div className='card__content'>
            <p className='card__title'>{role}</p>
            <p className='card__description'>{date}</p>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={url}
      className={`card__wrapper ${isSmallCard ? 'card__wrapper--small' : ''}`}
      onClick={onClick}
    >
      <div className='card__inner-wrapper'>
        <div className={'card__icon-wrapper ' + iconClassName}>
          <Image src={iconPath} alt={title} width={width} height={height} />
        </div>
        <div className='card__content'>
          <h3 className='card__title'>{title}</h3>
          {subtitle && <p className='card__description'>{subtitle}</p>}
        </div>
      </div>

      <div className='card__content'>
        <p className='card__title'>{role}</p>
        <p className='card__description'>{date}</p>
      </div>
    </Link>
  );
};
