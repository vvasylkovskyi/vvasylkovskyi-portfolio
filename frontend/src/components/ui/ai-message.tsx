export const AiMessage = ({ message }: { message: string }) => {
  return (
    <div className='flex w-max max-w-[75%] flex-col gap-2 rounded-lg px-3 py-2 text-sm ml-auto ai-message'>
      {message}
    </div>
  );
};
