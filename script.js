/**
 * HAUS SIGNS - Quotation Calculator
 * Main Application Script
 */

// ==================== State ====================
const state = {
    prices: {},
    letters: [],
    logo: { name: '', type: 'frontLit', length: 0, width: 0, lengthInches: 0, widthInches: 0 },
    panel: { name: '', length: 0, width: 0, lengthInches: 0, widthInches: 0 },
    lightbox: { style: null, size: null, quantity: 1, customDimensions: null },
    quotationItems: [],
    images: [],
    dp: 0
};

// ==================== Initialize ====================
function init() {
    // Load prices from settings
    state.prices = loadPrices();

    // Initialize settings form
    initSettingsForm(state.prices);

    // Setup settings listeners
    setupSettingsListeners(
        (newPrices) => {
            state.prices = newPrices;
            updateAllCalculations();
        },
        (defaultPrices) => {
            state.prices = defaultPrices;
            updateAllCalculations();
        }
    );

    // Apply custom lightbox formulas and render formula list
    applyCustomLightboxFormulas();
    renderLightboxFormulaList();
    setupLightboxFormulaListeners();

    // Set default date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('quoteDate').value = today;

    // Add initial letter row
    addLetterRow();

    // Render lightbox styles
    renderLightboxStyles();

    // Setup event listeners
    setupTabListeners();
    setupSignageListeners();
    setupLightboxListeners();
    setupQuotationListeners();
    setupImageListeners();
    setupExportListeners();
    setupSecretSettingsAccess(); // Hidden settings access

    // Initial render
    renderQuotationItems();
    updateSignageSummary();
}

// ==================== Secret Settings Access ====================
let logoClickCount = 0;
let logoClickTimer = null;

function setupSecretSettingsAccess() {
    const logoIcon = document.querySelector('.logo-icon');
    if (logoIcon) {
        logoIcon.style.cursor = 'pointer';
        logoIcon.addEventListener('click', handleSecretClick);
    }
}

function handleSecretClick() {
    logoClickCount++;

    // Reset counter after 3 seconds of no clicks
    if (logoClickTimer) clearTimeout(logoClickTimer);
    logoClickTimer = setTimeout(() => {
        logoClickCount = 0;
    }, 3000);

    // After 5 clicks, show settings tab
    if (logoClickCount >= 5) {
        const settingsBtn = document.getElementById('settingsTabBtn');
        if (settingsBtn) {
            settingsBtn.style.display = 'flex';
            settingsBtn.click();
            showNotification('Admin Settings unlocked!', 'success');
        }
        logoClickCount = 0;
    }
}

// ==================== Tab Navigation ====================
function setupTabListeners() {
    const tabBtns = document.querySelectorAll('.tab-btn');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;

            // Update active tab button
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Show corresponding content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
}

// ==================== Signage Tab ====================
function setupSignageListeners() {
    // Add letter button
    document.getElementById('addLetterBtn').addEventListener('click', addLetterRow);

    // Logo name
    document.getElementById('logoName').addEventListener('input', (e) => {
        state.logo.name = e.target.value;
        updateSignageSummary();
    });

    // Logo type
    document.getElementById('logoType').addEventListener('input', updateLogoCalculation);

    // Logo inches inputs (auto-convert to cm)
    document.getElementById('logoLengthInches').addEventListener('input', (e) => {
        const inches = parseFloat(e.target.value) || 0;
        state.logo.lengthInches = inches;
        state.logo.length = Math.round(inches * INCH_TO_CM * 10) / 10;
        document.getElementById('logoLength').value = state.logo.length || '';
        updateLogoCalculation();
    });
    document.getElementById('logoWidthInches').addEventListener('input', (e) => {
        const inches = parseFloat(e.target.value) || 0;
        state.logo.widthInches = inches;
        state.logo.width = Math.round(inches * INCH_TO_CM * 10) / 10;
        document.getElementById('logoWidth').value = state.logo.width || '';
        updateLogoCalculation();
    });

    // Logo cm inputs (auto-convert to inches)
    document.getElementById('logoLength').addEventListener('input', (e) => {
        const cm = parseFloat(e.target.value) || 0;
        state.logo.length = cm;
        state.logo.lengthInches = Math.round(cm / INCH_TO_CM * 10) / 10;
        document.getElementById('logoLengthInches').value = state.logo.lengthInches || '';
        updateLogoCalculation();
    });
    document.getElementById('logoWidth').addEventListener('input', (e) => {
        const cm = parseFloat(e.target.value) || 0;
        state.logo.width = cm;
        state.logo.widthInches = Math.round(cm / INCH_TO_CM * 10) / 10;
        document.getElementById('logoWidthInches').value = state.logo.widthInches || '';
        updateLogoCalculation();
    });

    // Panel name
    document.getElementById('panelName').addEventListener('input', (e) => {
        state.panel.name = e.target.value;
        updateSignageSummary();
    });

    // Panel inches inputs (auto-convert to cm)
    document.getElementById('panelLengthInches').addEventListener('input', (e) => {
        const inches = parseFloat(e.target.value) || 0;
        state.panel.lengthInches = inches;
        state.panel.length = Math.round(inches * INCH_TO_CM * 10) / 10;
        document.getElementById('panelLength').value = state.panel.length || '';
        updatePanelCalculation();
    });
    document.getElementById('panelWidthInches').addEventListener('input', (e) => {
        const inches = parseFloat(e.target.value) || 0;
        state.panel.widthInches = inches;
        state.panel.width = Math.round(inches * INCH_TO_CM * 10) / 10;
        document.getElementById('panelWidth').value = state.panel.width || '';
        updatePanelCalculation();
    });

    // Panel cm inputs (auto-convert to inches)
    document.getElementById('panelLength').addEventListener('input', (e) => {
        const cm = parseFloat(e.target.value) || 0;
        state.panel.length = cm;
        state.panel.lengthInches = Math.round(cm / INCH_TO_CM * 10) / 10;
        document.getElementById('panelLengthInches').value = state.panel.lengthInches || '';
        updatePanelCalculation();
    });
    document.getElementById('panelWidth').addEventListener('input', (e) => {
        const cm = parseFloat(e.target.value) || 0;
        state.panel.width = cm;
        state.panel.widthInches = Math.round(cm / INCH_TO_CM * 10) / 10;
        document.getElementById('panelWidthInches').value = state.panel.widthInches || '';
        updatePanelCalculation();
    });

    // Add to quotation button
    document.getElementById('addToQuotationBtn').addEventListener('click', addSignageToQuotation);

    // Clear signage button
    document.getElementById('clearSignageBtn').addEventListener('click', clearSignage);
}

