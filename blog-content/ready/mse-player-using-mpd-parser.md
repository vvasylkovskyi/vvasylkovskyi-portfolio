# Media Source Extensions using MPD Parser

In this tutorial, we will delve into the intricacies of Media Source Extensions (MSE) to enable web-based content playback using the MPEG-DASH specification. But first, let's start with a brief introduction to MPEG-DASH and provide a link to its official documentation for a deeper dive.

## Introduction to MPEG-DASH

As we delve deeper into this tutorial, you'll gain a comprehensive understanding of the MPEG-DASH protocol and how to implement it using Media Source Extensions. MPEG-DASH is a widely adopted protocol for adaptive streaming, allowing seamless media playback on the web. It defines how content can be efficiently delivered to end-users, providing vital information on video quality options, rendition-based quality selection, encryption, encoding details, frame rates, and more. If you want to explore the specific details of MPEG-DASH, you can refer to the [official MPEG-DASH documentation](https://www.mpeg.org/standards/MPEG-DASH/).

## Getting Started

To get started with Media Source Extensions and MPEG-DASH, we'll need to include the `mpd-parser` dependency. To maintain organization and streamline the development process, we'll set up a simple web server using Webpack. Let's dive into the Webpack setup.

### Setting up Webpack

We will be using a straightforward `webpack` server setup. If you're unfamiliar with this configuration, I recommend reading our article on setting up a `webpack` server [link to webpack tutorial], where you can be walked through on how to setup simple typescript project with webpack.

Once the setup is complete, run `npm i` to install the dependencies, `npm run build` to compile TypeScript, and `npm run start` to initiate the Webpack server, which will serve your `index.html`. Now you're ready to begin your video project!

## Creating Streams and MPD Manifest

Simillar to our previous article, we will now segment our media into 2-second length pieces and create a manifest file to reference these media segments.

To start, create a folder for your segments using the command `mkdir segments`. Next, let's utilize Shaka Packager to perform the video segmentation and manifest creation.

```sh
packager in=./BigBuckBunny.mp4,stream=video,init_segment='./segments/BigBuckBunny_0.mp4',segment_template='./segments/BigBuckBunny_$Number%01d$.mp4' \
--segment_duration 2 \
--mpd_output ./segments/BigBuckBunny.mpd
```

Here's a breakdown of the command:

- `-in` specifies the input file.
- `stream=video` indicates that we are dealing with a video file.
- `init_segment` defines the segment containing metadata crucial for initializing the media source. This metadata includes codec information, timescale, duration, and more.
- `segment_template` sets the template for segment names. In our case, it generates `n` MP4 files where `$Number%01d$` is replaced by the segment number.
- `--segment_duration` specifies the duration of each segment.

A new addition here is the `--mpd_output`, which indicates that we want to produce a manifest file while packaging this stream.

Executing this command will yield four segments:

```sh
BigBuckBunny_0.mp4
BigBuckBunny_1.mp4
BigBuckBunny_2.mp4
BigBuckBunny_3.mp4
```

And our sample manifest should look like the following:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!--Generated with https://github.com/google/shaka-packager version v2.5.1-9f11077-release-->
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="urn:mpeg:dash:schema:mpd:2011 DASH-MPD.xsd" profiles="urn:mpeg:dash:profile:isoff-live:2011" minBufferTime="PT2S" type="dynamic" publishTime="2023-10-11T08:13:24Z" availabilityStartTime="2023-10-11T08:13:23Z" minimumUpdatePeriod="PT5S" timeShiftBufferDepth="PT1800S">
  <Period id="0" start="PT0S">
    <AdaptationSet id="0" contentType="video" width="1920" height="1080" frameRate="15360/256" segmentAlignment="true" par="16:9">
      <Representation id="0" bandwidth="3745076" codecs="avc1.64002a" mimeType="video/mp4" sar="1:1">
        <SegmentTemplate timescale="15360" initialization="BigBuckBunny_0.mp4" media="BigBuckBunny_$Number%01d$.mp4" startNumber="1">
          <SegmentTimeline>
            <S t="0" d="64000" r="1"/>
            <S t="128000" d="25600"/>
          </SegmentTimeline>
        </SegmentTemplate>
      </Representation>
    </AdaptationSet>
  </Period>
