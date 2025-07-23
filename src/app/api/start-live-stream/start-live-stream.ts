import type { LiveStreamResponse } from '@/types/video';

export const startLiveStream = async (): Promise<LiveStreamResponse> => {
    try {
        const response = await fetch(`${process.env.VIDEO_SERVICE_URL}/api/v1/video/start-streaming-service`);
        return await response.json();
    } catch (e) {
        throw new Error(`Error While Fetching Video: ${e}`);
    }
};
