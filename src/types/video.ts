export type Video = {
  id: number;
  title: string;
  url: string;
  timestamp: string;
};

export type VideoResponse = {
  status: string;
  videos: Video[];
};

export type LiveStreamResponse = {
  status: string;
  stream_url: string;
};

export type WebRtcAnswer = {
  status: string;
  webrtc_answer: string; // SDP answer for WebRTC
};

export type WebRTCAnswerResponse = {
  data: WebRtcAnswer;
};
