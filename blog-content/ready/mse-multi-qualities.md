# Media Source Extensions for Multi-Quality Playback

In our previous article, we explored the integration of Media Source Extensions (MSE) with the MPEG-DASH streaming protocol, where the playback stream's data and capabilities are defined in an XML file known as the manifest. In this article, we will delve deeper into the core aspect of this technology - Adaptive Bitrate.

## Introduction to Adaptive Bitrate

Adaptive Bitrate (ABR) is a crucial feature in modern streaming services. It optimizes the viewer's experience by adjusting the quality of video in real-time, based on the viewer's internet connection and device capabilities. ABR ensures smooth playback by seamlessly switching between different renditions of the same content. To achieve this, it employs various algorithms that assess network conditions, buffer levels, and other factors to make intelligent decisions on the ideal video quality to deliver. In the following section, we'll discuss some common ABR algorithms and their role in optimizing the viewing experience.

## Getting Started

As in our previous tutorial, we will be using a straightforward `webpack` server setup. If you're unfamiliar with this configuration, I recommend reading our article on setting up a `webpack` server [link to webpack tutorial].

## Preparing the Media

To support multiple playback qualities, we need to create different renditions of our source video, "BigBuckBunny.mp4." These variations represent various quality levels and will be defined in the manifest under different `AdaptationSets` inside the `Representation` tag.

### Building Different Renditions

Before proceeding, we must convert our "BigBuckBunny.mp4" into different renditions. For this demonstration, we'll generate four different renditions. This can be achieved using the versatile `ffmpeg` tool.

Let's begin:

```sh
ffmpeg -i BigBuckBunny.mp4 -s 160x90 -b:v 250k ./source/BigBuckBunny_160x90_250k.mp4
ffmpeg -i BigBuckBunny.mp4 -s 320:180 -b:v 500k ./source/BigBuckBunny_320x180_500k.mp4
ffmpeg -i BigBuckBunny.mp4 -s 640:360 -b:v 750k ./source/BigBuckBunny_640:360_750k.mp4
ffmpeg -i BigBuckBunny.mp4 -s 1280:720 -b:v 1500k ./source/BigBuckBunny_1280:720_1500k.mp4
```

Explanation of the command:

- `-i` specifies the input file, which in this case is our source video.
- `-s` is used for scaling, defining the resulting video's dimensions.
- `-b:v` stands for the video bitrate, affecting the quality of the video. More bits result in better quality but consume more bandwidth.

We've intelligently combined scaling and bitrate adjustments to optimize quality for different devices and network conditions. This approach allows for better quality on smaller screens with lower bitrates, such as mobile phones.

In another scenario, you could keep the scale consistent across renditions but alter the bitrate. This would provide different quality levels for the same frame size, with the ABR algorithm making real-time quality decisions based on network conditions.

There are numerous ABR implementations, ranging from network-based to buffer-based algorithms and combinations of both. For more on ABR, please refer to our upcoming article [link to my next article].

### Packaging Media

In the packaging phase, we use `shaka-packager` to package the four renditions we've created. Each rendition is split into segments of 2 seconds, and they are packaged together in the same manifest. Rules are applied so that the manifest contains information about which rendition to choose based on the bitrate.

We can update our previous packager script as follows:

```sh
packager in=./source/BigBuckBunny_160x90_250k.mp4,stream=video,init_segment='./segments/160x90_250k/BigBuckBunny_0.mp4',segment_template='./segments/160x90_250k/BigBuckBunny_$Number%01d$.mp4' \
    in=./source/BigBuckBunny_320x180_500k.mp4,stream=video,init_segment='./segments/320x180_500k/BigBuckBunny_0.mp4',segment_template='./segments/320x180_500k/BigBuckBunny_$Number%01d$.mp4' \
    in=./source/BigBuckBunny_640x360_750k.mp4,stream=video,init_segment='./segments/640x360_750k/BigBuckBunny_0.mp4',segment_template='./segments/640x360_750k/BigBuckBunny_$Number%01d$.mp4' \
    in=./source/BigBuckBunny_1280x720_1500k.mp4,stream=video,init_segment='./segments/1280x720_1500k/BigBuckBunny_0.mp4',segment_template='./segments/1280x720_1500k/BigBuckBunny_$Number%01d$.mp4' \
    --segment_duration 2 \
    --mpd_output ./segments/BigBuckBunny.mpd
```

With these modifications, Shaka packager considers the bitrate information to populate the manifest with multiple `Representation` fields, each corresponding to a different rendition.

Notice our `BigBuckBunny.mpd` manifest file now contains multiple `Representation` fields:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!--Generated with https://github.com/google/shaka-packager version v2.5.1-9f11077-release-->
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="urn:mpeg:dash:schema:mpd:2011 DASH-MPD.xsd" profiles="urn:mpeg:dash:profile:isoff-live:2011" minBufferTime="PT2S" type="dynamic" publishTime="2023-10-12T08:16:23Z" availabilityStartTime="2023-10-12T08:16:22Z" minimumUpdatePeriod="PT5S" timeShiftBufferDepth="PT1800S">
  <Period id="0" start="PT0S">
    <AdaptationSet id="0" contentType="video" maxWidth="1280" maxHeight="720" frameRate="15360/256" segmentAlignment="true" par="16:9">
      <Representation id="0" bandwidth="523723" codecs="avc1.640015" mimeType="video/mp4" sar="1:1" width="320" height="180">
        <SegmentTemplate timescale="15360" initialization="320x180_500k/BigBuckBunny_0.mp4" media="320x180_500k/BigBuckBunny_$Number%01d$.mp4" startNumber="1">
        ...
        </SegmentTemplate>
      </Representation>
      <Representation id="1" bandwidth="1701860" codecs="avc1.640020" mimeType="video/mp4" sar="1:1" width="1280" height="720">
        <SegmentTemplate timescale="15360" initialization="1280x720_1500k/BigBuckBunny_0.mp4" media="1280x720_1500k/BigBuckBunny_$Number%01d$.mp4" startNumber="1">
        ...
        </SegmentTemplate>
      </Representation>
      <Representation id="2" bandwidth="267875" codecs="avc1.64000d" mimeType="video/mp4" sar="1:1" width="160" height="90">
        <SegmentTemplate timescale="15360" initialization="160x90_250k/BigBuckBunny_0.mp4" media="160x90_250k/BigBuckBunny_$Number%01d$.mp4" startNumber="1">
        ,,,
