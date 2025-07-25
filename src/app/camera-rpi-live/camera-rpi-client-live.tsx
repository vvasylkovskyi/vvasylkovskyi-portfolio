'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { WebRtcAnswer } from '@/types/video';

type CameraRpiClientLiveState = {
    isLoading: boolean;
    isStreaming: boolean;
}

export const CameraRpiClientLive = () => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const [state, setState] = useState<CameraRpiClientLiveState>({
        isLoading: false,
        isStreaming: false,
    });

    const sendOffer = async (offer: RTCSessionDescriptionInit) => {
        // You should implement this function to send offer SDP to Pi via MQTT or your signaling channel
        console.log('Sending offer SDP to Pi:', offer.sdp);
        setState(s => ({ ...s, isStreaming: true, isLoading: false }));
        const response = await fetch('/api/start-webrtc', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(offer),
        });

        const data: WebRtcAnswer = await response.json();
        handleAnswer({ sdp: data.webrtc_answer, type: "answer" } as RTCSessionDescriptionInit);
    };

    // You should call this method when you receive the answer SDP from Pi via MQTT/signaling
    const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
        console.log('Received answer SDP from Pi');
        if (pcRef.current) {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        }
    };

    const startWebRTC = async () => {
        setState({ isLoading: true, isStreaming: false });

        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });

        pcRef.current = pc;

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                // Optionally send ICE candidates to Pi if needed via MQTT
                console.log('>>> New ICE candidate:', event.candidate.candidate);
            }
        };

        pc.ontrack = (event) => {
            console.log('>>> Received remote track:', event.track);
            console.log('>>> Event streams:', event.streams);
            const [stream] = event.streams;
            if (videoRef.current && videoRef.current.srcObject !== stream) {
                console.log('>>> Attaching stream:', event.streams);
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch((error) => {
                    console.error('Error playing video:', error);
                });
                console.log('>>> Received remote stream');
            }
        };

        // Add transceiver for video, receive-only mode
        pc.addTransceiver('video', { direction: 'recvonly' });

        // Create SDP offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Wait for ICE gathering to complete
        await new Promise<void>((resolve) => {
            if (pc.iceGatheringState === 'complete') {
                resolve();
            } else {
                function checkState() {
                    if (pc.iceGatheringState === 'complete') {
                        pc.removeEventListener('icegatheringstatechange', checkState);
                        resolve();
                    }
                }
                pc.addEventListener('icegatheringstatechange', checkState);
            }
        });

        // Send offer SDP to Pi
        await sendOffer(pc.localDescription!);
    };

    const stopWebRTC = async () => {
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        await fetch('/api/stop-webrtc', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        setState({ isLoading: false, isStreaming: false });
    };

    if (!state.isStreaming) {
        return <div className="camera__layout-wrapper">
            {state.isLoading && <div className="player-component-wrapper player-loading-wrapper">
                <p>Loading live stream... This usually takes a few seconds</p>
            </div>}
            {!state.isLoading && <div className="player-component-wrapper player-loading-wrapper">
                <p>Live stream is not loaded... Click to Start Streaming</p>
            </div>}


            <div className="player-live-buttons-wrapper">
                <Button
                    onClick={startWebRTC}
                    variant="default"
                    disabled={state.isLoading || state.isStreaming}
                >
                    Start Live Stream
                </Button>

                <Button variant="secondary" onClick={stopWebRTC}>Stop Live Stream</Button>
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
                    onClick={startWebRTC}
                    variant="default"
                    disabled={state.isLoading || state.isStreaming}
                >
                    Start Live Stream
                </Button>

                <Button variant="secondary" onClick={stopWebRTC}>Stop Live Stream</Button>

                {/* <Button variant="default" onClick={handleJumpToLiveView}>Jump to Live Point</Button> */}

            </div>

        </div>
    );
};