function addLetterRow() {
    const letterData = {
        id: Date.now(),
        name: '',
        type: 'frontLit',
        height: 0,
        heightInches: 0,
        charCount: 0
    };
    state.letters.push(letterData);
    renderLetterRows();
}

function removeLetterRow(id) {
    if (state.letters.length === 1) return;
    state.letters = state.letters.filter(l => l.id !== id);
    renderLetterRows();
    updateSignageSummary();
}

// Conversion constant: 1 inch = 2.54 cm
const INCH_TO_CM = 2.54;

function renderLetterRows() {
    const container = document.getElementById('letterRows');

    container.innerHTML = state.letters.map((letter, index) => `
    <div class="letter-row" data-id="${letter.id}">
      <div class="form-group letter-name-group">
        <label>Letter Content</label>
        <input type="text" class="letter-name" data-id="${letter.id}" 
               value="${letter.name || ''}" placeholder="E.g: HAUS SIGNS">
      </div>
      <div class="form-group">
        <label>Letter Type</label>
        <select class="letter-type" data-id="${letter.id}">
          ${LETTER_TYPES.map(t => `
            <option value="${t.id}" ${letter.type === t.id ? 'selected' : ''}>${t.name}</option>
          `).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Height (inches)</label>
        <input type="number" class="letter-height-inches" data-id="${letter.id}" 
               value="${letter.heightInches || ''}" placeholder="4" min="0" step="0.1">
      </div>
      <div class="form-group">
        <label>Height (cm)</label>
        <input type="number" class="letter-height" data-id="${letter.id}" 
               value="${letter.height || ''}" placeholder="10" min="0" step="0.1">
      </div>
      <div class="form-group">
        <label>Letter Count</label>
        <input type="number" class="letter-count" data-id="${letter.id}" 
               value="${letter.charCount || ''}" placeholder="0" min="0">
      </div>
      <div class="form-group result-display">
        <label>Price</label>
        <div class="result-value letter-price" data-id="${letter.id}">0 ₱</div>
      </div>
      <button class="remove-btn" data-id="${letter.id}" ${state.letters.length === 1 ? 'disabled' : ''}>✕</button>
    </div>
  `).join('');

    // Add event listeners for name
    container.querySelectorAll('.letter-name').forEach(input => {
        input.addEventListener('input', (e) => {
            const id = parseInt(e.target.dataset.id);
            const letter = state.letters.find(l => l.id === id);
            if (letter) {
                letter.name = e.target.value;
                updateSignageSummary();
            }
        });
    });

    container.querySelectorAll('.letter-type').forEach(select => {
        select.addEventListener('change', (e) => {
            const id = parseInt(e.target.dataset.id);
            const letter = state.letters.find(l => l.id === id);
            if (letter) {
                letter.type = e.target.value;
                updateLetterCalculation(id);
                updateSignageSummary();
            }
        });
    });

    // Inches input - auto convert to cm
    container.querySelectorAll('.letter-height-inches').forEach(input => {
        input.addEventListener('input', (e) => {
            const id = parseInt(e.target.dataset.id);
            const letter = state.letters.find(l => l.id === id);
            if (letter) {
                const inches = parseFloat(e.target.value) || 0;
                letter.heightInches = inches;
                letter.height = Math.round(inches * INCH_TO_CM * 10) / 10; // Round to 1 decimal
                // Update cm input
                const cmInput = container.querySelector(`.letter-height[data-id="${id}"]`);
                if (cmInput) cmInput.value = letter.height || '';
                updateLetterCalculation(id);
                updateSignageSummary();
            }
        });
    });

    // CM input - auto convert to inches
    container.querySelectorAll('.letter-height').forEach(input => {
        input.addEventListener('input', (e) => {
            const id = parseInt(e.target.dataset.id);
            const letter = state.letters.find(l => l.id === id);
            if (letter) {
                const cm = parseFloat(e.target.value) || 0;
                letter.height = cm;
                letter.heightInches = Math.round(cm / INCH_TO_CM * 10) / 10; // Round to 1 decimal
                // Update inches input
                const inchInput = container.querySelector(`.letter-height-inches[data-id="${id}"]`);
                if (inchInput) inchInput.value = letter.heightInches || '';
                updateLetterCalculation(id);
                updateSignageSummary();
            }
        });
    });

    container.querySelectorAll('.letter-count').forEach(input => {
        input.addEventListener('input', (e) => {
            const id = parseInt(e.target.dataset.id);
            const letter = state.letters.find(l => l.id === id);
            if (letter) {
                letter.charCount = parseInt(e.target.value) || 0;
                updateLetterCalculation(id);
                updateSignageSummary();
            }
        });
    });

    container.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.dataset.id);
            removeLetterRow(id);
        });
    });
}

