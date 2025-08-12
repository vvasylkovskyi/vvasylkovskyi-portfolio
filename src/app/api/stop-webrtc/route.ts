import { stopWebRtc } from './stop-webrtc';

export async function GET(request: Request) {
    try {
        const result = await stopWebRtc(request);

        return Response.json(result);
    } catch (error) {
        return Response.json({ error }, { status: 500 });
    }
}
