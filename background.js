const BOXY_STYLE_ID = 'boxy-extension-style';
const BOXY_CSS = `
  *, *::before, *::after {
    border-radius: 0 !important;
    border-top-left-radius: 0 !important;
    border-top-right-radius: 0 !important;
    border-bottom-left-radius: 0 !important;
    border-bottom-right-radius: 0 !important;
  }
  
  input, button, select, textarea {
    -webkit-appearance: none !important;
    -moz-appearance: none !important;
    appearance: none !important;
  }
  
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none !important;
  }
  
  :root, html {
    --border-radius: 0 !important;
    --radius: 0 !important;
    --border-radius-sm: 0 !important;
    --border-radius-md: 0 !important;
    --border-radius-lg: 0 !important;
    --border-radius-xl: 0 !important;
    --border-radius-2xl: 0 !important;
    --border-radius-full: 0 !important;
    --rounded-sm: 0 !important;
    --rounded-md: 0 !important;
    --rounded-lg: 0 !important;
    --rounded-xl: 0 !important;
    --rounded-2xl: 0 !important;
    --rounded-full: 0 !important;
  }
`;

function isSystemPage(url) {
  return url && (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('moz-extension://'));
}

function injectCSSIntoTab(tabId) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: injectCSS,
    args: [BOXY_STYLE_ID, BOXY_CSS]
  });
  
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: processImages
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
  function forceBoxyStyle(element) {
    if (!element || element.nodeType !== 1) return;
    
    const computedStyle = window.getComputedStyle(element);
    const borderRadius = computedStyle.borderRadius;
    
    if (borderRadius && borderRadius !== '0px' && borderRadius !== 'none' && borderRadius !== '0') {
      element.style.setProperty('border-radius', '0', 'important');
      element.style.setProperty('border-top-left-radius', '0', 'important');
      element.style.setProperty('border-top-right-radius', '0', 'important');
      element.style.setProperty('border-bottom-left-radius', '0', 'important');
      element.style.setProperty('border-bottom-right-radius', '0', 'important');
    }
    
    if (element.style.borderRadius) {
      element.style.setProperty('border-radius', '0', 'important');
    }
  }

  function scanAndFixElements() {
    document.querySelectorAll('*').forEach((el) => {
      forceBoxyStyle(el);
    });
  }

  const existingStyle = document.getElementById(styleId);
  if (existingStyle) existingStyle.remove();
  
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = cssText;
  (document.head || document.documentElement).appendChild(style);
  
  scanAndFixElements();
  
  if (!document.body.dataset.boxyObserver) {
    document.body.dataset.boxyObserver = 'true';
    
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            forceBoxyStyle(node);
            if (node.querySelectorAll) {
              node.querySelectorAll('*').forEach(forceBoxyStyle);
            }
          }
        });
        if (mutation.type === 'attributes') {
          if (mutation.attributeName === 'style' || mutation.attributeName === 'class') {
            forceBoxyStyle(mutation.target);
          }
        }
      });
    });
    
    mutationObserver.observe(document.body, { 
      childList: true, 
      subtree: true, 
      attributes: true, 
      attributeFilter: ['style', 'class'] 
    });
    
    const styleObserver = new MutationObserver(() => {
      setTimeout(scanAndFixElements, 100);
    });
    
    if (document.head) {
      styleObserver.observe(document.head, { 
        childList: true, 
        subtree: true 
      });
    }
    
    const periodicCheck = setInterval(() => {
      if (!document.body.dataset.boxyObserver) {
        clearInterval(periodicCheck);
        return;
      }
      scanAndFixElements();
    }, 1000);
    
    document.body.dataset.boxyPeriodicCheck = periodicCheck;
  }
  
  if (typeof processImages === 'function') {
    processImages();
  }
}

function removeCSS(styleId) {
  const style = document.getElementById(styleId);
  if (style) style.remove();
  
  if (document.body && document.body.dataset.boxyObserver) {
    delete document.body.dataset.boxyObserver;
    
    if (document.body.dataset.boxyPeriodicCheck) {
      clearInterval(document.body.dataset.boxyPeriodicCheck);
      delete document.body.dataset.boxyPeriodicCheck;
    }
  }
  
  if (typeof removeImageWrappers === 'function') {
    removeImageWrappers();
  }
}

