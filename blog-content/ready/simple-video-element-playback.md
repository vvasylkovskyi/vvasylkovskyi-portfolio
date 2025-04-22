# Mastering Video Element Playback

Video playback is a fundamental aspect of modern web development, enriching user experiences and providing a powerful medium for communication. In this comprehensive guide, we'll explore the intricacies of integrating videos into HTML web pages using the versatile `<video>` element. Let's dive deep into the world of web video playback.

## Setting Up the Foundation

Before we embark on our journey through the intricacies of the `<video>` element, let's ensure we have a solid foundation in place. To avoid CORS (Cross-Origin Resource Sharing) issues and serve our HTML file and videos seamlessly, let's set up a basic Express server. Below is a simple `server.js` file to get us started:

```javascript
// server.js
var express = require("express");
var serveStatic = require("serve-static");

var app = express();

app.use(serveStatic(__dirname, { index: ["index.html"] }));

app.listen(4000, function () {
  console.log("CORS-enabled web server listening on port 4000");
});
```

Our `index.html` file is equally straightforward, containing a `<video>` element ready to be filled with captivating content:

```html
<!DOCTYPE html>
<html lang="en">
  <body>
    <div class="video__container">
      <video class="video__element"></video>
    </div>
  </body>
</html>
```

To manage dependencies efficiently, we'll use npm. Create a `package.json` file with `npm init -y` and include the following content:

```json
{
  "name": "video-element-playback",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js"
  },
  "author": "vvasylkovskyi",
  "license": "ISC",
  "dependencies": {
    "express": "^4.18.2",
    "serve-static": "^1.15.0"
  }
}
```

With this foundation in place, running `npm install` installs the required dependencies. You can then launch the server with `npm run start`, making your content accessible at port 4000.

## Preparing Media for Playback

To kickstart video playback, you'll need a video file. Fortunately, there are public test videos available for use, such as those found on this GitHub repository: [Test Videos](https://gist.github.com/jsturgis/3b19447b304616f18657). For this demonstration, we'll be using the Big Buck Bunny MP4 file, which you can access [here](http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4).

## Adding Video to Your Web Page

Now that we have a video file ready, let's proceed with integrating it into our web page. Modern web browsers come equipped with Video APIs that simplify the process for us. Specifically, for HTML, the `<video>` element embeds a media player that supports video playback.

```html
<video>
  <source
    src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    type="video/mp4"
  />
</video>
```

In the example above, we've provided a simple usage of the `<video>` element. Note the inclusion of the `type: video/mp4` attribute, which is optional but helps the browser validate compatibility with the file type. Additionally, you can include multiple `<source>` elements within a `<video>` element, and the browser will attempt to play them in priority order. If a browser doesn't support a particular file type, it will automatically fall back to the next available source.

```html
<video>
  <source
    src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    type="video/mp4"
  />
  <source
    src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.webm"
    type="video/webm"
  />
</video>
```

### Ensuring Your Video Fits Within Containers

It's important to prevent your video from overflowing its containers. To achieve this, consider placing your video inside a container HTML element and constraining its dimensions:

```html
<style>
  .video__element {
    max-width: 100%;
    max-height: 100%;
  }

  .video__container {
    width: 400px;
    height: 400px;
  }
</style>

<div class="video__container">
  <video class="video__element">
    <source
      src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
      type="video/mp4"
    />
  </video>
</div>
```

## Initiating Video Playback

At this point, our video may be rendered as an image and not playing. This is due to the browser's autoplay policy, which prevents automatic playback. To resolve this, we need to explicitly activate playback. There are several approaches:

1. **Using Built-in Controls**: We can add built-in controls to the video element by including the `controls` attribute.

```html
<div class="video__container">
  <video class="video__element" controls>
    <source
      src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
      type="video/mp4"
    />
  </video>
</div>
```

This will overlay a familiar playback UI on top of the video element, allowing users to interact with it.

2. **Using Autoplay**: You can enable video autoplay by including the `autoplay` attribute. However, be aware that browsers have varying autoplay policies. On many mobile devices, an autoplay button may be added to encourage user interaction. Desktop browsers typically require user interaction to start playback. One way to circumvent this policy is by adding the `muted` attribute to allow videos without sound to play. However, the drawback is that the video will be muted.

3. **Custom Controls**: The `<video>` element exposes a media player controls API that can be used to control playback programmatically. For instance:

```javascript
const video = document.getElementsByTagName("video")[0];
video.play(); // Start playback
video.pause(); // Pause playback
```

These approaches provide flexibility in managing video playback, adapting to various browser behaviors.

## Tracking Current Time and Duration

Understanding the current time and duration of a video is crucial for creating interactive video experiences. The `<video>` element provides valuable properties and methods to access and manipulate these aspects.

### Retrieving Current Time and Duration

To retrieve the current time and duration of a video, you can access the `currentTime` and `duration` properties, respectively. Here's how you can do it in JavaScript:

```javascript
const video = document.getElementsByTagName("video")[0];

// Get the current time in seconds
const currentTime = video.currentTime;

// Get the total duration of the video in seconds
const duration = video.duration;
```

With these values, you can display the current playback position and total duration to users.

### Simulating Seeking Behavior

Simulating seeking behavior allows you to jump to a specific point in the video timeline programmatically. To do this, you can set the `currentTime` property to the desired time in seconds. For example, to jump to the 30-second mark:

```javascript
const video = document.getElementsByTagName("video")[0];

// Jump to the 30-second mark
video.currentTime = 30;
```

This approach is particularly useful for implementing custom video controls or interactive features, such as seeking to specific scenes in a video.

## Conclusion

In this article, we've explored the essentials of adding video content to web pages, tracking the current time and duration of a video element, and even simulating seeking behavior. Understanding these properties is essential for creating dynamic video experiences. Additionally, we've seen how to simulate seeking behavior by changing the current time programmatically, opening up possibilities for interactive video applications.

For the full code and resources related to this tutorial, you can visit the [GitHub repository](https://github.com/vvasylkovskyi/barebones-mp4-player). Stay tuned for our next article, where we'll explore even more exciting features and techniques for web video development. Happy coding!
