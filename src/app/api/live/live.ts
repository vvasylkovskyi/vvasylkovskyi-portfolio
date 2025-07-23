
export const getHlsManifest = async (stream_url: string) => {
    try {
        return await fetch(`${process.env.VIDEO_SERVICE_URL}/api/v1/video${stream_url}`);
    } catch (e) {
        throw new Error(`Error While Fetching Video: ${e}`);
    }
};
