

import { getAllVideos } from '../api/get-all-videos/get-all-videos';

export default async function CameraRpi() {
    const videos = await getAllVideos();

    if (!videos || videos.videos.length === 0) {
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
            <p>No videos available</p>
        </div>
    }

    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <video width={640} height={360} style={{ backgroundColor: 'black' }} src={videos.videos[0].url} controls />
    </div>
}