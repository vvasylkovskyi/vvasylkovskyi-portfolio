
// useEffect(() => {
//     const video = videoRef.current;
//     if (!video || !state.streamUrl) {
//         return;
//     }

//     if (Hls.isSupported()) {
//         const hls = new Hls({
//             xhrSetup: (xhr, url) => {
//                 // if segment url does not start with prefix, prepend it
//                 const prefix = '/api/live?stream_url=/hls/stream.m3u8';
//                 if (!url.startsWith(prefix)) {
//                     const segmentUrl = url.substring(url.lastIndexOf('/') + 1);
//                     xhr.open('GET', `${window.location.protocol}//${window.location.host}/api/live?stream_url=/hls/${segmentUrl}`);
//                 }
//             }
//         });
//         hls.loadSource(state.streamUrl);
//         hls.attachMedia(video);
//         // Jump to live edge after manifest is parsed

//         hls.on(Hls.Events.MANIFEST_PARSED, () => {
//             const liveSync = hls.liveSyncPosition;
//             if (liveSync) {
//                 video.currentTime = liveSync;
//             }
//         });

//         hls.on(Hls.Events.ERROR, (_, data) => {
//             console.error('HLS.js error:', data);
//         });

//     } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
//         // For Safari
//         video.src = state.streamUrl;
//     } else {
//         console.error('HLS not supported in this browser.');
//     }
// }, [state.streamUrl]);

// // const handleJumpToLiveView = () => {
// //     if (videoRef.current) {
// //         videoRef.current.currentTime = videoRef.current.duration; // Jump to the end of the live stream
// //     }
// // };

// const handleStartLiveStream = async () => {
//     setState({ ...state, isLoading: true });
//     const response = await fetch('/api/start-live-stream');
//     const data = await response.json();
//     setState({
//         streamUrl: `/api/live?stream_url=${data.stream_url}`,
//         isLoading: false
//     });
// };

// const handleStopLiveStream = async () => {
//     await fetch('/api/stop-live-stream');
//     setState({
//         streamUrl: null,
//         isLoading: false
//     });
// };

// useEffect(() => {
//     return () => {
//         handleStopLiveStream();
//     };
// }, []);

// useEffect(() => {
//     const handleBeforeUnload = (_: BeforeUnloadEvent) => {
//         handleStopLiveStream();
//     };

//     window.addEventListener('beforeunload', handleBeforeUnload);

//     return () => {
//         window.removeEventListener('beforeunload', handleBeforeUnload);
//     };
// }, []);