// Minimum letter height in cm
const MIN_LETTER_HEIGHT = 15;         // For Front Lit & All Lit letters
const MIN_LETTER_HEIGHT_BACKLIT = 10; // For Back Lit letters
const MIN_LETTER_HEIGHT_3D = 8;       // For 3D Non-LED letters

function getMinHeightForType(letterType) {
    if (letterType === '3d') return MIN_LETTER_HEIGHT_3D;
    if (letterType === 'backLit') return MIN_LETTER_HEIGHT_BACKLIT;
    return MIN_LETTER_HEIGHT;
}

function updateLetterCalculation(id) {
    const letter = state.letters.find(l => l.id === id);
    if (!letter) return;

    const priceEl = document.querySelector(`.letter-price[data-id="${id}"]`);
    if (!priceEl) return;

    // Validate minimum height based on letter type
    const minHeight = getMinHeightForType(letter.type);
    if (letter.height > 0 && letter.height < minHeight) {
        priceEl.textContent = `⚠️ Minimum ${minHeight}cm`;
        priceEl.style.color = 'var(--danger)';
        letter.isValid = false;
        updateSignageSummary();
        return;
    }

    letter.isValid = true;
    priceEl.style.color = '';

    const result = calculateLetterPrice(letter.height, letter.charCount, letter.type, state.prices);
    priceEl.textContent = `${formatNumber(result.price)} ₱`;
    updateSignageSummary();
}

function updateLogoCalculation() {
    state.logo.type = document.getElementById('logoType').value;

    const result = calculateLogoPrice(state.logo.length, state.logo.width, state.logo.type, state.prices);

    document.getElementById('logoResult').textContent = `${formatNumber(result.price)} ₱`;

    updateSignageSummary();
}

function updatePanelCalculation() {
    const result = calculatePanelPrice(state.panel.length, state.panel.width, state.prices);

    document.getElementById('panelResult').textContent = `${formatNumber(result.price)} ₱`;

    updateSignageSummary();
}

function updateSignageSummary() {
    const summary = document.getElementById('signageSummary');
    let totalPrice = 0;
    let rows = [];

    // Letters (skip invalid ones)
    state.letters.forEach((letter, index) => {
        const minHeight = getMinHeightForType(letter.type);
        if (letter.height >= minHeight && letter.charCount > 0 && letter.isValid !== false) {
            const result = calculateLetterPrice(letter.height, letter.charCount, letter.type, state.prices);
            const typeInfo = LETTER_TYPES.find(t => t.id === letter.type);
            const displayName = letter.name || `Raised Letters ${index + 1}`;
            rows.push({
                label: `${displayName}: ${typeInfo?.name || ''} (${letter.height}cm × ${letter.charCount} letters)`,
                value: result.price
            });
            totalPrice += result.price;
        }
    });

    // Logo
    if (state.logo.length > 0 && state.logo.width > 0) {
        const result = calculateLogoPrice(state.logo.length, state.logo.width, state.logo.type, state.prices);
        const typeInfo = LETTER_TYPES.find(t => t.id === state.logo.type);
        const displayName = state.logo.name || 'Logo';
        rows.push({
            label: `${displayName}: ${typeInfo?.name || ''} (${state.logo.length}×${state.logo.width}cm)`,
            value: result.price
        });
        totalPrice += result.price;
    }

    // Panel
    if (state.panel.length > 0 && state.panel.width > 0) {
        const result = calculatePanelPrice(state.panel.length, state.panel.width, state.prices);
        const displayName = state.panel.name || 'Alu Panel';
        rows.push({
            label: `${displayName} (${state.panel.length}×${state.panel.width}cm)`,
            value: result.price
        });
        totalPrice += result.price;
    }

    if (rows.length === 0) {
        summary.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No products yet</p>';
        return;
    }

    summary.innerHTML = rows.map(row => `
    <div class="summary-row">
      <span class="label">${row.label}</span>
      <span class="value">${formatNumber(row.value)} ₱</span>
    </div>
  `).join('') + `
    <div class="summary-row total">
      <span class="label">Total</span>
      <span class="value">${formatNumber(totalPrice)} ₱</span>
    </div>
  `;
}

