## Adding Typescript Loader

It is worth to mention that webpack by itself does not know how to compile typescript into javascript. It uses loaders, in our case `ts-loader`. Let's add a code

```javascript
// webpack.config.js
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  ... // Keep your old code

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
}
```

We basically telling webpack to test for all the files

We will learn about:

- How to bundle app with webpack, add the necessary rules, production optimization,
- What is loader and how to choose the best one for you project,
- Embedding images, svg, fonts and other static artifacts in your project,
- How to enhance your project code standards using linter and prettier,
- Transpiling options when using typescript, understanding different ecma-script builds
- Hands-on on setting up React project,
- Getting Routing to work in React

## Setting up a Webpack Project
