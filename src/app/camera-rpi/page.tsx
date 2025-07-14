

import { getAllVideos } from '../api/get-all-videos/get-all-videos';
import { CameraRpiClient } from './camera-rpi-client';



export default async function CameraRpi() {
    const videos = await getAllVideos();

    return <CameraRpiClient videos={videos.videos} />;
}