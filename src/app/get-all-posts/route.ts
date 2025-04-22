import { getBlogsData } from './get-all-posts';

export async function GET(_: Request) {
  try {
    const result = await getBlogsData();

    return Response.json(result);
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}
