// Global variables
let currentUser = null;
let turns = JSON.parse(localStorage.getItem('turns')) || [];
let users = JSON.parse(localStorage.getItem('users')) || [];
let currentCustomerTurn = null;

// Initialize default admin user if none exist
if (users.length === 0) {
    users = [
        { username: 'admin', password: 'admin123', type: 'admin' }
    ];
    localStorage.setItem('users', JSON.stringify(users));
}

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const bookNowBtn = document.getElementById('bookNowBtn');
const loginModal = document.getElementById('loginModal');
const bookingModal = document.getElementById('bookingModal');
const adminModal = document.getElementById('adminModal');
const loginForm = document.getElementById('loginForm');
const bookingForm = document.getElementById('bookingForm');
const notificationForm = document.getElementById('notificationForm');
const customerTurnStatus = document.getElementById('customerTurnStatus');
const checkTurnStatusBtn = document.getElementById('checkTurnStatusBtn');
const cancelTurnBtn = document.getElementById('cancelTurnBtn');

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    updateUI();
    checkForExistingTurn();
});

function setupEventListeners() {
    // Admin login button
    loginBtn.addEventListener('click', () => showModal(loginModal));
    
    // Logout button
    logoutBtn.addEventListener('click', logout);
    
    // Take turn button (no login required)
    bookNowBtn.addEventListener('click', () => showModal(bookingModal));
    
    // Close modals
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeAllModals();
        });
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
    
    // Form submissions
    loginForm.addEventListener('submit', handleLogin);
    bookingForm.addEventListener('submit', handleTurn);
    notificationForm.addEventListener('submit', handleSMS);
    
    // Admin tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchTab(e.target.dataset.tab);
        });
    });
    
    // Customer turn status buttons
    checkTurnStatusBtn.addEventListener('click', checkTurnStatus);
    cancelTurnBtn.addEventListener('click', cancelTurn);
}

// Modal functions
function showModal(modal) {
    modal.style.display = 'block';
}

function closeAllModals() {
    loginModal.style.display = 'none';
    bookingModal.style.display = 'none';
    adminModal.style.display = 'none';
}

// Admin login functionality
function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    const user = users.find(u => 
        u.username === username && 
        u.password === password && 
        u.type === 'admin'
    );
    
    if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        closeAllModals();
        updateUI();
        showToast(`مرحباً بك المدير ${username}!`, 'success');
        
        // Clear form
        loginForm.reset();
    } else {
        showToast('بيانات المدير غير صحيحة. حاول مرة أخرى.', 'error');
    }
}

// Logout functionality
function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateUI();
    showToast('تم تسجيل الخروج بنجاح', 'success');
}

// Get next available turn number
function getNextTurnNumber() {
    // Get all waiting turns
    const waitingTurns = turns.filter(turn => turn.status === 'waiting');
    
    if (waitingTurns.length === 0) {
        return 1;
    }
    
    // Find the highest turn number among waiting turns
    const maxTurnNumber = Math.max(...waitingTurns.map(turn => turn.turnNumber));
    return maxTurnNumber + 1;
}

// Reorder turn numbers after completion
function reorderTurnNumbers() {
    // Get all waiting turns and sort them by creation time (FIFO)
    const waitingTurns = turns.filter(turn => turn.status === 'waiting')
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    // Assign new sequential numbers starting from 1
    waitingTurns.forEach((turn, index) => {
        const turnIndex = turns.findIndex(t => t.id === turn.id);
        if (turnIndex !== -1) {
            turns[turnIndex].turnNumber = index + 1;
        }
    });
    
    // Save updated turns
    localStorage.setItem('turns', JSON.stringify(turns));
    
    // Update current customer turn if exists
    if (currentCustomerTurn) {
        const updatedTurn = turns.find(t => t.id === currentCustomerTurn.id);
        if (updatedTurn) {
            currentCustomerTurn = updatedTurn;
            localStorage.setItem('currentCustomerTurn', JSON.stringify(updatedTurn));
            // Update the display
            showCustomerTurnStatus(updatedTurn);
        }
    }
}

// Turn booking functionality (no login required)
function handleTurn(e) {
    e.preventDefault();
    
    const customerName = document.getElementById('customerName').value;
    const mobileNumber = document.getElementById('mobileNumber').value;
    const serviceType = document.getElementById('serviceType').value;
    
    // Check if customer already has a turn
    const existingTurn = turns.find(turn => 
        turn.mobileNumber === mobileNumber && 
        turn.status === 'waiting'
    );
    
    if (existingTurn) {
        showToast('لديك دور بالفعل في الطابور!', 'error');
        return;
    }
    
    // Get the next available turn number
    const nextTurnNumber = getNextTurnNumber();
    
    const turn = {
        id: Date.now(),
        customerName,
        mobileNumber,
        serviceType,
        status: 'waiting',
        turnNumber: nextTurnNumber,
        createdAt: new Date().toISOString()
    };
    
    turns.push(turn);
    localStorage.setItem('turns', JSON.stringify(turns));
    
    // Set current customer turn
    currentCustomerTurn = turn;
    localStorage.setItem('currentCustomerTurn', JSON.stringify(turn));
    
    closeAllModals();
    bookingForm.reset();
    showToast(`تم تأكيد الدور ${turn.turnNumber}! ستستلم رسالة نصية عندما يحين دورك.`, 'success');
    
    // Show customer turn status
    showCustomerTurnStatus(turn);
}

