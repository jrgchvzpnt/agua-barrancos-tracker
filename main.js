if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('SW activo'))
      .catch(err => console.error('Error SW', err));
  });
}

window.renderNoticesPublic = function() {
    // Notices are now hardcoded in the HTML sidebar
    return;
};
