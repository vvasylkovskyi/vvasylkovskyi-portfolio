'use client';

import Plyr from 'plyr-react';
import type { FC } from 'react';

type VideoPlayerProps = {
    src: string;
};

export const VideoPlayer: FC<VideoPlayerProps> = ({ src }) => {
    return (
        <div style={{ maxWidth: 800 }}>
            <Plyr
                source={{
                    type: 'video',
                    sources: [
                        {
                            src,
                            type: 'video/mp4',
                        },
                    ],
                }}

                options={{
                    controls: [
                        'play-large', // The large play button in the center
                        'play',       // Play/pause playback
                        'progress',   // The progress bar and scrubber
                        'current-time', // Current time
                        'mute',       // Toggle mute
                        'volume',     // Volume control
                        'fullscreen', // Toggle fullscreen
                    ],
                }}
            />
        </div>
    );
}