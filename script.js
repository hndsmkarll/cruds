let students = [];
let editIndex = null;

const nameIn = document.getElementById('studentName');
const idIn = document.getElementById('studentID');
const emailIn = document.getElementById('studentEmail');
const actionBtn = document.getElementById('actionBtn');
const tableBody = document.getElementById('tableBody');
const modalOverlay = document.getElementById('modalOverlay');
const searchInput = document.getElementById('searchInput');
const registryCount = document.getElementById('registryCount');

// --- BACKGROUND ENGINE ---
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');
let particles = [];

function initParticles() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    particles = [];
    for(let i=0; i<70; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 1,
            vx: Math.random() * 0.6 - 0.3,
            vy: Math.random() * 0.6 - 0.3,
            op: Math.random() * 0.6
        });
    }
}

function animate() {
    ctx.clearRect(0,0, canvas.width, canvas.height);
    particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if(p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if(p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.fillStyle = `rgba(168, 85, 247, ${p.op})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    requestAnimationFrame(animate);
}
initParticles(); animate();
window.onresize = initParticles;

renderTable();

function filterData() {
    const term = searchInput.value.toLowerCase();
    renderTable(term);
}

setInterval(() => {
    const clock = document.getElementById('clock');
    if(clock) clock.innerText = new Date().toLocaleTimeString();
}, 1000);

function triggerConfirm(action, index = null) {
    if (action === 'save') {
        const nameVal = nameIn.value.trim();
        const idVal = idIn.value.trim();
        const emailVal = emailIn.value.trim();

        // 1. Check for Empty Fields
        if (!nameVal || !idVal || !emailVal) {
            showToast("Required: Complete all fields", "danger");
            return;
        }

        // 2. Validate Operator Name (Letters and Spaces only)
        const nameRegex = /^[A-Za-z\s]+$/;
        if (!nameRegex.test(nameVal)) {
            showToast("Error: Name must only contain letters", "danger");
            return;
        }

        // 3. Validate Registry ID (Numbers and Dashes only)
        const idRegex = /^[0-9-]+$/;
        if (!idRegex.test(idVal)) {
            showToast("Error: ID must only contain numbers", "danger");
            return;
        }

        // 4. Validate Email (Must be a valid email format)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailVal)) {
            showToast("Invalid: Use a valid email address", "danger");
            return;
        }
    }

    const title = document.getElementById('modalTitle');
    const desc = document.getElementById('modalDesc');
    const confirmBtn = document.getElementById('modalConfirmBtn');
    modalOverlay.classList.add('active');

    if (action === 'save') {
        const isUpdate = editIndex !== null;
        title.innerText = isUpdate ? "Sync Update?" : "Confirm Entry?";
        desc.innerText = "Commit these changes to the secure local registry?";
        confirmBtn.onclick = () => executeSave();
    } else if (action === 'delete') {
        title.innerText = "Purge Record?";
        desc.innerText = "Permanently erase this identity from the database?";
        confirmBtn.onclick = () => executeDelete(index);
    }
}

function executeSave() {
    const data = { 
        name: nameIn.value.trim(), 
        id: idIn.value.trim(), 
        email: emailIn.value.trim() 
    };

    if (editIndex !== null) {
        students[editIndex] = data;
        editIndex = null;
        actionBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> <span>Save Entry</span>';
        showToast("Record Updated", "success");
    } else {
        students.push(data);
        showToast("Successfully Added", "success");
    }

    closeModal();
    clearInputs();
    renderTable();
}

function executeDelete(index) {
    students.splice(index, 1);
    closeModal();
    renderTable();
    showToast("Record Purged", "danger");
}

function prepareEdit(index) {
    const s = students[index];
    nameIn.value = s.name;
    idIn.value = s.id;
    emailIn.value = s.email;
    editIndex = index;
    actionBtn.innerHTML = '<i class="fa-solid fa-rotate"></i> <span>Update Entry</span>';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderTable(filterTerm = "") {
    registryCount.innerText = `${students.length} RECORD${students.length !== 1 ? 'S' : ''}`;
    const filtered = students.filter(s => 
        s.name.toLowerCase().includes(filterTerm) || 
        s.id.toLowerCase().includes(filterTerm) || 
        s.email.toLowerCase().includes(filterTerm)
    );

    if (students.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="empty-state"><i class="fa-solid fa-database"></i>Registry is currently offline.</td></tr>`;
        return;
    }

    if (filtered.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="empty-state"><i class="fa-solid fa-magnifying-glass-chart"></i>No results for "${filterTerm}".</td></tr>`;
        return;
    }

    tableBody.innerHTML = filtered.map((s) => {
        const originalIndex = students.indexOf(s);
        return `
            <tr style="animation: fadeIn 0.4s ease forwards;">
                <td><b style="color:#fff">${s.name}</b></td>
                <td><span class="badge">#${s.id}</span></td>
                <td style="color: #94a3b8; font-size: 0.85rem;">${s.email}</td>
                <td style="text-align: right;">
                    <button class="action-btn" onclick="prepareEdit(${originalIndex})"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="action-btn delete" onclick="triggerConfirm('delete', ${originalIndex})"><i class="fa-solid fa-trash-can"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

function closeModal() { modalOverlay.classList.remove('active'); }
function clearInputs() { nameIn.value = ""; idIn.value = ""; emailIn.value = ""; }

function showToast(msg, type) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation';
    toast.innerHTML = `<i class="${icon}"></i> <span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}
