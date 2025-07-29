'use client';

import { useEffect, useRef, useState } from 'react';
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
        const response = await fetch("/api/turn-credentials");
        const turnCredentials = await response.json();
        const peerConnection = new RTCPeerConnection({
            iceServers: turnCredentials,
        });

        pcRef.current = peerConnection;

        const iceCandidates: RTCIceCandidateInit[] = [];

        const iceGatheringComplete = new Promise((resolve) => {
            peerConnection!.onicegatheringstatechange = (event) => {
                console.log('icegatheringstatechange -> ', peerConnection?.iceGatheringState);

                if (peerConnection!.iceGatheringState === 'complete') {
                    console.log('iceCandidates -> ', iceCandidates);
                    resolve(null);
                }
            };
        });

        peerConnection.onicecandidate = async (event: RTCPeerConnectionIceEvent) => {
            if (event.candidate) {
                console.log('icecandidate -> ', event.candidate);
                iceCandidates.push(event.candidate.toJSON());
            }
        };

        peerConnection.ontrack = (event) => {
            console.log('>>> Received remote track:', event.track);
            console.log('>>> Event streams:', event.streams);
            const [stream] = event.streams;
            if (videoRef.current && videoRef.current.srcObject !== stream) {
                console.log('>>> Attaching stream:', event.streams);
                videoRef.current.srcObject = stream;
                // If you want to play the video automatically, you can uncomment the line below
                // Required for mobile browsers (e.g., iOS) to play video automatically
                videoRef.current.muted = true;
                videoRef.current.play().catch((error) => {
                    console.error('Error playing video:', error);
                });
                console.log('>>> Received remote stream');
            }
        };

        // Add transceiver for video, receive-only mode
        peerConnection.addTransceiver('video', { direction: 'recvonly' });
        // const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        // stream.getTracks().forEach(track => pc.addTrack(track, stream));
        // Create SDP offer

        const offer = await peerConnection.createOffer();

        await peerConnection.setLocalDescription(offer);
        console.log('>>> Created SDP offer:', offer.sdp);
        // Send ICE Candidates with the offer (we are not trickleing it)


        // Wait for ICE gathering to complete
        // await new Promise<void>((resolve) => {
        //     if (peerConnection.iceGatheringState === 'complete') {
        //         resolve();
        //     } else {
        //         function checkState() {
        //             if (peerConnection.iceGatheringState === 'complete') {
        //                 peerConnection.removeEventListener('icegatheringstatechange', checkState);
        //                 resolve();
        //             }
        //         }
        //         peerConnection.addEventListener('icegatheringstatechange', checkState);
        //     }
        // });

        await iceGatheringComplete;
        offer.sdp += iceCandidates.map((candidate) => `a=${candidate.candidate}`).join('\r\n') + '\r\n';

        console.log('>>> Created SDP offer:', offer.sdp);


        // Send offer SDP to Pi
        await sendOffer(peerConnection.localDescription!);
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

    useEffect(() => {
        return () => {
            stopWebRTC();
        };
    }, []);

    useEffect(() => {
        const handleBeforeUnload = (_: BeforeUnloadEvent) => {
            stopWebRTC();
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

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