```

## MSE Player Engine for Managing Multiple Resolutions

### Changes to mpd-parser

In the `mpd-parser.ts`, you'll notice that when parsing the manifest of "BigBuckBunny.mpd," it now contains a `playlists` array with four entries, representing our four renditions. Pay attention to the `attributes` field of each playlist, especially the `BANDWIDTH` attribute. We will use this bandwidth attribute as a key to organize our segments. For each available bandwidth, we'll select a list of segments. Let's modify the code accordingly.

```typescript
export const getParsedManifest = async (manifestUri: string) => {
  const manifestResponse = await fetch(manifestUri);
  const manifest = await manifestResponse.text();

  const parsedManifest = parse(manifest);

  const bandwidths: Array<number> = [];
  const variants: { [key: string]: Variant } = parsedManifest.playlists.reduce(
    (accumulator: Array<Variant>, playlist: Playlist) => {
      const bandwidth = playlist.attributes.BANDWIDTH;
      bandwidths.push(bandwidth);
      const initializationSegment = `./segments/${playlist.segments[0].map.uri}`;
      const segments = playlist segments.map(
        (segment: any) => `./segments/${segment.uri}`
      );

      return {
        ...accumulator,
        [bandwidth]: {
          codecs: playlist.attributes.CODECS,
          segments: [initializationSegment, ...segments],
        },
      };
    },
    {}
  );

  return { variants, bandwidths };
};
```

bandwidths are collected and returned in the `bandwidths` array. The `variants` object contains the various renditions, each associated with its unique bandwidth, codecs, and segments.

For the sake of completeness, here are the type definitions that correlate with our parsing logic:

```typescript
type Segment = {
  uri: string;
  map: {
    uri: string;
  };
};

type Playlist = {
  attributes: {
    BANDWIDTH: number;
    CODECS: string;
  };
  segments: Array<Segment>;
};

type Variant = {
  codecs: string;
  segments: Array<string>;
};
```

With this modification, our parser can effectively handle multiple playlists in the manifest.

Now, let's adapt our Player Engine to support the playback of multiple renditions.

### Player Engine

The player engine will request the `mpd-parser.ts` to parse the manifest and retrieve the `variants` and `bandwidths`. However, the player engine does not possess the ability to decide which rendition to choose in real-time. It must make an initial assumption about the best quality to start playback. This is a crucial aspect of ABR.

Here, we'll take an optimistic approach and select the highest quality rendition to begin with:

```typescript
const { variants, bandwidths } = await getParsedManifest(
  "./segments/BigBuckBunny.mpd"
);

const firstVariant = variants[bandwidths[bandwidths.length - 1]];
const initializationSegment = firstVariant.segments[0];
const codecs = firstVariant.codecs;
const segments = firstVariant.segments;
```

It's important to note that this optimistic selection provides the best possible quality from the outset. However, it may result in longer video startup times due to the need to download larger media segments.

The remaining code should closely resemble what we've discussed in the previous article [link to previous article]. The Player Engine handles the creation of the media source and source buffers, manages the downloading of segments, and pushes them into the source buffer for playback.

### What's Next?

As an observant reader might have noticed, our code still lacks an essential component: the logic to switch between different renditions during playback. This decision-making process is typically handled by an Adaptive Bitrate (ABR) Manager in real-world streaming applications. The ABR Manager continuously assesses network conditions, buffer levels, and other factors to determine the optimal rendition to deliver. The Player Engine simply listens to the ABR Manager's decisions and switches between renditions accordingly.

The implementation of an ABR Manager is a topic that warrants its own dedicated article. Stay tuned for our next article, where we will explore the development of an ABR algorithm. As usually, the link to [full source code is here](https://github.com/viktorvasylkovskyi/barebones-mse-playback-with-multi-renditions).

We hope you've found this article informative and gained a deeper understanding of Adaptive Bitrate and its importance in modern streaming. Happy coding!

### References

- [Creating multiple resolutions of media](https://developer.mozilla.org/en-US/docs/Web/Media/DASH_Adaptive_Streaming_for_HTML_5_Video)
- [JavaScript Reduce](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce)
- [Working with Shaka Packager](https://www.radiantmediaplayer.com/guides/working-with-shaka-packager.html)
- [A quick guide to using FFmpeg to convert media files](https://opensource.com/article/17/6/ffmpeg-convert-media-file-formats)
- [How to build your own streaming video HTML player](https://eyevinntechnology.medium.com/how-to-build-your-own-streaming-video-html-player-6ee85d4d078a)