function addSignageToQuotation() {
    // Add letters (skip invalid ones)
    state.letters.forEach((letter, index) => {
        const minHeight = getMinHeightForType(letter.type);
        if (letter.height >= minHeight && letter.charCount > 0 && letter.isValid !== false) {
            const result = calculateLetterPrice(letter.height, letter.charCount, letter.type, state.prices);
            const typeInfo = LETTER_TYPES.find(t => t.id === letter.type);
            const displayName = letter.name || `Raised Letters`;
            state.quotationItems.push({
                description: `${displayName} - ${typeInfo?.name || ''} (${letter.height}cm x ${letter.charCount} letters)`,
                price: result.price
            });
        }
    });

    // Add logo
    if (state.logo.length > 0 && state.logo.width > 0) {
        const result = calculateLogoPrice(state.logo.length, state.logo.width, state.logo.type, state.prices);
        const typeInfo = LETTER_TYPES.find(t => t.id === state.logo.type);
        const displayName = state.logo.name || 'Logo';
        state.quotationItems.push({
            description: `${displayName} - ${typeInfo?.name || ''} (${state.logo.length}×${state.logo.width}cm)`,
            price: result.price
        });
    }

    // Add panel
    if (state.panel.length > 0 && state.panel.width > 0) {
        const result = calculatePanelPrice(state.panel.length, state.panel.width, state.prices);
        const displayName = state.panel.name || 'Alu Panel';
        state.quotationItems.push({
            description: `${displayName} (${state.panel.length}×${state.panel.width}cm)`,
            price: result.price
        });
    }

    renderQuotationItems();
    clearSignage();

    // Switch to quotation tab
    document.querySelector('[data-tab="quotation"]').click();

    showNotification('Added to quotation!', 'success');
}

function clearSignage() {
    state.letters = [];
    addLetterRow();

    state.logo = { name: '', type: 'frontLit', length: 0, width: 0, lengthInches: 0, widthInches: 0 };
    document.getElementById('logoName').value = '';
    document.getElementById('logoType').value = 'frontLit';
    document.getElementById('logoLengthInches').value = '';
    document.getElementById('logoLength').value = '';
    document.getElementById('logoWidthInches').value = '';
    document.getElementById('logoWidth').value = '';
    document.getElementById('logoResult').textContent = '0 ₱';

    state.panel = { name: '', length: 0, width: 0, lengthInches: 0, widthInches: 0 };
    document.getElementById('panelName').value = '';
    document.getElementById('panelLengthInches').value = '';
    document.getElementById('panelLength').value = '';
    document.getElementById('panelWidthInches').value = '';
    document.getElementById('panelWidth').value = '';
    document.getElementById('panelResult').textContent = '0 ₱';

    updateSignageSummary();
}

// ==================== Lightbox Tab ====================
function setupLightboxListeners() {
    // Quantity input
    document.getElementById('lightboxQty').addEventListener('input', updateLightboxCalculation);

    // Custom size inputs - Inches (auto-convert to cm)
    document.getElementById('customWidthInches').addEventListener('input', (e) => {
        const inches = parseFloat(e.target.value) || 0;
        const cm = Math.round(inches * INCH_TO_CM * 10) / 10;
        document.getElementById('customWidth').value = cm || '';
        updateLightboxCalculation();
    });
    document.getElementById('customHeightInches').addEventListener('input', (e) => {
        const inches = parseFloat(e.target.value) || 0;
        const cm = Math.round(inches * INCH_TO_CM * 10) / 10;
        document.getElementById('customHeight').value = cm || '';
        updateLightboxCalculation();
    });
    document.getElementById('customDepthInches').addEventListener('input', (e) => {
        const inches = parseFloat(e.target.value) || 0;
        const cm = Math.round(inches * INCH_TO_CM * 10) / 10;
        document.getElementById('customDepth').value = cm || '';
        updateLightboxCalculation();
    });

    // Custom size inputs - CM (auto-convert to inches)
    document.getElementById('customWidth').addEventListener('input', (e) => {
        const cm = parseFloat(e.target.value) || 0;
        const inches = Math.round(cm / INCH_TO_CM * 10) / 10;
        document.getElementById('customWidthInches').value = inches || '';
        updateLightboxCalculation();
    });
    document.getElementById('customHeight').addEventListener('input', (e) => {
        const cm = parseFloat(e.target.value) || 0;
        const inches = Math.round(cm / INCH_TO_CM * 10) / 10;
        document.getElementById('customHeightInches').value = inches || '';
        updateLightboxCalculation();
    });
    document.getElementById('customDepth').addEventListener('input', (e) => {
        const cm = parseFloat(e.target.value) || 0;
        const inches = Math.round(cm / INCH_TO_CM * 10) / 10;
        document.getElementById('customDepthInches').value = inches || '';
        updateLightboxCalculation();
    });

    // Add to quotation
    document.getElementById('addLightboxToQuotationBtn').addEventListener('click', addLightboxToQuotation);
}

