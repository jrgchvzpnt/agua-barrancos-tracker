// --- UI LOGIC ---
let currentDate = new Date();
window.selectedDateKey = null;

window.router = function(viewName) {
    if(viewName === 'admin') {
        window.location.href = 'login.html';
        return;
    }

    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-link').forEach(el => {
        el.classList.remove('active-nav');
    });

    const selectedView = document.getElementById(`view-${viewName}`);
    if(selectedView) selectedView.classList.remove('hidden');

    const activeNav = document.getElementById(`nav-${viewName}`);
    if(activeNav) {
        activeNav.classList.add('active-nav');
    }

    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu) mobileMenu.classList.add('hidden');
    window.scrollTo(0,0);

    if(viewName === 'home') window.renderCalendar();
    if(viewName === 'stats') window.calculateStats();
}

window.toggleMobileMenu = function() {
    document.getElementById('mobile-menu').classList.toggle('hidden');
}

// --- CALENDAR LOGIC ---
window.renderCalendar = function() {
    const grid = document.getElementById('calendar-grid');
    const monthTitle = document.getElementById('calendar-title');
    if (!grid || !monthTitle) return;

    grid.innerHTML = '';
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); 
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    monthTitle.innerText = `${monthNames[month]} ${year}`;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    
    for (let i = 0; i < firstDayIndex; i++) {
        grid.appendChild(document.createElement('div'));
    }

    let daysWithoutWaterThisMonth = 0;
    const outages = window.appState ? window.appState.outages : {};

    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasOutage = outages[dateKey];
        
        const cell = document.createElement('div');
        cell.className = 'calendar-day font-medium text-sm border transition-colors cursor-pointer flex items-center justify-center py-2 rounded-md';
        cell.innerText = day;
        cell.onclick = () => window.openDayModal(dateKey);

        if (hasOutage) {
            cell.classList.add('bg-alert-500', 'text-white', 'border-alert-600', 'shadow-md');
            daysWithoutWaterThisMonth++;
        } else {
            cell.classList.add('bg-white', 'text-slate-700', 'border-slate-100', 'hover:bg-water-50', 'hover:border-water-200');
        }

        const today = new Date();
        if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            cell.classList.add('today-marker');
        }
        grid.appendChild(cell);
    }

    const countSpan = document.getElementById('days-without-count');
    if (countSpan) countSpan.innerText = daysWithoutWaterThisMonth;
    
    const statusText = document.getElementById('status-text');
    if (statusText) {
        if (daysWithoutWaterThisMonth === 0) {
            statusText.innerText = "Excelente";
            statusText.className = "text-2xl font-bold text-green-300";
        } else if (daysWithoutWaterThisMonth < 3) {
            statusText.innerText = "Intermitente";
            statusText.className = "text-2xl font-bold text-yellow-300";
        } else {
            statusText.innerText = "Crítico";
            statusText.className = "text-2xl font-bold text-red-300";
        }
    }
    updateLatestReport();
}

