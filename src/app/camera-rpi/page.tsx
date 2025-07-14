

import { VideoPlayer } from '@/components/video-player';
import { getAllVideos } from '../api/get-all-videos/get-all-videos';

export default async function CameraRpi() {
    const videos = await getAllVideos();
    console.log(">>> videos", videos);

    if (!videos || videos.videos.length === 0) {
        return <div className='player-component-wrapper'>
            <p>No videos available</p>
        </div>
    }

    return <div className='player-component-wrapper' >
        <VideoPlayer src={videos.videos[0].url} />
    </div>
}