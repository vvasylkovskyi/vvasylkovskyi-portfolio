# Diving into Mp4 Boxes Container Formats

... Introduction to Mp4 boxes and stream container formats ...

In this tutorial we are going to learn how to parse `.mp4` boxes in browser, and we will try and manipulate some of the `.mp4` metadata in a way to trick the player. Ready? Let's code!

## Setup

For this tutorial, we expect that you understand the MSE streaming and are familiar with basic playback. To simplify, we are going to use an already existing basic MSE playback project. You can download the sample project from [this github repository](https://github.com/vvasylkovskyi/barebones-mse-playback). If you are not familiar with MSE playback, I suggest you start by reading [this introductory tutorial of MSE playback](link-to-mse-playback-blog).

## Intercepting MP4 file arrayBuffers

Simillar to the basic MSE, we will be using a simple video element with Media Source appending video segments into the source buffer. Our simple app is downloading the four segments of `BigBuckBunny.mp4`. The first segment is the initialization segment, and the rest are the media segments.

We already have code for the download:

```javascript
async function getMp4Data(mp4Uri) {
  const mp4Response = await fetch(mp4Uri);
  return mp4Response.arrayBuffer();
}
```

ArrayBuffer is actually the binary representation of the `.mp4` files. lets modify our `getMp4Data` so that it does some parsing on the array buffer.

```javascript
async function getMp4Data(mp4Uri) {
  const mp4Response = await fetch(mp4Uri);
  const arrayBuffer = await mp4Response.arrayBuffer();
  const modifiedArrayBuffer = parseMP4(arrayBuffer);
  return modifiedArrayBuffer;
}
```

Now we can define our function `parseMP4` where we will manipulate the binary data before appending it into source buffer for playback. But what can we do?

## ISOBMFF

... Give introduction about ISOBMFF ...

We have observed already that `.mp4` are composed of binary data, and represented as `ArrayBuffer` in javascript. Moreover, the binary data is actually split in boxes, and the boxes represent media metadata. The metadata usually contains important information such as what are the codecs, duration of the segment, etc. All of this metadata is specified using the MPEG standard. There are lots of different boxes. Let's start with the most simple one, the basic box.

## Parsing basic mp4 box

Each box first 8 bytes are the box header. The first 4 bytes are the size of the box and the next 4 bytes are the box name, like follows:

```javascript
class Box {
  size: number;
  name: string;
}
```

That looks simple enough, but how do we extract it from `ArrayBuffer`? Let's write the `parseMP4` method.

```javascript
function parseMP4(arrayBuffer) {
  const offset = 0;

  const view = new DataView(arrayBuffer);

  return arrayBuffer;
}
```

In javascript, `ArrayBuffer` object is not very easy to use. It makes sense since it is a primitive. For that reason, we can use `DataView` which is a wrapper of `ArrayBuffer` that allows to access binary data on any offset and in any format.

We have said before that first 4 bytes are the size of the box. 4 bytes are 32 bits. We can access them as follows:

```javascript
const view = new DataView(arrayBuffer);
const boxSize = view.getUint32(offset, /* Big Endian */ false);
```

The `getUint32` method gets the Uint32 value at the specified byte offset from the start of the view. since we did not provide an `offset`, the default is 0. The binary unsigned integer is treated as big endian by default, but we still explicitly set it just for better reading. You can go ahead and print the box size which should be 40 bytes for each segment.

Next 4 bytes are the box name. The name is a string and it is composed of characters. Each character is 1 byte which is 8 bits. We can get each of the chars bytes with the following code:

```javascript
view.getUint8(offset + 4);
view.getUint8(offset + 5);
view.getUint8(offset + 6);
view.getUint8(offset + 7);
```

Finally, let's convert it from char code into string:

```javascript
const boxType = String.fromCharCode(
  view.getUint8(offset + 4),
  view.getUint8(offset + 5),
  view.getUint8(offset + 6),
  view.getUint8(offset + 7)
);
```

In this demo there are 4 segments, wherein the first one is initialization segments. According to the initialization segment structure, it's box name is `ftyp`. The media segment box name is `styp`. You can go ahead and check this by printing:

```javascript
console.log(`Box Type: ${boxType}, Box Size: ${boxSize}`);
```

Now the size is 40 bytes, and we have parsed the first 8 bytes. How do we get information from the remaining 32 bytes? This depends on the box type. But let's continue and parse our boxes - the `ftyp` and `styp`.

## Parsing ftyp box

Parsing box header was easy. Let's parse `ftyp` box. `ftyp` stands for File Type Box and it comes in the audio and video initialization segments. The data in that box usually contains the information for video element to know how to decode the incomming segments.

```javascript
if (boxType === "ftyp") {
  parseFtypBox(view, offset, boxSize);
}
```

And let's parse the `ftyp` box. According to definition, File Type Box contains `majorBrand`, `minorBrand` and `compatibleBrands` properties:

```javascript
class FileTypeBox extends Box {
  majorBrand: string; // 32 unsigned bit
  minorBrand: string; // 32 unsigned bit
  compatibleBrands: string[]; // 32 unsigned bit []
}
```

So we have parsed our box already and we know that it has 40 bytes, where first 8 we already parsed.

```javascript
// Function to parse the "ftyp" box
function parseFtypBox(view, offset, boxSize) {
  // The first 8 bytes are already parsed in the main loop
  offset += 8;
  const majorBrand = String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3)
  );
  offset += 4;

  const minorVersion = view.getUint32(offset);
  offset += 4;

  console.log(`Major Brand: ${majorBrand}`);
  console.log(`Minor Version: ${minorVersion}`);
}
```

And now we have parsed another 8 bytes, total of 16 bytes. The remaining 16 bytes contain array of compatibleBrands of 4 bytes. So we can write it as a cycle.

```javascript
// Read the compatible brands (if any)
while (offset < boxSize) {
  const compatibleBrand = String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3)
  );
  offset += 4;
  console.log(`Compatible Brand: ${compatibleBrand}`);
}
```

Now we have parsed full `ftyp` box. According to specification, the initialization segment contain also a `moov` box.

## Parsing Movie Box - moov

Movie box is a mandatory one and must be exactly one box. It contains other boxes that have the metadata about the presentation. Of course as any other box, it has first 8 bytes for header, specifying size and name

```javascript
class MOOV extends Box {
  // Contains other boxes
}
```

How do we parse this box? Simply, once the `ftyp` box is parsed, the box right after it is the `moov`. Let's modify our `parseMP4` to get the `moov` box.

```javascript
function parseMP4(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  let offset = 0;

  while (offset < view.byteLength) {
    const boxSize = view.getUint32(offset);
    const boxType = String.fromCharCode(
      view.getUint8(offset + 4),
      view.getUint8(offset + 5),
      view.getUint8(offset + 6),
      view.getUint8(offset + 7)
    );

    console.log(`Box Type: ${boxType}, Box Size: ${boxSize}`);

    if (boxType === "ftyp") {
      parseFtypBox(view, offset, boxSize);
    } else if (boxType === "moov") {
      parseMoovBox(view, offset, boxSize);
    }

    offset += boxSize;
  }
}
```

As you noticed, we have wrapped the parsing of box type and size in a cycle, and we can jump into the next box. We know from specification, that after `ftyp` there is always `moov` box.

Lets define `parseMoovBox`:

```javascript
// Function to parse the "moov" box
function parseMoovBox(view, offset, boxSize) {
  // The first 8 bytes are already parsed in the main loop
  offset += 8;

  // The "moov" box may contain nested boxes like "mvhd" (movie header), "trak" (track), etc.
  while (offset < boxSize) {
    const subBoxSize = view.getUint32(offset);
    const subBoxType = String.fromCharCode(
      view.getUint8(offset + 4),
      view.getUint8(offset + 5),
      view.getUint8(offset + 6),
      view.getUint8(offset + 7)
    );

    console.log(`Sub-Box Type: ${subBoxType}, Sub-Box Size: ${subBoxSize}`);

    offset += subBoxSize;
  }
}
```

As you noticed, `moov` box contains other boxes, so it is a container box. First box is the `mvhd` - movie header. Let's parse this one.

## Parsing Movie Header Box - mvhd

This is a box that contains metadata about full media representation. It contains data such as the creation and modification time, the total duration of the media, timescale, initial play rate and the initial volume.

Let's parse this box. It is a sub box of the `moov` box, so

```javascript
function parseMoovBox(view, offset, boxSize) {
    ...
    if (subBoxType === 'mvhd') {
      parseMvhdBox(view, offset, subBoxSize);
    }
    ...
}

```

Note that from specification, `mvhd` box is a Full Box, its initial bytes are organized as a Full Box:

```javascript
class FullBox extends Box {
  version; // 8 unsigned bit
  flags; // 24 unsigned bit
}
```

The version can be 0 or 1, and different versions signal that the box's data is parsed differently. If the version is 0, the data fields are 4 bytes each. If the version is 1, the data fields are 8 bytes each.

The next 3 bytes are reserved and typically set to 0.

In `mvhd` box, all the data is contiguos, we can write the `parseMvhdBox` as follows:

```javascript
// Function to parse the "mvhd" (movie header) box
function parseMvhdBox(view, offset, boxSize) {
  // The first 8 bytes are already parsed in the main loop
  offset += 8;

  // The "mvhd" box has a version and flags field (8 bytes)
  const version = view.getUint8(offset);
  offset += 4; // Skip 3 reserved bytes
  const creationTime = view.getUint32(offset);
  offset += 4;
  const modificationTime = view.getUint32(offset);
  offset += 4;
  const timeScale = view.getUint32(offset);
  offset += 4;
  const duration = view.getUint32(offset);
  offset += 4;

  // Preferred rate (4 bytes)
  const preferredRate = view.getUint32(offset) / 0x10000; // Fixed-point value
  offset += 4;

  // Preferred volume (2 bytes)
  const preferredVolume = view.getUint16(offset) / 0x100; // Fixed-point value

  console.log(`Version: ${version}`);
  console.log(`Creation Time: ${creationTime}`);
  console.log(`Modification Time: ${modificationTime}`);
  console.log(`Time Scale: ${timeScale}`);
  console.log(`Duration: ${duration}`);
  console.log(`Preferred Rate: ${preferredRate}`);
  console.log(`Preferred Volume: ${preferredVolume}`);
}
```

## Parsing styp box

Parsing `styp` box very pretty simillar to `ftyp` box since it has the same size.

## Parsing Movie Fragment Box - moof

Similar to `moov` box, the `moof` contains the metadata for the fragment box. It was actually introduced later and allowed to split the track (audio, video and text) into fragments so that on each media segment `.mp4` file there must be one `moof` box which provides the metadata for the segment. It is a parent box which contains other boxes - Movie Fragment Header - `mfhd` and Track Fragment - `traf`.

```javascript
// Function to parse the "mfhd" (movie fragment header) box
function parseMfhdBox(view, offset, boxSize) {
  // The first 8 bytes are already parsed in the main loop
  offset += 8;
  const sequenceNumber = view.getUint32(offset);
  offset += 4;

  console.log(`Sequence Number: ${sequenceNumber}`);
}

// Function to parse the "traf" (track fragment) box
function parseTrafBox(view, offset, boxSize) {
  // The first 8 bytes are already parsed in the main loop
  offset += 8;

  // The "traf" box may contain nested boxes specific to the track fragment.
  // You can add parsing logic for sub-boxes within the "traf" box here.

  while (offset < boxSize) {
    const subBoxSize = view.getUint32(offset);
    const subBoxType = String.fromCharCode(
      view.getUint8(offset + 4),
      view.getUint8(offset + 5),
      view.getUint8(offset + 6),
      view.getUint8(offset + 7)
    );

    console.log(`Sub-Box Type: ${subBoxType}, Sub-Box Size: ${subBoxSize}`);

    // Add specific parsing logic for sub-boxes here if needed.

    offset += subBoxSize;
  }
}

// Function to parse the "moof" (movie fragment) box
function parseMoofBox(view, offset, boxSize) {
  // The first 8 bytes are already parsed in the main loop
  offset += 8;

  while (offset < boxSize) {
    const subBoxSize = view.getUint32(offset);
    const subBoxType = String.fromCharCode(
      view.getUint8(offset + 4),
      view.getUint8(offset + 5),
      view.getUint8(offset + 6),
      view.getUint8(offset + 7)
    );

    console.log(`Sub-Box Type: ${subBoxType}, Sub-Box Size: ${subBoxSize}`);

    if (subBoxType === "mfhd") {
      parseMfhdBox(view, offset, subBoxSize);
    } else if (subBoxType === "traf") {
      parseTrafBox(view, offset, subBoxSize);
    }

    offset += subBoxSize;
  }
}
```

## Parsing Mdat box

Finally, Mdat box stands for media data. It is where the actual audio and video data is. You will rarely see them being parsed since they are usually played by video players. But here just for fun, we will parse the mdat box, and extract the media data and play it in video element.

```javascript
// Function to parse the "mdat" (media data) box
function parseMdatBox(view, offset, boxSize) {
  // The first 8 bytes are already parsed in the main loop
  offset += 8;

  // The remaining bytes of the "mdat" box contain the media data.
  const mediaData = new Uint8Array(view.buffer, offset, boxSize - 8);

  // You can process the media data here. For example, you can log its size or
  // perform additional processing, such as sending it to a media player.

  console.log(`Media Data Size: ${mediaData.length} bytes`);

  // If needed, you can process the binary media data further.

  // Note: If you plan to play the media, you would typically need to use a
  // media player library (e.g., HTML5 video/audio player) to handle the media data.

  // If the media data is a video or audio sample, it should be passed to a player
  // or decoder for rendering/playback.

  const videoForMdat = document.createElement("video");
  videoForMdat.style.width = "640px";
  videoForMdat.setAttribute("controls", "");
  document.getElementsByTagName("body")[0].appendChild(videoForMdat);

  // Example: Display video frames in an HTML5 video element
  const videoBlob = new Blob([mediaData], { type: "video/mp4" });
  videoForMdat.src = URL.createObjectURL(videoBlob);
}
```

## Validating data

How do we know that the data that we are reading from the bytes is correct? One thing you can do if you have the original `.mp4` file available, you can probe it with `ffprobe`. If you haven't yet installed it, go ahead and install `ffprobe`. Now inspect the file metadata using the tool:

```sh
ffprobe BigBuckBunny.mp4
```

The output should be simillar to below:

```sh
...

Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'BigBuckBunny.mp4':
  Metadata:
    major_brand     : mp41
    minor_version   : 0
    compatible_brands: iso8isommp41dashavc1cmfc
    creation_time   : 2023-07-21T13:49:00.000000Z
  Duration: 00:00:10.00, start: 0.000000, bitrate: 3428 kb/s
  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(progressive), 1920x1080 [SAR 1:1 DAR 16:9], 2798 kb/s, 60 fps, 60 tbr, 15360 tbn (default)
    Metadata:
      creation_time   : 2023-07-21T13:49:00.000000Z
      handler_name    : VideoHandler
      vendor_id       : [0][0][0][0]
      encoder         : AVC Coding

```

## Summary

... write a summary ...

[Full code available in this repository](link-to-repository). Happy coding!

## References

- https://www.ramugedia.com/mp4-container
- https://www.w3.org/TR/mse-byte-stream-format-isobmff/
- shttps://observablehq.com/@benjamintoofer/iso-base-media-file-format
- https://dev.to/alfg/a-quick-dive-into-mp4-57fo
