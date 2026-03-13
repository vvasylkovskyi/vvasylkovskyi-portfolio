import { getMetrics } from './get-metrics';

export async function GET(_: Request) {
  try {
    const result = await getMetrics();
    return Response.json(result);
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}
