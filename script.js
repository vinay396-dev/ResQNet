// ============================================
// ANIMAL RESCUE PLATFORM - UPDATED JAVASCRIPT
// (Per-user data isolation: notifications, activities,
//  and memories are filtered by currentUser.phone)
// ============================================

/* Data storage */
let registeredUsers = []; // store registered users {name, phone, password}
let userNotifications = []; // global store of all user reports (each has userPhone)
let ngoNotifications = [];  // global NGO view (mirrors reports)
let userActivities = [];    // all activities (each has userPhone)
let userMemories = [];      // all memories (each has userPhone)

let ngoData = {
    name: "Animal Rescue Foundation",
    id: "ARF2025",
    phone: "9876543211",
    password: "ngo123", // demo password
    rescuesCompleted: 0,
    totalReports: 0,
    pendingRequests: 0,
    verifiedReports: 0
};

let currentUser = null;
let map;
let marker;
let currentNotificationId = null;
let stream = null;
let capturedPhoto = null;
let capturedPhotoUrl = null;

/* Supabase setup */
const SUPABASE_URL = window.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
let supabaseClient = null;
function initSupabase() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !window.supabase) {
        console.warn('Supabase not initialized: missing URL/KEY or library.');
        return;
    }
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase initialized.');
}

/* Supabase helpers (tables: registered_users, reports, activities, memories; storage bucket: report-photos) */
const TABLE_USERS = 'registered_users';
const TABLE_REPORTS = 'reports';
const TABLE_ACTIVITIES = 'activities';
const TABLE_MEMORIES = 'memories';
const BUCKET_REPORT_PHOTOS = 'report-photos';

async function sbFetchUserByPhone(phone) {
    const { data, error } = await supabaseClient.from(TABLE_USERS).select('*').eq('phone', phone).limit(1).maybeSingle();
    if (error) throw error;
    return data || null;
}
async function sbCreateUser(user) {
    const { data, error } = await supabaseClient.from(TABLE_USERS).insert(user).select('*').single();
    if (error) throw error;
    return data;
}
async function sbListReportsForUser(phone) {
    const { data, error } = await supabaseClient.from(TABLE_REPORTS).select('*').eq('user_phone', phone).order('id', { ascending: false }).limit(50);
    if (error) throw error;
    return data || [];
}
async function sbListAllReports() {
    const { data, error } = await supabaseClient.from(TABLE_REPORTS).select('*').order('id', { ascending: false }).limit(100);
    if (error) throw error;
    return data || [];
}
async function sbInsertReport(report) {
    const { data, error } = await supabaseClient.from(TABLE_REPORTS).insert(report).select('*').single();
    if (error) throw error;
    return data;
}
async function sbGetReportById(id) {
    const { data, error } = await supabaseClient.from(TABLE_REPORTS).select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data || null;
}
async function sbUpdateReportStatus(id, status) {
    const { data, error } = await supabaseClient.from(TABLE_REPORTS).update({ status }).eq('id', id).select('*').single();
    if (error) throw error;
    return data;
}
async function sbInsertActivity(activity) {
    const { data, error } = await supabaseClient.from(TABLE_ACTIVITIES).insert(activity).select('*').single();
    if (error) throw error;
    return data;
}
async function sbListActivitiesForUser(phone) {
    const { data, error } = await supabaseClient.from(TABLE_ACTIVITIES).select('*').eq('user_phone', phone).order('id', { ascending: false }).limit(100);
    if (error) throw error;
    return data || [];
}
async function sbInsertMemory(memory) {
    const { data, error } = await supabaseClient.from(TABLE_MEMORIES).insert(memory).select('*').single();
    if (error) throw error;
    return data;
}
async function sbListMemoriesForUser(phone) {
    const { data, error } = await supabaseClient.from(TABLE_MEMORIES).select('*').eq('user_phone', phone).order('id', { ascending: false }).limit(100);
    if (error) throw error;
    return data || [];
}
async function sbUploadReportPhoto(id, fileOrBlob) {
    if (!fileOrBlob) return null;
    try {
        const filePath = `${id}.jpg`;
        const contentType = (fileOrBlob && fileOrBlob.type) ? fileOrBlob.type : 'image/jpeg';
        const { error: upErr } = await supabaseClient.storage.from(BUCKET_REPORT_PHOTOS).upload(filePath, fileOrBlob, { upsert: true, contentType });
        if (upErr) throw upErr;
        const { data } = supabaseClient.storage.from(BUCKET_REPORT_PHOTOS).getPublicUrl(filePath);
        return data?.publicUrl || null;
    } catch (e) {
        console.warn('Photo upload failed:', e.message || e);
        return null;
    }
}

/* Init */
document.addEventListener('DOMContentLoaded', function() {
    initSupabase();
    loadNgoDataFromStorage();
    setupEventListeners();
    if (!supabaseClient) addSampleData();
    initSloganRotation();
    updateHomeVisibility();
    initStatsCounter();
});

/* Stats Counter Animation */
function initStatsCounter() {
    const statNumbers = document.querySelectorAll('.stat-number');
    let hasAnimated = false;

    function animateStats() {
        if (hasAnimated) return;
        
        statNumbers.forEach(stat => {
            const target = parseInt(stat.getAttribute('data-target'));
            const duration = 2000; // 2 seconds
            const increment = target / (duration / 16); // 60fps
            let current = 0;

            const updateCounter = () => {
                current += increment;
                if (current < target) {
                    stat.textContent = Math.floor(current);
                    requestAnimationFrame(updateCounter);
                } else {
                    stat.textContent = target;
                    hasAnimated = true;
                }
            };

            updateCounter();
        });
    }

    // Use Intersection Observer to trigger animation when section is visible
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !hasAnimated) {
                animateStats();
            }
        });
    }, { threshold: 0.3 });

    const statsSection = document.querySelector('.impact-stats-section');
    if (statsSection) {
        observer.observe(statsSection);
    }
}

/* NGO persistence (localStorage) */
function loadNgoDataFromStorage() {
    try {
        const json = localStorage.getItem('ngoData');
        if (json) {
            const parsed = JSON.parse(json);
            if (parsed && parsed.id && parsed.phone && parsed.password) {
                ngoData.id = parsed.id;
                ngoData.phone = parsed.phone;
                ngoData.password = parsed.password;
                if (parsed.name) ngoData.name = parsed.name;
            }
        }
    } catch (_) { /* ignore */ }
}
function saveNgoDataToStorage() {
    try {
        localStorage.setItem('ngoData', JSON.stringify({ id: ngoData.id, phone: ngoData.phone, password: ngoData.password, name: ngoData.name }));
    } catch (_) { /* ignore */ }
}

/* Slogan rotation (unchanged) */
function initSloganRotation() {
    let sloganIndex = 0;
    const slogans = document.querySelectorAll('.slogan');
    setInterval(() => {
        slogans.forEach(s => s.classList.remove('active'));
        sloganIndex = (sloganIndex + 1) % slogans.length;
        slogans[sloganIndex].classList.add('active');
    }, 3000);
}

