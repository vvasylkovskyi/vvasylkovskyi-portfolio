import { stopWebRtc } from './stop-webrtc';

export async function GET(_: Request) {
    try {
        const result = await stopWebRtc();

        return Response.json(result);
    } catch (error) {
        return Response.json({ error }, { status: 500 });
    }
}
