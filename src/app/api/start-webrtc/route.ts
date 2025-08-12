import { startWebRTC } from './start-webrtc';

export async function POST(request: Request) {
    try {
        const offer: RTCSessionDescriptionInit = await request.json();
        const result = await startWebRTC(request, offer);
        return Response.json(result);
    } catch (error) {
        return Response.json({ error }, { status: 500 });
    }
}
