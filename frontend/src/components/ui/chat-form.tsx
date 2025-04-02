'use client';

import type { ChangeEvent, KeyboardEvent } from 'react';
import { ChatSendButton } from './chat-send-button';

type ChatFormProps = {
  onClick: () => void;
  handleChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  input: string;
};

export const ChatForm = ({ onClick, handleChange, handleKeyDown, input }: ChatFormProps) => {
  return (
    <form className='flex w-full items-center space-x-2'>
      <input
        className='flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm flex-1'
        id='message'
        placeholder='Type or paste your message...'
        autoComplete='off'
        value={input}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      <ChatSendButton isDisabled={!input} onClick={onClick} text='Send' />
    </form>
  );
};