</MPD>
```

### Including the Stream in our Bundle

To ensure that the created stream is accessible within our web server bundle, we must employ the `CopyWebpackPlugin` to move the contents of the `segments` folder into the `dist` folder where our bundle resides. Let's add a new development dependency using `npm i copy-webpack-plugin -D`.

In our `webpack.config.js`, we need to add a new plugin inside the `plugins` array, next to `HtmlWebpackPlugin`. Begin by importing the new package:

```javascript
const CopyWebpackPlugin = require("copy-webpack-plugin");
```

Then add it to the `plugins` array:

```javascript
...
  plugins: [
    new HtmlWebpackPlugin({
      title: "Hello World",
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, './segments'),
          to: path.join(__dirname, 'dist/segments'),
        },
      ],
    }),
  ],
...
```

Now, run `npm run build`. After the build is completed, you'll notice that the `segments` folder has been copied into the `dist` folder. You can now utilize these files within your project.

## Implementing MSE Player Engine

I highly recommend reading my previous article on the introduction to MSE ([link to previous article]), where we developed a simple `MediaSource` and `SourceBuffer` for segment downloading. Both they are a central piece in the streaming and, when thinking of the broader playback architecture, they are a piece of a bigger component called **Player Engine**. In a complete application, various components handle specific responsibilities, adhering to the [Single Responsibility Principle](https://en.wikipedia.org/wiki/Single-responsibility_principle), which keeps our code clean and maintainable.

Now, since we are introducing a manifest parser, we will refer to the previous component as the **Player Engine** because it is primarily responsible for being the driver of player operations required for the playback. Actually, our player engine also does another thing which is downloading media segments using HTTP. For your convenience, I'll provide the code from the previous article below for your conveniece, now enhanced with TypeScript.

```typescript
const video: HTMLVideoElement = document.createElement("video");
video.style.width = "640px";
document.getElementsByTagName("body")[0].appendChild(video);

const mp4InitializationUri = "./segments/BigBuckBunny_0.mp4";
const mp4SegmentUri = "./segments/BigBuckBunny_$.mp4";

const mimeCodec = 'video/mp4; codecs="avc1.4d4032"';
const segmentsNumber = 3;

if (!MediaSource.isTypeSupported(mimeCodec)) {
  console.error("Unsupported media format");
  return;
}

const mediaSource = new MediaSource(); // mediaSource.readyState === 'closed'
const url = window.URL.createObjectURL(mediaSource);
video.src = url;

async function getMp4Data(mp4Uri) {
  const mp4Response = await fetch(mp4Uri);
  return mp4Response.arrayBuffer();
}

async function onSourceOpen() {
  const mediaSource = this;
  let i = 0;
  URL.revokeObjectURL(video.src); // Revoke Object URL for garbage collection
  const sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);

  sourceBuffer.addEventListener("updateend", async function () {
    if (!sourceBuffer.updating && i !== segmentsNumber) {
      i++;
      const nextSegment = await getMp4Data(nextSegmentUri); // Next segments
      sourceBuffer.appendBuffer(nextSegment);
    }
    if (mediaSource.readyState === "open" && i === segmentsNumber) {
      mediaSource.endOfStream();
    }
  });

  const firstSegment = await getMp4Data(mp4InitializationUri); // First segment is here
  sourceBuffer.appendBuffer(firstSegment);
}

mediaSource.addEventListener("sourceopen", onSourceOpen.bind(mediaSource));
```

Note you can also find the code above on [this Github repository](https://github.com/viktorvasylkovskyi/barebones-mse-playback)

The provided code handles the download of segments. Now, let's introduce the `mpd-parser`.

Create a new file and folder by running `mkdir src` and `touch mpd-parser.ts`. In the `mpd-parser.ts` file, we will manage our manifest parsing logic, utilizing the `mpd-parser` dependency. Start by including the new dependency:

```typescript
import { parse } from "mpd-parser";
```

Our manifest parser will download the manifest and parse it into JavaScript objects so that it can be read by our program. For our demonstration, our manifest is relatively simple, with only one available playlist containing segments, an initialization segment, and the codec information. Note that all the segment URIs are relative to the manifest location, so we'll need to add `./segments/` as the folder name to each URL.

Ideally, our manifest should resemble the following:

```typescript
// ./src/mpd-parser.ts
import { parse } from "mpd-parser";

