# Encrypting content with clear key

While clear key is an EME accepted [Common Key System](https://www.w3.org/TR/encrypted-media/#common-key-systems), it is not as secure as Widevine, Playready or Fairplay in production because it doesn't ensure secure keys distribution.

One may think why would we use a clear key for DRM if it is not secure. While it is not secure in production, some test environments can benefit from DRM using clear key algorithm as the underlying player technology and EME remain similar behavior Widevine.

Given the above motivation, last few days I have been trying to implement Widevine DRM for test purposes and it ended up being just too dificult. So I made a step back and implemented DRM using clear key. Here is how.

## Clear Key DRM Journey

Full demonstration for clear key DRM encryption has the following steps:

1. Creation of the media content, Creation of the keys to encrypt media content, Encryption and packaging of the media content.
2. Playing back encrypted media using ClearKey key system.

Lets go through each steps in detail.

## Encrypting and Packaging Media

You can obtain raw video from anywhere in the internet in an **.mp4** format. For demonstration we already have a video that we are going to encrypt. Usually you would get a video and an audio file but this would only complicate our demonstration since you would simply need to duplicate the number of keys for each content type.

I based alot of my research on [Dash Industry Forum - Generate MPEG-DASH Content encrypted with ClearKey](https://github.com/Dash-Industry-Forum/dash.js/wiki/Generate-MPEG-DASH-content-encrypted-with-MPEG-CENC-ClearKey). Some of the changes I have made is the use of [Shaka Packager](https://shaka-project.github.io/shaka-packager/html/tutorials/raw_key.html) to package and encrypt media. It made sense since we are going to playback the encrypted content in [Shaka Player](https://shaka-player-demo.appspot.com/docs/api/index.html). Both are web standards for packaging content and for playing it back on web.

Lets get back to it. So, first you are going to have to get shaka packager.

Next, we are going to create some keys. You can go ahead and make some, or for test we can just use the keys from the research above. For shaka packager to encrypt with clear key we are goint to need a key and a keyId:

- key: 87237D20A19F58A740C05684E699B4AA
- key ID: A16E402B9056E371F36D348AA62BB749

Shaka and Dash like keys in base64. So we are going to convert them.

- key: 87237D20A19F58A740C05684E699B4AA -> hyN9IKGfWKdAwFaE5pm0qg
- kid: A16E402B9056E371F36D348AA62BB749 -> oW5AK5BW43HzbTSKpiu3SQ

Now that we have our encryption keys, we can encrypt content using shaka packager.

```
packager \
  input==$MEDIA_FOLDER/glocken_2g_gprs_240p.mp4,stream=video,output==$MANIFESTS_FOLDER/glocken_2g_gprs_240p__clearKey_encrypted.mp4 \
  --enable_fixed_key_encryption \
  --keys label=SD:key_id=A16E402B9056E371F36D348AA62BB749:key=87237D20A19F58A740C05684E699B4AA \
  --mpd_output $MANIFESTS_FOLDER/glocken_2g_gprs_240p__clearKey_encrypted.mpd

```

What does this do?

1. Input - the media to process. In our case, shaka packager is encrypting and packaging the input file - video.
2. Output - place where to put the processed media
3. enable_fixed_key_encryption signals the use of the clear key
4. Label - SD is simply a label for the input file. Note here we assign keys to the media labeled as SD. Since there is only 1 media, naturally shaka packager assigns label SD to the video
5. mpd_output - the packaging step of shaka. Once the video is encrypted and output file is produced. In the end shaka packager generates an DASH manifest which includes all the information necessary for shaka player to handle the playback.

As a result we should have 2 files as output: **glocken_2g_gprs_240p**clearKey_encrypted.mp4** and **glocken_2g_gprs_240p**clearKey_encrypted.mpd**.

## Playing back the encrypted content on Shaka Player.

For the above keys and the manifest, the video will only play if shaka contains the correct keys.

In practice it is a relatively simple to tell shaka what keys to use. All we need to do is initialize Shaka player with the following DRM configuration.

```
    drm: {
        servers: {
            'org.w3.clearkey': {
                clearkeys: {
                    oW5AK5BW43HzbTSKpiu3SQ: 'hyN9IKGfWKdAwFaE5pm0qg',
                },
            },
        },
    },
```

As you can see the key is stored in the client itself, so anyone could come and pick the key from the source code. Thus it is not secure.

## Details of how CDM works

While clear key is not secure, it teaches us how CDM works since most of the DRM steps on the client remain the same. Widevine or other DRM provider simply improve DRM by ensuring secure keys distribution.

Actually _@Sanjuc_ has a github repository exemplifying step by step of how the keys are handled to CDM in the EME - https://github.com/sanjuc/clear-key/blob/master/script/main.js.

In short - here is what happens:

1. By ensuring that the DRM key system we want to use is _'org.w3.clearkey'_, DRM will execute **navigator.requestMediaKeySystemAccess('org.w3.clearkey', config')** which will provide a Media Key System Access object.
2. Media Key System Access will create Media Keys object: **keySystemAccess.createMediaKeys()**
3. At this point, Media Keys can be assigned to the media player: **html5video.setMediaKeys(createdMediaKeys)**
4. Media Keys will create a keySession which is also known as CDM. **keySession = mediaKeys.createSession();**
5. Finally, A Player will call CDM update method and provide a license/key to it which will then handle the decryption of the media.

```
var license = te.encode('{"keys":[{"kty":"oct","k":"hyN9IKGfWKdAwFaE5pm0qg","kid":"oW5AK5BW43HzbTSKpiu3SQ"}],"type":"temporary"}');
    keySession.update(license).catch(
        function (error) {
            console.error('Failed to update the session', error);
        }
    );
```

Note above that the CDM expects to receive keys in the above format specifically for clearKey EME implementation - https://www.w3.org/TR/encrypted-media/#clear-key-request-format-example. It also needs to be stringified and encoded.

## How is it useful?

In a real work example, Shaka Player expects to use a license proxy which would handle the license/key for it to pass to the CDM for content decryption. Therefore, clearkeys cannot be simply stored in shaka player.

So the question is... it all useless? It depends. Remember, CDM behaves always the same, not matter if it is being accessed by Shaka Player, or directly from the browser. Similarly, Shaka Player behaves always the same - no matter if we will use Widevine, PlayReady or ClearKey.

So imagine if we implement ClearKey in the following way:

```
    drm: {
        servers: {
            'org.w3.clearkey':
                'https://viktor.clients.dev.peacocktv.com:4443/acquirelicense',
        },
    },
```

Looks familiar? This is the same as implementation of the DRM Widevine or playready, which look like the this:

```
    drm: {
        servers: {
            'com.widevine.alpha':
                'https://cwip-shaka-proxy.appspot.com/no_auth',
        },
    },
```

Furthermore, we can recreated a license proxy using clear key and serve DRM protected content without need for DRM provider. Why would you want that? Integration tests or maybe Client-app tests.

## Initial Playback is playing in clear even without keys

The behavior you're describing is likely due to the design of the Encrypted Media Extensions (EME) specification, which allows for a so-called "clear" or unencrypted initial playback period. The ability to play video content immediately without providing keys is intentional and can be seen as a usability feature. Here's why this happens:

User Experience: EME is designed to ensure a smooth user experience. If a user navigates to a page with encrypted media content, they should be able to start playback right away, rather than waiting for the decryption keys to be obtained, which might take some time. This is especially important for streaming services and other video platforms where quick playback is expected.

Unencrypted Period: EME allows for an initial unencrypted playback period. During this period, the video player can begin streaming and displaying content to the user. This period is typically set by the content provider and is intended to be long enough to allow for the acquisition of decryption keys.

Content Protection: EME also defines a mechanism for obtaining decryption keys. The MediaKeys object is used to request and obtain these keys, typically from a license server. Once the keys are obtained, the encrypted media can be decrypted and displayed.

Progressive Enhancement: EME is designed to provide a level of progressive enhancement. This means that if EME is not supported in the user's browser, the content can still be played, albeit in the clear, without encryption. However, if EME is supported, encryption and content protection can be applied.

To summarize, the behavior you're observing is by design to ensure a smooth and user-friendly experience. The content will play unencrypted until the decryption keys are obtained and applied through the MediaKeys mechanism. This allows for quick playback and ensures that users don't experience unnecessary delays when accessing encrypted media content.

## Documentation

- https://www.w3.org/TR/encrypted-media/#clear-k ey-license-format
- https://github.com/Dash-Industry-Forum/dash.js/wiki/Generate-MPEG-DASH-content-encrypted-with-MPEG-CENC-ClearKey
- https://medium.com/swlh/how-to-play-mpeg-dash-encrypted-protected-content-using-encrypted-media-extensions-eme-in-browser-234f49fdc706
- https://license.uat.widevine.com/cenc/getlicense/widevine_test
- https://shaka-project.github.io/shaka-packager/html/tutorials/widevine.html#examples
