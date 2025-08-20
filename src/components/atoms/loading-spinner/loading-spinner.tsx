import './loading-spinner.scss';

export const LoadingSpinner = () => {
  return <span className='loader'></span>;
};

export const ProgressLoader = () => {
  return <span className='progress-loader'></span>;
};

export const FullScreenLoadingSpinner = ({ message }: { message: string }) => {
  return (
    <div className='full-screen-loader'>
      <LoadingSpinner />
      <div style={{ marginTop: '20px' }}>
        <p>{message}</p>
      </div>
    </div>
  );
};
