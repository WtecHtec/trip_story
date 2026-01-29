console.log('XTrace Background Service Worker Loaded');

chrome.action.onClicked.addListener((tab) => {
  // Opens the side panel on the current window
  chrome.sidePanel.open({ windowId: tab.windowId });
});