// Show customer turn status
function showCustomerTurnStatus(turn) {
    if (!turn) return;
    
    // Update turn status display
    document.getElementById('customerTurnNumber').textContent = `#${turn.turnNumber}`;
    document.getElementById('customerNameDisplay').textContent = turn.customerName;
    document.getElementById('customerServiceDisplay').textContent = getServiceNameInArabic(turn.serviceType);
    document.getElementById('customerStatusDisplay').textContent = getStatusInArabic(turn.status);
    document.getElementById('customerStatusDisplay').className = `status-${turn.status}`;
    
    // Format and display time
    const turnTime = new Date(turn.createdAt);
    const timeString = turnTime.toLocaleTimeString('ar-SA', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
    document.getElementById('customerTimeDisplay').textContent = timeString;
    
    // Show the status section
    customerTurnStatus.style.display = 'block';
    
    // Scroll to the status section
    customerTurnStatus.scrollIntoView({ behavior: 'smooth' });
}

// Check for existing turn on page load
function checkForExistingTurn() {
    const savedTurn = localStorage.getItem('currentCustomerTurn');
    if (savedTurn) {
        currentCustomerTurn = JSON.parse(savedTurn);
        // Check if turn still exists in the main turns array
        const existingTurn = turns.find(t => t.id === currentCustomerTurn.id);
        if (existingTurn && existingTurn.status === 'waiting') {
            showCustomerTurnStatus(existingTurn);
        } else {
            // Turn completed or cancelled, remove from localStorage
            localStorage.removeItem('currentCustomerTurn');
            currentCustomerTurn = null;
        }
    }
}

// Check turn status
function checkTurnStatus() {
    if (!currentCustomerTurn) return;
    
    // Find current turn in the turns array
    const currentTurn = turns.find(t => t.id === currentCustomerTurn.id);
    if (currentTurn) {
        // Update the display
        currentCustomerTurn = currentTurn;
        showCustomerTurnStatus(currentTurn);
        
        if (currentTurn.status === 'waiting') {
            showToast('دورك لا يزال في الانتظار', 'success');
        } else if (currentTurn.status === 'completed') {
            showToast('تم إكمال دورك! شكراً لك', 'success');
            // Remove completed turn from localStorage
            localStorage.removeItem('currentCustomerTurn');
            currentCustomerTurn = null;
            customerTurnStatus.style.display = 'none';
        }
    } else {
        showToast('لم يتم العثور على دورك', 'error');
    }
}

// Cancel turn
function cancelTurn() {
    if (!currentCustomerTurn) return;
    
    if (confirm('هل أنت متأكد من إلغاء دورك؟')) {
        // Find and update the turn status
        const turnIndex = turns.findIndex(t => t.id === currentCustomerTurn.id);
        if (turnIndex !== -1) {
            turns[turnIndex].status = 'cancelled';
            localStorage.setItem('turns', JSON.stringify(turns));
            
            // Remove from localStorage
            localStorage.removeItem('currentCustomerTurn');
            currentCustomerTurn = null;
            
            // Hide the status section
            customerTurnStatus.style.display = 'none';
            
            showToast('تم إلغاء دورك بنجاح', 'success');
        }
    }
}

// Admin functionality
function showAdminDashboard() {
    showModal(adminModal);
    loadTurns();
    loadCustomers();
}

function loadTurns() {
    const turnsList = document.getElementById('turnsList');
    turnsList.innerHTML = '';
    
    if (turns.length === 0) {
        turnsList.innerHTML = '<p>لا توجد أدوار في الطابور.</p>';
        return;
    }
    
    // Filter only waiting turns
    const waitingTurns = turns.filter(turn => turn.status === 'waiting');
    
    if (waitingTurns.length === 0) {
        turnsList.innerHTML = '<p>لا توجد أدوار تنتظر في الطابور.</p>';
        return;
    }
    
    waitingTurns.forEach(turn => {
        const turnItem = document.createElement('div');
        turnItem.className = 'turn-item';
        turnItem.innerHTML = `
            <div class="turn-info">
                <h4>${turn.customerName}</h4>
                <p><strong>الدور:</strong> #${turn.turnNumber}</p>
                <p><strong>الخدمة:</strong> ${getServiceNameInArabic(turn.serviceType)}</p>
                <p><strong>الجوال:</strong> ${turn.mobileNumber}</p>
                <p><strong>الحالة:</strong> <span class="status-${turn.status}">${getStatusInArabic(turn.status)}</span></p>
            </div>
            <div class="turn-actions">
                <button class="btn btn-primary btn-small" onclick="sendSMS('${turn.customerName}', '${turn.mobileNumber}')">
                    <i class="fas fa-sms"></i> إرسال رسالة
                </button>
                <button class="btn btn-secondary btn-small" onclick="completeTurn(${turn.id})">
                    <i class="fas fa-check"></i> إكمال
                </button>
            </div>
        `;
        turnsList.appendChild(turnItem);
    });
}

function loadCustomers() {
    const customerSelect = document.getElementById('notificationCustomer');
    customerSelect.innerHTML = '<option value="">اختر العميل</option>';
    
    // Only show waiting customers
    const waitingCustomers = turns.filter(turn => turn.status === 'waiting');
    waitingCustomers.forEach(turn => {
        const option = document.createElement('option');
        option.value = turn.customerName;
        option.textContent = `${turn.customerName} (الدور #${turn.turnNumber})`;
        customerSelect.appendChild(option);
    });
}

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
}

