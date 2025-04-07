import Link from 'next/link';

export const Footer = () => {
  return (
    <footer className=' border-grid border-t py-6 md:py-0'>
      <div className='container-wrapper'>
        <div className='container py-4'>
          <div className='text-balance text-center text-sm leading-loose text-muted-foreground md:text-left'>
            Built by
            <Link
              href='https://github.com/vvasylkovskyi'
              target='_blank'
              rel='noreferrer'
              className='font-medium underline underline-offset-4'
              style={{ marginLeft: 5 }}
            >
              Viktor Vasylkovskyi
            </Link>
            . The source code is available on
            <Link
              href='https://github.com/shadcn-ui/ui'
              target='_blank'
              rel='noreferrer'
              className='font-medium underline underline-offset-4'
              style={{ marginLeft: 5 }}
            >
              GitHub
            </Link>
            .
          </div>
        </div>
      </div>
    </footer>
  );
};
