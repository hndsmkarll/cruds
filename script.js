let editIndex = null;
let isLoginMode = true;

const authOverlay = document.getElementById('authOverlay');
const mainApp = document.getElementById('mainApp');
const authTitle = document.getElementById('authTitle');
const authSubtitle = document.getElementById('authSubtitle');
const toggleText = document.getElementById('toggleText');
const authUser = document.getElementById('authUser');
const authPass = document.getElementById('authPass');
const authSubmit = document.getElementById('authSubmit');

// --- AUTH LOGIC ---
async function checkSession() {
    try {
        const response = await fetch('api.php?action=check_session');
        const data = await response.json();
        if (data.logged_in) {
            authOverlay.classList.remove('active');
            setTimeout(() => {
                authOverlay.style.display = 'none';
                mainApp.style.display = 'block';
                renderTable();
            }, 400); 
        } else {
            authOverlay.style.display = 'flex';
            authOverlay.classList.add('active');
            mainApp.style.display = 'none';
        }
    } catch (err) { console.error(err); }
}

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    authTitle.innerText = isLoginMode ? "System Access" : "Request Entry";
    authSubtitle.innerText = isLoginMode ? "Identify yourself to enter the secure perimeter." : "Fill out the fields to request new portal credentials.";
    toggleText.innerText = isLoginMode ? "Request Entry" : "Sign In";
    authSubmit.innerHTML = `<span>${isLoginMode ? 'Authorize Access' : 'Create Identity'}</span> <i class="fa-solid fa-chevron-right"></i>`;
}

async function handleAuth() {
    const user = authUser.value.trim();
    const pass = authPass.value.trim();
    if(!user || !pass) return showToast("Credentials required", "danger");

    authSubmit.innerHTML = '<span>Processing...</span> <i class="fa-solid fa-spinner fa-spin"></i>';
    authSubmit.style.pointerEvents = 'none';

    try {
        const action = isLoginMode ? 'login' : 'signup';
        const response = await fetch(`api.php?action=${action}`, {
            method: 'POST',
            body: JSON.stringify({ username: user, password: pass })
        });
        const result = await response.json();

        if (result.status === 'success') {
            showToast(isLoginMode ? "Access Granted" : "Entry Approved", "success");
            checkSession();
        } else {
            showToast(result.message || "Invalid Access", "danger");
        }
    } catch (err) { showToast("Network Failure", "danger"); }
    finally {
        authSubmit.innerHTML = `<span>${isLoginMode ? 'Authorize Access' : 'Create Identity'}</span> <i class="fa-solid fa-chevron-right"></i>`;
        authSubmit.style.pointerEvents = 'all';
    }
}

async function logout() {
    await fetch('api.php?action=logout');
    location.reload();
}

