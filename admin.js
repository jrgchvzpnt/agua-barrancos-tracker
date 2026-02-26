document.addEventListener("DOMContentLoaded", () => {
    // --- NAVEGACIÓN DEL SIDEBAR ---
    const navLinks = {
        outages: document.getElementById('nav-outages'),
        sponsors: document.getElementById('nav-sponsors'),
        notices: document.getElementById('nav-notices'),
        calendar: document.getElementById('nav-calendar'),
        messages: document.getElementById('nav-messages'),
        stats: document.getElementById('nav-stats'),
    };

    const sections = {
        outages: document.getElementById('section-outages'),
        sponsors: document.getElementById('section-sponsors'),
        notices: document.getElementById('section-notices'),
        calendar: document.getElementById('section-calendar'),
        messages: document.getElementById('section-messages'),
        stats: document.getElementById('section-stats'),
    };

    function switchView(view) {
        Object.values(sections).forEach(section => section.classList.add('hidden'));
        Object.values(navLinks).forEach(link => link.classList.remove('bg-slate-700'));

        if (sections[view]) sections[view].classList.remove('hidden');
        if (navLinks[view]) navLinks[view].classList.add('bg-slate-700');
    }

    navLinks.outages.addEventListener('click', (e) => { e.preventDefault(); switchView('outages'); });
    navLinks.sponsors.addEventListener('click', (e) => { e.preventDefault(); switchView('sponsors'); });
    navLinks.notices.addEventListener('click', (e) => { e.preventDefault(); switchView('notices'); });
    navLinks.calendar.addEventListener('click', (e) => { e.preventDefault(); switchView('calendar'); });
    navLinks.messages.addEventListener('click', (e) => { e.preventDefault(); switchView('messages'); });
    navLinks.stats.addEventListener('click', (e) => { 
        e.preventDefault(); 
        switchView('stats');
        loadStats(); // Cargar estadísticas al cambiar a esta vista
    });

    switchView('outages');

    // --- LÓGICA DE FALLOS DE AGUA ---
    const outageForm = document.getElementById('outage-form');
    const cancelEditOutageBtn = document.getElementById('cancel-edit-outage');

    outageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const dateVal = document.getElementById('outage-date').value;
        if (!dateVal) return alert("Selecciona una fecha válida.");

        const submitBtn = outageForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerText;
        submitBtn.disabled = true;
        submitBtn.innerText = 'Guardando...';

        try {
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
        } catch (error) {
            console.error("Error al guardar el reporte:", error);
            alert(`❌ Hubo un error: ${error.message}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = originalBtnText;
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
        
        adsList.innerHTML = ''; // Clear previous content

        if (ads.length === 0) {
            const p = document.createElement('p');
            p.className = 'text-gray-500 text-sm italic';
            p.textContent = 'No hay publicidad activa.';
            adsList.appendChild(p);
            return;
        }

        ads.forEach(ad => {
            const imageUrl = Array.isArray(ad.imageUrls) && ad.imageUrls.length > 0 ? ad.imageUrls[0] : ad.imageUrl || 'https://via.placeholder.com/150';
            
            const adItem = document.createElement('div');
            adItem.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg border';

            const leftDiv = document.createElement('div');
            leftDiv.className = 'flex items-center gap-3 overflow-hidden';
            
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = ad.name;
            img.className = 'w-10 h-10 rounded-md border';
            leftDiv.appendChild(img);

            const infoDiv = document.createElement('div');
            infoDiv.className = 'truncate';
            
            const nameP = document.createElement('p');
            nameP.className = 'font-bold text-sm truncate';
            nameP.textContent = ad.name;
            infoDiv.appendChild(nameP);

            const linkA = document.createElement('a');
            linkA.href = ad.linkUrl;
            linkA.target = '_blank';
            linkA.className = 'text-xs text-blue-600 hover:underline';
            linkA.textContent = 'Ver enlace';
            infoDiv.appendChild(linkA);
            leftDiv.appendChild(infoDiv);

            const rightDiv = document.createElement('div');
            rightDiv.className = 'flex gap-2';

            const editBtn = document.createElement('button');
            editBtn.className = 'text-blue-500';
            editBtn.textContent = 'Editar';
            editBtn.onclick = () => editAd(ad.id);
            rightDiv.appendChild(editBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'text-red-500';
            deleteBtn.textContent = 'X';
            deleteBtn.onclick = () => window.deleteAdCloud(ad.id);
            rightDiv.appendChild(deleteBtn);

            adItem.appendChild(leftDiv);
            adItem.appendChild(rightDiv);
            adsList.appendChild(adItem);
        });
    };

    adForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('ad-id').value;
        const name = document.getElementById('ad-name').value;
        const linkUrl = document.getElementById('ad-link').value;
        const imageUrlsString = document.getElementById('ad-images').value;
        const imageDescriptionsString = document.getElementById('ad-image-descriptions').value;
        const submitBtn = adForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerText;

        if (!imageUrlsString || !name || !linkUrl) {
            return alert("Por favor, completa todos los campos requeridos.");
        }

        submitBtn.disabled = true;
        submitBtn.innerText = 'Guardando...';

        try {
            const imageUrls = imageUrlsString.split('\n').map(url => url.trim()).filter(url => url);
            const imageDescriptions = imageDescriptionsString.split('\n').map(desc => desc.trim());

            if (imageUrls.length === 0) {
                alert("Por favor, ingresa al menos una URL de imagen.");
                submitBtn.disabled = false;
                submitBtn.innerText = originalBtnText;
                return;
            }

            const success = await window.saveAdCloud(id, { name, imageUrls, imageDescriptions, linkUrl, createdAt: new Date() });
            if (success) {
                alert("✅ Anuncio guardado.");
                adForm.reset();
                document.getElementById('ad-id').value = '';
                cancelEditAdBtn.classList.add('hidden');
                submitBtn.innerText = '+ Agregar Publicidad';
            } else {
                alert("❌ Hubo un error al guardar el anuncio.");
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
        document.getElementById('ad-images').value = ad.imageUrls ? ad.imageUrls.join('\n') : '';
        document.getElementById('ad-image-descriptions').value = ad.imageDescriptions ? ad.imageDescriptions.join('\n') : '';

        adForm.querySelector('button[type="submit"]').innerText = 'Actualizar Publicidad';
        cancelEditAdBtn.classList.remove('hidden');
        switchView('sponsors');
        window.scrollTo(0, 0);
    };

    cancelEditAdBtn.addEventListener('click', () => {
        adForm.reset();
        document.getElementById('ad-id').value = '';
        cancelEditAdBtn.classList.add('hidden');
        adForm.querySelector('button[type="submit"]').innerText = '+ Agregar Publicidad';
    });

    // --- LÓGICA DE AVISOS ---
    const noticeForm = document.getElementById('notice-form');
    const cancelEditNoticeBtn = document.getElementById('cancel-edit-notice');

    window.renderNotices = function() {
        const noticesList = document.getElementById('notices-list');
        if (!noticesList) return;
        const notices = window.appState.notices || [];
        
        noticesList.innerHTML = '';

        if (notices.length === 0) {
            noticesList.innerHTML = '<p class="text-gray-500 text-sm italic">No hay avisos activos.</p>';
            return;
        }

        notices.forEach(notice => {
            const noticeItem = document.createElement('div');
            const typeText = notice.type === 'community' ? 'Aviso' : 'Tip';
            const typeColor = notice.type === 'community' ? 'blue' : 'amber';
            
            noticeItem.className = `flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-${typeColor}-200`;
            noticeItem.innerHTML = `
                <div class="overflow-hidden">
                    <p class="font-bold text-sm truncate text-${typeColor}-800">${typeText}</p>
                    <p class="text-xs text-gray-600 truncate">${notice.content}</p>
                </div>
                <div class="flex gap-2">
                    <button class="text-blue-500" onclick="editNotice('${notice.id}')">Editar</button>
                    <button class="text-red-500" onclick="window.deleteNoticeCloud('${notice.id}')">X</button>
                </div>
            `;
            noticesList.appendChild(noticeItem);
        });
    };

    noticeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('notice-id').value;
        const type = document.getElementById('notice-type').value;
        const content = document.getElementById('notice-content').value;
        const submitBtn = noticeForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerText;

        if (!content) return alert("Por favor, escribe el contenido del aviso.");

        submitBtn.disabled = true;
        submitBtn.innerText = 'Guardando...';

        try {
            const success = await window.saveNoticeCloud(id, { type, content, createdAt: new Date() });
            if (success) {
                alert("✅ Aviso guardado.");
                noticeForm.reset();
                document.getElementById('notice-id').value = '';
                cancelEditNoticeBtn.classList.add('hidden');
                submitBtn.innerText = '+ Agregar Aviso';
            } else {
                alert("❌ Hubo un error al guardar el aviso.");
            }
        } catch (error) {
            console.error("Error saving notice:", error);
            alert("❌ Hubo un error al guardar el aviso.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = originalBtnText;
        }
    });

    window.editNotice = (id) => {
        const notice = window.appState.notices.find(n => n.id === id);
        if (!notice) return;

        document.getElementById('notice-id').value = notice.id;
        document.getElementById('notice-type').value = notice.type;
        document.getElementById('notice-content').value = notice.content;

        noticeForm.querySelector('button[type="submit"]').innerText = 'Actualizar Aviso';
        cancelEditNoticeBtn.classList.remove('hidden');
        switchView('notices');
        window.scrollTo(0, 0);
    };

    cancelEditNoticeBtn.addEventListener('click', () => {
        noticeForm.reset();
        document.getElementById('notice-id').value = '';
        cancelEditNoticeBtn.classList.add('hidden');
        noticeForm.querySelector('button[type="submit"]').innerText = '+ Agregar Aviso';
    });

    // --- LÓGICA DE MENSAJES ---
    window.renderMessages = function() {
        const msgList = document.getElementById('messages-list');
        if (!msgList) return;
        const msgs = window.appState.messages || [];

        msgList.innerHTML = ''; // Clear previous content

        if (msgs.length === 0) {
            const p = document.createElement('p');
            p.className = 'text-gray-500 text-sm italic col-span-full';
            p.textContent = 'No hay mensajes.';
            msgList.appendChild(p);
            return;
        }

        msgs.forEach(msg => {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'bg-purple-50 p-4 rounded-xl border relative';

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'absolute top-2 right-2 text-red-500';
            deleteBtn.textContent = 'X';
            deleteBtn.onclick = () => window.deleteMessageCloud(msg.id);
            msgDiv.appendChild(deleteBtn);

            const nameP = document.createElement('p');
            nameP.className = 'font-bold';
            nameP.textContent = msg.name;
            msgDiv.appendChild(nameP);

            const contactP = document.createElement('p');
            contactP.className = 'text-xs text-gray-500 mb-2';
            contactP.innerHTML = `
                📞 ${msg.phone || 'N/A'} | 
                📧 ${msg.email || 'N/A'} • 
                🗓️ ${new Date(msg.createdAt).toLocaleDateString()}
            `;
            msgDiv.appendChild(contactP);

            const messageP = document.createElement('p');
            messageP.className = 'text-sm bg-white p-3 rounded-lg border';
            messageP.textContent = msg.message;
            msgDiv.appendChild(messageP);

            msgList.appendChild(msgDiv);
        });
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

    // Renombrado a renderCalendar y expuesto globalmente para ser llamado desde firebase-init.js
    window.renderCalendar = function() {
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

        modalContent.innerHTML = ''; // Clear previous content
        modalTitle.textContent = '';
        document.getElementById('modal-date').textContent = dateKey;

        if (data) {
            modalHeader.className = 'p-4 flex justify-between items-center bg-red-600';
            modalTitle.textContent = 'Reporte de Corte';
            
            const statusP = document.createElement('p');
            statusP.innerHTML = '<strong>Estado:</strong> ';
            statusP.appendChild(document.createTextNode(data.status));
            modalContent.appendChild(statusP);

            const notesP = document.createElement('p');
            notesP.innerHTML = '<strong>Notas:</strong> ';
            notesP.appendChild(document.createTextNode(data.notes || 'N/A'));
            modalContent.appendChild(notesP);

            adminActions.classList.remove('hidden');
        } else {
            modalHeader.className = 'p-4 flex justify-between items-center bg-green-600';
            modalTitle.textContent = 'Servicio Normal';
            const noReportP = document.createElement('p');
            noReportP.textContent = 'No hay reportes para este día.';
            modalContent.appendChild(noReportP);
            adminActions.classList.add('hidden');
        }
        
        modal.showModal();
    }

    window.handleDeleteOutage = async function() {
        if (!window.selectedDateKey) return;
        if (confirm(`¿Seguro que quieres eliminar el registro para ${window.selectedDateKey}?`)) {
            await window.deleteOutageCloud(window.selectedDateKey);
            document.getElementById('day-modal').close();
            // No es necesario llamar a renderCalendar aquí, onSnapshot lo hará automáticamente.
        }
    }

    window.handleEditOutage = function() {
        if (!window.selectedDateKey) return;
        const modal = document.getElementById('day-modal');
        
        // Llama a la función de edición ya existente
        window.editOutage(window.selectedDateKey);
        
        // Cierra el modal
        modal.close();
    }

    // Initial render
    setTimeout(() => {
        // La primera renderización ahora es manejada por el onSnapshot en firebase-init.js
        // que llama a window.renderCalendar() cuando los datos están listos.
        // Mantenemos esto para renderizar ads y mensajes que tienen su propia sincronización.
        window.renderAds();
        window.renderMessages();
        window.renderNotices();
    }, 1000);

    // --- LÓGICA DE ESTADÍSTICAS ---
    async function loadStats() {
        const statsTodayEl = document.getElementById('stats-today');
        const statsMonthEl = document.getElementById('stats-month');
        const statsYearEl = document.getElementById('stats-year');

        // Mostrar un estado de carga
        statsTodayEl.textContent = '...';
        statsMonthEl.textContent = '...';
        statsYearEl.textContent = '...';

        try {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');

            const yearId = `Y_${year}`;
            const monthId = `M_${year}_${month}`;
            const dayId = `D_${year}_${month}_${day}`;

            const analyticsRef = window.collection(window.db, 'analytics');
            
            const yearDocRef = window.doc(analyticsRef, yearId);
            const monthDocRef = window.doc(analyticsRef, monthId);
            const dayDocRef = window.doc(analyticsRef, dayId);

            const [yearSnap, monthSnap, daySnap] = await Promise.all([
                window.getDoc(yearDocRef),
                window.getDoc(monthDocRef),
                window.getDoc(dayDocRef)
            ]);

            statsYearEl.textContent = yearSnap.exists() ? yearSnap.data().visits : 0;
            statsMonthEl.textContent = monthSnap.exists() ? monthSnap.data().visits : 0;
            statsTodayEl.textContent = daySnap.exists() ? daySnap.data().visits : 0;

        } catch (error) {
            console.error("Error al cargar estadísticas:", error);
            statsTodayEl.textContent = 'Error';
            statsMonthEl.textContent = 'Error';
            statsYearEl.textContent = 'Error';
        }
    }
});