function renderLightboxStyles() {
    const container = document.getElementById('lightboxStyles');

    container.innerHTML = Object.entries(LIGHTBOX_STYLES).map(([id, style]) => `
    <div class="lightbox-style-card" data-style="${id}">
      <div class="style-number">${id}</div>
      <div class="style-name">${style.name.replace(`Style ${id} - `, '')}</div>
    </div>
  `).join('');

    // Add click listeners
    container.querySelectorAll('.lightbox-style-card').forEach(card => {
        card.addEventListener('click', () => selectLightboxStyle(parseInt(card.dataset.style)));
    });
}

function selectLightboxStyle(styleId) {
    const style = LIGHTBOX_STYLES[styleId];
    if (!style) return;

    state.lightbox.style = styleId;
    state.lightbox.size = null;
    state.lightbox.customDimensions = null;

    // Update UI
    document.querySelectorAll('.lightbox-style-card').forEach(card => {
        card.classList.toggle('selected', parseInt(card.dataset.style) === styleId);
    });

    // Show config panel
    document.getElementById('lightboxConfig').style.display = 'block';
    document.getElementById('selectedStyleName').textContent = style.name;

    // Render size buttons
    renderSizeButtons(styleId);
}

function renderSizeButtons(styleId) {
    const style = LIGHTBOX_STYLES[styleId];
    const container = document.getElementById('sizeButtons');

    container.innerHTML = Object.entries(style.sizes).map(([size, data]) => `
    <button class="size-btn" data-size="${size}">
      <span class="size-label">${size}</span>
      <span class="size-dimensions">${data.label.replace(`${size}: `, '')}</span>
    </button>
  `).join('') + `
    <button class="size-btn" data-size="custom">
      <span class="size-label">Custom</span>
      <span class="size-dimensions">Custom size</span>
    </button>
  `;

    container.querySelectorAll('.size-btn').forEach(btn => {
        btn.addEventListener('click', () => selectLightboxSize(btn.dataset.size));
    });
}

function selectLightboxSize(size) {
    state.lightbox.size = size;

    // Update UI
    document.querySelectorAll('.size-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.size === size);
    });

    // Show/hide custom inputs
    const customInputs = document.getElementById('customSizeInputs');
    if (size === 'custom') {
        customInputs.style.display = 'block';
        state.lightbox.customDimensions = {
            width: parseFloat(document.getElementById('customWidth').value) || 0,
            height: parseFloat(document.getElementById('customHeight').value) || 0,
            depth: parseFloat(document.getElementById('customDepth').value) || 0
        };
    } else {
        customInputs.style.display = 'none';
        state.lightbox.customDimensions = null;
    }

    updateLightboxCalculation();
}

function updateLightboxCalculation() {
    // Clear any previous warning
    const warningEl = document.getElementById('lightboxSizeWarning');
    if (warningEl) warningEl.style.display = 'none';
    state.lightbox.isValid = true;

    if (!state.lightbox.style || !state.lightbox.size) {
        document.getElementById('lightboxResult').textContent = '0 ₱';
        return;
    }

    const quantity = parseInt(document.getElementById('lightboxQty').value) || 1;
    state.lightbox.quantity = quantity;

    if (state.lightbox.size === 'custom') {
        state.lightbox.customDimensions = {
            width: parseFloat(document.getElementById('customWidth').value) || 0,
            height: parseFloat(document.getElementById('customHeight').value) || 0,
            depth: parseFloat(document.getElementById('customDepth').value) || 0
        };

        // Validate against Size S minimum
        const style = LIGHTBOX_STYLES[state.lightbox.style];
        if (style && style.sizes.S) {
            const sizeS = style.sizes.S;
            const custom = state.lightbox.customDimensions;

            if (custom.width > 0 && custom.height > 0 && custom.depth > 0) {
                if (custom.width < sizeS.width || custom.height < sizeS.height || custom.depth < sizeS.depth) {
                    state.lightbox.isValid = false;
                    if (warningEl) {
                        warningEl.textContent = `⚠️ Minimum size is Size S: ${sizeS.width}×${sizeS.height}×${sizeS.depth}cm`;
                        warningEl.style.display = 'block';
                    }
                    document.getElementById('lightboxResult').textContent = '❌ Invalid size';
                    document.getElementById('lightboxResult').style.color = 'var(--danger)';
                    return;
                }
            }
        }
    }

    document.getElementById('lightboxResult').style.color = '';

    const result = calculateLightboxPrice(
        state.lightbox.style,
        state.lightbox.size,
        quantity,
        state.lightbox.customDimensions,
        state.prices
    );

    document.getElementById('lightboxResult').textContent =
        `${formatNumber(result.totalPrice)} ₱`;
}

