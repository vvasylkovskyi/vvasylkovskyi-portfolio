import { startWebRTC } from './start-webrtc';

export async function POST(req: Request) {
    try {
        const offer: RTCSessionDescriptionInit = await req.json();
        const result = await startWebRTC(offer);

        return Response.json(result);
    } catch (error) {
        return Response.json({ error }, { status: 500 });
    }
}
