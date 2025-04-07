import getMarkedHTML from './get-marked-html';
import { getBlogById } from './get-post-by-id';

export async function GET(request: Request) {
  try {
    const id = new URL(request.url)?.searchParams?.get('id');
    if (!id) {
      return Response.json({ error: 'Missing id' }, { status: 400 });
    }

    const blogData = getBlogById(id);

    const content = getMarkedHTML(blogData.content);

    return Response.json({ ...blogData, content });
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}
