import type { HighlightOptions } from 'highlight.js';
import hljs from 'highlight.js';
import { marked } from 'marked';

const getMarkedHTML = (content: string) => {
  // Create a custom renderer
  const renderer = new marked.Renderer();

  // Override function for code rendering
  renderer.code = (code: HighlightOptions, language: string) => {
    // Check if the given language is available with highlight.js
    const validLang = hljs.getLanguage(language) ? language : 'plaintext';
    // Highlight the syntax
    const highlighted = hljs.highlight(validLang, code).value;
    // Return the highlighted code within a preformatted code block
    return `<pre><code class="hljs ${language}">${highlighted}</code></pre>`;
  };

  // Override the image method
  renderer.image = (href: string, title: string, text: string) => {
    href = `/images?file=${href}`;

    const imagePath = `${href}`;
    // Call the original renderer method with the modified URL
    // Construct the image tag manually or call the original renderer method
    return `<div class="image-wrapper"><img src="${imagePath}" alt="${text}"${
      title ? ` title="${title}"` : ''
    }></div>`;
  };

  // Set options for marked
  marked.setOptions({
    renderer: renderer, // Use the custom renderer
  });

  return marked.parse(content);
};

export default getMarkedHTML;
