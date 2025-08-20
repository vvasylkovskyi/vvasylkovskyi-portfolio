import { getDeviceInfo } from './get-device-info';

export async function GET(_: Request) {
  try {
    const result = await getDeviceInfo(_.headers.get('Authorization') as string);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}
