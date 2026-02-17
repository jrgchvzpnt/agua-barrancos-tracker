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
            duracion: document.getElementById('outage-duration').value,
            timestamp: new Date()
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
            : ads.map(ad => {
                const imageUrl = Array.isArray(ad.imageUrls) && ad.imageUrls.length > 0 ? ad.imageUrls[0] : ad.imageUrl || 'https://via.placeholder.com/150';
                return `
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <div class="flex items-center gap-3 overflow-hidden">
                        <img src="${imageUrl}" alt="${ad.name}" class="w-10 h-10 rounded-md border">
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
            `}).join('');
    };

    adForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('ad-id').value;
        const name = document.getElementById('ad-name').value;
        const imageUrls = document.getElementById('ad-images').value.split('\n').map(url => url.trim()).filter(url => url);
        const imageDescriptions = document.getElementById('ad-image-descriptions').value.split('\n').map(desc => desc.trim());
        const linkUrl = document.getElementById('ad-link').value;

        if (imageUrls.length === 0) {
            alert("Por favor, agrega al menos una URL de imagen.");
            return;
        }

        const success = await window.saveAdCloud(id, { name, imageUrls, imageDescriptions, linkUrl, createdAt: new Date() });
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
        const images = Array.isArray(ad.imageUrls) ? ad.imageUrls.join('\n') : ad.imageUrl || '';
        document.getElementById('ad-images').value = images;
        const descriptions = Array.isArray(ad.imageDescriptions) ? ad.imageDescriptions.join('\n') : '';
        document.getElementById('ad-image-descriptions').value = descriptions;
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

    // --- CALENDAR LOGIC (ADMIN) ---
    let currentDate = new Date();
    window.selectedDateKey = null;

    function renderAdminCalendar() {
        const grid = document.getElementById('calendar-grid');
        if (!grid) return;

        grid.innerHTML = '';
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayIndex = new Date(year, month, 1).getDay();
        
        for (let i = 0; i < firstDayIndex; i++) {
            grid.appendChild(document.createElement('div'));
        }

        const outages = window.appState ? window.appState.outages : {};

        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const hasOutage = outages[dateKey];
            
            const cell = document.createElement('div');
            cell.className = 'text-center py-2 border rounded-lg cursor-pointer';
            cell.innerText = day;
            cell.onclick = () => openAdminDayModal(dateKey);

            if (hasOutage) {
                cell.classList.add('bg-red-500', 'text-white');
            } else {
                cell.classList.add('bg-gray-100');
            }
            grid.appendChild(cell);
        }
    }

    function openAdminDayModal(dateKey) {
        window.selectedDateKey = dateKey;
        const outages = window.appState ? window.appState.outages : {};
        const data = outages[dateKey];
        
        const modal = document.getElementById('day-modal');
        const modalHeader = document.getElementById('modal-header');
        const modalTitle = document.getElementById('modal-title');
        const modalContent = document.getElementById('modal-content-body');
        const adminActions = document.getElementById('modal-admin-actions');

        document.getElementById('modal-date').innerText = dateKey;

        if (data) {
            modalHeader.className = 'p-4 flex justify-between items-center bg-red-600';
            modalTitle.innerHTML = `Reporte de Corte`;
            modalContent.innerHTML = `
                <p><strong>Estado:</strong> ${data.status}</p>
                <p><strong>Notas:</strong> ${data.notes || 'N/A'}</p>
            `;
            adminActions.classList.remove('hidden');
        } else {
            modalHeader.className = 'p-4 flex justify-between items-center bg-green-600';
            modalTitle.innerHTML = `Servicio Normal`;
            modalContent.innerHTML = `<p>No hay reportes para este día.</p>`;
            adminActions.classList.add('hidden');
        }
        
        modal.showModal();
    }

    window.handleDeleteOutage = async function() {
        if (!window.selectedDateKey) return;
        if (confirm(`¿Seguro que quieres eliminar el registro para ${window.selectedDateKey}?`)) {
            await window.deleteOutageCloud(window.selectedDateKey);
            document.getElementById('day-modal').close();
            renderAdminCalendar();
        }
    }

    // Initial render
    setTimeout(() => {
        renderAdminCalendar();
        window.renderAds();
        window.renderMessages();
    }, 1000);
});