function addLightboxToQuotation() {
    if (!state.lightbox.style || !state.lightbox.size) {
        showNotification('Please select a lightbox style and size!', 'error');
        return;
    }

    // Block if custom size is too small
    if (state.lightbox.isValid === false) {
        showNotification('Lightbox size is too small! Please select a size larger than Size S.', 'error');
        return;
    }

    const style = LIGHTBOX_STYLES[state.lightbox.style];
    const quantity = state.lightbox.quantity;

    let sizeLabel = '';
    if (state.lightbox.size === 'custom') {
        const { width, height, depth } = state.lightbox.customDimensions;
        sizeLabel = `Custom (${width}×${height}×${depth}cm)`;
    } else {
        sizeLabel = style.sizes[state.lightbox.size].label;
    }

    const result = calculateLightboxPrice(
        state.lightbox.style,
        state.lightbox.size,
        quantity,
        state.lightbox.customDimensions,
        state.prices
    );

    state.quotationItems.push({
        description: `${style.name} - ${sizeLabel}`,
        price: result.totalPrice
    });

    renderQuotationItems();

    // Reset lightbox selection
    state.lightbox = { style: null, size: null, quantity: 1, customDimensions: null };
    document.querySelectorAll('.lightbox-style-card').forEach(card => card.classList.remove('selected'));
    document.getElementById('lightboxConfig').style.display = 'none';
    document.getElementById('lightboxQty').value = '1';
    document.getElementById('customWidthInches').value = '';
    document.getElementById('customWidth').value = '';
    document.getElementById('customHeightInches').value = '';
    document.getElementById('customHeight').value = '';
    document.getElementById('customDepthInches').value = '';
    document.getElementById('customDepth').value = '';
    document.getElementById('lightboxResult').textContent = '0 ₱';

    // Switch to quotation tab
    document.querySelector('[data-tab="quotation"]').click();

    showNotification('Lightbox added to quotation!', 'success');
}

// ==================== Quotation Tab ====================
function setupQuotationListeners() {
    document.getElementById('addItemBtn').addEventListener('click', addManualItem);
    document.getElementById('dpAmount').addEventListener('input', updateQuotationTotals);

    // Installation checkbox
    document.getElementById('installationCheck').addEventListener('change', (e) => {
        const priceSection = document.getElementById('installationPriceSection');
        priceSection.style.display = e.target.checked ? 'flex' : 'none';
        if (!e.target.checked) {
            document.getElementById('installationPrice').value = '0';
        }
        updateQuotationTotals();
    });

    document.getElementById('installationPrice').addEventListener('input', updateQuotationTotals);
}

function addManualItem() {
    state.quotationItems.push({
        description: '',
        price: 0
    });
    renderQuotationItems();
}

function removeQuotationItem(index) {
    state.quotationItems.splice(index, 1);
    renderQuotationItems();
}

