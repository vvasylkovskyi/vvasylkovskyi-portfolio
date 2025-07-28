# WebRTC - Zero latency streaming with Raspberry pi streaming with Picamera2

My goal is to create a live camera to use as a security or remote access for robotics projects. Previously I attempted live streaming at [Live Camera Streaming from Raspberry Pi with Camera Module and Picamera2 - the easy way](https://www.viktorvasylkovskyi.com/posts/raspberry-pi-live-camera-streaming). All was nice and dandy until I tested and observed that the live view had around 5-10 seconds delay. The results where not what I had expected so I had to change strategy. 

In this notes, we will implement live streaming with almost zero latency - ideal for real time camera view. This is achieved by implementing [WebRTC](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API). Here we will walk through about how to implement it end to end from camera to client device.

## Github Code

Full code available on https://github.com/viktorvasylkovskyi/rpi-camera. 

## Real Time Streaming with WebRTC

![alt text](./real-time-streaming-with-picamera2-raspberry-pi/webrtc-streaming.png)

The architecture required is similar to what we have done before in [Live Camera Streaming from Raspberry Pi with Camera Module and Picamera2 - the easy way](https://www.viktorvasylkovskyi.com/posts/raspberry-pi-live-camera-streaming) except for HLS which is replaced by WebRTC. What we need it: 

- A Web Client, Web Server, Raspberry Pi, and MQTT Broker
- A Web Client initiates WebRTC protocol and propagates it down to the Web Server
- A Web server proxies the WebRTC `sdp` message to the Raspberry Pi through MQTT Broker messages
- Raspberry pi generates `sdp` answer for the client and attaches media handler to stream frames on demand
- Finally, web server returns the answer to the client and the client can initiate the communication from the browser using `video` element. 

## WebRTC under the hood

Feel free to skip this section if you want hands-on working example of WebRTC. If you are curious to understand how WebRTC works and delivers your media, then this section is a little overview. We build-up on [the excellent explanation about WebRTC by Metered](https://www.metered.ca/tools/openrelay/). 

Essentially WebRTC is based on Peer to Peer connection between devices, and a UDP transport protocol. The combination of both is what allows the WebRTC to be so fast and have so little latency. WebRTC is a protocol for establishing peer to peer communication between two machines. But establishing communication between two machines on the network is not that simple, so there are some caveats that are important to understand before implementing WebRTC. There are two main problems when establishing P2P connection: 

 - Discovering peers IP addresses
 - Bypassing corporate or home router firewalls

### Discovering peers IP addresses - STUN Servers

So you have two devices that want to start sending messages over the internet to each other, without intermediary service so how can we make them do that? First thing, each device needs to know who they want to talk to, and in the internet, the devices are identified by their IP addresses. But here is the catch, most of the devices do not know their IP addresses, because of the [IP depletion problem](https://en.wikipedia.org/wiki/IPv4_address_exhaustion). There are so many devices in the world, that it is not possible to give IP address to each of them. So each device actually have a private IP address, which is assigned to it by the router. The router itself is the one that has a public IP address. 

If you have read about WebRTC, then you probably heard about STUN server. STUN server is what allows the devices to discover their public IP address. The assumption is that devices know the IP address of a STUN server, which is public, and they can ask it for the IP address of themselves. That is what devices do in WebRTC. So a device `A` can ask STUN server what is its IP address, and then send it to the device `B`. Device `B` does the same, and so they can now establish a direct peer to peer connection. Or can't they? 

### Bypassing corporate or home router firewalls - TURN Servers

The above works fine when the devices are within the same network, but if they are not, then the router firewall will probably block the peer to peer connection because most of the routers don't just allow random device to talk to some of the devices in the private network for security reasons. There is a workaround though, which is well used in WebRTC. A router usually allows for the data to flow from the device `A` on the internet to the device `B` in the private network if the device `B` had initiated connection with the `A`. This is called [Symetric NAT](https://www.checkmynat.com/posts/understanding--symmetric-nat-limitations/). 

So if two devices are on the different networks, they can start talking to each other using the TURN servers which are the relay servers. In this case, the connection is no longer peer to peer as the data has to pass through a centralized TURN server. This means, that if you want your data transmissions to work reliably in WebRTC, then you need both STUN and a TURN server. 

### Exchanging WebRTC sdp between client browser and raspberry pi

For simplicity, I will omit the messages and API exchange between HTTP and MQTT. If you are interested in details on how to do it, you can read about it here [Live Camera Streaming from Raspberry Pi with Camera Module and Picamera2 - the easy way](https://www.viktorvasylkovskyi.com/posts/raspberry-pi-live-camera-streaming).


## Preparing Raspberry pi with camera streaming

So here we are going to implement WebRTC on raspberry pi:  

```python
from picamera2 import Picamera2
self.camera = Picamera2()
configuration = self.camera.create_video_configuration(
    main={"size": (640, 480)}
)
self.camera.configure(configuration)

class WebRTCOffer(BaseModel):
    type: str
    sdp: str

class PicameraVideoTrack(VideoStreamTrack):
    def __init__(self, picam):
        super().__init__()
        self.picam = picam
        self.start_time = time.time()
    
    async def recv(self):
        await asyncio.sleep(1 / 30)  # Simulate 30fps pacing
        frame = self.picam.capture_array()
        video_frame = av.VideoFrame.from_ndarray(frame, format="rgb24")
        video_frame.pts = int((time.time() - self.start_time) * 90000)  # 90kHz clock for video
        video_frame.time_base = fractions.Fraction(1, 90000)
        return video_frame

class WebRTCStreamer:
    def __init__(self):
        self.pc = None

    async def start(self, offer_sdp, video_track):
        self.pc = RTCPeerConnection()
        self.pc.addTrack(video_track)
        await self.pc.setRemoteDescription(RTCSessionDescription(sdp=offer_sdp, type="offer"))
        answer = await self.pc.createAnswer()
        await self.pc.setLocalDescription(answer)
        return self.pc.localDescription.sdp

    async def stop(self):
        if self.pc:
            await self.pc.close()
            self.pc = None

async def _start_webrtc_stream(self, webrtc_offer: WebRTCOffer):
    encoder = H264Encoder(bitrate=2_000_000)
    self.camera.start_recording(encoder, self.output)
    self.webrtc_streamer = WebRTCStreamer()
    picamera_video_track = PicameraVideoTrack(self.camera)
    answer_sdp = await self.webrtc_streamer.start(webrtc_offer.sdp, picamera_video_track)
    return answer_sdp
```

Let's talk about code step by step:

1. Once the WebRTC offer arives to the raspberry pi, we start the `Picamera2` and configure it to start streaming. It will be streaming a `VideoStreamTrack` to the web client using our custom implementation `PicameraVideoTrack`. Essentially this part of the code explains how to stream frames. Note that these frames streaming is initiated by the web browser client, contrary to the HLS, where the camera is the one who starts streaming. 
2. The WebRTC offer needs to be answered by raspberry pi which is done in `WebRTCStreamer`. In `WebRTCStreamer.start` the answer to the client is generated, and the WebRTC attaches the `picamera_video_track` which basically tells how to stream, defined in the step 1.
3. The `answer_sdp` is sent back to the client using HTTP + MQTT. 

**Note:** In `PicameraVideoTrack` sometimes `recv()` is very fast and doesn't simulate framerate with `sleep()`, sometimes the media track ends up buffering or stalling. That is why we are adding `asyncio.sleep()` to simulate 30 fps. This is common in camera-fed streams when no proper timestamp/framerate pacing is enforced. Without this my stream didn't work.


## WebRTC Client Implementation

Client-side implementation is best explained in official [WebRTC](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API) docs. I will share here my implementation of it: 

```typescript
    const pcRef = useRef<RTCPeerConnection | null>(null);

    const sendOffer = async (offer: RTCSessionDescriptionInit) => {
        // You should implement this function to send offer SDP to Pi via MQTT or your signaling channel
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

    const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
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
            const [stream] = event.streams;
            if (videoRef.current && videoRef.current.srcObject !== stream) {
                videoRef.current.srcObject = stream;
                // If you want to play the video automatically, you can uncomment the line below
                // Required for mobile browsers (e.g., iOS) to play video automatically
                navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                videoRef.current.play();
            }
        };

        // Add transceiver for video, receive-only mode
        pc.addTransceiver('video', { direction: 'recvonly' });

        // Create SDP offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Send offer SDP to Pi
        await sendOffer(pc.localDescription!);
    };

```

Let's break it down: 

 1. There is alot of boilerplate code for `sendOffer` which is fully generated by the client. This offer is send to the web server that will make it reach the raspberry pi camera somehow, in my case it is MQTT messaging. 
 2. The HTTP awaits for the raspberry pi to return the `sdp` answer in `handleAnswer`. The sdp offer/answer look like something like this - lot of gibrish.

```sh
v=0\\r\\no=- 3962438243 3962438243 IN IP4 0.0.0.0\\r\\ns=-\\r\\nt=0 0\\r\\na=group:BUNDLE 0\\r\\na=msid-semantic:WMS *\\r\\nm=video 32848 UDP/TLS/RTP/SAVPF 96 97 103 104 109 114\\r\\nc=IN IP4 192.168.2.121\\r\\na=sendonly\\r\\na=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\\r\\na=extmap:9 urn:ietf:params:rtp-hdrext:sdes:mid\\r\\na=mid:0\\r\\na=msid:27deda98-ad08-41b6-b3c2-4ccccf648da2 54da9b29-3f67-4439-9e7f-c28a124cdd81\\r\\na=rtcp:9 IN IP4 0.0.0.0\\r\\na=rtcp-mux\\r\\na=ssrc-group:FID 2466844985 2984972159\\r\\na=ssrc:2466844985 cname:567307e8-257f-4b6f-a404-063bb5ce487c\\r\\na=ssrc:2984972159 cname:567307e8-257f-4b6f-a404-063bb5ce487c\\r\\na=rtpmap:96 VP8/90000\\r\\na=rtcp-fb:96 nack\\r\\na=rtcp-fb:96 nack pli\\r\\na=rtcp-fb:96 goog-remb\\r\\na=rtpmap:97 rtx/90000\\r\\na=fmtp:97 apt=96\\r\\na=rtpmap:103 H264/90000\\r\\na=rtcp-fb:103 nack\\r\\na=rtcp-fb:103 nack pli\\r\\na=rtcp-fb:103 goog-remb\\r\\na=fmtp:103 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42001f\\r\\na=rtpmap:104 rtx/90000\\r\\na=fmtp:104 apt=103\\r\\na=rtpmap:109 H264/90000\\r\\na=rtcp-fb:109 nack\\r\\na=rtcp-fb:109 nack pli\\r\\na=rtcp-fb:109 goog-remb\\r\\na=fmtp:109 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f\\r\\na=rtpmap:114 rtx/90000\\r\\na=fmtp:114 apt=109\\r\\na=candidate:274a8690a1ab621e92bd97a1abc6ea21 1 udp 2130706431 192.168.2.121 32848 typ host\\r\\na=candidate:73b6fc9eff30d771a6039ebe60cbe14a 1 udp 2130706431 fdfa:ce41:7423::94a 54723 typ host\\r\\na=candidate:d937fbb57a3d03a657a35eb3120f1452 1 udp 2130706431 fdfa:ce41:7423:0:fbf0:7642:d1d5:2138 43698 typ host\\r\\na=candidate:4823626fc8c989e49e96fbce9d5fd53f 1 udp 1694498815 79.168.107.25 32848 typ srflx raddr 192.168.2.121 rport 32848\\r\\na=end-of-candidates\\r\\na=ice-ufrag:NnKF\\r\\na=ice-pwd:cwZi4RhGefib6mEdLFpRZA\\r\\na=fingerprint:sha-256 FB:36:14:92:CB:66:41:D5:E4:24:27:D8:0B:E1:6C:C0:56:41:3A:E3:A9:2C:5F:9C:B2:5A:2C:99:58:F0:0D:66\\r\\na=fingerprint:sha-384 DD:3F:13:1A:06:F1:7B:16:7D:12:CC:4C:86:AF:62:BC:D1:28:11:0D:CC:91:57:E7:ED:61:50:85:10:9B:77:DA:FC:54:F4:B1:47:13:54:95:36:C0:0E:8D:F0:49:F9:09\\r\\na=fingerprint:sha-512 63:11:89:28:26:16:D7:FC:9E:01:74:27:8C:62:34:9E:07:1F:D5:37:15:94:FF:7D:19:DA:0A:B4:24:64:8C:4F:21:69:17:68:EA:D5:C8:F2:82:6C:4F:E5:BB:8F:38:6A:39:13:29:E2:DA:7B:92:78:FA:CC:CC:9B:57:B0:24:E7\\r\\na=setup:active\\r\\n
```

3. Once the answer is set to the browser, browser knows where is raspberry pi, and starts to request stream of it. This is where WebRTC provides a stream using 

```javascript
 pc.ontrack = (event) => {
            const [stream] = event.streams;
            if (videoRef.current && videoRef.current.srcObject !== stream) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
        };
```

Remember the `PicameraVideoTrack` ? This is the `event.streams[0]` from the code above. We will add this stream onto video element `srcObject`. 

So far it will all play for desktop browsers

### Adding TURN Server

The above works just fine as long as the devices are on the same network. If they are not, then we need to provide the TURN servers. I have created an account on [Open Relay](https://www.metered.ca/tools/openrelay/) because I found them on the web and they offer free TURN servers up to 20GB. The only difference with the TURN server is that we need to update a WebRTC ICE servers like follows: 


```javascript
    const startWebRTC = async () => {
        const response = await fetch("/api/turn-credentials");
        const turnCredentials = await response.json();
        const pc = new RTCPeerConnection({
            iceServers: turnCredentials,
        });
        ...
```

Note our TURN credentials are a list of servers that can be provided on demand using API. I am using my BFF backend service to fetch the `turn-credentials` using the Metered API Key like this:
 
```javascript
// /api/turn-credentials

export const getIceServers = async (): Promise<VideoResponse> => {
    try {
        const response = await fetch(`https://your-domain.metered.live/api/v1/turn/credentials?apiKey=${process.env.METERED_API_KEY_TURN_CREDENTIALS}`);
        return response.json();
    } catch (e) {
        throw new Error(`Error While Fetching Video: ${e}`);
    }
};
```

This API returns a list of ICE servers including TURN and STUN servers with credentials as follows: 

```json
[
    {
        "urls": "stun:stun.relay.metered.ca:80"
    },
    {
        "urls": "turn:standard.relay.metered.ca:80",
        "username": "username",
        "credential": "password"
    },
    {
        "urls": "turn:standard.relay.metered.ca:80?transport=tcp",
        "username": "username",
        "credential": "password"
    },
    {
        "urls": "turn:standard.relay.metered.ca:443",
        "username": "username",
        "credential": "password"
    },
    {
        "urls": "turns:standard.relay.metered.ca:443?transport=tcp",
        "username": "username",
        "credential": "password"
    }
]
```

Note, we need to fetch this as well on the device camera because both devices need to know the addresses of both TURN and STUN to relay data.

### WebRTC Samples 

I found some samples from where you can learn how to use WebRTC effectively. Feel free to dive in - https://webrtc.github.io/samples/. Also, Metered offers free TURN and a very good explanation here https://www.metered.ca/tools/openrelay/.


### Adding MQTT for managing Raspberry Pi Turn on and off the streaming

Our `/start-streaming-service` and `/stop-streaming-service` will simple send messages via MQTT to the MQTT broker. We will assume that raspberry pi is subscribed to these messages and will be able to call `start_recording` and `stop_recording` on the `Picamera2`. 

I will not dive deep into this in this article, but if you are curious feel free to visit my series on setting up MQTT for raspberry pi: 

- [Provisioning AWS IoT Core Certificates for Ec-2 instance - MQTT Subscriber with Terraform](https://www.viktorvasylkovskyi.com/posts/provisioning-aws-iot-core-for-ec-2)
- [Provisioning AWS IoT Core Certificates for Raspberry Pi for MQTT Broker with Terraform](https://www.viktorvasylkovskyi.com/posts/provisioning-aws-iot-core-for-raspberry-pi)
- [AWS IoT Core - Implementing Publisher and Subscriber for MQTT in Python](https://www.viktorvasylkovskyi.com/posts/provisioning-aws-iot-core-python-implementation)


For completeness though, I will leave my code here so you can see how everything can be orchestrated from web service, at least it works for me: 

```python

@videos_router.get("/start-streaming-service")
async def start_streaming_service():
    ffmpeg_service = FFmpegStreamingService()
    ffmpeg_service.start()
    stream_url = f"/hls/{ffmpeg_service.STREAM_NAME}.m3u8"
    mqtt_client = AwsMQTTClient(MQTTClients.WEB_SERVICE.value)
    event = CameraControlEvent(action=CameraAction.START_LIVE_STREAM)
    mqtt_client.publish(MQTTTopics.CAMERA_CONTROL.value, event.json())

    return {
        "status": "Video streaming service started successfully",
        "stream_url": stream_url,
    }


@videos_router.get("/stop-streaming-service")
async def stop_streaming_service():
    mqtt_client = AwsMQTTClient(MQTTClients.WEB_SERVICE.value)
    ffmpeg_service = FFmpegStreamingService()
    ffmpeg_service.stop()
    event = CameraControlEvent(action=CameraAction.STOP_LIVE_STREAM)
    mqtt_client.publish(MQTTTopics.CAMERA_CONTROL.value, event.json())
    return {
        "status": "Video streaming service stopped successfully",
    }

```

### Adding Wait for stream to start

The code above has an issue at `start-streaming-service`, it assumes that the communication to raspberry pi and streaming is instantaneous and returns the URL to the client. This may cause bugs where client tries to fetch the manifest that doesn't exist yet. So let's add the waiting function, we will wait in the FastAPI endpoint until FFmpeg generates first segments - this way we can ensure the client that they can start playback without any issues: 

```python
@videos_router.get("/start-streaming-service")
async def start_streaming_service():
    ffmpeg_service = FFmpegStreamingService()
    stream_url = f"/hls/{ffmpeg_service.STREAM_NAME}.m3u8"
    mqtt_client = AwsMQTTClient(MQTTClients.WEB_SERVICE.value)

    event = CameraControlEvent(action=CameraAction.START_LIVE_STREAM)
    mqtt_client.publish(MQTTTopics.CAMERA_CONTROL.value, event.json())

    ffmpeg_service.start()
    # Wait for 10 seconds to ensure the stream is available
    success = await ffmpeg_service.start_and_wait(10)

    if not success:
        return {
            "status": "error",
            "message": "Stream failed to become available in time",
        }

    return {
        "status": "Video streaming service started successfully",
        "stream_url": stream_url,
    }
```

Now let's implement the `start_and_wait` on Ffmpeg service: 

```python
    async def start_and_wait(
        self, timeout_seconds: float = 5.0, poll_interval: float = 0.2
    ) -> bool:
        if not self.process:
            self.start()
        else:
            logger.info("FFmpeg process already running, skipping start.")

        manifest_path = os.path.join(self.HLS_DIR, f"{self.STREAM_NAME}.m3u8")

        waited = 0.0
        while not os.path.exists(manifest_path) and waited < timeout_seconds:
            await asyncio.sleep(poll_interval)
            waited += poll_interval

        if os.path.exists(manifest_path):
            logger.success("Stream manifest is now available.")
            return True
        else:
            logger.error("Timed out waiting for manifest to appear.")
            return False
```

We are basically putting our process to `sleep` and when using `asyncio` coroutine until the file appears in the desired location. Using `asyncio` allows us to await in a non-blocking manner. So Ffmpeg is waiting for the raspberry pi to start streaming data into it's UDP service and once it receives data ffmpeg will create first segments. That is when we will return the URL to the client.

### Clean the segments on stop streaming 

Now, the last piece of the backend puzzle is to ensure that when start streaming begins, the "old live" view doesn't show up. This is accomplished by cleaning up the segments from the folder essentially. Let's write this function in ffmpeg service: 

```python
    def cleanup(self):
        """Remove the manifest and all segment files."""
        manifest_path = os.path.join(self.HLS_DIR, f"{self.STREAM_NAME}.m3u8")
        segment_pattern = os.path.join(self.HLS_DIR, f"{self.STREAM_NAME}_*.ts")

        try:
            # Remove manifest file
            if os.path.exists(manifest_path):
                os.remove(manifest_path)
                logger.info(f"Removed manifest file: {manifest_path}")

            # Remove segment files
            segments = glob.glob(segment_pattern)
            for segment_file in segments:
                os.remove(segment_file)
            logger.info(f"Removed {len(segments)} segment files.")
        except Exception as e:
            logger.error(f"Failed to cleanup HLS files: {e}")
```

Now we have to just invoke it on stop-streaming: 

```python
@videos_router.get("/stop-streaming-service")
async def stop_streaming_service():
    ...
    ffmpeg_service.cleanup()
    ...
    return {
        "status": "Video streaming service stopped successfully",
    }
```


## Building Javascript Web Client 

Now the client has to do the following: 

1. start streaming by calling `/start-streaming-service`
2. Fetch segments by using `stream_url`. 

All we need is a very little JS to orchestrate these API calls. I will leave you do it. The last piece will be to put the segments into the `<video>` HTML element. Natively, only Safari and iOS support HLS, so for best compatibility across all the browsers I am using `hls.js` which essentially polyfills the browsers that don't support it. This way the live stream can be played across all of the browsers. I am using a simple video element for such playback.

```javascript
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
```

## Conclusion

And that is it, you should be able to see your raspberry pi streaming to the web browser. Let me know if you succeeded in the comments below! 



