# Setting Up a Node.js HTTP Server

In this technical blog post, we'll guide you through the process of setting up a basic Express server in Node.js. This server will serve an HTML file while effectively handling CORS (Cross-Origin Resource Sharing) issues. Below, you'll find a succinct `server.js` file:

```typescript
// server.js
var express = require("express");
var serveStatic = require("serve-static");

var app = express();

app.use(serveStatic(__dirname, { index: ["index.html"] }));

app.listen(4000, function () {
  console.log("CORS-enabled web server listening on port 4000");
});
```

The `server.js` file showcases a minimalistic setup for an Express server, which effectively handles CORS problems by serving static content.

## The HTML File

Our `index.html` file remains delightfully straightforward:

```html
<!-- test comment -->
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script defer src="index.js"></script>
  </head>
  <body></body>
</html>
```

This HTML file is designed to display a document, and it includes a script for potential interactivity through the `index.js` file.

## Dependency Management with npm

Efficient dependency management is crucial. You can make use of npm to streamline this process. Start by initializing a `package.json` file with the following command:

```bash
npm init -y
```

Once you've executed this command, your `package.json` file should look like this:

```json
{
  "name": "http-server-demo",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js"
  },
  "author": "viktorvasylkovskyi",
  "license": "ISC",
  "dependencies": {
    "express": "^4.18.2",
    "serve-static": "^1.15.0"
  }
}
```

This `package.json` file specifies the project's metadata, scripts, author information, and dependencies.

## Installing Dependencies

With your `package.json` configured, running the following command will neatly install the required dependencies:

```bash
npm install
```

## Launching the Server

To start your server on port 4000, execute the following command:

```bash
npm run start
```

This will launch the Express server, allowing it to listen on port 4000 and handle your web content seamlessly.

## Summary

This post outlines the setup of a Node.js Express server for serving an HTML file while handling CORS issues. It includes `server.js` and `index.html` code snippets, npm-based dependency management, and launching the server on port 4000. This concise guide helps you establish a functional HTTP server. For further details, refer to the provided reference link. For full code, refer to this [github repo](https://github.com/vvasylkovskyi/http-server).

Farewell and happy coding!

## References

For further information on HTTP web servers, please refer to the following resource:

- [HTTP Web Server](https://developer.mozilla.org/en-US/docs/Learn/Common_questions/Web_mechanics/What_is_a_web_server)
- [NPM](https://docs.npmjs.com/)
