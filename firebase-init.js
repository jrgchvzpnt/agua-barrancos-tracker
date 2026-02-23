import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app-check.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, getDoc, runTransaction, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// --- CONFIGURACIÓN ---
const firebaseConfig = {
  apiKey: "AIzaSyBTheMMxd2m4cjKGm_7oZ1qL73_xHXFQHA",
  authDomain: "monitor-h2o-barrancos.firebaseapp.com",
  projectId: "monitor-h2o-barrancos",
  storageBucket: "monitor-h2o-barrancos.firebasestorage.app",
  messagingSenderId: "217695747731",
  appId: "1:217695747731:web:392515506f31a216d59766"
};

// --- INICIALIZACIÓN ---
const app = initializeApp(firebaseConfig);

// Activar App Check solo en producción
if (location.hostname === "agua-barrancos-tracker.web.app" || location.hostname === "monitorbarrancos.com") {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider('6LfvsHQsAAAAALHLX9fdNU9PW4g-Hr51Iqy7wId3'),
    isTokenAutoRefreshEnabled: true
  });
}

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Exponer funciones y db globalmente para usarlas en otros scripts como admin.js
window.db = db;
window.getDoc = getDoc;
window.doc = doc;
window.collection = collection;

const outagesCollection = collection(db, 'outages');
const messagesCollection = collection(db, 'messages');
const adsCollection = collection(db, 'ads');

// --- ESTADO GLOBAL ---
window.appState = {
    outages: {},
    isAdmin: false,
    user: null,
    ads: [],
    messages: []
};

// --- LÓGICA DE AUTENTICACIÓN ---
onAuthStateChanged(auth, async (user) => {
    const path = window.location.pathname.toLowerCase();
    const isPublicPage = path.includes('index.html') || path.endsWith('/') || path.endsWith('/agua-barrancos-tracker/');

    if (user && !user.isAnonymous) {
        // User is logged in, now VERIFY if they are an admin.
        const adminDocRef = doc(db, 'admins', user.uid);
        const adminDocSnap = await getDoc(adminDocRef);

        if (adminDocSnap.exists()) {
            // User is a verified admin
            window.appState.user = user;
            window.appState.isAdmin = true;
            
            if (path.includes('login.html')) {
                window.location.href = 'admin.html';
            }
            
            // If on admin page, load admin data
            if (path.includes('admin.html')) {
                syncOutages();
                syncMessages();
                syncAds();
            }
        } else {
            // User is authenticated but NOT an admin. Force sign out.
            await signOut(auth);
            alert("Acceso denegado. No tienes permisos de administrador.");
            window.location.href = 'login.html';
        }
    } else {
        // User is not logged in or is anonymous
        window.appState.user = null;
        window.appState.isAdmin = false;

        // If they are trying to access admin, redirect to login
        if (path.includes('admin.html')) {
            window.location.href = 'login.html';
        }
    }

    // Sincronizar datos y hacer login anónimo solo en páginas públicas
    if (isPublicPage) {
        syncOutages();
        syncAds();
        trackVisit(); // <-- Llamada a la función de tracking

        if (!user) { // Solo intentar login anónimo si no hay ningún usuario
            signInAnonymously(auth).catch((error) => {
                console.error("Error de inicio de sesión anónimo:", error);
                const statusIndicator = document.getElementById('connection-status');
                if (statusIndicator) {
                    statusIndicator.classList.add('bg-red-500');
                    statusIndicator.title = "Error de conexión";
                }
            });
        }
    }
});

// Función para iniciar sesión
window.signIn = async function(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        return { success: true };
    } catch (error) {
        // Do not log detailed error to console in production
        return { success: false, message: "Credenciales incorrectas." };
    }
}

// Función para cerrar sesión
window.signOutUser = async function() {
    try {
        await signOut(auth);
    } catch (error) {
        // Do not log detailed error to console in production
    }
}

// --- LÓGICA DE ANALYTICS ---
async function trackVisit() {
    // Solo contar una visita por sesión del navegador para no inflar las métricas con recargas
    if (sessionStorage.getItem('visitTracked')) {
        return;
    }
    sessionStorage.setItem('visitTracked', 'true');

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    // IDs para los documentos de analytics
    const yearId = `Y_${year}`;
    const monthId = `M_${year}_${month}`;
    const dayId = `D_${year}_${month}_${day}`;

    const analyticsRef = collection(db, 'analytics');
    const yearRef = doc(analyticsRef, yearId);
    const monthRef = doc(analyticsRef, monthId);
    const dayRef = doc(analyticsRef, dayId);

    try {
        // Usamos una transacción para asegurar que los incrementos sean atómicos
        await runTransaction(db, async (transaction) => {
            // No necesitamos leer, `increment` lo hace en el servidor.
            // Simplemente actualizamos los 3 documentos.
            transaction.set(yearRef, { visits: increment(1) }, { merge: true });
            transaction.set(monthRef, { visits: increment(1) }, { merge: true });
            transaction.set(dayRef, { visits: increment(1) }, { merge: true });
        });
    } catch (e) {
        // No loguear errores en producción para no exponer detalles
    }
}


