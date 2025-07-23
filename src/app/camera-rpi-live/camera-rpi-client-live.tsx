'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Button } from '@/components/ui/button';

type CameraRpiClientLiveState = {
    streamUrl: string | null;
    isLoading: boolean;
}

export const CameraRpiClientLive = () => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [state, setState] = useState<CameraRpiClientLiveState>({
        streamUrl: null,
        isLoading: false
    });

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !state.streamUrl) {
            return;
        }

        if (Hls.isSupported()) {
            const hls = new Hls({
                xhrSetup: (xhr, url) => {
                    // if segment url does not start with prefix, prepend it
                    const prefix = '/api/live?stream_url=/hls/stream.m3u8';
                    if (!url.startsWith(prefix)) {
                        const segmentUrl = url.substring(url.lastIndexOf('/') + 1);
                        xhr.open('GET', `${window.location.protocol}//${window.location.host}/api/live?stream_url=/hls/${segmentUrl}`);
                    }
                }
            });
            hls.loadSource(state.streamUrl);
            hls.attachMedia(video);
            // Jump to live edge after manifest is parsed

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                const liveSync = hls.liveSyncPosition;
                if (liveSync) {
                    video.currentTime = liveSync;
                }
            });

            hls.on(Hls.Events.ERROR, (_, data) => {
                console.error('HLS.js error:', data);
            });

        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // For Safari
            video.src = state.streamUrl;
        } else {
            console.error('HLS not supported in this browser.');
        }
    }, [state.streamUrl]);

    // const handleJumpToLiveView = () => {
    //     if (videoRef.current) {
    //         videoRef.current.currentTime = videoRef.current.duration; // Jump to the end of the live stream
    //     }
    // };

    const handleStartLiveStream = async () => {
        setState({ ...state, isLoading: true });
        const response = await fetch('/api/start-live-stream');
        const data = await response.json();
        setState({
            streamUrl: `/api/live?stream_url=${data.stream_url}`,
            isLoading: false
        });
    };

    const handleStopLiveStream = async () => {
        await fetch('/api/stop-live-stream');
        setState({
            streamUrl: null,
            isLoading: false
        });
    };

    useEffect(() => {
        return () => {
            handleStopLiveStream();
        };
    }, []);

    useEffect(() => {
        const handleBeforeUnload = (_: BeforeUnloadEvent) => {
            handleStopLiveStream();
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    if (!state.streamUrl) {
        return <div className="camera__layout-wrapper">
            {state.isLoading && <div className="player-component-wrapper player-loading-wrapper">
                <p>Loading live stream... This usually takes a few seconds</p>
            </div>}
            {!state.isLoading && <div className="player-component-wrapper player-loading-wrapper">
                <p>Live stream is not loaded... Click to Start Streaming</p>
            </div>}


            <div className="player-live-buttons-wrapper">
                <Button
                    onClick={handleStartLiveStream}
                    variant="default"
                >
                    Start Live Stream
                </Button>

                <Button variant="secondary" onClick={handleStopLiveStream}>Stop Live Stream</Button>
            </div>

        </div>
    }

    return (
        <div className="camera__layout-wrapper">
            <div className="player-component-wrapper">
                <video
                    ref={videoRef}
                    controls
                    autoPlay
                    muted
                    playsInline
                />
            </div>
            <div className="player-live-buttons-wrapper">
                <Button
                    onClick={handleStartLiveStream}
                    variant="default"
                >
                    Start Live Stream
                </Button>

                <Button variant="secondary" onClick={handleStopLiveStream}>Stop Live Stream</Button>

                {/* <Button variant="default" onClick={handleJumpToLiveView}>Jump to Live Point</Button> */}

            </div>

        </div>
    );
};
