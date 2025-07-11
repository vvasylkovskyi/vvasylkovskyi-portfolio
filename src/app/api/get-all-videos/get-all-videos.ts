import type { PostType } from '@/types/post';
import { pool } from '../database/pool';

export const getAllVideos = async (): Promise<PostType[]> => {
    try {
        const response = await fetch("");

        return response.json() as PostType[];
    } catch (e) {
        throw new Error(`Error While Fetching Posts: ${e}`);
    }
};
