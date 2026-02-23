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
    const imageUploadInput = document.getElementById('ad-image-upload');
    const imagePreviewContainer = document.getElementById('image-previews');
    let uploadedFiles = [];

    if (imageUploadInput) {
        imageUploadInput.addEventListener('change', (e) => {
            imagePreviewContainer.innerHTML = '';
            uploadedFiles = Array.from(e.target.files);

            uploadedFiles.forEach((file, index) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const previewElement = document.createElement('div');
                    previewElement.className = 'relative border rounded-lg p-2';
                    previewElement.innerHTML = `
                        <img src="${event.target.result}" class="w-24 h-24 object-cover rounded-md">
                        <textarea data-index="${index}" class="w-full mt-2 border rounded-md p-1 text-xs" placeholder="Descripción..."></textarea>
                    `;
                    imagePreviewContainer.appendChild(previewElement);
                };
                reader.readAsDataURL(file);
            });
        });
    }

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
        const linkUrl = document.getElementById('ad-link').value;
        const submitBtn = adForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerText;

        submitBtn.disabled = true;
        submitBtn.innerText = 'Subiendo...';

        try {
            let imageUrls = [];
            let imageDescriptions = [];

            if (uploadedFiles.length > 0) {
                imageUrls = await window.uploadAdImages(uploadedFiles);
                const descriptionElements = imagePreviewContainer.querySelectorAll('textarea');
                imageDescriptions = Array.from(descriptionElements).map(el => el.value);
            } else if (id) {
                // Editing without changing images
                const existingAd = window.appState.ads.find(a => a.id === id);
                imageUrls = existingAd.imageUrls;
                // This part is tricky without a way to edit existing descriptions easily.
                // For now, we assume descriptions are not editable without re-uploading.
                imageDescriptions = existingAd.imageDescriptions || [];
            }

            if (imageUrls.length === 0) {
                alert("Por favor, selecciona al menos una imagen.");
                submitBtn.disabled = false;
                submitBtn.innerText = originalBtnText;
                return;
            }

            const success = await window.saveAdCloud(id, { name, imageUrls, imageDescriptions, linkUrl, createdAt: new Date() });
            if (success) {
                alert("✅ Anuncio guardado.");
                adForm.reset();
                imagePreviewContainer.innerHTML = '';
                uploadedFiles = [];
                cancelEditAdBtn.classList.add('hidden');
            }
        } catch (error) {
            console.error("Error saving ad:", error);
            alert("❌ Hubo un error al guardar el anuncio.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = originalBtnText;
        }
    });

    window.editAd = (id) => {
        const ad = window.appState.ads.find(a => a.id === id);
        if (!ad) return;

        document.getElementById('ad-id').value = ad.id;
        document.getElementById('ad-name').value = ad.name;
        document.getElementById('ad-link').value = ad.linkUrl;
        
        imagePreviewContainer.innerHTML = '';
        uploadedFiles = [];
        
        if (ad.imageUrls && ad.imageUrls.length > 0) {
            ad.imageUrls.forEach((url, index) => {
                const description = (ad.imageDescriptions && ad.imageDescriptions[index]) ? ad.imageDescriptions[index] : '';
                const previewElement = document.createElement('div');
                previewElement.className = 'relative border rounded-lg p-2';
                previewElement.innerHTML = `
                    <img src="${url}" class="w-24 h-24 object-cover rounded-md">
                    <p class="mt-2 text-xs text-gray-600 break-all"><strong>Actual:</strong> ${description || 'Sin descripción'}</p>
                `;
                imagePreviewContainer.appendChild(previewElement);
            });
        }

        cancelEditAdBtn.classList.remove('hidden');
        window.scrollTo(0, 0);
    };

    cancelEditAdBtn.addEventListener('click', () => {
        adForm.reset();
        imagePreviewContainer.innerHTML = '';
        uploadedFiles = [];
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