/* Visibility management: Hide home content when dashboards/login/register are active */
function updateHomeVisibility() {
    const userDashActive = document.getElementById('user-dashboard')?.classList.contains('active');
    const ngoDashActive = document.getElementById('ngo-dashboard')?.classList.contains('active');
    const userLoginActive = document.getElementById('user-login')?.classList.contains('active');
    const userRegActive = document.getElementById('user-registration')?.classList.contains('active');
    const ngoLoginActive = document.getElementById('ngo-login')?.classList.contains('active');
    const ngoRegActive = document.getElementById('ngo-registration')?.classList.contains('active');
    
    const hideHome = userDashActive || ngoDashActive || userLoginActive || userRegActive || ngoLoginActive || ngoRegActive;
    
    // Hide/show all home content
    const homeElements = [
        '.hero',
        '.animal-actions-section',
        '.impact-stats-section',
        '#user-type-selection'
    ];
    
    homeElements.forEach(selector => {
        const el = document.querySelector(selector);
        if (el) {
            if (selector === '#user-type-selection') {
                el.style.display = hideHome ? 'none' : 'flex';
            } else {
                el.style.display = hideHome ? 'none' : '';
            }
        }
    });
}

/* Map init (unchanged) */
function initMap() {
    if (map) return;
    map = L.map('map').setView([20.5937, 78.9629], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

/* Event listeners: mostly unchanged; ensures hero visibility updates */
function setupEventListeners() {
    // Header nav
    document.querySelector('.home-link').addEventListener('click', e => { e.preventDefault(); showHomePage(); });
    document.querySelector('.about-link').addEventListener('click', e => { e.preventDefault(); document.getElementById('about-modal').style.display = 'block'; });
    document.querySelector('.login-link').addEventListener('click', e => { e.preventDefault(); document.getElementById('login-selection-modal').style.display = 'block'; });
    document.querySelector('.signup-link').addEventListener('click', e => { e.preventDefault(); document.getElementById('signup-selection-modal').style.display = 'block'; });

    // hero buttons
    document.querySelector('.start-rescuing-btn').addEventListener('click', () => {
        document.getElementById('user-type-selection').style.display = 'flex';
        updateHomeVisibility();
    });
    document.querySelector('.learn-more-btn').addEventListener('click', () => document.getElementById('about-modal').style.display = 'block');

    // login/signup selection
    document.getElementById('user-login-option').addEventListener('click', () => { closeAllModals(); document.getElementById('user-login').classList.add('active'); updateHomeVisibility(); });
    document.getElementById('ngo-login-option').addEventListener('click', () => { closeAllModals(); document.getElementById('ngo-login').classList.add('active'); updateHomeVisibility(); });
    document.getElementById('user-signup-option').addEventListener('click', () => { closeAllModals(); document.getElementById('user-registration').classList.add('active'); updateHomeVisibility(); });
    document.getElementById('ngo-signup-option').addEventListener('click', () => { closeAllModals(); document.getElementById('ngo-registration').classList.add('active'); updateHomeVisibility(); });

    // user/ngo quick buttons
    document.querySelectorAll('.user-btn').forEach(b => b.addEventListener('click', () => { document.getElementById('user-registration').classList.add('active'); document.getElementById('user-type-selection').style.display='none'; updateHomeVisibility(); }));
    document.querySelectorAll('.ngo-btn').forEach(b => b.addEventListener('click', () => { document.getElementById('ngo-registration').classList.add('active'); document.getElementById('user-type-selection').style.display='none'; updateHomeVisibility(); }));

    // back buttons
    document.querySelectorAll('.back-to-selection').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('user-registration').classList.remove('active');
            document.getElementById('user-login').classList.remove('active');
            document.getElementById('ngo-registration').classList.remove('active');
            document.getElementById('ngo-login').classList.remove('active');
            document.getElementById('user-type-selection').style.display = 'flex';
            updateHomeVisibility();
        });
    });

    // forms
    document.getElementById('user-registration-form').addEventListener('submit', handleUserRegistration);
    document.getElementById('user-login-form').addEventListener('submit', handleUserLogin);
    document.getElementById('ngo-registration-form').addEventListener('submit', handleNgoRegistration);
    document.getElementById('ngo-login-form').addEventListener('submit', handleNgoLogin);

    // file/camera/report/location
    document.getElementById('choose-file-btn').addEventListener('click', () => document.getElementById('file-input').click());
    document.getElementById('file-input').addEventListener('change', handleFileSelect);
    document.getElementById('take-photo-btn').addEventListener('click', e => { e.preventDefault(); openCamera(); });
    document.getElementById('capture-btn').addEventListener('click', capturePhoto);
    document.getElementById('retake-btn').addEventListener('click', retakePhoto);
    document.getElementById('use-photo-btn').addEventListener('click', usePhoto);
    document.getElementById('submit-report-btn').addEventListener('click', submitReport);
    document.getElementById('detect-location-btn').addEventListener('click', detectLocation);

    // dashboards
    document.getElementById('user-dashboard-btn').addEventListener('click', () => { showUserPage('user-dashboard-page'); });
    document.getElementById('user-profile-btn').addEventListener('click', () => { showUserPage('user-profile-page'); });
    document.getElementById('user-activities-btn').addEventListener('click', () => { showUserPage('user-activities-page'); });
    document.getElementById('user-memories-btn').addEventListener('click', () => { showUserPage('user-memories-page'); });
    document.getElementById('user-logout-btn').addEventListener('click', logout);
    document.getElementById('ngo-dashboard-btn').addEventListener('click', () => { showNgoPage('ngo-dashboard-page'); });
    document.getElementById('ngo-details-btn').addEventListener('click', () => { showNgoPage('ngo-details-page'); });
    document.getElementById('rescue-stats-btn').addEventListener('click', () => { showNgoPage('rescue-stats-page'); });
    document.getElementById('ngo-logout-btn').addEventListener('click', logout);

    // modal closes + outside click
    document.querySelectorAll('.close').forEach(c => c.addEventListener('click', closeAllModals));
    window.addEventListener('click', e => { if (e.target.classList?.contains('modal')) closeAllModals(); });

    // rating/feedback
    document.querySelectorAll('.star').forEach(star => star.addEventListener('click', function() { setRating(this.getAttribute('data-rating')); }));
    document.getElementById('submit-feedback-btn').addEventListener('click', submitFeedback);

    // modal actions
    document.getElementById('verify-report-btn').addEventListener('click', verifyReport);
    document.getElementById('complete-rescue-btn').addEventListener('click', completeRescue);
}

