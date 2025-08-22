import { registerIoTDevice } from './register-iot-device';

export async function GET(_: Request) {
  try {
    const result = await registerIoTDevice();
    return Response.json(result);
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}