export const getParsedManifest = async (manifestUri: string) => {
  const manifestResponse = await fetch(manifestUri);
  const manifest = await manifestResponse.text();

  const parsedManifest = parse(manifest);

  const codecs = parsedManifest.playlists[0].attributes.CODECS;
  const segments = parsedManifest.playlists[0].segments.map(
    (segment: any) => `./segments/${segment.uri}`
  );
  const initializationSegment = `./segments/${parsedManifest.playlists[0].segments[0].map.uri}`;

  return { codecs, segments, initializationSegment };
};
```

You might notice that at this point, TypeScript raises an error because it doesn't recognize the type of `mpd-parser`. Since there are no publicly available type definitions for `@types/mpd-parser`, we will declare our own types. Create a `.global.d.ts` file in the root of your project:

```typescript
// .global.d.ts
declare module "mpd-parser" {
  function parse(data: string): any;
}
```

This declaration will resolve the TypeScript warning.

## Using Manifest Data in Segment Downloader

Now that we have the `getParsedManifest` method, we can use its results in our segment downloader. Let's replace some of the hardcoded values. First, import our new method: `getParsedManifest`.

```typescript
import { getParsedManifest } from "./src/mpd-parser";
```

Now, let's utilize it:

```typescript
const { codecs, segments, initializationSegment } = await getParsedManifest(
  "./segments/BigBuckBunny.mpd"
);

const mp4InitializationUri = initializationSegment;
const mimeCodec = `video/mp4; codecs="${codecs}"`;
```

Notice how everything becomes dynamic. We can now eliminate the need for regex replacements with `$i` because the manifest parser already parses segment URIs for us. Additionally, we no longer need to hardcode the `segmentNumber`.

The final code will look like this:

```typescript
// Updated onSourceOpen function
async function onSourceOpen() {
  let i = 0;
  URL.revokeObjectURL(video.src); // Revoke Object URL for garbage collection
  const sourceBuffer: SourceBuffer = mediaSource.addSourceBuffer(mimeCodec);

  sourceBuffer.addEventListener("updateend", async function () {
    if (!sourceBuffer.updating && i !== segments.length) {
      const nextSegmentUri = segments[i];
      const nextSegment = await getMp4Data(nextSegmentUri); // Next segments
      sourceBuffer.appendBuffer(nextSegment);
      i++;
    }
    if (mediaSource.readyState === "open" && i === segments.length) {
      mediaSource.endOfStream();
    }
  });

  const firstSegment = await getMp4Data(mp4InitializationUri); // First segment is here
  sourceBuffer.appendBuffer(firstSegment);
}

mediaSource.addEventListener("sourceopen", onSourceOpen.bind(mediaSource));
```

## Testing

Finally, let's test that everything works. To add a user interface (UI) to the video element, include a `controls` attribute. This will immediately render basic playback controls overlay, making it convenient for testing. At the beginning of the file, when creating a video, add this code:

```typescript
const video: HTMLVideoElement = document.createElement("video");
video.style.width = "640px";
video.setAttribute("controls", "");
document.getElementsByTagName("body")[0].appendChild(video);
```

Now the video should have controls. Go ahead and hit play to observe video playback in action.

## Summary

In this article, we embarked on a journey into the world of Media Source Extensions (MSE) and explored how to enable web-based content playback using the MPEG-DASH specification. We began with an introduction to MPEG-DASH, shedding light on its importance in adaptive streaming for delivering seamless media playback on the web.

Throughout the article, we addressed several key components and concepts:

- **Setting up Webpack:** We created a simple Webpack configuration to lay the foundation for our project, utilizing TypeScript to ensure compatibility across browsers.

- **Creating Streams and MPD Manifest:** We segmented media into 2-second length pieces and generated a manifest file to reference these segments using Shaka Packager.

- **Implementing MSE Segment Downloader:** We took a closer look at the segment downloader component, which handles the download of media segments via HTTP. This component was enhanced with TypeScript for clarity and efficiency.

- **Using Manifest Data:** By introducing the manifest parser, we achieved dynamic handling of media segments, making our project more versatile and maintainable. We discussed the retrieval of codec information, segments, and initialization segments from the manifest.

- **Testing:** We ensured that everything worked as expected by adding playback controls to the video element and verifying seamless video playback.

I hope you enjoyed this article! Don't forget to explore the full code in [our GitHub repository](https://github.com/viktorvasylkovskyi/barebones-mse-playback). Stay tuned for more exciting articles on web development and media streaming.

## References

- [How to Build Your Own Streaming Video HTML Player](https://eyevinntechnology.medium.com/how-to-build-your-own-streaming-video-html-player-6ee85d4d078a)
- [Mpd Parser](https://github.com/videojs/mpd-parser)
- [MPD Parser on npm](https://www.npmjs.com/package/mpd-parser)
- [Webpack](https://webpack.js.org/)