// --- PARTICLE ENGINE ---
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');
let particles = [];
function initParticles() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    particles = [];
    for(let i=0; i<70; i++) particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, size: Math.random() * 2 + 1, vx: Math.random() * 0.6 - 0.3, vy: Math.random() * 0.6 - 0.3, op: Math.random() * 0.6 });
}
function animate() {
    ctx.clearRect(0,0, canvas.width, canvas.height);
    particles.forEach(p => { p.x += p.vx; p.y += p.vy; if(p.x < 0 || p.x > canvas.width) p.vx *= -1; if(p.y < 0 || p.y > canvas.height) p.vy *= -1; ctx.fillStyle = `rgba(168, 85, 247, ${p.op})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); });
    requestAnimationFrame(animate);
}
initParticles(); animate(); window.onresize = initParticles;

// --- CRUD ENGINE ---
async function renderTable(filterTerm = "") {
    try {
        const response = await fetch('api.php?action=read');
        const students = await response.json();
        document.getElementById('registryCount').innerText = `${students.length} RECORD${students.length !== 1 ? 'S' : ''}`;
        const filtered = students.filter(s => s.full_name.toLowerCase().includes(filterTerm) || s.registry_id.toLowerCase().includes(filterTerm) || s.email.toLowerCase().includes(filterTerm));
        document.getElementById('tableBody').innerHTML = filtered.map(s => `
            <tr style="animation: fadeIn 0.4s ease forwards;">
                <td><b style="color:#fff">${s.full_name}</b></td>
                <td><span class="badge">#${s.registry_id}</span></td>
                <td style="color: #94a3b8; font-size: 0.85rem;">${s.email}</td>
                <td style="text-align: right; white-space: nowrap;">
                    <button class="action-btn" onclick="prepareEdit('${s.id}', '${s.full_name}', '${s.registry_id}', '${s.email}')"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="action-btn" style="color:var(--error); margin-left:8px;" onclick="triggerConfirm('delete', '${s.id}')"><i class="fa-solid fa-trash-can"></i></button>
                </td>
            </tr>`).join('');
    } catch (err) { console.error("Load failed", err); }
}

async function executeSave() {
    const name = document.getElementById('studentName').value.trim();
    const regId = document.getElementById('studentID').value.trim();
    const email = document.getElementById('studentEmail').value.trim();

    // Validation: Gmail only
    if (!email.toLowerCase().endsWith("@gmail.com")) {
        showToast("Use @gmail.com address", "danger");
        return;
    }

    const data = { name, id: regId, email, editIndex };

    try {
        const response = await fetch('api.php?action=save', { 
            method: 'POST', 
            body: JSON.stringify(data) 
        });
        const result = await response.json();
        
        if (result.status === 'success') {
            showToast(editIndex ? "Record Updated" : "Added Successfully", "success");
            clearInputs(); 
            closeModal(); 
            renderTable();
        }
    } catch (err) { showToast("Save failed", "danger"); }
}

async function executeDelete(id) {
    const confirmBtn = document.getElementById('modalConfirmBtn');
    confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    confirmBtn.style.pointerEvents = 'none';

    try {
        const response = await fetch(`api.php?action=delete&id=${id}`);
        const result = await response.json();
        
        // Logical check: if status is success OR if the server just returns true
        if (result.status === 'success' || result === true) {
            showToast("Record Purged", "success");
            closeModal(); 
            renderTable();
        } else {
            showToast("Purge Failed: Check API", "danger");
        }
    } catch (err) { 
        showToast("System Error", "danger"); 
    } finally {
        confirmBtn.innerHTML = 'Authorize';
        confirmBtn.style.pointerEvents = 'all';
    }
}

function prepareEdit(dbId, name, regId, email) {
    document.getElementById('studentName').value = name;
    document.getElementById('studentID').value = regId;
    document.getElementById('studentEmail').value = email;
    editIndex = dbId;
    document.getElementById('actionBtn').innerHTML = '<i class="fa-solid fa-rotate"></i> <span>Update Entry</span>';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function triggerConfirm(action, id = null) {
    const title = document.getElementById('modalTitle');
    const desc = document.getElementById('modalDesc');
    const confirmBtn = document.getElementById('modalConfirmBtn');
    
    // Resetting handler to prevent multiple triggers
    confirmBtn.onclick = null; 

    if (action === 'save') {
        const name = document.getElementById('studentName').value;
        const regId = document.getElementById('studentID').value;
        const email = document.getElementById('studentEmail').value;
        
        if (!name || !regId || !email) return showToast("Complete all fields", "danger");
        
        title.innerText = editIndex ? "Sync Update?" : "Confirm Entry?";
        desc.innerText = "Commit these changes to the secure database?";
        confirmBtn.onclick = () => executeSave();
    } else if (action === 'delete') {
        title.innerText = "Purge Record?";
        desc.innerText = "Permanently erase this identity from the registry?";
        confirmBtn.onclick = () => executeDelete(id);
    }
    
    document.getElementById('modalOverlay').classList.add('active');
}

function closeModal() { document.getElementById('modalOverlay').classList.remove('active'); }

function clearInputs() { 
    document.getElementById('studentName').value = ""; 
    document.getElementById('studentID').value = ""; 
    document.getElementById('studentEmail').value = ""; 
    editIndex = null;
    document.getElementById('actionBtn').innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> <span>Save Entry</span>';
}

function showToast(msg, type) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'}"></i> <span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 3000);
}

function filterData() { renderTable(document.getElementById('searchInput').value.toLowerCase()); }

setInterval(() => { 
    const clockEl = document.getElementById('clock');
    if(clockEl) clockEl.innerText = new Date().toLocaleTimeString(); 
}, 1000);

checkSession();
