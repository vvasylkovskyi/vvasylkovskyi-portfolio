import type { VideoResponse } from '@/types/video';

export const getIceServers = async (): Promise<VideoResponse> => {
    try {
        const response = await fetch(`https://vvasylkovskyi.metered.live/api/v1/turn/credentials?apiKey=${process.env.METERED_API_KEY_TURN_CREDENTIALS}`);
        return response.json();
    } catch (e) {
        throw new Error(`Error While Fetching Video: ${e}`);
    }
};
