'use client';

import { AiMessage } from '@/components/ui/ai-message';
import { ChatForm } from '@/components/ui/chat-form';
import { HumanMessage } from '@/components/ui/human-message';
import { ChatFormWrapper } from '@/components/ui/styles/styles';
import { useWebSocket } from '@/hooks/useWebSocket';
import type { ChangeEvent } from 'react';
import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const [messages, setMessages] = useState<{ user: string; msg: string }[]>([]);
  const [input, setInput] = useState(''); // User input state

  // WebSocket connection logic (message handling & status tracking)
  const { response, isOpen, sendMessage } = useWebSocket('ws://localhost:2999/ws/chat');
  const messagesEndRef = useRef<HTMLDivElement>(null); // Ref for scrolling to the latest message

  useEffect(() => {
    // Handle WebSocket responses and update messages
    if (response) {
      setMessages((prevMessages) => {
        const lastMessage = prevMessages[prevMessages.length - 1];
        // Update last bot message or add a new one
        if (lastMessage && lastMessage.user === 'Bot') {
          lastMessage.msg = response;
          return [...prevMessages];
        } else {
          return [...prevMessages, { user: 'Bot', msg: response }];
        }
      });
    }
  }, [response]);

  // Updates input field on change
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setInput(event.target.value);
  };

  // Handles sending of messages from the user
  const handleSubmit = () => {
    if (input.trim()) {
      const userMessage = { user: 'User', msg: input };
      setMessages((prevMessages) => [...prevMessages, userMessage]); // Add user message to list
      setInput('');

      if (isOpen) {
        sendMessage(input); // Send message via WebSocket if open
      }
    }
  };

  // Scrolls to the latest token in the chat whenever a new message is added
  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }); // , 100); // you can add delay for scrolling, giving user a moment to read message bots message,
    // but looks slightly jittery

    return () => clearTimeout(timer); // Cleanup the timeout
  }, [messages]);

  // Handles "Enter" key submission without needing to click the send button
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleKeyDown = (event: any) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault(); // Prevent default newline
      handleSubmit();
    }
  };

  return (
    <div
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      className='flex w-full items-center justify-center'
    >
      <div className='w-full flex items-center justify-center'>
        <h1 className='text-2xl font-bold text-center'>Welcome! How can I be of service today?</h1>
      </div>
      <div
        className='rounded-xl w-full border bg-card text-card-foreground shadow mt-5'
        style={{
          height: '60vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
        }}
      >
        <div
          className='h-full'
          style={{
            display: 'flex',
            width: '100%',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div className='p-6 space-y-4 xl:space-y-4 h-full overflow-y-auto'>
            <div className='space-y-4'>
              {messages.map((message) => {
                if (message.user === 'User') {
                  return <HumanMessage key={message.msg} message={message.msg} />;
                } else {
                  return <AiMessage key={message.msg} message={message.msg} />;
                }
              })}
            </div>
            <div ref={messagesEndRef} />
          </div>

          <ChatFormWrapper className='flex items-center p-6 pt-0 h-28'>
            <ChatForm
              onClick={handleSubmit}
              handleChange={handleChange}
              handleKeyDown={handleKeyDown}
              input={input}
            />
          </ChatFormWrapper>
        </div>
      </div>
    </div>
  );
}
