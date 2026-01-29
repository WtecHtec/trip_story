console.log('XTrace Content Script Loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'FETCH_TWEETS') {
        const tweets = scrapeTweets();
        sendResponse({ tweets });
    }
    return true; // Keep channel open
});

function scrapeTweets() {
    // Select all tweet articles in the DOM, no limit
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    const tweets = [];

    articles.forEach(article => {
        try {
            // Extract Tweet Text
            const textEl = article.querySelector('div[data-testid="tweetText"]');
            const text = textEl ? textEl.innerText : '';

            // Extract Timestamp
            const timeEl = article.querySelector('time');
            const timestamp = timeEl ? timeEl.getAttribute('datetime') : new Date().toISOString();

            // Extract Status URL / ID
            const linkEl = article.querySelector('a[href*="/status/"]');
            let url = '';
            let id = '';
            if (linkEl) {
                url = linkEl.href;
                const match = url.match(/\/status\/(\d+)/);
                if (match) {
                    id = match[1];
                }
            }

            // Helper to get number from testid element by aria-label or text
            const getMetric = (testId) => {
                const el = article.querySelector(`[data-testid="${testId}"]`);
                if (el) {
                    // Try innerText first (usually "15" or "1.5K")
                    const text = el.innerText;
                    if (text && text.trim().length > 0) return text;

                    // Fallback to aria-label (e.g., "15 replies")
                    const label = el.getAttribute('aria-label');
                    if (label) {
                        const match = label.match(/(\d+(?:,\d+)*(?:\.\d+)?(?:K|M|B)?)/i);
                        return match ? match[1] : '0';
                    }
                }
                return '0';
            };

            // Metrics
            const replies = getMetric('reply');
            const retweets = getMetric('retweet');
            const likes = getMetric('like');

            // Views
            let views = '0';
            // User provided strategy: aria-label="64152 views. View post analytics"
            // This is usually on the analytics link
            const viewsEl = article.querySelector('a[href*="/analytics"]');
            if (viewsEl) {
                const label = viewsEl.getAttribute('aria-label');
                if (label) {
                    const match = label.match(/^(\d+(?:,\d+)*(?:\.\d+)?(?:K|M|B)?)/i);
                    if (match) views = match[1];
                } else {
                    // Fallback to text if aria-label is missing
                    views = viewsEl.innerText || '0';
                }
            } else {
                // Sometimes it's just a div with the aria-label if analytics is disabled/different
                // Try looking for the specific aria-label pattern
                const viewGroup = article.querySelector('[aria-label*="views"]');
                if (viewGroup) {
                    const label = viewGroup.getAttribute('aria-label');
                    const match = label.match(/^(\d+(?:,\d+)*(?:\.\d+)?(?:K|M|B)?)/i);
                    if (match) views = match[1];
                }
            }

            // Only add if we have at least an ID
            if (id) {
                tweets.push({
                    id,
                    text,
                    timestamp,
                    url,
                    metrics: {
                        replies,
                        retweets,
                        likes,
                        views
                    }
                });
            }
        } catch (e) {
            console.error('Error parsing tweet:', e);
        }
    });

    return tweets;
}
