document.addEventListener("DOMContentLoaded", () => {
    
    // --- NAVEGACIÓN DEL SIDEBAR ---
    const navLinks = {
        outages: document.getElementById('nav-outages'),
        sponsors: document.getElementById('nav-sponsors'),
        calendar: document.getElementById('nav-calendar'),
        messages: document.getElementById('nav-messages'),
    };

    const sections = {
        outages: document.getElementById('section-outages'),
        sponsors: document.getElementById('section-sponsors'),
        calendar: document.getElementById('section-calendar'),
        messages: document.getElementById('section-messages'),
    };

    function switchView(view) {
        Object.values(sections).forEach(section => section.classList.add('hidden'));
        Object.values(navLinks).forEach(link => link.classList.remove('bg-slate-700'));

        if (sections[view]) sections[view].classList.remove('hidden');
        if (navLinks[view]) navLinks[view].classList.add('bg-slate-700');
    }

    navLinks.outages.addEventListener('click', (e) => { e.preventDefault(); switchView('outages'); });
    navLinks.sponsors.addEventListener('click', (e) => { e.preventDefault(); switchView('sponsors'); });
    navLinks.calendar.addEventListener('click', (e) => { e.preventDefault(); switchView('calendar'); });
    navLinks.messages.addEventListener('click', (e) => { e.preventDefault(); switchView('messages'); });

    switchView('outages');

    // --- LÓGICA DE FALLOS DE AGUA ---
    const outageForm = document.getElementById('outage-form');
    const cancelEditOutageBtn = document.getElementById('cancel-edit-outage');

    outageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const dateVal = document.getElementById('outage-date').value;
        if (!dateVal) return alert("Selecciona una fecha válida.");

        const data = {
            status: document.getElementById('outage-status').value,
            notes: document.getElementById('outage-notes').value,
            timestamp: new Date().toISOString()
        };

        const success = await window.saveOutageCloud(dateVal, data);
        if (success) {
            alert(`✅ Se guardó el registro para el día ${dateVal}`);
            outageForm.reset();
            document.getElementById('outage-date').disabled = false;
            cancelEditOutageBtn.classList.add('hidden');
        } else {
            alert("❌ Hubo un error al guardar.");
        }
    });

    window.editOutage = (dateKey) => {
        const outage = window.appState.outages[dateKey];
        if (!outage) return;
        
        document.getElementById('outage-date').value = dateKey;
        document.getElementById('outage-date').disabled = true;
        document.getElementById('outage-status').value = outage.status;
        document.getElementById('outage-notes').value = outage.notes;
        
        cancelEditOutageBtn.classList.remove('hidden');
        switchView('outages');
        window.scrollTo(0, 0);
    };

    cancelEditOutageBtn.addEventListener('click', () => {
        outageForm.reset();
        document.getElementById('outage-date').disabled = false;
        cancelEditOutageBtn.classList.add('hidden');
    });

    // --- LÓGICA DE PUBLICIDAD (ADS) ---
    const adForm = document.getElementById('ad-form');
    const cancelEditAdBtn = document.getElementById('cancel-edit-ad');

    window.renderAds = function() {
        const adsList = document.getElementById('ads-list');
        if (!adsList) return;
        const ads = window.appState.ads || [];
        
        adsList.innerHTML = ads.length === 0
            ? '<p class="text-gray-500 text-sm italic">No hay publicidad activa.</p>'
            : ads.map(ad => `
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <div class="flex items-center gap-3 overflow-hidden">
                        <img src="${ad.imageUrl}" alt="${ad.name}" class="w-10 h-10 rounded-md border">
                        <div class="truncate">
                            <p class="font-bold text-sm truncate">${ad.name}</p>
                            <a href="${ad.linkUrl}" target="_blank" class="text-xs text-blue-600 hover:underline">Ver enlace</a>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="editAd('${ad.id}')" class="text-blue-500">Editar</button>
                        <button onclick="window.deleteAdCloud('${ad.id}')" class="text-red-500">X</button>
                    </div>
                </div>
            `).join('');
    };

    adForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('ad-id').value;
        const name = document.getElementById('ad-name').value;
        const imageUrl = document.getElementById('ad-image').value;
        const linkUrl = document.getElementById('ad-link').value;

        const success = await window.saveAdCloud(id, { name, imageUrl, linkUrl });
        if (success) {
            alert("✅ Anuncio guardado.");
            adForm.reset();
            cancelEditAdBtn.classList.add('hidden');
        }
    });

    window.editAd = (id) => {
        const ad = window.appState.ads.find(a => a.id === id);
        if (!ad) return;

        document.getElementById('ad-id').value = ad.id;
        document.getElementById('ad-name').value = ad.name;
        document.getElementById('ad-image').value = ad.imageUrl;
        document.getElementById('ad-link').value = ad.linkUrl;

        cancelEditAdBtn.classList.remove('hidden');
        window.scrollTo(0, 0);
    };

    cancelEditAdBtn.addEventListener('click', () => {
        adForm.reset();
        cancelEditAdBtn.classList.add('hidden');
    });

    // --- LÓGICA DE MENSAJES ---
    window.renderMessages = function() {
        const msgList = document.getElementById('messages-list');
        if (!msgList) return;
        const msgs = window.appState.messages || [];

        msgList.innerHTML = msgs.length === 0
            ? '<p class="text-gray-500 text-sm italic col-span-full">No hay mensajes.</p>'
            : msgs.map(msg => `
                <div class="bg-purple-50 p-4 rounded-xl border relative">
                    <button onclick="window.deleteMessageCloud('${msg.id}')" class="absolute top-2 right-2 text-red-500">X</button>
                    <p class="font-bold">${msg.name}</p>
                    <p class="text-xs text-gray-500 mb-2">📞 ${msg.phone || 'N/A'} • 🗓️ ${new Date(msg.createdAt).toLocaleDateString()}</p>
                    <p class="text-sm bg-white p-3 rounded-lg border">${msg.message}</p>
                </div>
            `).join('');
    };

    // --- INFO DE NAVBAR ---
    setTimeout(() => {
        if (window.appState && window.appState.user) {
            const adminEmailBox = document.getElementById('admin-email');
            if (adminEmailBox) adminEmailBox.innerText = `Hola, ${window.appState.user.email}`;
        }
    }, 1500);
});
