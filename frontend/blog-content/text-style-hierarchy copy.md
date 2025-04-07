Creating the right visual hierarchy for text content is crucial in both digital and print formats. It helps users understand the content flow and makes it easier for them to digest information. Here are several guidelines that can help you establish an effective text visual hierarchy:

1. **Use of Different Font Sizes**: Headings, subheadings, and body text should have distinct, consistent font sizes. Generally, the more important the text, the larger the font size. This distinction helps readers identify the level of importance of the information at a glance.

2. **Font Weight and Style**: Beyond size, using different font weights (bold vs. regular) and styles (italic, uppercase) can emphasize importance or indicate different types of content. For example, bold text might attract more attention than regular text, signaling that it's more important or it's a heading.

3. **Color and Contrast**: Color can be an effective way to draw attention to text. High-contrast colors are more easily noticed than low-contrast ones. However, use color sparingly to highlight only key points. Also, ensure there's enough contrast between the text color and background color for readability.

4. **Spacing and Grouping**: Use spacing to your advantage. Elements closely placed are perceived as related, while those farther apart are seen as belonging to separate groups or categories. Line spacing (leading), paragraph spacing, and margin widths can greatly affect readability and perception of hierarchy.

5. **Alignment and Indentation**: Text alignment and indentation can also guide readers through the content. For instance, centered text is often more noticeable, while left-aligned text is more readable. Indentations can indicate related paragraphs or new sections.

6. **Consistency**: Regardless of the choices you make for font, size, weight, color, etc., consistency is key. Establish rules for how different text elements appear and stick to them throughout the content. This predictability helps readers understand and absorb material more efficiently.

7. **Use of Visual Elements**: Incorporate non-text visual elements like lines, borders, or icons to differentiate between sections or highlight important points. These can break up text-heavy content and give the eye a "place to rest."

8. **Hierarchy Levels**: Don’t create too many levels of hierarchy, as it can confuse the reader. Normally, 3-4 levels (e.g., titles, headings, subheadings, and body text) are enough for clear and effective structuring.

9. **Understanding the Audience**: Tailor the visual hierarchy to suit the reading habits and expectations of your target audience. For instance, an academic paper may have a different text hierarchy than a blog post or a flyer.

10. **Testing and Feedback**: If possible, gather feedback from real users to understand how your text hierarchy works in practice. Sometimes, what makes sense to you may not be as clear to others. Testing and subsequent tweaking can make a big difference.

By following these guidelines, you can create text content that communicates more effectively, ensuring that readers recognize the most important points and navigate the content in a logical and intuitive manner. Remember, these rules are not set in stone; the key is to understand the principles behind them so you can make informed design decisions.

# Setting Fonts for your project

Every project uses text elements. If your project uses HTML, then chances are you will be using `h1` `h2`, `h3`, `label`, `span`, `p` for your text rendering. In this tutorial, we will be demo how to setup fonts in your web project using webpack.

... Explain the importance of font style ...

## Getting fonts

First we need to get fonts that we want to use in our project. There are multiple websites that offer fonts for free. In this tutorial we will be using [Font Squirrel](https://www.fontsquirrel.com/). Head on there and download the font that you like the most. Once downloaded, you should have a folder with a bunch of `.ttf` files. ... Explain what are ttf files ...

... explain why bundling fonts is beneficial for pefromance compared with downloading it remotely ...

### Configure Webpack

Using custom fonts in a Webpack project involves several steps - adding font files to your project, and defining font-faces in your CSS. Below is a step-by-step guide on how to include and use fonts in your Webpack project:

Using custom fonts in a Webpack project involves several steps, including file loader configuration, adding font files to your project, and defining font-faces in your CSS. Below is a step-by-step guide on how to include and use fonts in your Webpack project:

#### 1. Configure Webpack

For Webpack 5 - include the loader in your `webpack.config.js` to handle our font file formats - `.ttf`. Note that you may have more font formats like `.woff`, `.woff2`, `.eot`, and `.otf`. But for our example the above is enough

```javascript
// webpack.config.js
module.exports = {
  // ... other configurations
  module: {
    rules: [
      // ... other rules
      {
        test: /\.ttf$/i,
        type: "asset/resource",
        generator: {
          filename: "fonts/[name][ext]", // This places the fonts within 'fonts' folder in 'dist'
        },
      },
    ],
  },
};
```

**Note on Webpack 4** - you may encounter other blogs saying that the right way of setting fonts require installing `file-loader` or `url-loader` and importing the fonts with the rule simmilar to the following. While it works for webpack 4, starting at version 5, the webpack streamlined the process where you no longer need to install the loaders, by simply tell webpack the `asset/resource` and it will import the files.

```javascript
module.exports = {
  // ... other configurations
  module: {
    rules: [
      // ... other rules
      {
        test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
        use: [
          {
            loader: "file-loader",
            options: {
              name: "[name].[ext]",
              outputPath: "fonts/",
            },
          },
        ],
      },
    ],
  },
};
```

#### 2. Add Font Files:

Place your font files in a specific directory in your project, like `static/fonts/`.

#### 3. Define @font-face in CSS:

In your CSS, use `@font-face` to define your custom fonts. Be sure to specify the correct path to your font files.

```css
/* styles.css */
@font-face {
  font-family: "MyCustomFont";
  src: url("./static/fonts/MyCustomFont.ttf") format("ttf");
  font-weight: 400;
  font-style: normal;
}
```

The combination of `font-weight` and `font-style` is what declares which `src` font to use. Be mindful to declare those well. For example, you may have `Light`, `Regular`, `SemiBold`, `Bold` and `ExtraBold` fonts. In this case you will declare all five font faces:

```css
/* styles.css */
@font-face {
  ...
  src: url("./static/fonts/MyCustomFontExtraBold.ttf") format("ttf");
  font-weight: 600;
  ...
}

@font-face {
  ...
  src: url("./static/fonts/MyCustomFontBold.ttf") format("ttf");
  font-weight: 500;
  ...
}

@font-face {
  ...
  src: url("./static/fonts/MyCustomFontSemiBold.ttf") format("ttf");
  font-weight: 400;
  ...
}

@font-face {
  ...
  src: url("./static/fonts/MyCustomFontRegular.ttf") format("ttf");
  font-weight: 300;
  ...
}

@font-face {
  ...
  src: url("./static/fonts/MyCustomFontLight.ttf") format("ttf");
  font-weight: 200;
  ...
}
```

And the same goes for `Italic` vs `Regular`, but in this case, we care about `font-style`.

```css
@font-face {
  ...
  src: url("./static/fonts/MyCustomFontRegular.ttf") format("ttf");
  font-style: normal;
  ...
}

@font-face {
  ...
  src: url("./static/fonts/MyCustomFontLight.ttf") format("ttf");
  font-style: italic;
  ...
}
```

In the end, the combination of both `font-style` and `font-weight` is what declares the fonts path to choose.

#### 4. Use the Custom Font in CSS:

Now you can use the custom font in your styles by referring to the same `font-family` name you defined earlier.

```css
body,
h1,
h2,
h3,
h4,
h5,
h6,
p,
label,
span {
  font-family: "MyCustomFont";
}
```

#### 5. Importing the CSS file:

Make sure to import the CSS file in your JavaScript entry point to include it in the Webpack build process.

```javascript
// index.js or your entry file
import "./path/to/styles.css";
```

This setup should include your fonts in the build output and display them correctly on your web pages. Remember, the paths specified in your CSS file should be relative to the final output CSS file Webpack generates. If you have a different folder structure, you need to adjust the paths accordingly.

## Conclusion

... Give a Conclusion ...
