if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Usamos ruta relativa para GitHub Pages
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('SW activo'))
      .catch(err => console.error('Error SW', err));
  });
}