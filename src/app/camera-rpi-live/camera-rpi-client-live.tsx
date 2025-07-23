"use client";

import { FC, useEffect, useRef } from "react";
import Hls from 'hls.js';

type CameraRpiClientProps = {
    streamUrl: string;
};

export const CameraRpiClientLive: FC<CameraRpiClientProps> = ({ streamUrl }) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) {
            return;
        }

        if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(streamUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.ERROR, (event, data) => {
                console.error("HLS.js error:", data);
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // For Safari
            video.src = streamUrl;
        } else {
            console.error("HLS not supported in this browser.");
        }
    }, [streamUrl]);

    return (
        <div className="camera__layout-wrapper">
            <div className="player-component-wrapper">
                <video
                    ref={videoRef}
                    controls
                    autoPlay
                    muted
                    playsInline
                    style={{ width: '100%' }}
                />
            </div>
        </div>
    );
};
