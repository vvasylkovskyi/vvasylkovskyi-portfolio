import { stopLiveStream } from './stop-live-stream';

export async function GET(_: Request) {
    try {
        const result = await stopLiveStream();

        return Response.json(result);
    } catch (error) {
        return Response.json({ error }, { status: 500 });
    }
}
