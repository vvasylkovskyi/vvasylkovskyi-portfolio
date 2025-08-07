# Unlocking Secure Playback: Exploring EME with MSE

In our previous article, we dove into the intricacies of media playback using the Media Source Extensions (MSE) and how to efficiently push segments into a source buffer. If you haven't had the chance to explore it yet, we recommend starting with the [previous article](link to the previous article) as this discussion builds upon those concepts.

In this article, we'll take our MSE player's capabilities to the next level by introducing the Encrypted Media Extensions (EME) standard. EME is a web specification that empowers us to play encrypted content seamlessly. Let's embark on this journey to enhance your understanding of this essential aspect of web media.

## Setting the Stage

Before we delve deeper into EME and its implementation, let's set up our project. You can either download the complete base project from our [GitHub repository](https://github.com/vvasylkovskyi/barebones-mse-playback) or create your own from scratch.

If you opt to start a new project and wish to follow along, we'll be using a straightforward HTTP server. For detailed setup instructions, please refer to our article on [HTTP server setup](link to HTTP server setup article).

## Demystifying Encrypted Playback

If you're already familiar with EME and are eager to see the code in action, you can jump right into the practical demonstration of our basic EME implementation (scroll to the "Prepare Media" section).

There's a wealth of information available on the internet regarding the encryption of video content using MSE, EME, and DRM. Resources like [Securing OTT Content](https://eyevinntechnology.medium.com/securing-ott-content-a941d998ca9a) and [Securing OTT Content — DRM](https://eyevinntechnology.medium.com/securing-ott-content-drm-1af2c08fdd31) provide comprehensive insights into this subject. However, for the purposes of this article, let's start with the basics.

Video encryption typically employs symmetric encryption, with AES encryption in cenc mode being a common choice. EME standardizes how this encryption process should occur, aiming to harmonize encryption across all web devices through the Common Encryption standard. The actual encryption process takes place within a specialized software or hardware module known as the Content Decryption Module (CDM). EME's role is to ensure that the keys are provided correctly to the CDM. Distributing these symmetric keys securely is the responsibility of the Digital Rights Management (DRM) protocol. In our case, we'll utilize ClearKey, the simplest form of DRM. It's worth noting that ClearKey is also the name of a specific CDM, which we must inform our system to use for video decryption.

This introduction may seem like a lot to digest, but it's essential to grasp these fundamentals to understand the code we're about to explore.

## Preparing Your Media

As is customary, before we introduce new components into the mix, we need to prepare our media. For this demonstration, we'll use "BigBuckBunny.mp4" and split it into 2-second segments. All these segments will be encrypted using ClearKey encryption.

Encrypting any content requires a set of encryption keys. So, let's create those keys.

## Encryption Essentials

Our media is now ready for encryption. As discussed earlier, symmetric key encryption is our chosen approach, meaning we need one key for both encryption and decryption.

Let's define some key parameters for our encryption process:

- `key`: The actual encryption key (kept secret).
- `kid`: The Key ID, which is public and references our secret key.

Both `key` and `kid` consist of 16 bytes, usually represented in hexadecimal format.