function renderQuotationItems() {
    const tbody = document.getElementById('itemsBody');

    if (state.quotationItems.length === 0) {
        tbody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align: center; color: var(--text-muted); padding: 2rem;">
          No products yet. Add from Signage or Lightbox tab.
        </td>
      </tr>
    `;
        updateQuotationTotals();
        return;
    }

    tbody.innerHTML = state.quotationItems.map((item, index) => `
    <tr>
      <td>
        <input type="text" placeholder="Product name" 
               value="${item.description}" 
               data-index="${index}" data-field="description">
      </td>
      <td>
        <input type="number" placeholder="0" min="0" step="0.01"
               value="${item.price || ''}" 
               data-index="${index}" data-field="price">
      </td>
      <td>
        <button class="remove-item-btn" data-index="${index}">✕</button>
      </td>
    </tr>
  `).join('');

    // Add event listeners
    tbody.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', handleItemInput);
    });

    tbody.querySelectorAll('.remove-item-btn').forEach(btn => {
        btn.addEventListener('click', () => removeQuotationItem(parseInt(btn.dataset.index)));
    });

    updateQuotationTotals();
}

function handleItemInput(e) {
    const index = parseInt(e.target.dataset.index);
    const field = e.target.dataset.field;
    let value = e.target.value;

    if (field === 'price') {
        value = parseFloat(value) || 0;
    }

    state.quotationItems[index][field] = value;
    updateQuotationTotals();
}

function updateQuotationTotals() {
    // Calculate items subtotal
    let subtotal = state.quotationItems.reduce((sum, item) => sum + (item.price || 0), 0);

    // Add installation if checked
    const installationChecked = document.getElementById('installationCheck').checked;
    const installationPrice = parseFloat(document.getElementById('installationPrice').value) || 0;

    if (installationChecked && installationPrice > 0) {
        subtotal += installationPrice;
    }

    state.dp = parseFloat(document.getElementById('dpAmount').value) || 0;
    const total = subtotal - state.dp;

    document.getElementById('subtotalDisplay').textContent = formatNumber(subtotal);
    document.getElementById('totalDisplay').textContent = formatNumber(total);
}

// ==================== Image Upload ====================
function setupImageListeners() {
    const uploadArea = document.getElementById('imageUploadArea');
    const input = document.getElementById('imageInput');

    uploadArea.addEventListener('click', () => input.click());
    input.addEventListener('change', handleImageSelect);

    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);

    document.addEventListener('paste', handleGlobalPaste);
}

function handleImageSelect(e) {
    const files = Array.from(e.target.files);
    addImages(files);
}

function handleDragOver(e) {
    e.preventDefault();
    document.getElementById('imageUploadArea').classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    document.getElementById('imageUploadArea').classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    document.getElementById('imageUploadArea').classList.remove('dragover');

    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    addImages(files);
}

function handleGlobalPaste(e) {
    const activeElement = document.activeElement;
    if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
        return;
    }

    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles = [];
    for (const item of items) {
        if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) imageFiles.push(file);
        }
    }

    if (imageFiles.length > 0) {
        e.preventDefault();
        document.getElementById('imageUploadArea').classList.add('dragover');
        setTimeout(() => {
            document.getElementById('imageUploadArea').classList.remove('dragover');
        }, 300);
        addImages(imageFiles);
    }
}

function addImages(files) {
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            state.images.push({
                name: file.name,
                data: e.target.result
            });
            renderImagePreviews();
        };
        reader.readAsDataURL(file);
    });
}

function renderImagePreviews() {
    const getLabel = (index) => index === 0 ? 'Layout' : `Additional ${index}`;

    document.getElementById('imagePreviews').innerHTML = state.images.map((img, index) => `
    <div class="image-preview-item">
      <img src="${img.data}" alt="${img.name}">
      <button class="remove-btn" data-index="${index}">✕</button>
      <div class="image-label">${getLabel(index)}</div>
    </div>
  `).join('');

    document.querySelectorAll('#imagePreviews .remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            state.images.splice(index, 1);
            renderImagePreviews();
        });
    });
}

// ==================== Export ====================
function setupExportListeners() {
    document.getElementById('previewBtn').addEventListener('click', showPreview);
    document.getElementById('closePreview').addEventListener('click', hidePreview);
    document.getElementById('copyImageBtn').addEventListener('click', copyImageToClipboard);
    document.getElementById('exportPdfBtn').addEventListener('click', exportPDF);
    document.getElementById('exportImageBtn').addEventListener('click', exportImage);
}

function updatePDFTemplate() {
    // Customer info
    document.getElementById('pdfCustomerName').textContent = document.getElementById('customerName').value || '';
    document.getElementById('pdfAddress').textContent = document.getElementById('address').value || '';
    document.getElementById('pdfPhone').textContent = document.getElementById('phone').value || '';

    // Date
    const date = document.getElementById('quoteDate').value;
    const formattedDate = date ? new Date(date).toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
    }) : '';
    document.getElementById('pdfDate').textContent = formattedDate;

    // Items
    const itemsBody = document.getElementById('pdfItemsBody');
    itemsBody.innerHTML = '';

    let subtotal = 0;
    state.quotationItems.forEach(item => {
        if (item.description || item.price > 0) {
            subtotal += item.price || 0;

            const tr = document.createElement('tr');
            tr.innerHTML = `
        <td>${item.description}</td>
        <td></td>
        <td></td>
        <td>${formatNumber(item.price || 0)}</td>
      `;
            itemsBody.appendChild(tr);
        }
    });

    // Add installation if checked
    const installationChecked = document.getElementById('installationCheck').checked;
    const installationPrice = parseFloat(document.getElementById('installationPrice').value) || 0;

    if (installationChecked && installationPrice > 0) {
        subtotal += installationPrice;
        const tr = document.createElement('tr');
        tr.innerHTML = `
        <td>Installation Fee</td>
        <td></td>
        <td></td>
        <td>${formatNumber(installationPrice)}</td>
      `;
        itemsBody.appendChild(tr);
    }

    // Totals
    const dp = parseFloat(document.getElementById('dpAmount').value) || 0;
    const total = subtotal - dp;

    document.getElementById('pdfDP').textContent = formatNumber(dp);
    document.getElementById('pdfSubtotal').textContent = formatNumber(subtotal);
    document.getElementById('pdfTotal').textContent = formatNumber(total);

    // Update payment terms note based on installation
    const termsNote = document.querySelector('.pdf-template .terms-note');
    if (termsNote) {
        if (installationChecked && installationPrice > 0) {
            termsNote.innerHTML = '<strong>Note:</strong> Price includes accompanying accessories. This is a NON-VAT receipt.';
        } else {
            termsNote.innerHTML = '<strong>Note:</strong> Price includes accompanying accessories. Installation fees and shipping are not included. This is a NON-VAT receipt.';
        }
    }

    // Images
    const layoutContainer = document.getElementById('pdfLayoutImage');
    const imagesSection = document.getElementById('pdfImagesSection');

    if (layoutContainer) {
        if (state.images.length > 0) {
            layoutContainer.innerHTML = state.images.map((img, i) =>
                `<div class="pdf-image-row">
          <img src="${img.data}" alt="Layout ${i + 1}">
          <div class="pdf-image-label">Layout ${i + 1} of ${state.images.length}</div>
        </div>`
            ).join('');
            imagesSection.style.display = 'block';
        } else {
            layoutContainer.innerHTML = '';
            imagesSection.style.display = 'none';
        }
    }
}

function showPreview() {
    updatePDFTemplate();

    const template = document.getElementById('pdfTemplate');
    document.getElementById('previewContainer').innerHTML = template.innerHTML;

    document.getElementById('previewSection').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hidePreview() {
    document.getElementById('previewSection').classList.remove('active');
    document.body.style.overflow = '';
}

function exportPDF() {
    if (!document.getElementById('customerName').value.trim()) {
        showNotification('Please enter customer name!', 'error');
        document.getElementById('customerName').focus();
        return;
    }

    updatePDFTemplate();

    const template = document.getElementById('pdfTemplate');
    const pdfContent = template.querySelector('.pdf-content');
    const customerName = document.getElementById('customerName').value.replace(/[^a-zA-Z0-9]/g, '_');
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filename = `Quotation_${customerName}_${date}.pdf`;

    const btn = document.getElementById('exportPdfBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="icon">⏳</span> Generating...';

    template.style.position = 'static';
    template.style.left = 'auto';

    html2canvas(pdfContent, {
        scale: 2,
        useCORS: true,
        logging: false
    }).then(canvas => {
        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        const imgWidth = 210;
        const pageHeight = (canvas.height * imgWidth) / canvas.width;

        const pdf = new jspdf.jsPDF({
            unit: 'mm',
            format: [imgWidth, pageHeight],
            orientation: 'portrait'
        });

        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, pageHeight);
        pdf.save(filename);

        template.style.position = 'absolute';
        template.style.left = '-9999px';

        btn.disabled = false;
        btn.innerHTML = '<span class="icon">📄</span> Export PDF';

        showNotification('PDF exported successfully!', 'success');
    }).catch(error => {
        console.error('Error generating PDF:', error);

        template.style.position = 'absolute';
        template.style.left = '-9999px';

        btn.disabled = false;
        btn.innerHTML = '<span class="icon">📄</span> Export PDF';

        showNotification('Error generating PDF. Please try again!', 'error');
    });
}

function exportImage() {
    if (!document.getElementById('customerName').value.trim()) {
        showNotification('Please enter customer name!', 'error');
        document.getElementById('customerName').focus();
        return;
    }

    updatePDFTemplate();

    const template = document.getElementById('pdfTemplate');
    const pdfContent = template.querySelector('.pdf-content');
    const customerName = document.getElementById('customerName').value.replace(/[^a-zA-Z0-9]/g, '_');
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filename = `Quotation_${customerName}_${date}.png`;

    const btn = document.getElementById('exportImageBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="icon">⏳</span> Generating...';

    template.style.position = 'static';
    template.style.left = 'auto';

    html2canvas(pdfContent, {
        scale: 2,
        useCORS: true,
        logging: false
    }).then(canvas => {
        canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            template.style.position = 'absolute';
            template.style.left = '-9999px';

            btn.disabled = false;
            btn.innerHTML = '<span class="icon">🖼️</span> Export Image';

            showNotification('Image exported successfully!', 'success');
        }, 'image/png');
    }).catch(error => {
        console.error('Error generating image:', error);

        template.style.position = 'absolute';
        template.style.left = '-9999px';

        btn.disabled = false;
        btn.innerHTML = '<span class="icon">🖼️</span> Export Image';

        showNotification('Error generating image. Please try again!', 'error');
    });
}

function copyImageToClipboard() {
    if (!document.getElementById('customerName').value.trim()) {
        showNotification('Please enter customer name!', 'error');
        document.getElementById('customerName').focus();
        return;
    }

    updatePDFTemplate();

    const template = document.getElementById('pdfTemplate');
    const pdfContent = template.querySelector('.pdf-content');

    const btn = document.getElementById('copyImageBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="icon">⏳</span> Copying...';

    template.style.position = 'static';
    template.style.left = 'auto';

    html2canvas(pdfContent, {
        scale: 2,
        useCORS: true,
        logging: false
    }).then(canvas => {
        canvas.toBlob(async blob => {
            try {
                await navigator.clipboard.write([
                    new ClipboardItem({
                        'image/png': blob
                    })
                ]);

                template.style.position = 'absolute';
                template.style.left = '-9999px';

                btn.disabled = false;
                btn.innerHTML = '<span class="icon">📋</span> Copy Image';

                showNotification('Image copied to clipboard!', 'success');
            } catch (err) {
                console.error('Failed to copy image:', err);

                template.style.position = 'absolute';
                template.style.left = '-9999px';

                btn.disabled = false;
                btn.innerHTML = '<span class="icon">📋</span> Copy Image';

                showNotification('Failed to copy. Try Export Image instead.', 'error');
            }
        }, 'image/png');
    }).catch(error => {
        console.error('Error generating image:', error);

        template.style.position = 'absolute';
        template.style.left = '-9999px';

        btn.disabled = false;
        btn.innerHTML = '<span class="icon">📋</span> Copy Image';

        showNotification('Error generating image. Please try again!', 'error');
    });
}

// ==================== Utilities ====================
function updateAllCalculations() {
    // Update all letter calculations
    state.letters.forEach(letter => {
        updateLetterCalculation(letter.id);
    });

    // Update logo and panel
    updateLogoCalculation();
    updatePanelCalculation();

    // Update lightbox
    updateLightboxCalculation();

    // Update summary
    updateSignageSummary();
}

// ==================== Start ====================
document.addEventListener('DOMContentLoaded', init);
