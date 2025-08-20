'use client'

import { useTheme } from '@/hooks/useTheme'

// Powered by Giscus. Find documentation here - https://giscus.app/

export const GiscusComments = () => {
    const { theme } = useTheme();
    // const { theme, isResolved } = useTheme();

    // if (!isResolved) {
    //     return null;
    // }

    return <div className='giscus'>
        <script src="https://giscus.app/client.js"
            data-repo="vvasylkovskyi/vvasylkovskyi-portfolio"
            data-repo-id="R_kgDOORhAZg"
            data-category="General"
            data-category-id="DIC_kwDOORhAZs4CsUxH"
            data-mapping="title"
            data-strict="0"
            data-reactions-enabled="1"
            data-emit-metadata="0"
            data-input-position="top"
            // Theme is for initial page load, but then the prop update do not propagate into iframe
            data-theme={theme}
            data-lang="en"
            async>
        </script>
    </div>
}