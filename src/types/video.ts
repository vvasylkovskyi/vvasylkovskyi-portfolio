
export type Video = {
    id: number;
    title: string;
    url: string;
    timestamp: string;
}

export type VideoResponse = {
    status: string;
    videos: Video[];
}