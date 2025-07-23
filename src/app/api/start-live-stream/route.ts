import { startLiveStream } from './start-live-stream';

export async function GET(_: Request) {
    try {
        const result = await startLiveStream();

        return Response.json(result);
    } catch (error) {
        return Response.json({ error }, { status: 500 });
    }
}
