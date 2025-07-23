

import { startLiveStream } from '../api/start-live-stream/start-live-stream';
import { CameraRpiClientLive } from './camera-rpi-client-live';



export default async function CameraRpiLive() {
    const liveStreamResponse = await startLiveStream();
    if (!liveStreamResponse || !liveStreamResponse.stream_url) {
        return <div>Error starting live stream.</div>;
    }


    return <CameraRpiClientLive streamUrl={`${process.env.VIDEO_SERVICE_URL}/api/v1/video${liveStreamResponse.stream_url}`} />;
}