'use client';

import type { FC } from 'react';

type ButtonProps = {
  text: string;
  onClick?: () => void;
  hierarchy: 'primary' | 'secondary' | 'tertiary';
};

export const Button: FC<ButtonProps> = ({ text, hierarchy, onClick }) => {
  return (
    <button
      className={`generic-button ${hierarchy === 'secondary' ? 'secondary-button' : 'primary-button'}`}
      onClick={onClick}
    >
      {text}
    </button>
  );
};
