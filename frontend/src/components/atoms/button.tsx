'use client';

import type { FC } from 'react';

type ButtonProps = {
  text: string;
  onClick: () => void;
};

export const Button: FC<ButtonProps> = ({ text, onClick }) => {
  return (
    <button className='primary-button' onClick={onClick}>
      {text}
    </button>
  );
};