/* close modals helper */
function closeAllModals() {
    ['feedback-modal','notification-modal','camera-modal','photo-preview-modal','login-selection-modal','signup-selection-modal','about-modal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    stopCamera();
}

/* Navigation helpers */
function showHomePage() {
    closeAllModals();
    ['user-registration','user-login','ngo-registration','ngo-login'].forEach(id => document.getElementById(id)?.classList.remove('active'));
    document.getElementById('user-type-selection').style.display = 'none';
    document.getElementById('user-dashboard').classList.remove('active');
    document.getElementById('ngo-dashboard').classList.remove('active');
    updateHomeVisibility();
}

function showUserTypeSelection() {
    document.getElementById('user-type-selection').style.display = 'flex';
    updateHomeVisibility();
}

/* === AUTH: registration/login === */

/* USER registration */
function handleUserRegistration(e) {
    e.preventDefault();
    const name = document.getElementById('user-name').value.trim();
    const phone = document.getElementById('user-phone').value.trim();
    const password = document.getElementById('user-password').value.trim();
    const confirm = document.getElementById('user-confirm-password').value.trim();

    if (!name || !phone || !password || !confirm) { alert('Please fill all fields'); return; }
    if (password !== confirm) { alert('Passwords do not match'); return; }

    // check duplicate
    if (registeredUsers.some(u => u.phone === phone)) {
        alert('Phone already registered. Please login.');
        return;
    }

    const user = { name, phone, password };
    if (supabaseClient) {
        // store in Supabase
        sbCreateUser({ name, phone, password })
            .then(created => { currentUser = { name: created.name, phone: created.phone, password: created.password }; finishUserLoginUI(); alert('Registration successful — you are logged in.'); })
            .catch(err => { console.error(err); alert('Registration failed. If already registered, please login.'); });
        return;
    }
    // fallback local
    registeredUsers.push(user);
    currentUser = user;
    finishUserLoginUI();
}

/* USER login */
function handleUserLogin(e) {
    e.preventDefault();
    const phone = document.getElementById('user-login-phone').value.trim();
    const password = document.getElementById('user-login-password').value.trim();
    if (!phone || !password) { alert('Enter phone and password'); return; }
    if (supabaseClient) {
        sbFetchUserByPhone(phone)
            .then(user => {
                if (!user || user.password !== password) { alert('Invalid credentials!'); return; }
                currentUser = { name: user.name, phone: user.phone, password: user.password };
                finishUserLoginUI(true);
            })
            .catch(err => { console.error(err); alert('Login failed.'); });
        return;
    }
    const found = registeredUsers.find(u => u.phone === phone && u.password === password);
    if (!found) { alert('Invalid credentials!'); return; }
    currentUser = found;
    finishUserLoginUI(true);
}

function finishUserLoginUI(isLogin = false) {
    if (isLogin) document.getElementById('user-login').classList.remove('active');
    else document.getElementById('user-registration').classList.remove('active');
    document.getElementById('user-dashboard').classList.add('active');
    document.getElementById('ngo-dashboard').classList.remove('active'); // Ensure NGO dashboard is hidden
    document.getElementById('user-welcome').textContent = `Welcome, ${currentUser.name}!`;
    updateUserProfile();
    displayUserNotifications();
    displayUserActivities();
    displayUserMemories();
    updateHomeVisibility(); // Hide all home content
}

/* NGO registration */
function handleNgoRegistration(e) {
    e.preventDefault();
    const ngoId = document.getElementById('ngo-id').value.trim();
    const phone = document.getElementById('ngo-phone').value.trim();
    const password = document.getElementById('ngo-password').value.trim();
    const confirm = document.getElementById('ngo-confirm-password').value.trim();

    if (!ngoId || !phone || !password || !confirm) { alert('Please fill all fields'); return; }
    if (password !== confirm) { alert('Passwords do not match'); return; }

    ngoData.id = ngoId;
    ngoData.phone = phone;
    ngoData.password = password;
    saveNgoDataToStorage();
    document.getElementById('ngo-registration').classList.remove('active');
    document.getElementById('ngo-dashboard').classList.add('active');
    document.getElementById('user-dashboard').classList.remove('active'); // Ensure user dashboard is hidden
    updateNgoStats();
    displayNgoNotifications();
    updateHomeVisibility(); // Hide all home content
    alert('NGO registered and logged in.');
}

/* NGO login */
function handleNgoLogin(e) {
    e.preventDefault();
    const ngoId = document.getElementById('ngo-login-id').value.trim();
    const phone = document.getElementById('ngo-login-phone').value.trim();
    const password = document.getElementById('ngo-login-password').value.trim();
    // ensure we load latest stored credentials
    loadNgoDataFromStorage();
    if (ngoData.id === ngoId && ngoData.phone === phone && ngoData.password === password) {
        document.getElementById('ngo-login').classList.remove('active');
        document.getElementById('ngo-dashboard').classList.add('active');
        document.getElementById('user-dashboard').classList.remove('active'); // Ensure user dashboard is hidden
        updateNgoStats();
        displayNgoNotifications();
        updateHomeVisibility(); // Hide all home content
    } else {
        alert('Invalid NGO credentials!');
    }
}

/* logout */
function logout() {
    currentUser = null;
    // hide dashboards and show home
    document.getElementById('user-dashboard').classList.remove('active');
    document.getElementById('ngo-dashboard').classList.remove('active');
    document.getElementById('user-login-form').reset();
    document.getElementById('ngo-login-form').reset();
    document.getElementById('user-registration').classList.remove('active');
    document.getElementById('ngo-registration').classList.remove('active');
    showHomePage();
    alert('Logged out.');
}

/* === Dashboard nav helpers === */
function showUserPage(pageId) {
    document.querySelectorAll('#user-dashboard .page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');

    if (pageId === 'user-dashboard-page' && !map) setTimeout(initMap, 100);

    document.querySelectorAll('#user-dashboard .menu-item').forEach(it => it.classList.remove('active'));
    // set active menu item
    const mapping = {
        'user-dashboard-page':'user-dashboard-btn',
        'user-profile-page':'user-profile-btn',
        'user-activities-page':'user-activities-btn',
        'user-memories-page':'user-memories-btn'
    };
    document.getElementById(mapping[pageId])?.classList.add('active');

    // refresh content
    if (pageId === 'user-profile-page') updateUserProfile();
    if (pageId === 'user-activities-page') displayUserActivities();
    if (pageId === 'user-memories-page') displayUserMemories();
}

/* Show NGO pages similar */
function showNgoPage(pageId) {
    document.querySelectorAll('#ngo-dashboard .page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');

    document.querySelectorAll('#ngo-dashboard .menu-item').forEach(it => it.classList.remove('active'));
    const mapping = {
        'ngo-dashboard-page':'ngo-dashboard-btn',
        'ngo-details-page':'ngo-details-btn',
        'rescue-stats-page':'rescue-stats-btn'
    };
    document.getElementById(mapping[pageId])?.classList.add('active');

    if (pageId === 'ngo-details-page') updateNgoDetails();
    if (pageId === 'rescue-stats-page') updateNgoStats();
}

/* === Profile / stats updates === */
function updateUserProfile() {
    if (!currentUser) return;
    document.getElementById('profile-name').value = currentUser.name;
    document.getElementById('profile-phone').value = currentUser.phone;

    // show counts filtered for currentUser
    if (supabaseClient) {
        Promise.all([
            sbListReportsForUser(currentUser.phone),
            sbListMemoriesForUser(currentUser.phone)
        ]).then(([reports, memories]) => {
            document.getElementById('profile-reports').value = reports.length;
            document.getElementById('profile-rescues').value = memories.length;
        }).catch(err => {
            console.error(err);
            // fallback to local counts if something goes wrong
            const reportsCount = userNotifications.filter(n => n.userPhone === currentUser.phone).length;
            const rescuesCount = userMemories.filter(m => m.userPhone === currentUser.phone).length;
            document.getElementById('profile-reports').value = reportsCount;
            document.getElementById('profile-rescues').value = rescuesCount;
        });
        return;
    }
    const reportsCount = userNotifications.filter(n => n.userPhone === currentUser.phone).length;
    const rescuesCount = userMemories.filter(m => m.userPhone === currentUser.phone).length;
    document.getElementById('profile-reports').value = reportsCount;
    document.getElementById('profile-rescues').value = rescuesCount;
}

function updateNgoDetails() {
    document.getElementById('ngo-detail-name').value = ngoData.name;
    document.getElementById('ngo-detail-id').value = ngoData.id;
    document.getElementById('ngo-detail-phone').value = ngoData.phone;
}

function updateNgoStats() {
    if (supabaseClient) {
        sbListAllReports()
            .then(list => {
                const completed = list.filter(r => r.status === 'success').length;
                const pending = list.filter(r => r.status === 'pending').length;
                const verified = list.filter(r => r.status === 'verified').length;
                document.getElementById('rescue-count').textContent = `Rescues Completed: ${completed}`;
                document.getElementById('stats-total').value = completed;
                document.getElementById('stats-pending').value = pending;
                document.getElementById('stats-verified').value = verified;
                const totalProcessed = completed + verified;
                const successRate = totalProcessed === 0 ? 0 : Math.round((completed / totalProcessed) * 100);
                document.getElementById('stats-success').value = `${successRate}%`;
            })
            .catch(err => console.error(err));
        return;
    }
    document.getElementById('rescue-count').textContent = `Rescues Completed: ${ngoData.rescuesCompleted}`;
    document.getElementById('stats-total').value = ngoData.rescuesCompleted;
    document.getElementById('stats-pending').value = ngoData.pendingRequests;
    document.getElementById('stats-verified').value = ngoData.verifiedReports;
    const totalProcessed = ngoData.rescuesCompleted + ngoData.verifiedReports;
    const successRate = totalProcessed === 0 ? 0 : Math.round((ngoData.rescuesCompleted / totalProcessed) * 100);
    document.getElementById('stats-success').value = `${successRate}%`;
}

/* === File & Camera functions (unchanged) === */
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        document.getElementById('file-name').textContent = file.name;
        capturedPhoto = file;
        capturedPhotoUrl = URL.createObjectURL(file);
        showPhotoPreviewInForm(capturedPhotoUrl);
    }
}
function showPhotoPreviewInForm(photoUrl) {
    const preview = document.getElementById('photo-preview');
    const previewImg = document.getElementById('preview-img');
    previewImg.src = photoUrl;
    preview.style.display = 'block';
    previewImg.onclick = () => showPhotoPreviewModal(photoUrl);
}
function showPhotoPreviewModal(photoUrl) {
    const modalPhoto = document.getElementById('modal-photo');
    modalPhoto.src = photoUrl;
    document.getElementById('photo-preview-modal').style.display = 'block';
}

