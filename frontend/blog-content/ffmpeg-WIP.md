## Create black screen video

-f lavfi -t 5 -i color=c=black:s=1280x720:r=30: Generates a 5-second black screen video using the lavfi filter.
-t 5: Sets the duration of the output video to 5 seconds.
-c:v libx264: Specifies the H.264 codec for video compression.
-pix_fmt rgba: Sets the pixel format to yuv420p.
-y black_screen.mp4: Specifies the output file name as "black_screen.mp4."
This command will create an MP4 video with a black screen and a short duration. Keep in mind that this video file will still be encoded, but it will contain black frames, which might serve your purpose for having a black screen in MP4 format.

-pix_fmt:

- rgba
- rgb24

```sh
ffmpeg -f lavfi -t 5 -i color=c=black:s=1280x720:r=30 -t 5 -c:v libx264 -pix_fmt rgba -y black_screen.mp4
```

## Decode Video File Into Images

Make sure to match the pixel format of the PNG file which is typically RGBA. Also do not provide codec information, otherwise you may push encoded bytes into png file which will essentially corrupt it.

```sh
ffmpeg -i black_screen.mp4 -pix_fmt rgba ./pngs/output_%03d.png
```

## Encode png images back into video

To encode png file back into video, we are going to need to specify 3 main properties:

- framerate - how many frames/images there should be per second. We should set 30 for this demo
- codecs - we will be using H.264 video codec, which is common for mp4 files
- pixel format - to make video understand how to draw each pixel from binary data. PNG use RGBA, however, it is common to convert RGBA to YUV:4:2:0 pixel format. This will bring advantage of better video compression.

Let run it:

```sh
ffmpeg -framerate 30 -i ./pngs/output_%03d.png -c:v libx264 -pix_fmt yuv420p  black_screen.mp4
```

Lets validate that everything went ok using `ffprobe`

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

5 seconds, 30 fps, h264 and yuv420p.

We can still reencode the video in a way that it uses RGBA

```sh
ffmpeg -i black_screen.mp4 -vf format=rgba black_screen_rgba.mp4
```

Let's play it

https://github.com/Kagami/ffmpeg.js/
https://www.npmjs.com/package/ffmpeg.js

### Preparing Segments with Ffmpeg

For the demonstration, we will use ffmppeg to split a source file into multiple segments of 2 seconds, although many real-world streaming apps will do 2s segments and separation of video. We know our video is 10 seconds long, so we should split it into 5 two second segments.

First, make sure to create a folder: `mkdir segments`. Then run ffmpeg to split video into segments.

```sh
ffmpeg -ss 00:00:00 -t 00:00:02 -i BigBuckBunny.mp4 -acodec copy -vcodec copy ./segments/BigBuckBunny_1.mp4
ffmpeg -ss 00:00:02 -t 00:00:02 -i BigBuckBunny.mp4 -acodec copy -vcodec copy ./segments/BigBuckBunny_2.mp4
ffmpeg -ss 00:00:04 -t 00:00:02 -i BigBuckBunny.mp4 -acodec copy -vcodec copy ./segments/BigBuckBunny_3.mp4
ffmpeg -ss 00:00:06 -t 00:00:02 -i BigBuckBunny.mp4 -acodec copy -vcodec copy ./segments/BigBuckBunny_4.mp4
ffmpeg -ss 00:00:08 -t 00:00:02 -i BigBuckBunny.mp4 -acodec copy -vcodec copy ./segments/BigBuckBunny_5.mp4
```

- The `-ss` means starting time
- `-t` the duration since the starting time, so it is always 2 seconds
- `-acodec` is the filter to treat audio codec. Since our video has no audio, it could be skipped, but for completeness here we show this one
- `-vcodec` is the filter to treat video codec. Copy means to copy this codec same as before
- `-i` is for the input file
- and finally we are giving the output destination in the end of the command

Now running all the commands above should give us 5 independently playable segments. Note, in the real-world scenario, we could run the above using `for` loop until the video reaches the end.
