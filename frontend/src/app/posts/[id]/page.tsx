'use server';

export default async function PostItemPage({ params }: { params: { id: string } }) {
  const data = await fetch(`http://localhost:3000/get-post-by-id?id=${params.id}`);
  const blog = await data.json();

  return (
    <div className='my-5'>
      <div className='article-wrapper'>
        <article>
          <main>
            <div className='date-container date-container--highlight'>
              <p className='date-text'>{blog.date}</p>
            </div>
            <div
              className='markdown-body'
              dangerouslySetInnerHTML={{
                __html: blog.content,
              }}
            ></div>
          </main>
        </article>
      </div>
    </div>
  );
}