function openCamera() {
    document.getElementById('camera-modal').style.display = 'block';
    const video = document.getElementById('camera-preview');
    const statusDiv = document.getElementById('camera-status');
    document.getElementById('capture-btn').style.display = 'inline-block';
    document.getElementById('retake-btn').style.display = 'none';
    document.getElementById('use-photo-btn').style.display = 'none';
    statusDiv.textContent = 'Initializing camera...';
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        .then(mediaStream => {
            stream = mediaStream;
            video.srcObject = stream;
            video.onloadedmetadata = () => { video.play(); statusDiv.textContent = 'Camera ready'; };
        })
        .catch(err => { statusDiv.textContent = `Error: ${err.message}`; alert('Unable to access camera: ' + err.message); });
}
function stopCamera() { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } }
function capturePhoto() {
    const video = document.getElementById('camera-preview');
    const canvas = document.getElementById('camera-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    ctx.drawImage(video,0,0,canvas.width,canvas.height);
    document.getElementById('capture-btn').style.display='none';
    document.getElementById('retake-btn').style.display='inline-block';
    document.getElementById('use-photo-btn').style.display='inline-block';
    document.getElementById('camera-status').textContent = 'Photo captured';
    stopCamera();
}
function retakePhoto() { document.getElementById('capture-btn').style.display='inline-block'; document.getElementById('retake-btn').style.display='none'; document.getElementById('use-photo-btn').style.display='none'; openCamera(); }
function usePhoto() {
    const canvas = document.getElementById('camera-canvas');
    canvas.toBlob(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
            capturedPhotoUrl = reader.result;
            capturedPhoto = blob;
            document.getElementById('file-name').textContent = 'camera-photo.jpg';
            showPhotoPreviewInForm(capturedPhotoUrl);
            document.getElementById('camera-modal').style.display = 'none';
            stopCamera();
            alert('Photo captured and ready to attach.');
        };
        reader.readAsDataURL(blob);
    }, 'image/jpeg', 0.8);
}

/* === Location functions unchanged === */
function detectLocation() {
    if (!map) initMap();
    if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
    document.getElementById('location').value = 'Detecting location...';
    navigator.geolocation.getCurrentPosition(async pos => {
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        if (marker) map.removeLayer(marker);
        marker = L.marker([lat,lng]).addTo(map).bindPopup('Your Location').openPopup();
        map.setView([lat,lng], 15);
        try {
            const addr = await getAddressFromCoordinates(lat,lng);
            document.getElementById('location').value = addr;
            alert('Location detected');
        } catch (err) {
            document.getElementById('location').value = `Lat:${lat.toFixed(6)},Lng:${lng.toFixed(6)}`;
            alert('Location detected (coords)');
        }
    }, err => {
        alert('Unable to retrieve location: ' + err.message);
        document.getElementById('location').value = '';
    }, { enableHighAccuracy: true, timeout: 10000 });
}
async function getAddressFromCoordinates(lat,lng) {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
    const data = await res.json();
    if (data && data.address) {
        const a = data.address;
        let s = '';
        if (a.road) s += a.road + ', ';
        if (a.suburb) s += a.suburb + ', ';
        if (a.city || a.town || a.village) s += (a.city||a.town||a.village) + ', ';
        if (a.postcode) s += a.postcode;
        if (a.state) s += ', ' + a.state;
        if (a.country) s += ', ' + a.country;
        return s || 'Address not available';
    }
    return 'Address not available';
}

