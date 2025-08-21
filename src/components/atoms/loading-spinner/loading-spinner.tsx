import './loading-spinner.scss';

export const SmallLoadingSpinner = () => {
  return <span className={`loader-small`}></span>;
};

export const LoadingSpinner = ({ color }: { color?: string }) => {
  return <span className={`loader ${color ? 'loader--' + color : ''}`}></span>;
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
