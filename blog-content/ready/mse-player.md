# Mastering Media Source Extensions (MSE) for Web Development

In the ever-evolving landscape of web development, delivering high-quality media content to users stands as a paramount challenge. Fortunately, there's a powerful tool in your arsenal: Media Source Extensions (MSE). This ingenious technology allows you to manipulate and control media streams, offering a seamless and tailored playback experience for your audience. In this comprehensive guide, we'll embark on a journey to unravel the intricacies of MSE and learn how to harness its capabilities to elevate your web applications.

## Laying the Foundation

Before we plunge into the captivating realm of Media Source Extensions, it's essential to establish a solid foundation. We'll kick things off by setting up a basic Express server. This server will serve our HTML file and videos, gracefully sidestepping those pesky CORS (Cross-Origin Resource Sharing) issues. Feel free to visit the article about [HTTP Server Setup](link-to-http-server-setup). Or simply [clone the project here](https://github.com/viktorvasylkovskyi/http-server).

Once your setup is complete, running `npm install` will neatly install the necessary dependencies. Execute `npm run start` to launch the server on port 4000.

## Elevating Media Playback with MSE

**Media Source Extensions (MSE)** arm web developers with the unprecedented ability to dynamically control media streams within web applications. This empowerment translates into enhanced customization and interactivity, making MSE an indispensable asset. To dive deeper into MSE, refer to the [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/MediaSource).

To seamlessly connect MediaSource with media elements like the `video` element, we rely on **`URL.createObjectURL`**. This dynamic method creates links on the fly, enabling real-time manipulation of media content. Uncover the full potential of `URL.createObjectURL` in the [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL).

In your project, create a `media-source.js` file and leverage native JavaScript to interact with the video element:

```javascript
// media-source.js
const video = document.getElementById("video");
const mediaSource = new MediaSource();
const url = URL.createObjectURL(mediaSource);

// Bind MediaSource to the video element
video.src = url;
```

Inspecting your video element via developer tools reveals that it now points to a blob with your web server's address. This transformation stems from converting a media source into an object URL.

Next, let's introduce the concept of Source Buffers.

## Source Buffers: Streaming Video Data to Media Source

Source Buffers serve as instrumental components in feeding video data into Media Source. In this tutorial, we'll focus on fetching video segments. To initiate this process, we must await the `sourceopen` event, signaling MediaSource's readiness to accept a source buffer:

```javascript
mediaSource.addEventListener("sourceopen", onSourceOpen);
```

With the source open, we can create and add a source buffer to Media Source:

```javascript
const onSourceOpen = async () => {
  const videoSourceBuffer = mediaSource.addSourceBuffer(
    'video/mp4; codecs="avc1.4d4032"'
  );
};
```

Please note that specifying the MIME type of the source buffer is crucial. This MIME type must align with valid codecs supported by the browser.

Now, it's time to fetch the video segment:

```javascript
const mp4Uri = "/manifests/BigBuckBunny.mp4";

const mp4Response = await fetch(mp4Uri);

// Ensure the data is in JavaScript ArrayBuffer format
const mp4VideoData = await mp4Response.arrayBuffer();
videoSourceBuffer.appendBuffer(mp4VideoData);
```

At this juncture, upon inspecting your browser, you'll notice that the video now contains a buffer with one element - `video.buffered`. This buffer corresponds to the `.mp4` segment we just appended.

## Marking the End of the Stream

As we've completed the download of all video segments, MSE advises calling the `endOfStream` method to signify the end of the stream. We can

achieve this when the source buffer append operation concludes:

```javascript
sourceBuffer.addEventListener("updateend", function () {
  if (mediaSource.readyState === "open") {
    mediaSource.endOfStream();
  }
});
```

You may observe that, in your browser, the video gets downloaded in the Network tab under `BigBuckBunny.mp4`. However, it won't play automatically due to the browser's autoplay policy, which mandates user interaction. To initiate playback, you can manually play the video using JavaScript:

```javascript
const video = document.getElementsByTagName("video")[0];
video.play();
```

## Transitioning to Multi-Segment Streams

Up until now, we've been playing a single `.mp4` file of 10 seconds using MSE. The browser cleverly employs the Range HTTP protocol to manage this. However, as we venture into a more realistic scenario, we'll encounter an `.mp4` file divided into multiple smaller segments. In typical streaming applications, video/audio files are segmented into sequences of 2 seconds, 6 seconds, or other durations, depending on the use case. Let's move forward and split our video into segments.

### Preparing Segments with Shaka-Packager

In the realm of streaming media, tools like Shaka Packager are indispensable. Shaka Packager, an open-source content packaging and encryption tool from the Shaka Player project, empowers us to prepare our video content for adaptive streaming with ease. You can delve deeper into Shaka Packager by exploring its official documentation [here](https://github.com/shaka-project/shaka-packager).

But how do you get started with Shaka Packager, you ask? It's surprisingly simple, thanks to the magic of Docker. Installing Shaka Packager with Docker is a breeze and unlocks a world of possibilities for video segmenting and packaging.

For our demonstration, we'll utilize Shaka Packager to split a source video file into multiple 2-second segments. While real-world streaming applications often use 2-second segments and separate video streams, we'll keep things straightforward. Given that our video is 10 seconds long, we'll divide it into five two-second segments.

To begin, create a folder for your segments: `mkdir segments`. Now, let's run Shaka Packager to perform the video segmentation magic.

```sh
packager in=./BigBuckBunny.mp4,stream=video,init_segment='./segments/BigBuckBunny_0.mp4',segment_template='./segments/BigBuckBunny_$Number%01d$.mp4' \
--segment_duration 2
```

Here's a breakdown of the command:

- `-in` specifies the input file.
- `stream=video` indicates that we're dealing with a video file.
- `init_segment` defines the segment containing metadata crucial for initializing the media source. This metadata includes codec information, timescale, duration, and more.
- `segment_template` sets the template for segment names. In our case, it generates `n` MP4 files where `$Number%01d$` is replaced by the segment number.
- `--segment_duration` specifies the duration of each segment.

Executing this command will yield four segments:

```sh
BigBuckBunny_0.mp4
BigBuckBunny_1.mp4
BigBuckBunny_2.mp4
BigBuckBunny_3.mp4
```

You might wonder why there are four segments instead of five for our 10-second video divided into 2-second segments. Shaka Packager, in its wisdom, ensures a smooth timeline and visual connection between MP4 files. Consequently, some segments might have extended durations due to frame concatenation. To ensure our video isn't cut in half, we'll double-check its size in the next section.

### Enhancing Our MSE Implementation to Play All the Segments

Now that we've harnessed Shaka Packager's magic to create segments, it's time to extend our Media Source Extensions (MSE) implementation to handle these segments. First, let's make our `mp4Uri` dynamic:

```javascript
const mp4InitializationUri = "./segments/BigBuckBunny_0.mp4";
const mp4SegmentUri = "./segments/BigBuckBunny_$.mp4";
const segmentsNumber = 3;
```

Please note that the `$` symbol will be replaced later with the segment count. In a production-like MSE setup, you'd dynamically determine this value per asset. Now, we'll modify our `sourceBuffer` to fetch segments one after the other.

```javascript
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
      const nextSegment = await getMp4Data(nextSegmentUri); // Fetch the next segment
      sourceBuffer.appendBuffer(nextSegment);
    }
    if (mediaSource.readyState === "open" && i === segmentsNumber) {
      mediaSource.endOfStream();
    }
  });

  const firstSegment = await getMp4Data(mp4InitializationUri); // The first segment
  sourceBuffer.appendBuffer(firstSegment);
}

mediaSource.addEventListener("sourceopen", onSourceOpen.bind(mediaSource));
```

The code above is sufficient for appending the initialization segment first. Now, let's complete the code. A best practice is to append the next segment only after the previous one has been fully appended. Therefore, we'll add a callback to `updateend` to append the next segment when the previous one has finished.

```javascript
sourceBuffer.addEventListener("updateend", async function () {
  if (!sourceBuffer.updating && i !== segmentsNumber) {
    i++;
    const nextSegment = await getMp4Data(nextSegmentUri); // Fetch the next segment
    sourceBuffer.appendBuffer(nextSegment);
  }
  if (mediaSource.readyState === "open" && i === segmentsNumber) {
    mediaSource.endOfStream();
  }
});
```

Note that we increment `i` to fetch the next segments. After `appendBuffer` is executed, the `updateend` event will be called again, and the loop continues. When `i` equals `segmentsNumber`, we signal `endOfStream`.

Your JavaScript code is now prepared to handle segmented video playback, unlocking the full potential of Media Source Extensions. Below, you'll find the complete code snippet for your reference:

```javascript
const startPlayback = async () => {
  const video = document.getElementById("video");

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
        const nextSegment = await getMp4Data(nextSegmentUri); // Fetch the next segment
        sourceBuffer.appendBuffer(nextSegment);
      }
      if (mediaSource.readyState === "open" && i === segmentsNumber) {
        mediaSource.endOfStream();
      }
    });

    const firstSegment = await getMp4Data(mp4InitializationUri); // The first segment
    sourceBuffer.appendBuffer(firstSegment);
  }

  mediaSource.addEventListener("sourceopen", onSourceOpen.bind(mediaSource));
};
```

To conclude our exploration, let's initiate video playback and verify its duration:

```javascript
const video = document.getElementsByTagName("video")[0];
video.play();
console.log(video.duration); // The video duration is approximately 9.999 seconds.
```

As you can observe, the video duration closely aligns with the expected 10 seconds. Additionally, for a more in-depth examination, you can inspect the network tab within the developer tools, where you'll witness the concurrent downloading of multiple video segments. This insightful observation reaffirms the successful segmentation and playback of our video content.

In conclusion, we hope this guide has illuminated the inner workings of Media Source Extensions and how they can be harnessed to optimize media playback on the web. For the complete code and a hands-on experience, visit the [GitHub repository](https://github.com/viktorvasylkovskyi/barebones-mse-playback).

If you're eager to dive even deeper into this realm, feel free to explore the references below. Happy coding!

## References

- [MSE Basics](https://web.dev/media-mse-basics/)
- [How video streaming works on the web: An introduction](https://medium.com/canal-tech/how-video-streaming-works-on-the-web-an-introduction-7919739f7e1)
- [Video Element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video)
- [Shaka Packager](https://github.com/shaka-project/shaka-packager)
