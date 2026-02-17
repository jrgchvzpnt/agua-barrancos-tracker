import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- 1. NUEVA IMPORTACIÓN DE APP CHECK ---
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app-check.js";

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

// --- 2. ACTIVACIÓN DE APP CHECK ---
const appCheck = initializeAppCheck(app, {
  // BORRA EL TEXTO DE ABAJO Y PEGA TU CLAVE DE SITIO (MANTÉN LAS COMILLAS SIMPLES):
  provider: new ReCaptchaV3Provider('6LfUTW4sAAAAAHx1OpF-9jswWS8NkEHNvw7tNMZH'),
  isTokenAutoRefreshEnabled: true
});

const auth = getAuth(app);
const db = getFirestore(app);
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
onAuthStateChanged(auth, user => {
    const path = window.location.pathname.toLowerCase();

    if (user && !user.isAnonymous) {
        window.appState.user = user;
        window.appState.isAdmin = true;
        
        if (path.includes('login.html')) {
            window.location.href = 'admin.html';
        }
        
        if (path.includes('admin.html')) {
            syncOutages();
            syncMessages();
            syncAds();
        }
    } else {
        window.appState.user = null;
        window.appState.isAdmin = false;

        if (path.includes('admin.html')) {
            window.location.href = 'login.html';
        }
    }

    // Determinar si estamos en una página pública
    const isPublicPage = path.includes('index.html') || path.endsWith('/') || path.endsWith('/agua-barrancos-tracker/');

    // Sincronizar datos y hacer login anónimo solo en páginas públicas
    if (isPublicPage) {
        syncOutages();
        syncAds();

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
        return { success: false, message: "Credenciales incorrectas." };
    }
}

// Función para cerrar sesión
window.signOutUser = async function() {
    try {
        await signOut(auth);
    } catch (error) {}
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
        return false;
    }
};

window.deleteAdCloud = async function(id) {
    if (!window.appState.isAdmin) return;
    if (confirm("¿Seguro que quieres eliminar este anuncio?")) {
        await deleteDoc(doc(db, 'ads', id));
    }
};