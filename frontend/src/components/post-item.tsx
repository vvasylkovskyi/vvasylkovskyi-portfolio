import Link from 'next/link';

type PostItemProps = {
  url: string;
  title: string;
  date: string;
  metaText: string;
  categories: string[];
};

export const PostItem = ({ url, title, date, metaText, categories }: PostItemProps) => {
  return (
    <Link className='post-link' href={`/posts/${url}`}>
      <div className='post-item__card'>
        <div className='date-container'>{<p>{date}</p>}</div>

        <div className='title-container'>{<p>{title}</p>}</div>

        <div className='meta-text--container'>
          <p className='meta-text'>{metaText}</p>
        </div>

        <div className='post-item-tags__container'>
          {categories.map((category) => (
            <div key={category} className='post-item-tag'>
              {category}
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
};