To create a key, you can use [OpenSSL](https://www.openssl.org/) or any tool of your choice. Run the following command in your terminal:

```sh
openssl rand -hex 16
```

This command generates a random hexadecimal string of 16 bytes, which is your encryption key. Remember to save this key for later use.

Next, let's create a `kid` using the same method. Store this key as well, as we'll need it shortly. For your convenience, in case you encounter any issues with OpenSSL, here are demo `key` and `kid` values:

- `key`: 87237D20A19F58A740C05684E699B4AA
- `kid`: A16E402B9056E371F36D348AA62BB749

## Encrypting Content with Shaka Packager

Now that we have our encryption keys and prepared media, it's time to encrypt the content using these keys. Utilize the following command:

```sh
packager in=./BigBuckBunny.mp4,stream=video,init_segment='./segments/BigBuckBunny_0.mp4',segment_template='./segments/BigBuckBunny_$Number%01d$.mp4' \
    --segment_duration 2 \
    --enable_fixed_key_encryption \
    --clear_lead=2 \
    --keys label=HD:key_id=A16E402B9056E371F36D348AA62BB749:key=87237D20A19F58A740C05684E699B4AA,label=SD:key_id=A16E402B9056E371F36D348AA62BB749:key=87237D20A19F58A740C05684E699B4AA
```

This command closely resembles our previous one, with a few additions:

- `--enable_fixed_key_encryption`: This parameter signifies the use of ClearKey encryption.
- `--clear_lead=2`: This is an optional parameter that dictates how much content remains unencrypted at the beginning. EME is concerned about user experience and aims to avoid slow video starts due to encryption. By default, `--clear_lead` is set to 5 seconds, meaning the first 5 seconds are unencrypted. However, we're forcing it to 2 seconds, which matches the segment size - the smallest value that will work.
- `--keys label=HD:key_id=A16E402B9056E371F36D348AA62BB749:key=87237D20A19F58A740C05684E699B4AA`: This part tells our packager which keys to use for encrypting the content. The `label` corresponds to a specific piece of the stream to be encrypted. In our case, there are several renditions, including 'HD' (High Definition) and 'SD' (Standard Definition), which are associated with the 'key_id' and 'key' pairs.

When you execute the above command, Shaka Packager will produce 2-second segments, now encrypted with our secret key.

## Playback of Encrypted Content

Now, let's open our application and attempt to play the content. You may notice that the playback remains stuck in a buffering state indefinitely. This occurs because the media is encrypted, and decryption isn't being handled as expected according to the EME standard.

## Decrypting the Content

To successfully play encrypted content, we must listen for the `"encrypted"` event from the HTML VideoElement and handle EME. Let

's subscribe to this event:

```javascript
const video = document.getElementsByTagName("video")[0];
video.addEventListener("encrypted", handleEmeEncryption, false);
```

Now, let's define our `handleEmeEncryption` function and initiate the Content Decryption Module (CDM). To do this, we first need to open a ClearKey CDM:

```javascript
const config = [
  {
    initDataTypes: ["cenc"],
    videoCapabilities: [{ contentType: `video/mp4; codecs="avc1.4d4032"` }],
    audioCapabilities: [],
  };
];

const mediaKeysSystemAccess = await window.navigator.requestMediaKeySystemAccess("org.w3.clearkey", config);

const createdMediaKeys = await mediaKeysSystemAccess.createMediaKeys();
```

At this point, we've created an empty media keys object and gained access to the 'clearkey' CDM. As you can see from the parameter above, we're providing a configuration that explains the encryption used (cenc) and the required audio and video capabilities for the CDM.

Now, let's set the media keys for the video element:

```javascript
await video.setMediaKeys(createdMediaKeys);
```

If you try to play the content now, it will work for the first 4 seconds due to our `--clear_lead=2` setting. Despite the label '2 seconds', since our first video segment actually contains 4 seconds (you can confirm this with `ffmpeg`), the entire first segment is unencrypted and can be played with an empty keys object. Please note that the video starts loading the second segment because the content cannot be decrypted without the key. Let's proceed to decrypt the remaining content.

```javascript
const mediaKeys = video.mediaKeys;
const keysSession = mediaKeys.createSession();
keysSession.addEventListener("message", handleMessage, false);

await keysSession.generateRequest(event.initDataType, event.initData);
```

We're continuing our EME implementation by creating a decryption session for our media keys. This time, the `"message"` event will be triggered once the video element receives a piece of encrypted content in the source buffer. When this occurs, we must provide the encryption key to the CDM so it can decrypt the video. Finally, we call `generateRequest`, which will initiate a system call to the CDM with the initialization data from the `"encrypted"` event.

Let's craft the `handleMessage` method:

```javascript
const handleMessage = (event) => {
  const keySession = event.target;
  var te = new TextEncoder();
  // Base64 - https://cryptii.com/pipes/binary-to-base64
  const base64Key = "hyN9IKGfWKdAwFaE5pm0qg"; // Base64 of 87237D20A19F58A740C05684E699B4AA
  const base64KeyID = "oW5AK5BW43HzbTSKpiu3SQ"; // Base64 of A16E402B9056E371F36D348AA62BB749
  var license = te.encode(
    `{"keys":[{"kty":"oct","k":"${base64Key}","kid":"${base64KeyID}"}],"type":"temporary"}`
  );
  keySession.update(license).catch((error) => {
    console.log("Error: ", error);
  });
};
```

Step by step:

1. We've converted our Key and KeyID into Base64 representation using [this tool](https://cryptii.com/pipes/binary-to-base64). Since browsers lack a Base64 API, this approach simplifies the process. Feel free to use any tool you prefer as long as it produces the correct value.
2. The `TextEncoder` takes a stream of code points as input and emits a stream of bytes, effectively converting our object into a byte array.
3. In DRM terminology, the license contains the decryption key. We provide the license in ClearKey format, as described [here](https://www.w3.org/TR/encrypted-media/#clear-key-request-format-example).
4. Error handling is included in case you need to change the key and encounter decryption issues.

Now, let's attempt playback and see the decryption in action!

## Summary

In this article, we explored the intricate world of EME with MSE, bringing secure media playback to life. We covered key concepts such as encrypting content, handling encryption keys, and the step-by-step process of decrypting protected content. By implementing EME, you can ensure a seamless and secure media experience on the web.

For the complete code and a hands-on experience, visit the [GitHub repository](https://github.com/vvasylkovskyi/barebones-mse-encrypted-eme-playback). Happy Coding!

## References

- [Encrypted Media Extensions](https://www.w3.org/TR/encrypted-media/)
- [What is EME](https://web.dev/articles/media-eme)
- [EME WTF?](https://web.dev/articles/eme-basics)
- [Generate MPEG DASH content encrypted with MPEG CENC ClearKey](https://github.com/Dash-Industry-Forum/dash.js/wiki/Generate-MPEG-DASH-content-encrypted-with-MPEG-CENC-ClearKey)
- [Shaka Packager - Raw Key](https://shaka-project.github.io/shaka-packager/html/tutorials/raw_key.html)
- [Securing OTT Content](https://eyevinntechnology.medium.com/securing-ott-content-a941d998ca9a)
- [Securing OTT Content — DRM](https://eyevinntechnology.medium.com/securing-ott-content-drm-1af2c08fdd31)
