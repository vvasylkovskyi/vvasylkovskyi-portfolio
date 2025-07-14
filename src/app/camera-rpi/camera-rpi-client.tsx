"use client";

import { TimelineSwiper } from "@/components/timeline-swiper";
import { VideoPlayer } from "@/components/video-player";
import { Video } from "@/types/video";
import { FC, useState } from "react";

type CameraRpiClientProps = {
    videos: Video[]
};

type CameraState = {
    currentVideoSrc: string;
};

export const CameraRpiClient: FC<CameraRpiClientProps> = ({ videos }) => {
    const [state, setState] = useState<CameraState>({
        currentVideoSrc: videos[0].url,
    });

    if (!videos || videos.length === 0) {
        return <div className='player-component-wrapper'>
            <p>No videos available</p>
        </div>
    }

    return <div className="camera__layout-wrapper">
        <div className='player-component-wrapper' >
            <VideoPlayer src={state.currentVideoSrc} />
        </div>
        <div className='player-timeline'>
            <TimelineSwiper videosList={videos} onSlideChange={(video) => setState({ currentVideoSrc: video.url })} />
        </div>
    </div>
}