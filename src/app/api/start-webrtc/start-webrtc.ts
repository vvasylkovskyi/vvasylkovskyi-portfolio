import type { WebRtcAnswer } from '@/types/video';

export const startWebRTC = async (rtcOffer: RTCSessionDescriptionInit): Promise<WebRtcAnswer> => {
    try {
        const response = await fetch(`${process.env.VIDEO_SERVICE_URL}/api/v1/video/start-webrtc`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(rtcOffer),
        });
        return await response.json();
    } catch (e) {
        throw new Error(`Error While Fetching Video: ${e}`);
    }
};