/* === Report submission: requires currentUser, store userPhone on entries === */
function submitReport() {
    if (!currentUser) { alert('Please login as a user to submit a report.'); return; }

    const animalType = document.getElementById('animal-type').value;
    const animalCondition = document.getElementById('animal-condition').value;
    const location = document.getElementById('location').value.trim();
    const description = document.getElementById('description').value.trim();

    if (!animalType || !animalCondition || !location) { alert('Fill required fields (type, condition, location)'); return; }

    const reportId = Date.now();
    if (supabaseClient) {
        (async () => {
            let photoPublicUrl = null;
            if (capturedPhoto) photoPublicUrl = await sbUploadReportPhoto(reportId, capturedPhoto);
            // Fallback: if upload failed but we still have a preview data URL, persist it so NGO can see
            let finalPhotoUrl = photoPublicUrl;
            if (!finalPhotoUrl && capturedPhotoUrl) {
                finalPhotoUrl = capturedPhotoUrl; // data URL or object URL; acceptable for display
            }
            const reportRow = {
                id: reportId,
                title: `${animalCondition} ${animalType} Report`,
                description: `You reported a ${animalCondition.toLowerCase()} ${animalType.toLowerCase()}`,
                status: 'pending',
                date: new Date().toISOString(),
                animal_type: animalType,
                condition: animalCondition,
                location,
                description_note: description,
                user_phone: currentUser.phone,
                user_name: currentUser.name,
                has_photo: !!finalPhotoUrl,
                photo_url: finalPhotoUrl
            };
            await sbInsertReport(reportRow);
            await sbInsertActivity({
                title: `Report Submitted - ${animalType}`,
                description: `You submitted a report for a ${animalCondition.toLowerCase()} ${animalType.toLowerCase()} at ${location}`,
                date: new Date().toISOString(),
                type: 'report',
                user_phone: currentUser.phone
            });
            // reset form and refresh
            resetReportForm();
            await reloadUserDataFromSupabase();
            await reloadNgoFromSupabase();
            alert(`Report submitted (ID ${reportId}). NGO will review it soon.`);
        })().catch(err => { console.error(err); alert('Failed to submit report.'); });
        return;
    }

    const newNotification = {
        id: reportId,
        title: `${animalCondition} ${animalType} Report`,
        description: `You reported a ${animalCondition.toLowerCase()} ${animalType.toLowerCase()}`,
        status: 'pending',
        date: new Date().toLocaleDateString(),
        animalType, condition: animalCondition,
        location,
        descriptionNote: description,
        userPhone: currentUser.phone,
        userName: currentUser.name,
        hasPhoto: !!capturedPhotoUrl,
        photoUrl: capturedPhotoUrl,
        photoBlob: capturedPhoto
    };

    userNotifications.unshift(newNotification);
    userActivities.unshift({
        id: reportId,
        title: `Report Submitted - ${animalType}`,
        description: `You submitted a report for a ${animalCondition.toLowerCase()} ${animalType.toLowerCase()} at ${location}`,
        date: new Date().toLocaleDateString(),
        type: 'report',
        userPhone: currentUser.phone
    });
    const ngoNotification = { ...newNotification, description: newNotification.description };
    ngoNotifications.unshift(ngoNotification);
    ngoData.totalReports++;
    ngoData.pendingRequests++;

    resetReportForm();

    // refresh current user's view
    displayUserNotifications();
    displayUserActivities();
    updateUserProfile();
    updateNgoStats();

    alert(`Report submitted (ID ${reportId}). NGO will review it soon.`);
}

function resetReportForm() {
    document.getElementById('animal-type').value = '';
    document.getElementById('animal-condition').value = '';
    document.getElementById('location').value = '';
    document.getElementById('description').value = '';
    document.getElementById('file-name').textContent = 'No file chosen';
    document.getElementById('file-input').value = '';
    document.getElementById('photo-preview').style.display = 'none';
    capturedPhoto = null; capturedPhotoUrl = null;
}

/* === Display functions now filter by currentUser.phone === userPhone ===> isolation === */

function displayUserNotifications() {
    const container = document.getElementById('user-notifications');
    container.innerHTML = '';

    if (!currentUser) {
        container.innerHTML = '<p>Please login to view your reports.</p>';
        return;
    }
    if (supabaseClient) {
        sbListReportsForUser(currentUser.phone)
            .then(list => {
                if (!list || list.length === 0) { container.innerHTML = '<p>No reports yet. Submit a report to see it here.</p>'; return; }
                list.slice(0,5).forEach(row => {
                    const notification = {
                        id: row.id,
                        title: row.title,
                        description: row.description,
                        status: row.status,
                        date: new Date(row.date).toLocaleDateString(),
                        hasPhoto: !!row.photo_url
                    };
                    const item = document.createElement('div');
                    item.className = 'notification-item';
                    item.addEventListener('dblclick', () => showNotificationDetails(notification.id, 'user'));
                    const photoIndicator = notification.hasPhoto ? '<span style="color:#3498db;margin-left:10px;"><i class="fas fa-camera"></i></span>' : '';
                    item.innerHTML = `
                        <div class="notification-icon"><i class="fas fa-exclamation-circle"></i></div>
                        <div class="notification-content">
                            <h4>${notification.title} ${photoIndicator}</h4>
                            <p>${notification.description}</p>
                            <small>Report ID: ${notification.id} | ${notification.date}</small>
                        </div>
                        <span class="status status-${notification.status}">${notification.status}</span>
                    `;
                    container.appendChild(item);
                });
            })
            .catch(err => { console.error(err); container.innerHTML = '<p>Failed to load your reports.</p>'; });
        return;
    }
    const myNotifications = userNotifications.filter(n => n.userPhone === currentUser.phone);
    if (myNotifications.length === 0) {
        container.innerHTML = '<p>No reports yet. Submit a report to see it here.</p>';
        return;
    }
    myNotifications.slice(0,5).forEach(notification => {
        const item = document.createElement('div');
        item.className = 'notification-item';
        item.addEventListener('dblclick', () => showNotificationDetails(notification.id, 'user'));
        const photoIndicator = notification.hasPhoto ? '<span style="color:#3498db;margin-left:10px;"><i class="fas fa-camera"></i></span>' : '';
        item.innerHTML = `
            <div class="notification-icon"><i class="fas fa-exclamation-circle"></i></div>
            <div class="notification-content">
                <h4>${notification.title} ${photoIndicator}</h4>
                <p>${notification.description}</p>
                <small>Report ID: ${notification.id} | ${notification.date}</small>
            </div>
            <span class="status status-${notification.status}">${notification.status}</span>
        `;
        container.appendChild(item);
    });
}

