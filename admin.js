document.addEventListener("DOMContentLoaded", () => {
    
    // 1. REGISTRO DE FALLOS DE AGUA
    const outageForm = document.getElementById('outage-form');
    if (outageForm) {
        outageForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const dateVal = document.getElementById('outage-date').value; 
            if (!dateVal) return alert("Selecciona una fecha válida.");

            const statusVal = document.getElementById('outage-status').value;
            const notesVal = document.getElementById('outage-notes').value;

            const [year, month, day] = dateVal.split('-');
            const dateKey = `${year}-${String(parseInt(month)).padStart(2, '0')}-${String(parseInt(day)).padStart(2, '0')}`; 

            const data = {
                status: statusVal,
                notes: notesVal,
                timestamp: new Date().toISOString()
            };

            const success = await window.saveOutageCloud(dateKey, data);
            if (success) {
                alert(`✅ Se registró el fallo para el día ${dateKey}`);
                outageForm.reset();
            } else {
                alert("❌ Hubo un error al guardar.");
            }
        });
    }

    // 2. LÓGICA DE PUBLICIDAD (ADS)
    window.renderAds = function() {
        const adsList = document.getElementById('ads-list');
        if (!adsList) return;

        const ads = window.appState.ads || [];
        
        if (ads.length === 0) {
            adsList.innerHTML = '<p class="text-gray-500 text-sm italic">No hay publicidad activa.</p>';
            return;
        }

        adsList.innerHTML = ads.map(ad => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
                <div class="flex items-center gap-3 overflow-hidden">
                    <img src="${ad.imageUrl}" alt="${ad.name}" class="w-10 h-10 object-cover rounded-md border border-gray-300">
                    <div class="truncate">
                        <p class="font-bold text-gray-800 text-sm truncate">${ad.name}</p>
                        <a href="${ad.linkUrl}" target="_blank" class="text-xs text-blue-600 hover:underline">Ver enlace</a>
                    </div>
                </div>
                <button onclick="window.deleteAdCloud('${ad.id}')" class="text-red-500 font-bold ml-2">X</button>
            </div>
        `).join('');
    };

    const adForm = document.getElementById('ad-form');
    if (adForm) {
        adForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('ad-name').value;
            const img = document.getElementById('ad-image').value;
            const link = document.getElementById('ad-link').value;

            const success = await window.saveAdCloud(name, img, link);
            if (success) {
                alert("✅ Anuncio publicado.");
                adForm.reset();
            }
        });
    }

    // 3. MENSAJES DE VECINOS
    window.renderMessages = function() {
        const msgList = document.getElementById('messages-list');
        if (!msgList) return;

        const msgs = window.appState.messages || [];
        
        if (msgs.length === 0) {
            msgList.innerHTML = '<p class="text-gray-500 text-sm italic col-span-full py-4">No hay mensajes nuevos.</p>';
            return;
        }

        msgList.innerHTML = msgs.map(msg => `
            <div class="bg-purple-50 p-4 rounded-xl border border-purple-100 relative">
                <button onclick="window.deleteMessageCloud('${msg.id}')" class="absolute top-2 right-2 text-red-500 font-bold">X</button>
                <p class="font-bold text-gray-900">${msg.name}</p>
                <p class="text-xs text-gray-500 mb-2">📞 ${msg.phone || 'N/A'} • 🗓️ ${new Date(msg.createdAt).toLocaleDateString()}</p>
                <p class="text-sm text-gray-700 bg-white p-3 rounded-lg border border-purple-50 mt-2">${msg.message}</p>
            </div>
        `).join('');
    };

    // Navbar info
    setTimeout(() => {
        if (window.appState && window.appState.user) {
            const adminEmailBox = document.getElementById('admin-email');
            if (adminEmailBox) adminEmailBox.innerText = `Hola, ${window.appState.user.email}`;
        }
    }, 1500);
});