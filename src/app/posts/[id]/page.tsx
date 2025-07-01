import { GiscusComments } from '@/components/giscus-comments';
import { getPostById } from '@/lib/get-post-by-id';

export default async function PostItemPage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const blog = await getPostById(id);

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
        <GiscusComments />
      </div>
    </div>
  );
}
