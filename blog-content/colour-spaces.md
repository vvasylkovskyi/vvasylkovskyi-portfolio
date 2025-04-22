# Video Codecs - encoding media

A fast and reliable delivery of video or audio streams requires that actual data is compressed in codecs. A Codec is a compression format of video data. Similar to how you would compress _.zip_ files. This article will explore why video needs encoding and experiment by encoding a _.mp4_ file with a ffmpeg encoder.

## Why is video encoding needed?

Compressing video into a smaller size without losing its quality seems like a no-brainer. If the video is big, we can compress (encode), transfer it over the internet, and decompress (decode) it on the other end. But how big is a video file?

Let's think about television nowadays. The latest TVs support 4K streaming. Now, 4K is 2,160 pixels tall and 3,840 pixels wide. Combined, this equals nearly 8.3 million individual pixels. Each pixel is 24 bits (3 bytes) for colour image (one byte for Red, Green and Blue). Each second of a video is usually composed of 30 frames.

Summing all the bytes equals an astonishing number of ~746496000 bytes!

```
2160 * 3840 * 30 * 3 = 746496000 bytes ~= 74MB
```

Now imagine an entire movie of 1h30 minutes. That's a considerable number. Besides, streaming video on the best networks would be only possible.

Current open standard video codecs allow compression of at least [45%, allowing bandwidth requirements of 32+ Mb/s (instead of 74MB)](https://mammothsecurity.com/blog/what-is-the-storage-difference-between-h264-h265-and-h265).

Another advantage of encoding is the interoperability. As the number of devices capable of streaming video increases, more custom implementations. This means some devices can only decode/playback a specific encoding. Therefore, encoding allows the video to scale to more devices.

## Lets encode

Now that we understand the need for encoding let's go ahead and try to encode a video ourselves.

### Software requirements

One of the best tools for video encoding is [ffmpeg](https://ffmpeg.org/download.html). It is available for all platforms.

Once you have installed ffmpeg, the next thing we will need to encode a video is a raw video stream. Raw video stream, or unencoded video, is typically a .mp4 or .mov containing full video.

You can get a raw video from this repository - https://gist.github.com/jsturgis/3b19447b304616f18657. A famous [Big Buck Bunny](http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4) will work perfectly for our demonstration.

## Encoding in H264

We will encode our [Big Buck Bunny](http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4) using H.264 codecs. Let us create a _encoding-unprotected-video_ folder and place the [Big Buck Bunny](http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4) file into it.

The ffmpeg flag to encode in H.264 is **libx264**. To encode video - add a _-c:v_ meaning - channel:video. Finally, with the input file being [Big Buck Bunny](http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4) and the output is an arbitrary file name of our choice:

```
ffmpeg -i BigBuckBunny.mp4 -c:v libx264 h264BigBuckBunny.mp4
```

For better compression, ffmpeg allows to specify extra presents. For instance, the best compression possible is also the slowest. We can do it using **-preset veryslow**

```
ffmpeg -i BigBuckBunny.mp4 -c:v libx264 -preset veryslow h264BigBuckBunnyVerySlowPreset.mp4
```

For more options on how to encode video in **H.264**, you can go to official ffmpeg documentation - https://trac.ffmpeg.org/wiki/Encode/H.264

## Results

Let's compare the file size between the original and the resulting H264 encoded video. First, the original [Big Buck Bunny](http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4).

```
encoding-unprotected-video % ls -la BigBuckBunny.mp4
-rw-r--r--  1 ******  ****  158008374 Sep  3 19:08 BigBuckBunny.mp4
```

And now, both files, including the compressed files.

```
-rw-r--r--  1 ****  ****  158008374 Sep  3 19:08 BigBuckBunny.mp4
-rw-r--r--  1 ****  ****  124570157 Sep  3 19:14 h264BigBuckBunny.mp4
-rw-r--r--  1 ****  ****  114502772 Sep  3 19:21 h264BigBuckBunnyVerySlowPreset.mp4
```

## Conclusion

In this tutorial, you have seen how to encode video and why video encoding is needed.

We have explored only a tiny tip of the iceberg. Video Encoding per se does not make streaming of global streaming leaders such as Netflix or Disney. Explore how video encoding is used in video pipelines in the following articles of this video blog.

I hope you enjoyed reading and that this tutorial will be helpful in your following projects!