window.openDayModal = function(dateKey) {
    window.selectedDateKey = dateKey;
    const outages = window.appState ? window.appState.outages : {};
    const data = outages[dateKey];
    
    const modal = document.getElementById('day-modal');
    const modalHeader = document.getElementById('modal-header');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content-body');

    modalContent.innerHTML = '';
    modalTitle.innerHTML = '';

    document.getElementById('modal-date').textContent = formatDatePretty(dateKey);
    modalHeader.className = "p-4 flex justify-between items-center transition-colors duration-300";

    if (data) {
        modalHeader.classList.add('bg-alert-600');
        modalTitle.innerHTML = `<div class="flex items-center gap-2"><i data-lucide="alert-triangle" class="w-5 h-5 text-white"></i> <span class="text-white">Reporte de Corte</span></div>`;
        
        const estado = data.status || data.motivo || "Corte registrado";
        const detalle = data.notes || data.comentarios || "Sin comentarios";

        const estadoDiv = document.createElement('div');
        const estadoLabel = document.createElement('p');
        estadoLabel.className = 'text-xs text-slate-500 uppercase font-bold';
        estadoLabel.textContent = 'Estado del Servicio';
        const estadoP = document.createElement('p');
        estadoP.className = 'text-slate-800 font-bold';
        estadoP.textContent = estado;
        estadoDiv.append(estadoLabel, estadoP);
        modalContent.appendChild(estadoDiv);

        if (data.duracion) {
            const duracionDiv = document.createElement('div');
            const duracionLabel = document.createElement('p');
            duracionLabel.className = 'text-xs text-slate-500 uppercase font-bold mt-3';
            duracionLabel.textContent = 'Duración';
            const duracionP = document.createElement('p');
            duracionP.className = 'text-slate-800';
            duracionP.textContent = data.duracion;
            duracionDiv.append(duracionLabel, duracionP);
            modalContent.appendChild(duracionDiv);
        }

        const detalleDiv = document.createElement('div');
        detalleDiv.className = 'mt-3';
        const detalleLabel = document.createElement('p');
        detalleLabel.className = 'text-xs text-slate-500 uppercase font-bold';
        detalleLabel.textContent = 'Detalles / Notas';
        const detalleP = document.createElement('p');
        detalleP.className = 'text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 mt-1';
        detalleP.style.whiteSpace = 'pre-wrap';
        const escapedDetalle = detalle.replace(/</g, "<").replace(/>/g, ">");
        detalleP.innerHTML = escapedDetalle.replace(/\*(.*?)\*/g, '<b>$1</b>');
        detalleDiv.append(detalleLabel, detalleP);
        modalContent.appendChild(detalleDiv);

    } else {
        modalHeader.classList.add('bg-success-600');
        modalTitle.innerHTML = `<div class="flex items-center gap-2"><i data-lucide="check-circle" class="w-5 h-5 text-white"></i> <span class="text-white">Servicio Normal</span></div>`;
        
        const container = document.createElement('div');
        container.className = 'text-center py-4';
        
        const iconContainer = document.createElement('div');
        iconContainer.className = 'bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3';
        iconContainer.innerHTML = '<i data-lucide="thumbs-up" class="w-8 h-8 text-success-600"></i>';
        
        const p1 = document.createElement('p');
        p1.className = 'text-slate-600';
        p1.textContent = 'No hay reportes de fallas para este día.';
        
        const p2 = document.createElement('p');
        p2.className = 'text-xs text-slate-400 mt-2';
        p2.textContent = 'El suministro operó con normalidad.';
        
        container.append(iconContainer, p1, p2);
        modalContent.appendChild(container);
    }
    
    if (modal) modal.showModal();
    if (window.lucide) window.lucide.createIcons();
}

window.changeMonth = function(delta) {
    currentDate.setMonth(currentDate.getMonth() + delta);
    window.renderCalendar();
}

