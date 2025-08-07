# DRM playback on Web - Encrypted Media Extensions (EME)

In the previous article we delved into playback using MSE and MPEG-DASH protocol with multiple bitrate-videos. I highly recomment you to start reading previous article [link to the prev article] in case you haven't yet, as this article is building up over the previous one.

In this article, we are going to enhance our MSE player playback with an Encrypted Media Extensions (EME) standard - a web spec that allows playback of encrypted content. Lets get to it

## What is DRM ?

... Give an introduction about DRM ...

## What is EME ?

... Give an introduction about EME ...

## Setup

Lets setup our project. You can download full base project from my [github repository](https://github.com/vvasylkovskyi/barebones-mse-playback-with-multi-renditions), or start you own from scratch.

In case you choose to start a new project, and you want to follow up, we are going to be using a simple webpack dev server. You can read more details on the setup in this article [link to webpack setup article].

## Prepare Media

As always, before diving into adding new building block, we need to prepare our media. For this demonstration we are going to use the `BigBuckBunny.mp4`, convert it into four renditions of different bitrates, and split it into segments of 2 seconds. Also we are going to encrypt all our segments with a ClearKey encryption.

Naturally, encrypting anything requires a set of encryption keys. So lets create some keys

## Encryption

Our media is ready to be encrypted. First lets define some of the parameters in our encryption process:

- key: The actual encryption key. This is a secret
- kid: The Key ID which is public and references our secret key

Both **key** and **kid** are 16 bytes and they can be expressed in hexadecimal format.

### Creating Encryption Keys

For this tutorial we are going to use [OpenSSL](https://www.openssl.org/) to create key. ... Talk about OpenSSL ....

To create a key just run on a terminal.

```sh
openssl rand -hex 16
```

As you probably guessed from the comand above, we have just created a random hexadecimal string of 16 bytes. Pick up the key and save it for later.

Now let's create a kid using the same command. Save the kid somewhere, we are going to need it soon. For the sake of simplicity, in case you have any trouble with openssl, I will leave a demo `key` and `kid` bellow:

- key: 87237D20A19F58A740C05684E699B4AA
- kid: A16E402B9056E371F36D348AA62BB749

### Encrypting content with shaka packager

Now that we have our encryption keys, and our content is prepared, let's encrypt it using the keys.

```sh
packager in=./source/BigBuckBunny_160x90_250k.mp4,stream=video,init_segment='./segments/160x90_250k/BigBuckBunny_0.mp4',segment_template='./segments/160x90_250k/BigBuckBunny_$Number%01d$.mp4' \
    in=./source/BigBuckBunny_320x180_500k.mp4,stream=video,init_segment='./segments/320x180_500k/BigBuckBunny_0.mp4',segment_template='./segments/320x180_500k/BigBuckBunny_$Number%01d$.mp4' \
    in=./source/BigBuckBunny_640x360_750k.mp4,stream=video,init_segment='./segments/640x360_750k/BigBuckBunny_0.mp4',segment_template='./segments/640x360_750k/BigBuckBunny_$Number%01d$.mp4' \
    in=./source/BigBuckBunny_1280x720_1500k.mp4,stream=video,init_segment='./segments/1280x720_1500k/BigBuckBunny_0.mp4',segment_template='./segments/1280x720_1500k/BigBuckBunny_$Number%01d$.mp4' \
    --segment_duration 2 \
    --enable_fixed_key_encryption \
    --clear_lead=2 \
    --keys label=HD:key_id=A16E402B9056E371F36D348AA62BB749:key=87237D20A19F58A740C05684E699B4AA,label=SD:key_id=A16E402B9056E371F36D348AA62BB749:key=87237D20A19F58A740C05684E699B4AA \
    --mpd_output ./segments/BigBuckBunny.mpd
```

You may have noticed that above command is very simillar to the previous with few aditions:

```sh
    --enable_fixed_key_encryption \
    --keys label=SD:key_id=A16E402B9056E371F36D348AA62BB749:key=87237D20A19F58A740C05684E699B4AA
```

- `--enable_fixed_key_encryption` - encrypts content using clearkey scheme
- `--keys label=SD:key_id=A16E402B9056E371F36D348AA62BB749:key=87237D20A19F58A740C05684E699B4AA` - is to indicate to our packager what are the keys that we want to use to encrypt the content. The `label` refer to the piece of the stream to encrypt. In our case there are several renditions, among which there are `HD` (High Definition) and `SD` (Standard definition) name for the **key_id** and **key** pairs. I called the `SD` because we are encrypting video, and SD means standard definition which represents the video quality - 720p.
- `--keys label=SD:key_id=A16E402B9056E371F36D348AA62BB749:key=87237D20A19F58A740C05684E699B4AA` - is to indicate to our packager what are the keys that we want to use to encrypt the content. The `label` refer to the piece of the stream to encrypt. In our case there are several renditions, among which there are `HD` (High Definition) and `SD` (Standard definition) name for the **key_id** and **key** pairs.

  Clear lead in seconds if encryption is enabled.
  Shaka Packager does not support partial encrypted segments, all the
  segments including the partial segment overlapping with the initial
  'clear_lead' seconds are not encrypted, with all the following segments
  encrypted. If segment_duration is greater than 'clear_lead', then only the
  first segment is not encrypted.
  Default: 5

When running the command above, shaka packager will produce a manifest with a new section containing information about encryption, simillar to the one bellow:

```xml
      <ContentProtection value="cenc" schemeIdUri="urn:mpeg:dash:mp4protection:2011" cenc:default_KID="a16e402b-9056-e371-f36d-348aa62bb749"/>
      <ContentProtection schemeIdUri="urn:uuid:1077efec-c0b2-4d02-ace3-3c1e52e2fb4b">
        <cenc:pssh>AAAARHBzc2gBAAAAEHfv7MCyTQKs4zweUuL7SwAAAAKhbkArkFbjcfNtNIqmK7dJoW5AK5BW43HzbTSKpiu3SQAAAAA=</cenc:pssh>
      </ContentProtection>
```

## Playing the encrypted content

Lets open our app and try and play. You may notice that playback stays in buffering indefinitely. This is because the media is encrypted and the decryption was not handled as expected by EME standard.

### Decrypting content

Using MPEG-DASH and MSE/EME stack, we can handle decryption in two ways - active or reactive way. Since we are using MPEG-DASH, the manifest comes with the information regarding the content protection. So we can start decrypting video before the video element actually complains that the video is encrypted.

On the other hand, we can listen to `"encrypted"` event from HTML VideoElement. Let's have a look at both approaches.

### Event-based Decrypting content

We can keep everything as before and let our Player Engine start the playback. It will create MediaSource and Source Buffer and start appending video segments. As soon as the video element gets to the part when it should play, it will detect that the media is encrypted and will send the `"encrypted"` event. So let's subscribe to the event.

```javascript
video.addEventListener("encrypted", handleEmeEncryption, false);
```

Lets define our `handleEmeEncryption` in the new file in `src/eme-handler.ts` to keep our Player Engine as simple as possible and to keep adhering to Single Responsabilty Principle [link to single responsability principle].

The

### MPEG-DASH based Decrypting content
