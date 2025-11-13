const BOXY_STYLE_ID = 'boxy-extension-style';
const BOXY_CSS = '* { border-radius: 0 !important; }';

function isSystemPage(url) {
  return url && (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('moz-extension://'));
}

function injectCSSIntoTab(tabId) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: injectCSS,
    args: [BOXY_STYLE_ID, BOXY_CSS]
  });
}

function removeCSSFromTab(tabId) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: removeCSS,
    args: [BOXY_STYLE_ID]
  });
}

function injectCSS(styleId, cssText) {
  const existingStyle = document.getElementById(styleId);
  if (existingStyle) existingStyle.remove();
  
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = cssText;
  (document.head || document.documentElement).appendChild(style);
}

function removeCSS(styleId) {
  const style = document.getElementById(styleId);
  if (style) style.remove();
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && !isSystemPage(tab.url)) {
    chrome.storage.local.get(['boxifyEnabled'], (result) => {
      if (result.boxifyEnabled === true) {
        injectCSSIntoTab(tabId);
      }
    });
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'boxifyToggle') {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (!isSystemPage(tab.url)) {
          message.enabled ? injectCSSIntoTab(tab.id) : removeCSSFromTab(tab.id);
        }
      });
    });
  }
});

