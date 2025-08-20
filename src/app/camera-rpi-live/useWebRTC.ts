import { WebRtcAnswer } from '@/types/video';
import { useEffect, useRef, useState } from 'react';

type UseWebRTCProps = {
  getToken: () => Promise<string>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
};

export enum WebRTCProgressState {
  NotStarted = 'not_started',
  LoadingTurnAndStun = 'turn_and_stun',
  Gathering = 'gathering',
  OfferSent = 'offer_sent',
  AnswerReceived = 'answer_received',
  Streaming = 'streaming',
  Stopped = 'stopped',
}

type UseWebRTCState = {
  isLoading: boolean;
  isStreaming: boolean;
  status: WebRTCProgressState;
};

const WebRTCStatusToMessage: Record<WebRTCProgressState, string> = {
  [WebRTCProgressState.NotStarted]: 'WebRTC not started',
  [WebRTCProgressState.LoadingTurnAndStun]: 'Loading TURN and STUN servers list',
  [WebRTCProgressState.Gathering]:
    'Gathering all available candidates to choose best streaming channel',
  [WebRTCProgressState.OfferSent]: 'Offer sent to Pi, waiting for answer',
  [WebRTCProgressState.AnswerReceived]: 'Answer received from Pi, starting streaming',
  [WebRTCProgressState.Streaming]: 'Streaming in progress',
  [WebRTCProgressState.Stopped]: 'WebRTC stopped',
};

export const useWebRTC = ({ getToken, videoRef }: UseWebRTCProps) => {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [state, setState] = useState<UseWebRTCState>({
    isLoading: false,
    isStreaming: false,
    status: WebRTCProgressState.NotStarted,
  });

  const sendOffer = async (offer: RTCSessionDescriptionInit) => {
    // You should implement this function to send offer SDP to Pi via MQTT or your signaling channel
    console.log('Sending offer SDP to Pi:', offer.sdp);

    setState((prevState) => ({
      ...prevState,
      status: WebRTCProgressState.OfferSent,
    }));

    const token = await getToken();
    const response = await fetch('/api/start-webrtc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(offer),
    });

    const data: WebRtcAnswer = await response.json();
    handleAnswer({ sdp: data.webrtc_answer, type: 'answer' } as RTCSessionDescriptionInit);
  };

  // You should call this method when you receive the answer SDP from Pi via MQTT/signaling
  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    setState((prevState) => ({ ...prevState, status: WebRTCProgressState.AnswerReceived }));
    console.log('Received answer SDP from Pi');
    if (pcRef.current) {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    }
  };

  const startWebRTC = async () => {
    setState({
      ...state,
      status: WebRTCProgressState.LoadingTurnAndStun,
      isLoading: true,
      isStreaming: false,
    });

    const token = await getToken();
    const response = await fetch('/api/turn-credentials', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const turnCredentials = await response.json();

    setState((prevState) => ({
      ...prevState,
      status: WebRTCProgressState.Gathering,
    }));

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

      setState((prevState) => ({
        ...prevState,
        status: WebRTCProgressState.Streaming,
        isLoading: false,
        isStreaming: true,
      }));

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

    const token = await getToken();
    await fetch('/api/stop-webrtc', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    setState({
      ...state,
      isLoading: false,
      isStreaming: false,
      status: WebRTCProgressState.Stopped,
    });
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

  return {
    startWebRTC,
    stopWebRTC,
    isLoading: state.isLoading,
    isStreaming: state.isStreaming,
    loadingMessage: WebRTCStatusToMessage[state.status],
  };
};