function handleSMS(e) {
    e.preventDefault();
    
    const customer = document.getElementById('notificationCustomer').value;
    const adminPhone = document.getElementById('adminPhone').value;
    const message = document.getElementById('notificationMessage').value;
    
    if (!customer || !adminPhone || !message) {
        showToast('يرجى ملء جميع الحقول', 'error');
        return;
    }
    
    // Simulate sending SMS
    showToast(`تم إرسال الرسالة النصية إلى ${customer} من ${adminPhone}: "${message}"`, 'success');
    
    // Clear form
    notificationForm.reset();
    
    // Switch back to turns tab
    switchTab('turns');
}

function sendSMS(customerName, mobileNumber) {
    const adminPhone = prompt('أدخل رقم جوال المدير:');
    if (!adminPhone) return;
    
    const message = prompt('أدخل الرسالة النصية (افتراضي: "دورك، احضر خلال 15 دقيقة"):', 'دورك، احضر خلال 15 دقيقة');
    if (message) {
        showToast(`تم إرسال الرسالة النصية إلى ${customerName} (${mobileNumber}) من ${adminPhone}: "${message}"`, 'success');
    }
}

function completeTurn(turnId) {
    const turn = turns.find(t => t.id === turnId);
    if (turn) {
        turn.status = 'completed';
        localStorage.setItem('turns', JSON.stringify(turns));
        
        // If this is the current customer's turn, update the display
        if (currentCustomerTurn && currentCustomerTurn.id === turnId) {
            currentCustomerTurn.status = 'completed';
            showCustomerTurnStatus(currentCustomerTurn);
        }
        
        // Reorder turn numbers for remaining waiting customers
        reorderTurnNumbers();
        
        // Reload turns display
        loadTurns();
        loadCustomers();
        
        showToast(`تم إكمال الدور #${turn.turnNumber} بنجاح`, 'success');
    }
}

// Utility functions for Arabic text
function getServiceNameInArabic(serviceType) {
    const serviceNames = {
        'haircut': 'قص شعر',
        'beard-trim': 'قص لحية',
        'haircut-beard': 'قص شعر + لحية',
        'shampoo': 'غسيل شعر',
        'styling': 'تسريحة'
    };
    return serviceNames[serviceType] || serviceType;
}

function getStatusInArabic(status) {
    const statusNames = {
        'waiting': 'في الانتظار',
        'confirmed': 'مؤكد',
        'completed': 'مكتمل',
        'cancelled': 'ملغي'
    };
    return statusNames[status] || status;
}

function updateUI() {
    if (currentUser) {
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        bookNowBtn.textContent = 'لوحة تحكم المدير';
        bookNowBtn.onclick = showAdminDashboard;
    } else {
        loginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        bookNowBtn.textContent = 'خذ دورك';
        bookNowBtn.onclick = () => showModal(bookingModal);
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('notificationToast');
    const toastMessage = document.getElementById('toastMessage');
    
    // Set message and style based on type
    toastMessage.textContent = message;
    toast.className = `toast toast-${type}`;
    
    // Show toast
    toast.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        toast.style.display = 'none';
    }, 5000);
}

// Toast close functionality
document.querySelector('.toast-close').addEventListener('click', () => {
    document.getElementById('notificationToast').style.display = 'none';
});

// Load current user from localStorage on page refresh
window.addEventListener('load', function() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUI();
    }
});

