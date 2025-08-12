import type { LiveStreamResponse } from '@/types/video';

export const stopWebRtc = async (request: Request): Promise<LiveStreamResponse> => {
    try {
        const headers: HeadersInit = { 'Authorization': request.headers.get('Authorization') as string };
        const response = await fetch(`${process.env.VIDEO_SERVICE_URL}/api/v1/video/stop-webrtc`, { headers });
        return response.json();
    } catch (e) {
        throw new Error(`Error While Fetching Video: ${e}`);
    }
};
