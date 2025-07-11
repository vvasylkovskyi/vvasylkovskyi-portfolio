import type { PostType } from '@/types/post';
import { pool } from '../database/pool';
import { VideoResponse } from '@/types/video';

export const getAllVideos = async (): Promise<VideoResponse> => {
    try {
        const response = await fetch(`${process.env.VIDEO_SERVICE_URL}/api/v1/video`);
        return response.json();
    } catch (e) {
        throw new Error(`Error While Fetching Posts: ${e}`);
    }
};
