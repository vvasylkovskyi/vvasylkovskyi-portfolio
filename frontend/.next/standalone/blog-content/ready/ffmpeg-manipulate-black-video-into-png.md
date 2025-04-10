# Decoding Video Using FFmpeg: A Journey Into the World of Video Manipulation

Welcome to the new tutorial about video processing. Today we are going to have some fun with video conversions. Some time ago I went down into a rabit hole about how to manipulate video binary data in a way to change the video, and I ended up writing a script that creates a black video from void and converts it into the images - decoding the video.

I found it insigtful to share, since by manipulating video and frames, we can learn alot about how decoders work, and how the video actually is played. Let's get started.

## The Essence of Video: An Illusion of Movement

At its core, a video is simply a sequence of images displayed in rapid succession. These individual images are known as frames, and every video is characterized by a specific number of frames per second (FPS). If we dig deeper, each video frame is composed of pixels. For instance, in a video with dimensions of 1280 pixels in width and 720 pixels in height, each frame consists of a whopping 921,600 pixels. Each pixel, depending on its color representation, is composed of several bytes, with one of the most common color schemes being RGBA. In the RGBA scheme, each pixel is painted using four bytes: one each for red, green, blue, and alpha (representing opacity on a scale from 0 to 1). Each byte comprises 8 bits, the most elemental unit of data that can either be a 0 or a 1.

But let's prove that a video is indeed a sequence of images by creating a black video: a 5-second video comprised of frames, with each pixel painted in black.

## Creating a Black Video with FFmpeg

To craft a static 5-second video adorned with black frames, we turn to the versatile FFmpeg:

```sh
ffmpeg -f lavfi -t 5 -i color=c=black:s=1280x720:r=30 -t 5 -c:v libx264 -pix_fmt rgba -y black_screen.mp4
```

Let's dissect the command:

- `-f lavfi -t 5 -i color=c=black:s=1280x720:r=30`: This generates a 5-second black screen video using the lavfi filter.
- `-t 5`: Specifies the duration of the output video as 5 seconds.
- `-c:v libx264`: Chooses the H.264 codec for video compression.
- `-pix_fmt rgba`: Sets the pixel format to yuv420p.
- `-y black_screen.mp4`: Names the output file "black_screen.mp4."

To confirm the success of our endeavor, we can use `ffprobe`:

```sh
ffprobe black_screen.mp4;
```

The output reveals that it's a 5-second video with 30 FPS, encoded in H.264, and with a pixel format of yuv420p. Everything checks out as expected.

## Decoding Video Files into Images

Beneath the surface, video players must decode video files before playing them. The decoding process takes the video file (in this case, a .mp4 file) and utilizes a known compression algorithm (such as H.264 for video) to transform it into raw images, which can then be visualized.

Before proceeding, create a folder to store the decoded images: `mkdir black-images`.

While decoding, ensure that the pixel format matches the PNG file, which is typically RGBA. Do not provide codec information to avoid corrupting the PNG file with encoded bytes:

```sh
ffmpeg -i black_screen.mp4 -pix_fmt rgba ./black-images/output_%03d.png
```

Given that our video is 5 seconds long and contains 30 frames per second, this command should yield 150 images in PNG format.

## Encoding Video Using Raw Images

Just as we decoded a video into images, we can logically perform the reverse operation: encoding a set of images into a video. The images we previously generated can be converted into an .mp4 file, encoded with H.264.

To encode the PNG files back into a video, we must specify three key properties:

- **Framerate**: Set it to 30 for this demonstration.
- **Codecs**: We will utilize the H.264 video codec, common for .mp4 files.
- **Pixel Format**: To instruct the video player how to draw each pixel from binary data, convert RGBA to YUV:4:2:0 pixel format. This enhances video compression.

Execute the command:

```sh
ffmpeg -framerate 30 -i ./black-images/output_%03d.png -c:v libx264 -pix_fmt yuv420p black_screen.mp4
```

Again, validate the result with `ffprobe`:

```sh
ffprobe black_screen;

>>>

Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'black_screen.mp4':
  Metadata:
    major_brand     : isom
    minor_version   : 512
    compatible_brands: isomiso2avc1mp41
    encoder         : Lavf57.83.100
  Duration: 00:00:05.00, start: 0.000000, bitrate: 15 kb/s
    Stream #0:0(und): Video: h264 (High) (avc1 / 0x31637661), yuv420p, 1280x720 [SAR 1:1 DAR 16:9], 10 kb/s, 30 fps, 30 tbr, 15360 tbn, 60 tbc (default)
```

The output should confirm the video's properties: 5 seconds in duration, 30 FPS, encoded in H.264, and using the yuv420p pixel format.

## Summary

In our journey through video manipulation, we've discovered the fundamental building blocks of video—frames, pixels, and the magic of encoding and decoding. We've gone from a blank canvas to a black screen. This adventure has unraveled the enchanting world of video processing, offering insights into the technology that powers our screens.

## References

- [FFmpeg](https://ffmpeg.org/ffmpeg.html)