// --- STATS LOGIC ---
window.calculateStats = function() {
    const outages = window.appState ? window.appState.outages : {};
    const keys = Object.keys(outages);
    const currentYear = new Date().getFullYear();
    let totalYear = 0;
    let monthCounts = new Array(12).fill(0);
    
    keys.forEach(dateStr => {
        const [y, m] = dateStr.split('-').map(Number);
        if (y === currentYear) {
            totalYear++;
            monthCounts[m - 1]++;
        }
    });

    const elTotal = document.getElementById('stat-year-total');
    if (elTotal) elTotal.innerText = totalYear;
    
    const currentMonthIndex = new Date().getMonth();
    const elAvg = document.getElementById('stat-average');
    if (elAvg) elAvg.innerText = (totalYear / (currentMonthIndex + 1)).toFixed(1);

    const maxVal = Math.max(...monthCounts);
    const monthNamesShort = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const elWorst = document.getElementById('stat-worst-month');
    if (elWorst) {
        if (maxVal > 0) {
            elWorst.innerText = `${monthNamesShort[monthCounts.indexOf(maxVal)]} (${maxVal})`;
        } else {
            elWorst.innerText = "-";
        }
    }

    let streak = 0;
    let checkDate = new Date();
    for(let i = 0; i < 365; i++) {
         const k = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2,'0')}-${String(checkDate.getDate()).padStart(2,'0')}`;
         if(outages[k]) break;
         streak++;
         checkDate.setDate(checkDate.getDate() - 1);
    }
    const elStreak = document.getElementById('stat-streak');
    if (elStreak) elStreak.innerText = streak;

    const chartContainer = document.getElementById('chart-container');
    if (!chartContainer) return;
    chartContainer.innerHTML = '';
    
    monthCounts.forEach((count) => {
        const maxScale = Math.max(maxVal, 5); 
        const percent = (count / maxScale) * 100;
        const barWrapper = document.createElement('div');
        barWrapper.className = 'w-full flex flex-col justify-end items-center h-full relative';
        
        const bar = document.createElement('div');
        bar.className = 'w-full bg-water-100 group-hover:bg-water-500 transition-colors rounded-t-md';
        bar.style.height = count > 0 ? `${Math.max(percent, 5)}%` : '4px';
        
        if(count > 0) {
            const label = document.createElement('div');
            label.className = 'absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-600';
            label.innerText = count;
            barWrapper.appendChild(label);
        }
        barWrapper.appendChild(bar);
        chartContainer.appendChild(barWrapper);
    });
}

// --- FORM HANDLERS ---
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = e.target.querySelector('button');
        const lastSubmit = localStorage.getItem('lastMessageTimestamp');
        const currentTime = new Date().getTime();

        if (lastSubmit && (currentTime - lastSubmit < 60000)) { // 60 seconds cooldown
            const timeLeft = Math.ceil((60000 - (currentTime - lastSubmit)) / 1000);
            window.showToast(`Debes esperar ${timeLeft} segundos para enviar otro mensaje.`, true);
            return;
        }

        const formData = new FormData(e.target);
        const name = formData.get('name');
        const email = formData.get('email');
        const phone = formData.get('phone');
        const message = formData.get('message');
        
        if (!email && !phone) {
            window.showToast("Debes proporcionar un email o un teléfono.", true);
            return;
        }

        const originalText = btn.innerText;
        btn.disabled = true;
        btn.innerText = 'Enviando...';

        if (window.saveMessage) {
            const contactInfo = phone || email;
            const result = await window.saveMessage(name, contactInfo, message);
            
            if (result.success) {
                window.showToast("¡Mensaje enviado con éxito!");
                localStorage.setItem('lastMessageTimestamp', new Date().getTime());
                e.target.reset();
            } else {
                window.showToast("Error al enviar el mensaje.", true);
            }
        }
        btn.disabled = false;
        btn.innerText = originalText;
    });
}

function updateLatestReport() {
    const outages = window.appState ? window.appState.outages : {};
    const container = document.getElementById('latest-report-container');
    if (!container) return;

    container.innerHTML = ''; // Clear previous content

    const reports = Object.entries(outages)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => (b.timestamp || 0) < (a.timestamp || 0) ? -1 : 1);

    if (reports.length > 0) {
        const lastReport = reports[0];
        const { date, status, motivo, notes, comentarios, duracion } = lastReport;
        
        const estado = status || motivo || "Corte de agua reportado";
        const detalle = notes || comentarios || (duracion ? `Duración: ${duracion}` : "Sin detalles adicionales");

        // Safely create and append elements
        const reportDiv = document.createElement('div');
        reportDiv.className = 'border-l-4 border-alert-500 pl-4 py-1';

        const dateP = document.createElement('p');
        dateP.className = 'text-xs text-slate-500 font-semibold uppercase mb-1';
        dateP.textContent = formatDatePretty(date);
        reportDiv.appendChild(dateP);

        const estadoP = document.createElement('p');
        estadoP.className = 'font-bold text-slate-800';
        estadoP.textContent = estado;
        reportDiv.appendChild(estadoP);

        const detalleP = document.createElement('p');
        detalleP.className = 'text-sm text-slate-500 mt-1';
        
        // Aplicar formato para saltos de línea y negritas
        detalleP.style.whiteSpace = 'pre-wrap';
        const escapedDetalle = detalle.replace(/</g, "<").replace(/>/g, ">");
        detalleP.innerHTML = escapedDetalle.replace(/\*(.*?)\*/g, '<b>$1</b>');

        reportDiv.appendChild(detalleP);

        container.appendChild(reportDiv);
    } else {
        const noReportsP = document.createElement('p');
        noReportsP.className = 'text-sm text-slate-500 italic';
        noReportsP.textContent = 'No hay registros recientes.';
        container.appendChild(noReportsP);
    }
}

// --- UTILS ---
window.showToast = function(msg, isError = false) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-msg');
    const toastIcon = document.getElementById('toast-icon');
    
    if (!toast || !toastMsg || !toastIcon) return;
    toastMsg.innerText = msg;
    
    if(isError) {
         toastIcon.innerHTML = '<i data-lucide="alert-circle" class="text-red-400 w-5 h-5"></i>';
    } else {
         toastIcon.innerHTML = '<i data-lucide="check-circle" class="text-green-400 w-5 h-5"></i>';
    }
    if (window.lucide) window.lucide.createIcons();
    
    toast.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 3000);
}

function formatDatePretty(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m-1, d);
    return date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// --- INIT ---
window.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) window.lucide.createIcons();
    window.router('home');

    document.getElementById('prev-btn').addEventListener('click', () => {
        if (!currentSponsor) return;
        currentImageIndex = (currentImageIndex - 1 + currentSponsor.imageUrls.length) % currentSponsor.imageUrls.length;
        updateCarousel();
    });

    document.getElementById('next-btn').addEventListener('click', () => {
        if (!currentSponsor) return;
        currentImageIndex = (currentImageIndex + 1) % currentSponsor.imageUrls.length;
        updateCarousel();
    });
});

// --- RENDER ADS (PUBLIC) ---
window.renderAdsPublic = function() {
    const bannerContainer = document.getElementById('ads-banner-public');
    if (!bannerContainer) return;
    const ads = window.appState.ads || [];

    bannerContainer.innerHTML = ''; // Clear previous content

    if (ads.length === 0) {
        const placeholderDiv = document.createElement('div');
        placeholderDiv.className = 'col-span-full bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-6 text-center';
        const placeholderP = document.createElement('p');
        placeholderP.className = 'text-slate-400 text-sm';
        placeholderP.textContent = 'Espacio para Patrocinadores';
        placeholderDiv.appendChild(placeholderP);
        bannerContainer.appendChild(placeholderDiv);
        return;
    }

    ads.forEach(ad => {
        const imageUrl = Array.isArray(ad.imageUrls) && ad.imageUrls.length > 0 ? ad.imageUrls[0] : ad.imageUrl || 'https://via.placeholder.com/150';
        
        const card = document.createElement('div');
        card.className = 'sponsor-card';
        card.onclick = () => openSponsorModal(ad);

        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = ad.name;
        
        card.appendChild(img);
        bannerContainer.appendChild(card);
    });
};

// --- SPONSOR CAROUSEL LOGIC ---
let currentImageIndex = 0;
let currentSponsor = null;

function openSponsorModal(ad) {
    const images = Array.isArray(ad.imageUrls) ? ad.imageUrls : [ad.imageUrl];
    if (!images || images.length === 0) return;

    currentSponsor = { ...ad, imageUrls: images };
    currentImageIndex = 0;
    
    const modal = document.getElementById('sponsor-modal');
    document.getElementById('sponsor-modal-title').innerText = ad.name;
    document.getElementById('sponsor-contact-link').href = ad.linkUrl;
    
    updateCarousel();
    
    modal.showModal();
    if (window.lucide) window.lucide.createIcons();
}

function updateCarousel() {
    const carousel = document.getElementById('sponsor-carousel');
    const descriptionContainer = document.getElementById('sponsor-description');
    const descriptionTextEl = document.getElementById('sponsor-description-text');

    if (carousel && descriptionContainer && descriptionTextEl) {
        carousel.innerHTML = ''; // Clear previous image
        const img = document.createElement('img');
        img.src = currentSponsor.imageUrls[currentImageIndex];
        img.className = 'max-h-full max-w-full object-contain';
        carousel.appendChild(img);

        const descriptions = currentSponsor.imageDescriptions || [];
        const description = descriptions[currentImageIndex];

        if (description) {
            descriptionTextEl.textContent = description;
            descriptionContainer.classList.remove('hidden');
        } else {
            descriptionContainer.classList.add('hidden');
        }
        
        // Ensure icons are always rendered if they exist in the new structure
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }
}
