document.addEventListener('DOMContentLoaded', () => {
  const rateLink = document.getElementById('rateLink');
  const boxifyOn = document.getElementById('boxifyOn');
  const boxifyOff = document.getElementById('boxifyOff');
  
  chrome.management.getSelf((info) => {
    rateLink.href = info.id 
      ? `https://chrome.google.com/webstore/detail/${info.id}/reviews`
      : 'https://chrome.google.com/webstore';
  });

  const updateToggleState = (enabled) => {
    if (enabled) {
      boxifyOn.classList.add('active');
      boxifyOff.classList.remove('active');
    } else {
      boxifyOn.classList.remove('active');
      boxifyOff.classList.add('active');
    }
  };

  chrome.storage.local.get(['boxifyEnabled'], (result) => {
    updateToggleState(result.boxifyEnabled === true);
  });

  boxifyOn.addEventListener('click', () => {
    updateToggleState(true);
    chrome.storage.local.set({ boxifyEnabled: true }, () => {
      chrome.runtime.sendMessage({ action: 'boxifyToggle', enabled: true });
    });
  });

  boxifyOff.addEventListener('click', () => {
    updateToggleState(false);
    chrome.storage.local.set({ boxifyEnabled: false }, () => {
      chrome.runtime.sendMessage({ action: 'boxifyToggle', enabled: false });
    });
  });
});