// --- LÓGICA DE DATOS (FIRESTORE) ---

function syncOutages() {
    const statusIndicator = document.getElementById('connection-status');
    if (statusIndicator) statusIndicator.classList.add('bg-yellow-400');

    onSnapshot(outagesCollection, (snapshot) => {
        const outagesData = {};
        snapshot.forEach(doc => {
            outagesData[doc.id] = doc.data();
        });
        window.appState.outages = outagesData;
        
        if (typeof window.renderCalendar === 'function') window.renderCalendar();
        if (typeof window.renderAdsPublic === 'function') window.renderAdsPublic();
        
        if (statusIndicator) {
            statusIndicator.classList.remove('bg-yellow-400', 'bg-red-500');
            statusIndicator.classList.add('bg-green-500');
            statusIndicator.title = "Conectado";
        }
    }, (error) => {
        console.error("Error al sincronizar:", error);
        if (statusIndicator) {
            statusIndicator.classList.remove('bg-yellow-400', 'bg-green-500');
            statusIndicator.classList.add('bg-red-500');
        }
    });
}

window.saveOutageCloud = async function(dateKey, data) {
    if (!window.appState.isAdmin) return false;
    try {
        await setDoc(doc(db, 'outages', dateKey), data);
        return true;
    } catch (error) {
        // Do not log detailed error to console in production
        return false;
    }
};

window.deleteOutageCloud = async function(dateKey) {
    if (!window.appState.isAdmin) return;
    const keyToDelete = dateKey || window.selectedDateKey;
    if (!keyToDelete) return;
    
    try {
        await deleteDoc(doc(db, 'outages', keyToDelete));
    } catch (error) {
        // Do not log detailed error to console in production
        throw error;
    }
};

function syncMessages() {
    onSnapshot(messagesCollection, (snapshot) => {
        const messagesData = [];
        snapshot.forEach(doc => {
            messagesData.push({ id: doc.id, ...doc.data() });
        });
        window.appState.messages = messagesData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        if (typeof window.renderMessages === 'function') window.renderMessages();
    });
}

window.saveMessage = async function(name, phone, message) {
    try {
        const timestamp = new Date().toISOString();
        const docId = `${timestamp}-${name.replace(/\s+/g, '')}`;
        await setDoc(doc(db, 'messages', docId), { name, phone, message, createdAt: timestamp, read: false });
        return { success: true };
    } catch (error) {
        // Do not log detailed error to console in production
        return { success: false };
    }
}

window.deleteMessageCloud = async function(id) {
    if (!window.appState.isAdmin) return;
    if (confirm("¿Seguro que quieres eliminar este mensaje?")) {
        await deleteDoc(doc(db, 'messages', id));
    }
};

function syncAds() {
    onSnapshot(adsCollection, (snapshot) => {
        const adsData = [];
        snapshot.forEach(doc => {
            adsData.push({ id: doc.id, ...doc.data() });
        });
        window.appState.ads = adsData.sort((a, b) => a.name.localeCompare(b.name));
        if (typeof window.renderAds === 'function') window.renderAds();
        if (typeof window.renderAdsPublic === 'function') window.renderAdsPublic();
    });
}

window.saveAdCloud = async function(id, data) {
    if (!window.appState.isAdmin) return false;
    try {
        const docId = id || data.name.toLowerCase().replace(/\s+/g, '-');
        await setDoc(doc(db, 'ads', docId), { ...data, active: true }, { merge: true });
        return true;
    } catch (error) {
        // Do not log detailed error to console in production
        return false;
    }
};

window.deleteAdCloud = async function(id) {
    if (!window.appState.isAdmin) return;
    if (confirm("¿Seguro que quieres eliminar este anuncio?")) {
        await deleteDoc(doc(db, 'ads', id));
    }
};

window.uploadAdImages = async function(files) {
    if (!window.appState.isAdmin) throw new Error("Permiso denegado.");
    const uploadPromises = files.map(file => {
        const storageRef = ref(storage, `ads/${Date.now()}-${file.name}`);
        return uploadBytes(storageRef, file).then(snapshot => getDownloadURL(snapshot.ref));
    });
    return Promise.all(uploadPromises);
};