function getEdgeColor(img) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = Math.min(img.naturalWidth || img.width, 100);
  canvas.height = Math.min(img.naturalHeight || img.height, 100);
  
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  const edgePixels = [];
  const width = canvas.width;
  const height = canvas.height;
  
  for (let i = 0; i < width; i++) {
    edgePixels.push(data[(i * 4) + 0], data[(i * 4) + 1], data[(i * 4) + 2]);
    edgePixels.push(data[((height - 1) * width + i) * 4 + 0], data[((height - 1) * width + i) * 4 + 1], data[((height - 1) * width + i) * 4 + 2]);
  }
  for (let i = 0; i < height; i++) {
    edgePixels.push(data[(i * width) * 4 + 0], data[(i * width) * 4 + 1], data[(i * width) * 4 + 2]);
    edgePixels.push(data[((i + 1) * width - 1) * 4 + 0], data[((i + 1) * width - 1) * 4 + 1], data[((i + 1) * width - 1) * 4 + 2]);
  }
  
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < edgePixels.length; i += 3) {
    r += edgePixels[i];
    g += edgePixels[i + 1];
    b += edgePixels[i + 2];
  }
  
  const count = edgePixels.length / 3;
  return `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`;
}

function processImages() {
  if (document.body.dataset.boxyImageObserver) return;
  document.body.dataset.boxyImageObserver = 'true';
  
  const processImageNode = (img) => {
    if (img.complete && img.naturalWidth > 0) {
      processImage(img);
    } else {
      img.addEventListener('load', () => processImage(img), { once: true });
    }
  };
  
  document.querySelectorAll('img:not([data-boxy-processed])').forEach(processImageNode);
  
  new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          if (node.tagName === 'IMG') {
            processImageNode(node);
          }
          const newImages = node.querySelectorAll && node.querySelectorAll('img:not([data-boxy-processed])');
          if (newImages) {
            newImages.forEach(processImageNode);
          }
        }
      });
    });
  }).observe(document.body, { childList: true, subtree: true });
}

function processImage(img) {
  if (img.dataset.boxyProcessed === 'true') return;
  
  const computedStyle = window.getComputedStyle(img);
  const borderRadius = computedStyle.borderRadius;
  const isRounded = borderRadius && borderRadius !== '0px' && borderRadius !== 'none';
  
  const parent = img.parentElement;
  const parentStyle = parent ? window.getComputedStyle(parent) : null;
  const parentRounded = parentStyle && parentStyle.borderRadius && parentStyle.borderRadius !== '0px';
  
  if (!isRounded && !parentRounded) {
    img.dataset.boxyProcessed = 'true';
    return;
  }
  
  try {
    const edgeColor = getEdgeColor(img);
    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-boxy-wrapper', 'true');
    wrapper.style.display = 'inline-block';
    wrapper.style.backgroundColor = edgeColor;
    wrapper.style.padding = '0';
    wrapper.style.margin = '0';
    wrapper.style.verticalAlign = 'middle';
    
    const maxDim = Math.max(img.width || img.offsetWidth || 0, img.height || img.offsetHeight || 0);
    if (maxDim > 0) {
      wrapper.style.width = maxDim + 'px';
      wrapper.style.height = maxDim + 'px';
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.justifyContent = 'center';
    }
    
    img.parentNode.insertBefore(wrapper, img);
    wrapper.appendChild(img);
    img.dataset.boxyProcessed = 'true';
  } catch (e) {
    img.dataset.boxyProcessed = 'true';
  }
}

function removeImageWrappers() {
  document.querySelectorAll('[data-boxy-wrapper]').forEach((wrapper) => {
    const img = wrapper.querySelector('img');
    if (img) {
      wrapper.parentNode.insertBefore(img, wrapper);
      wrapper.remove();
      delete img.dataset.boxyProcessed;
    }
  });
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
