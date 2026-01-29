// DOM Elements
const accountView = document.getElementById('account-view');
const tweetView = document.getElementById('tweet-view');
const accountList = document.getElementById('account-list');
const tweetList = document.getElementById('tweet-list');
const accountInput = document.getElementById('account-input');
const addAccountBtn = document.getElementById('add-account-btn');
const backToAccountsBtn = document.getElementById('back-to-accounts');
const currentAccountName = document.getElementById('current-account-name');
const fetchTweetsBtn = document.getElementById('fetch-tweets-btn');
const sendBtn = document.getElementById('send-btn');
const toggleTweetsBtn = document.getElementById('toggle-tweets-btn');
const tweetListContainer = document.getElementById('tweet-list-container');
const selectAllCheckbox = document.getElementById('select-all-tweets');
const apiResult = document.getElementById('api-result');
const apiOutput = document.getElementById('api-output');

// State
let currentAccount = null;
let accounts = [];
let collectedTweets = [];
let isTweetListCollapsed = false;

// Navigation
function showAccountView() {
    accountView.classList.remove('hidden');
    tweetView.classList.add('hidden');
    currentAccount = null;
    renderAccounts(); // Re-render to ensure fresh state
}

async function showTweetView(account) {
    accountView.classList.add('hidden');
    tweetView.classList.remove('hidden');
    currentAccount = account;
    currentAccountName.textContent = '@' + account.username;

    // Clear previous tweets
    collectedTweets = [];
    renderTweets();
    apiResult.classList.add('hidden');
    isTweetListCollapsed = false;
    tweetListContainer.classList.remove('collapsed');
    toggleTweetsBtn.textContent = '▲';

    // Navigate current tab to profile
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
        const targetUrl = account.profileUrl;
        // Simple check to avoid reloading if already there
        if (!tab.url.includes(account.username)) {
            chrome.tabs.update(tab.id, { url: targetUrl });
        }
    }
}

// Storage Helpers
async function loadAccounts() {
    const result = await chrome.storage.local.get('accounts');
    accounts = result.accounts || [];
    renderAccounts();
}

async function saveAccounts() {
    await chrome.storage.local.set({ accounts });
    renderAccounts();
}

// Account Logic
function normalizeUsername(input) {
    input = input.replace(/\/$/, '');
    try {
        const url = new URL(input);
        const pathParts = url.pathname.split('/').filter(Boolean);
        return pathParts[pathParts.length - 1];
    } catch {
        if (input.startsWith('@')) return input.substring(1);
        return input;
    }
}

function addAccount() {
    const input = accountInput.value.trim();
    if (!input) return;

    const username = normalizeUsername(input);
    if (!username) {
        alert('Invalid username or URL');
        return;
    }

    if (accounts.some(acc => acc.username.toLowerCase() === username.toLowerCase())) {
        alert('Account already exists');
        return;
    }

    const newAccount = {
        username: username,
        profileUrl: `https://x.com/${username}`,
        createdAt: Date.now()
    };

    accounts.push(newAccount);
    saveAccounts();
    accountInput.value = '';
}

function deleteAccount(username, event) {
    event.stopPropagation();
    if (confirm(`Delete @${username}?`)) {
        accounts = accounts.filter(acc => acc.username !== username);
        saveAccounts();
    }
}

function renderAccounts() {
    accountList.innerHTML = '';
    accounts.forEach(acc => {
        const li = document.createElement('li');
        li.className = 'account-item';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'account-name';
        nameSpan.textContent = '@' + acc.username;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '✕';
        deleteBtn.title = 'Remove Account';
        deleteBtn.onclick = (e) => deleteAccount(acc.username, e);

        li.appendChild(nameSpan);
        li.appendChild(deleteBtn);

        li.addEventListener('click', () => showTweetView(acc));

        accountList.appendChild(li);
    });
}

// Tweet Logic
function toggleTweetList() {
    isTweetListCollapsed = !isTweetListCollapsed;
    if (isTweetListCollapsed) {
        tweetListContainer.classList.add('collapsed');
        toggleTweetsBtn.textContent = '▼';
    } else {
        tweetListContainer.classList.remove('collapsed');
        toggleTweetsBtn.textContent = '▲';
    }
}

async function fetchTweets() {
    if (isTweetListCollapsed) toggleTweetList();

    tweetList.innerHTML = '<div style="padding:12px">Fetching...</div>';

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;

        // Ensure we are injected or capable of messaging
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'FETCH_TWEETS' }).catch(err => null);

        if (response && response.tweets && response.tweets.length > 0) {
            collectedTweets = response.tweets;
            renderTweets();
        } else {
            tweetList.innerHTML = '<div style="padding:12px">No tweets found. Please ensure you are on the Twitter/X profile page and the page is loaded.</div>';
        }
    } catch (err) {
        console.error(err);
        tweetList.innerHTML = '<div style="padding:12px">Error fetching tweets. Try refreshing the page.</div>';
    }
}