function displayUserActivities() {
    const container = document.getElementById('user-activities');
    container.innerHTML = '';

    if (!currentUser) { container.innerHTML = '<p>Please login to view your activities.</p>'; return; }
    if (supabaseClient) {
        sbListActivitiesForUser(currentUser.phone)
            .then(list => {
                if (!list || list.length === 0) { container.innerHTML = '<p>No activities yet. Your activities will appear here.</p>'; return; }
                list.forEach(activity => {
                    const item = document.createElement('div');
                    item.className = 'notification-item';
                    const dateStr = new Date(activity.date).toLocaleDateString();
                    item.innerHTML = `
                        <div class="notification-icon"><i class="fas fa-${activity.type === 'report' ? 'clipboard' : activity.type === 'verification' ? 'check-circle' : activity.type === 'rescue' ? 'heart' : 'comment'}"></i></div>
                        <div class="notification-content">
                            <h4>${activity.title}</h4>
                            <p>${activity.description}</p>
                            <small>${dateStr}</small>
                        </div>
                    `;
                    container.appendChild(item);
                });
            })
            .catch(err => { console.error(err); container.innerHTML = '<p>Failed to load your activities.</p>'; });
        return;
    }
    const myActivities = userActivities.filter(a => a.userPhone === currentUser.phone);
    if (myActivities.length === 0) {
        container.innerHTML = '<p>No activities yet. Your activities will appear here.</p>';
        return;
    }
    myActivities.forEach(activity => {
        const item = document.createElement('div');
        item.className = 'notification-item';
        item.innerHTML = `
            <div class="notification-icon"><i class="fas fa-${activity.type === 'report' ? 'clipboard' : activity.type === 'verification' ? 'check-circle' : 'heart'}"></i></div>
            <div class="notification-content">
                <h4>${activity.title}</h4>
                <p>${activity.description}</p>
                <small>${activity.date}</small>
            </div>
        `;
        container.appendChild(item);
    });
}

