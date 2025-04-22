'use client';

type ChatSendButtonProps = {
  isDisabled: boolean;
  onClick: () => void;
  text: string;
};

export const ChatSendButton = ({ isDisabled, onClick, text }: ChatSendButtonProps) => {
  return (
    <button
      className='chat-send-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 w-9'
      disabled={isDisabled}
      onClick={onClick}
    >
      <svg
        xmlns='http://www.w3.org/2000/svg'
        width='24'
        height='24'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        stroke-width='2'
        stroke-linecap='round'
        stroke-linejoin='round'
        className='lucide lucide-send'
      >
        <path d='M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z'></path>
        <path d='m21.854 2.147-10.94 10.939'></path>
      </svg>
      <span className='sr-only'>{text}</span>
    </button>
  );
};
