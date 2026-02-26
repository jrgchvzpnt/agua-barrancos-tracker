if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('SW activo'))
      .catch(err => console.error('Error SW', err));
  });
}

window.renderNoticesPublic = function() {
    const container = document.getElementById('notices-container');
    if (!container) return;

    const notices = window.appState.notices || [];
    
    if (notices.length === 0) {
        container.innerHTML = '<p class="text-center text-slate-500 col-span-full">No hay avisos importantes por el momento.</p>';
        return;
    }

    container.innerHTML = notices.map(notice => {
        const isCommunity = notice.type === 'community';
        const bgColor = isCommunity ? 'bg-blue-50' : 'bg-amber-50';
        const borderColor = isCommunity ? 'border-blue-200' : 'border-amber-200';
        const titleColor = isCommunity ? 'text-blue-800' : 'text-amber-800';
        const textColor = isCommunity ? 'text-blue-700' : 'text-amber-700';
        const dotColor = isCommunity ? 'bg-blue-400' : 'bg-amber-400';
        const title = isCommunity ? 'AVISO COMUNITARIO' : 'TIP DE SUPERVIVENCIA';

        return `
            <div class="${bgColor} ${borderColor} rounded-2xl p-6 border">
                <h5 class="font-bold ${titleColor} text-sm mb-2 flex items-center">
                    <span class="w-2 h-2 rounded-full ${dotColor} mr-2"></span>
                    ${title}
                </h5>
                <p class="${textColor} text-sm leading-relaxed">${notice.content}</p>
            </div>
        `;
    }).join('');
};