function displayUserMemories() {
    const container = document.getElementById('user-memories');
    container.innerHTML = '';

    if (!currentUser) { container.innerHTML = '<p>Please login to view your memories.</p>'; return; }
    if (supabaseClient) {
        sbListMemoriesForUser(currentUser.phone)
            .then(list => {
                if (!list || list.length === 0) { container.innerHTML = '<p>No memories yet. Successful rescues will appear here.</p>'; return; }
                list.forEach(memory => {
                    const card = document.createElement('div');
                    card.className = 'memory-card';
                    const title = memory.title;
                    const animalType = memory.animal_type;
                    const dateStr = new Date(memory.date).toLocaleDateString();
                    const photoBadge = memory.user_photo ? '<span class="photo-badge"><i class="fas fa-camera"></i> Your Photo</span>' : '<span class="photo-badge stock"><i class="fas fa-image"></i> Stock Photo</span>';
                    const safeUrl = (memory.image || '').replace(/'/g, "\\'").replace(/\\/g, "\\\\");
                    const imgHtml = `<img src="${memory.image}" alt="${title}" class="memory-img" style="cursor:pointer;" onclick="showPhotoPreviewModal('${safeUrl}')">`;
                    card.innerHTML = `
                        <div class="memory-image-container">${imgHtml}${photoBadge}</div>
                        <div class="memory-info">
                            <h4>${title}</h4>
                            <p><strong>Animal:</strong> ${animalType}</p>
                            <p><strong>Date:</strong> ${dateStr}</p>
                            <p><strong>Location:</strong> ${memory.location}</p>
                            ${memory.user_photo ? '<p class="photo-note"><i class="fas fa-check-circle"></i> Photo from your report</p>' : ''}
                        </div>
                    `;
                    container.appendChild(card);
                });
            })
            .catch(err => { console.error(err); container.innerHTML = '<p>Failed to load your memories.</p>'; });
        return;
    }
    const myMemories = userMemories.filter(m => m.userPhone === currentUser.phone);
    if (myMemories.length === 0) {
        container.innerHTML = '<p>No memories yet. Successful rescues will appear here.</p>';
        return;
    }
    myMemories.forEach(memory => {
        const card = document.createElement('div');
        card.className = 'memory-card';
        const photoBadge = memory.userPhoto ? '<span class="photo-badge"><i class="fas fa-camera"></i> Your Photo</span>' : '<span class="photo-badge stock"><i class="fas fa-image"></i> Stock Photo</span>';
        const imgHtml = `<img src="${memory.image}" alt="${memory.title}" class="memory-img" style="cursor:pointer;" onclick="showPhotoPreviewModal('${memory.image.replace(/'/g, "\\'")}')">`;
        card.innerHTML = `
            <div class="memory-image-container">${imgHtml}${photoBadge}</div>
            <div class="memory-info">
                <h4>${memory.title}</h4>
                <p><strong>Animal:</strong> ${memory.animalType}</p>
                <p><strong>Date:</strong> ${memory.date}</p>
                <p><strong>Location:</strong> ${memory.location}</p>
                ${memory.userPhoto ? '<p class="photo-note"><i class="fas fa-check-circle"></i> Photo from your report</p>' : ''}
            </div>
        `;
        container.appendChild(card);
    });
}

async function reloadUserDataFromSupabase() {
    if (!supabaseClient || !currentUser) return;
    // refresh profile counts by fetching lists
    const [reports, memories] = await Promise.all([
        sbListReportsForUser(currentUser.phone),
        sbListMemoriesForUser(currentUser.phone)
    ]);
    // Update UI using existing renderers
    displayUserNotifications();
    displayUserActivities();
    displayUserMemories();
    // Profile counts are derived in updateUserProfile; keep arrays in sync minimally
    try {
        document.getElementById('profile-reports').value = reports.length;
        document.getElementById('profile-rescues').value = memories.length;
    } catch (_) {}
}

async function reloadNgoFromSupabase() {
    if (!supabaseClient) return;
    displayNgoNotifications();
    updateNgoStats();
}

/* NGO notifications: shows all (unchanged) */
function displayNgoNotifications() {
    const container = document.getElementById('ngo-notifications');
    container.innerHTML = '';
    if (supabaseClient) {
        sbListAllReports()
            .then(list => {
                if (!list || list.length === 0) { container.innerHTML = '<p>No rescue requests yet.</p>'; return; }
                list.forEach(row => {
                    const notification = {
                        id: row.id,
                        title: row.title,
                        description: row.description,
                        status: row.status,
                        date: new Date(row.date).toLocaleDateString(),
                        animalType: row.animal_type,
                        condition: row.condition,
                        location: row.location,
                        descriptionNote: row.description_note,
                        userPhone: row.user_phone,
                        userName: row.user_name,
                        hasPhoto: !!row.photo_url,
                        photoUrl: row.photo_url
                    };
                    appendNgoNotification(container, notification);
                });
            })
            .catch(err => { console.error(err); container.innerHTML = '<p>Failed to load rescue requests.</p>'; });
        return;
    }
    if (ngoNotifications.length === 0) { container.innerHTML = '<p>No rescue requests yet.</p>'; return; }
    ngoNotifications.forEach(notification => {
        appendNgoNotification(container, notification);
    });
}

function appendNgoNotification(container, notification) {
        const item = document.createElement('div');
        item.className = 'notification-item';
        item.addEventListener('dblclick', () => showNotificationDetails(notification.id, 'ngo'));
        let actionButton = '';
        if (notification.status === 'pending') actionButton = `<button class="btn" onclick="verifyReport(${notification.id})">✅ Verify Report</button>`;
        else if (notification.status === 'verified') actionButton = `<button class="btn" onclick="completeRescue(${notification.id})">🎉 Mark as Completed</button>`;
        const photoIndicator = notification.hasPhoto ? '<span style="color:#3498db;margin-left:10px;"><i class="fas fa-camera"></i></span>' : '';
        item.innerHTML = `
            <div class="notification-icon"><i class="fas fa-exclamation-triangle"></i></div>
            <div class="notification-content">
                <h4>${notification.title} ${photoIndicator}</h4>
                <p>${notification.description}</p>
                <small>Report ID: ${notification.id} | ${notification.date}</small>
            </div>
            <span class="status status-${notification.status}">${notification.status}</span>
            ${actionButton}
        `;
        container.appendChild(item);
}

/* Notification details (unchanged, uses notification.userPhone) */
function showNotificationDetails(notificationId, userType) {
    if (supabaseClient) {
        (async () => {
            const row = await sbGetReportById(notificationId);
            if (!row) return;
            currentNotificationId = notificationId;
            const hasPhoto = !!row.photo_url;
            let photoButton = '';
            if (hasPhoto) {
                const escapedUrl = row.photo_url.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
                photoButton = `<div class="notification-detail-item"><strong>📸 Photo:</strong> Included with report <button class="photo-view-btn" onclick="showPhotoPreviewModal('${escapedUrl}')"><i class="fas fa-camera"></i> View Report Photo</button></div>`;
            }
            const detailsHTML = `
                <div class="notification-detail-item"><strong>Report ID:</strong> ${row.id}</div>
                <div class="notification-detail-item"><strong>User Name:</strong> ${row.user_name}</div>
                <div class="notification-detail-item"><strong>User Phone:</strong> ${row.user_phone}</div>
                <div class="notification-detail-item"><strong>Animal Type:</strong> ${row.animal_type}</div>
                <div class="notification-detail-item"><strong>Condition:</strong> ${row.condition}</div>
                <div class="notification-detail-item"><strong>Location:</strong> ${row.location || 'Location not available'}</div>
                <div class="notification-detail-item"><strong>Description:</strong> ${row.description_note || ''}</div>
                <div class="notification-detail-item"><strong>Status:</strong> <span class="status status-${row.status}">${row.status}</span></div>
                <div class="notification-detail-item"><strong>Date:</strong> ${new Date(row.date).toLocaleDateString()}</div>
                ${photoButton}
            `;
            document.getElementById('notification-details').innerHTML = detailsHTML;
            document.getElementById('notification-modal').style.display = 'block';
            const verifyBtn = document.getElementById('verify-report-btn');
            const completeBtn = document.getElementById('complete-rescue-btn');
            if (userType === 'ngo') {
                verifyBtn.style.display = row.status === 'pending' ? 'inline-block' : 'none';
                completeBtn.style.display = row.status === 'verified' ? 'inline-block' : 'none';
            } else {
                verifyBtn.style.display = 'none';
                completeBtn.style.display = 'none';
            }
        })().catch(err => console.error(err));
        return;
    }
    const notification = userType === 'user' ? userNotifications.find(n => n.id === notificationId) : ngoNotifications.find(n => n.id === notificationId);
    if (!notification) return;
    currentNotificationId = notificationId;
    let photoButton = '';
    if (notification.hasPhoto && notification.photoUrl) {
        const escapedUrl = notification.photoUrl.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        photoButton = `<div class="notification-detail-item"><strong>📸 Photo:</strong> Included with report <button class="photo-view-btn" onclick="showPhotoPreviewModal('${escapedUrl}')"><i class="fas fa-camera"></i> View Report Photo</button></div>`;
    }
    const detailsHTML = `
        <div class="notification-detail-item"><strong>Report ID:</strong> ${notification.id}</div>
        <div class="notification-detail-item"><strong>User Name:</strong> ${notification.userName}</div>
        <div class="notification-detail-item"><strong>User Phone:</strong> ${notification.userPhone}</div>
        <div class="notification-detail-item"><strong>Animal Type:</strong> ${notification.animalType}</div>
        <div class="notification-detail-item"><strong>Condition:</strong> ${notification.condition}</div>
        <div class="notification-detail-item"><strong>Location:</strong> ${notification.location || 'Location not available'}</div>
        <div class="notification-detail-item"><strong>Description:</strong> ${notification.descriptionNote}</div>
        <div class="notification-detail-item"><strong>Status:</strong> <span class="status status-${notification.status}">${notification.status}</span></div>
        <div class="notification-detail-item"><strong>Date:</strong> ${notification.date}</div>
        ${photoButton}
    `;
    document.getElementById('notification-details').innerHTML = detailsHTML;
    document.getElementById('notification-modal').style.display = 'block';

    const verifyBtn = document.getElementById('verify-report-btn');
    const completeBtn = document.getElementById('complete-rescue-btn');
    if (userType === 'ngo') {
        verifyBtn.style.display = notification.status === 'pending' ? 'inline-block' : 'none';
        completeBtn.style.display = notification.status === 'verified' ? 'inline-block' : 'none';
    } else {
        verifyBtn.style.display = 'none';
        completeBtn.style.display = 'none';
    }
}

/* === Rescue workflow: verify and complete must attribute activities/memories to the correct user === */

function verifyReport(notificationId = null) {
    const id = notificationId || currentNotificationId;
    if (supabaseClient) {
        (async () => {
            const updated = await sbUpdateReportStatus(id, 'verified');
            await sbInsertActivity({
                title: `Report Verified - ${updated.animal_type}`,
                description: `Your report for a ${updated.condition.toLowerCase()} ${updated.animal_type.toLowerCase()} at ${updated.location} has been verified by NGO`,
                date: new Date().toISOString(),
                type: 'verification',
                user_phone: updated.user_phone
            });
            await reloadNgoFromSupabase();
            if (currentUser) await reloadUserDataFromSupabase();
            document.getElementById('notification-modal').style.display = 'none';
            alert('Report verified successfully!');
        })().catch(err => { console.error(err); alert('Failed to verify report.'); });
        return;
    }
    const ngoNotification = ngoNotifications.find(n => n.id === id);
    if (ngoNotification) {
        ngoNotification.status = 'verified';
        ngoData.pendingRequests = Math.max(0, ngoData.pendingRequests - 1);
        ngoData.verifiedReports++;
    }
    const userNotification = userNotifications.find(n => n.id === id);
    if (userNotification) {
        userNotification.status = 'verified';
        userActivities.unshift({
            id: id,
            title: `Report Verified - ${userNotification.animalType}`,
            description: `Your report for a ${userNotification.condition.toLowerCase()} ${userNotification.animalType.toLowerCase()} at ${userNotification.location} has been verified by NGO`,
            date: new Date().toLocaleDateString(),
            type: 'verification',
            userPhone: userNotification.userPhone
        });
    }
    displayNgoNotifications();
    if (currentUser) {
        displayUserActivities();
        displayUserNotifications();
        updateUserProfile();
    }
    updateNgoStats();
    document.getElementById('notification-modal').style.display = 'none';
    alert('Report verified successfully!');
}

function completeRescue(notificationId = null) {
    const id = notificationId || currentNotificationId;
    if (supabaseClient) {
        (async () => {
            const updated = await sbUpdateReportStatus(id, 'success');
            await sbInsertMemory({
                title: `🎉 Successful Rescue - ${updated.animal_type}`,
                animal_type: updated.animal_type,
                location: updated.location,
                date: new Date().toISOString(),
                image: updated.photo_url || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=500&q=60',
                user_photo: !!updated.photo_url,
                user_phone: updated.user_phone
            });
            await sbInsertActivity({
                title: `Rescue Completed - ${updated.animal_type}`,
                description: `Your reported ${updated.animal_type.toLowerCase()} at ${updated.location} has been successfully rescued!`,
                date: new Date().toISOString(),
                type: 'rescue',
                user_phone: updated.user_phone
            });
            await reloadNgoFromSupabase();
            if (currentUser) await reloadUserDataFromSupabase();
            document.getElementById('notification-modal').style.display = 'none';
            document.getElementById('feedback-modal').style.display = 'block';
            alert('Rescue marked completed — memory saved.');
        })().catch(err => { console.error(err); alert('Failed to complete rescue.'); });
        return;
    }
    const ngoNotification = ngoNotifications.find(n => n.id === id);
    if (ngoNotification) ngoNotification.status = 'completed';
    const userNotification = userNotifications.find(n => n.id === id);
    if (userNotification) {
        userNotification.status = 'success';
        const mem = {
            id,
            title: `🎉 Successful Rescue - ${userNotification.animalType}`,
            animalType: userNotification.animalType,
            location: userNotification.location,
            date: new Date().toLocaleDateString(),
            image: userNotification.photoUrl || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=500&q=60',
            userPhoto: !!userNotification.photoUrl,
            userPhone: userNotification.userPhone
        };
        userMemories.unshift(mem);
        userActivities.unshift({
            id,
            title: `Rescue Completed - ${userNotification.animalType}`,
            description: `Your reported ${userNotification.animalType.toLowerCase()} at ${userNotification.location} has been successfully rescued!`,
            date: new Date().toLocaleDateString(),
            type: 'rescue',
            userPhone: userNotification.userPhone
        });
    }
    ngoData.rescuesCompleted++;
    displayNgoNotifications();
    if (currentUser) {
        displayUserMemories();
        displayUserActivities();
        displayUserNotifications();
        updateUserProfile();
    }
    updateNgoStats();
    document.getElementById('notification-modal').style.display = 'none';
    document.getElementById('feedback-modal').style.display = 'block';
    alert('Rescue marked completed — memory saved.');
}

/* Rating & feedback: include userPhone when saving activity */
function setRating(rating) {
    document.querySelectorAll('.star').forEach(st => st.classList.remove('active'));
    document.querySelectorAll(`.star`).forEach(st => { if (parseInt(st.getAttribute('data-rating')) <= parseInt(rating)) st.classList.add('active'); });
}
function submitFeedback() {
    const rating = document.querySelector('.star.active')?.getAttribute('data-rating');
    const feedbackText = document.getElementById('feedback-text').value.trim();
    if (!rating) { alert('Please select rating'); return; }
    userActivities.unshift({
        id: Date.now(),
        title: `Feedback Submitted - ${rating} Stars`,
        description: `You rated the rescue service ${rating} stars${feedbackText ? ' with feedback' : ''}`,
        date: new Date().toLocaleDateString(),
        type: 'feedback',
        userPhone: currentUser?.phone || 'unknown'
    });
    alert('Thank you for your feedback!');
    document.getElementById('feedback-modal').style.display = 'none';
    document.getElementById('feedback-text').value = '';
    document.querySelectorAll('.star').forEach(s => s.classList.remove('active'));
    if (currentUser) displayUserActivities();
}

/* Sample data seeding: include userPhone/userPhone in activities & memories */
function addSampleData() {
    // seed a sample registered user
    registeredUsers.push({ name: 'Sample User', phone: '9876543210', password: 'user123' });

    userNotifications.push({
        id: 1001,
        title: "🐕 Injured Dog Report",
        description: "You reported an injured dog near Central Park",
        status: "success",
        date: "2025-01-10",
        animalType: "Dog",
        condition: "Injured",
        location: "123 Main Street, Krishnankovil, 626126",
        descriptionNote: "Found a dog with injured leg near the main gate",
        userPhone: "9876543210",
        userName: "Sample User",
        hasPhoto: true,
        photoUrl: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=500&q=60",
        photoBlob: null
    });

    ngoNotifications.push({
        id: 1001,
        title: "🐕 Injured Dog Report",
        description: "User reported an injured dog near Central Park",
        status: "completed",
        date: "2025-01-10",
        animalType: "Dog",
        condition: "Injured",
        location: "123 Main Street, Krishnankovil, 626126",
        descriptionNote: "Found a dog with injured leg near the main gate",
        userPhone: "9876543210",
        userName: "Sample User",
        hasPhoto: true,
        photoUrl: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=500&q=60",
        photoBlob: null
    });

    userMemories.push({
        id: 1001,
        title: "🎉 Successful Rescue - Dog",
        animalType: "Dog",
        location: "123 Main Street, Krishnankovil, 626126",
        date: "2025-01-10",
        image: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=500&q=60",
        userPhoto: true,
        userPhone: "9876543210"
    });

    userActivities.push({
        id: 1001,
        title: "Report Verified - Dog",
        description: "Your report for a injured dog at 123 Main Street, Krishnankovil, 626126 has been verified by NGO",
        date: "2025-01-10",
        type: 'verification',
        userPhone: "9876543210"
    });

    ngoData.rescuesCompleted = 1;
    ngoData.verifiedReports = 0;
    ngoData.pendingRequests = 0;
}

/* End of script.js */