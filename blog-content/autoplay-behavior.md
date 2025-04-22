# Autoplay

### Ensure video don't overflow containers

It is a good idea to make sure that your video does not overflow. I suggest adding a container HTML to your video, and contain it inside it as follows:

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

You should see your video like following:

![Alt text](video_not_playing.png)

## Making Video Play

Our video is rendered as image and isn't actually playing because we did not explicitly activate playback. The browser autoplay policy actually prevents that. I am not going to dive in much into that, there is a great article on autoplay policy for a curious reader - https://developer.chrome.com/blog/autoplay/. Essentially browsers implement tree rules for autoplay:

- Never Auto-Play
- Stop Media with Sound
- Allow All Auto-Play

So to play a video, we need to be explicit about it. One way of doing so is by using video element built-in controls. We can add them by adding a **controls** tag.

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

Then a familiar playback UI will overlay on top of the video element. Another common way is to allow video autoplay by itself. This can be done by adding an **autoplay** attribute. If the video.

As I mentioned before, some browsers will not playback due to autoplay policy. Most of mobile devices will add an autoplay button to encourage user interaction. Once toggled, the content plays.

However, on Desktop we will need to use controls, or our custom play button to start playback. There are no muchways to circumvent the autoplay policy. One way is by adding a **muted** attribute to allow videos without sound to play. The obvious drawback of this trick is the video being muted now.

![Alt text](iOS-user-interaction-play.png)

Full list of attributes can be found here - https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video
