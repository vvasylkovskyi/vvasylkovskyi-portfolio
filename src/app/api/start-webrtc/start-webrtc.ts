import type { WebRtcAnswer, WebRTCAnswerResponse } from '@/types/video';

export const startWebRTC = async (
  request: Request,
  rtcOffer: RTCSessionDescriptionInit,
): Promise<WebRtcAnswer> => {
  try {
    const headers: HeadersInit = { Authorization: request.headers.get('Authorization') as string };
    const response = await fetch(`${process.env.VIDEO_SERVICE_URL}/api/v1/video/start-webrtc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(rtcOffer),
    });
    const webRtcAnswerResponse: WebRTCAnswerResponse = await response.json();
    return webRtcAnswerResponse.data;
  } catch (e) {
    throw new Error(`Error While Fetching Video: ${e}`);
  }
};