function renderTweets() {
    tweetList.innerHTML = '';
    if (collectedTweets.length === 0) {
        return;
    }

    collectedTweets.forEach(tweet => {
        const div = document.createElement('div');
        div.className = 'tweet-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'tweet-checkbox';
        checkbox.dataset.id = tweet.id;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'tweet-content';
        contentDiv.textContent = tweet.text;

        // Metrics
        const metrics = tweet.metrics || { replies: '0', retweets: '0', likes: '0', views: '0' };
        const statsDiv = document.createElement('div');
        statsDiv.className = 'tweet-stats';
        statsDiv.innerHTML = `
            <span class="stat-item" title="Replies">💬 ${metrics.replies}</span>
            <span class="stat-item" title="Reposts">🔁 ${metrics.retweets}</span>
            <span class="stat-item" title="Likes">❤️ ${metrics.likes}</span>
            <span class="stat-item" title="Views">📊 ${metrics.views}</span>
        `;

        const metaDiv = document.createElement('div');
        metaDiv.className = 'tweet-meta';
        metaDiv.textContent = `${new Date(tweet.timestamp).toLocaleString()}`;

        contentDiv.appendChild(statsDiv);
        contentDiv.appendChild(metaDiv);

        div.appendChild(checkbox);
        div.appendChild(contentDiv);
        tweetList.appendChild(div);
    });

    // Reset state
    selectAllCheckbox.checked = false;
    updateSendButtonState();

    const checkboxes = tweetList.querySelectorAll('.tweet-checkbox');
    checkboxes.forEach(cb => cb.addEventListener('change', updateSendButtonState));
}

function updateSendButtonState() {
    const selected = tweetList.querySelectorAll('.tweet-checkbox:checked');
    sendBtn.disabled = selected.length === 0;
    sendBtn.textContent = selected.length > 0 ? `Send (${selected.length})` : 'Send to API';
}

// API Result Logic
const toggleApiBtn = document.getElementById('toggle-api-btn');
const apiContentContainer = document.getElementById('api-content-container');
let isApiCollapsed = false;

function toggleApiResult() {
    isApiCollapsed = !isApiCollapsed;
    if (isApiCollapsed) {
        apiContentContainer.classList.add('collapsed');
        toggleApiBtn.textContent = '▼'; // Should be pointing down/closed logic, let's stick to arrow conventions
        // Actually, if it starts open, maybe we want '▲' to collapse?
        // Let's standard: '▲' = click to collapse (currently expanded), '▼' = click to expand (currently collapsed)
        // Adjusting logic:
        // Expanded (default): button is '▲' (Collapse)
        // Collapsed: button is '▼' (Expand)
    } else {
        apiContentContainer.classList.remove('collapsed');
        toggleApiBtn.textContent = '▲';
    }
    // Update button text specifically based on state
    toggleApiBtn.textContent = isApiCollapsed ? '▼' : '▲';
}

function sendToApi() {
    const selectedCheckboxes = tweetList.querySelectorAll('.tweet-checkbox:checked');
    const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.id);
    const selectedTweets = collectedTweets.filter(t => selectedIds.includes(t.id));

    console.log("selectedTweets---", selectedTweets);

    // Reset API view
    apiResult.classList.remove('hidden');
    isApiCollapsed = false;
    apiContentContainer.classList.remove('collapsed');
    toggleApiBtn.textContent = '▲';

    apiOutput.textContent = 'Sending...';

    if (!isTweetListCollapsed) toggleTweetList();

    setTimeout(() => {
        apiOutput.textContent = JSON.stringify({
            status: 'success',
            count: selectedTweets.length,
            // Simple sum isn't quite right with '1.2K' strings, but good enough for mock
            data: selectedTweets
        }, null, 2);

        // Scroll to bottom
        apiResult.scrollIntoView({ behavior: 'smooth' });
    }, 800);
}

// Event Listeners - Add new one
toggleApiBtn.addEventListener('click', toggleApiResult);

// Event Listeners
backToAccountsBtn.addEventListener('click', showAccountView);
addAccountBtn.addEventListener('click', addAccount);
accountInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addAccount();
});
fetchTweetsBtn.addEventListener('click', fetchTweets);
toggleTweetsBtn.addEventListener('click', toggleTweetList);

selectAllCheckbox.addEventListener('change', (e) => {
    const checkboxes = tweetList.querySelectorAll('.tweet-checkbox');
    checkboxes.forEach(cb => cb.checked = e.target.checked);
    updateSendButtonState();
});
sendBtn.addEventListener('click', sendToApi);

// Initialize
function init() {
    console.log('XTrace Sidepanel Initialized');
    loadAccounts();
}

init();
