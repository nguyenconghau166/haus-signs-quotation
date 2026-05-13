/**
 * HAUS SIGNS - Quotation Calculator
 * Main Application Script
 */

// ==================== State ====================
const state = {
    prices: {},
    letters: [],
    logo: {
        name: '',
        type: 'acrylicFomex',
        noLed: false,
        difficult: false,
        length: 0,
        width: 0,
        lengthInches: 0,
        widthInches: 0
    },
    acrylicLogo: {
        name: '',
        shape: 'round',
        complex: false,
        length: 0,
        width: 0,
        lengthInches: 0,
        widthInches: 0
    },
    panel: { name: '', hasSticker: false, length: 0, width: 0, lengthInches: 0, widthInches: 0 },
    lightbox: { style: null, size: null, quantity: 1, customDimensions: null },
    anchor: {
        productType: 'letter',
        letter: { name: '', height: 0, heightInches: 0, charCount: 0 },
        logo: { name: '', length: 0, width: 0, lengthInches: 0, widthInches: 0 },
        panel: { name: '', length: 0, width: 0, lengthInches: 0, widthInches: 0 }
    },
    quotationItems: [],
    images: [],
    dp: 0,
    discount: 0,
    vatEnabled: false,
    customer: {
        name: localStorage.getItem('customerName') || '',
        company: localStorage.getItem('customerCompany') || '',
        phone: localStorage.getItem('customerPhone') || '',
        email: localStorage.getItem('customerEmail') || ''
    }
};

// ==================== Initialize ====================
async function init() {
    // Load prices from settings
    state.prices = await loadPrices();
    const settingsMeta = getSettingsMeta();

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

    // Set default date and validity
    const today = new Date();
    document.getElementById('quoteDate').value = today.toISOString().split('T')[0];
    const validUntil = new Date(today);
    validUntil.setDate(validUntil.getDate() + 15);
    const validUntilEl = document.getElementById('quoteValidUntil');
    if (validUntilEl) validUntilEl.value = validUntil.toISOString().split('T')[0];

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
    setupFlashingListeners(); // Flashing Mode Haus Sign
    setupSecretSettingsAccess(); // Hidden settings access

    // Initial render
    renderQuotationItems();
    updateSignageSummary();

    if (settingsMeta.source === 'cache') {
        showNotification('Shared settings server is offline. Using local cached prices.', 'error');
    }

    // Keep settings in sync when multiple employees use the same shared server
    startSharedPriceSync();
}

function arePricesEqual(a, b) {
    const keys = Object.keys(DEFAULT_PRICES);
    return keys.every((key) => (a?.[key] || 0) === (b?.[key] || 0));
}

function startSharedPriceSync(intervalMs = 15000) {
    let formulaSignature = JSON.stringify(loadLightboxFormulas());

    setInterval(async () => {
        const latestPrices = await loadPrices();
        const latestFormulaSignature = JSON.stringify(loadLightboxFormulas());
        let hasChanges = false;

        if (!arePricesEqual(latestPrices, state.prices)) {
            state.prices = latestPrices;
            initSettingsForm(latestPrices);
            updateAllCalculations();
            hasChanges = true;
        }

        if (latestFormulaSignature !== formulaSignature) {
            formulaSignature = latestFormulaSignature;
            applyCustomLightboxFormulas();
            renderLightboxFormulaList();
            updateLightboxCalculation();
            hasChanges = true;
        }

        if (hasChanges) {
            showNotification('Shared settings updated from server.', 'success');
        }
    }, intervalMs);
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

            // Show corresponding content (only toggle input-panel tabs, not quotation)
            document.querySelectorAll('.input-panel .tab-content').forEach(content => {
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

    // Logo type and options
    document.getElementById('logoType').addEventListener('input', updateLogoCalculation);
    document.getElementById('logoNoLed').addEventListener('change', (e) => {
        state.logo.noLed = e.target.checked;
        updateLogoCalculation();
    });
    document.getElementById('logoDifficult').addEventListener('change', (e) => {
        state.logo.difficult = e.target.checked;
        updateLogoCalculation();
    });

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

    // Acrylic Logo name
    document.getElementById('acrylicLogoName').addEventListener('input', (e) => {
        state.acrylicLogo.name = e.target.value;
        updateSignageSummary();
    });
    document.getElementById('acrylicLogoShape').addEventListener('change', (e) => {
        state.acrylicLogo.shape = e.target.value;
        updateAcrylicLogoCalculation();
    });
    document.getElementById('acrylicLogoComplex').addEventListener('change', (e) => {
        state.acrylicLogo.complex = e.target.checked;
        updateAcrylicLogoCalculation();
    });

    // Acrylic Logo inches inputs (auto-convert to cm)
    document.getElementById('acrylicLogoLengthInches').addEventListener('input', (e) => {
        const inches = parseFloat(e.target.value) || 0;
        state.acrylicLogo.lengthInches = inches;
        state.acrylicLogo.length = Math.round(inches * INCH_TO_CM * 10) / 10;
        document.getElementById('acrylicLogoLength').value = state.acrylicLogo.length || '';
        updateAcrylicLogoCalculation();
    });
    document.getElementById('acrylicLogoWidthInches').addEventListener('input', (e) => {
        const inches = parseFloat(e.target.value) || 0;
        state.acrylicLogo.widthInches = inches;
        state.acrylicLogo.width = Math.round(inches * INCH_TO_CM * 10) / 10;
        document.getElementById('acrylicLogoWidth').value = state.acrylicLogo.width || '';
        updateAcrylicLogoCalculation();
    });

    // Acrylic Logo cm inputs (auto-convert to inches)
    document.getElementById('acrylicLogoLength').addEventListener('input', (e) => {
        const cm = parseFloat(e.target.value) || 0;
        state.acrylicLogo.length = cm;
        state.acrylicLogo.lengthInches = Math.round(cm / INCH_TO_CM * 10) / 10;
        document.getElementById('acrylicLogoLengthInches').value = state.acrylicLogo.lengthInches || '';
        updateAcrylicLogoCalculation();
    });
    document.getElementById('acrylicLogoWidth').addEventListener('input', (e) => {
        const cm = parseFloat(e.target.value) || 0;
        state.acrylicLogo.width = cm;
        state.acrylicLogo.widthInches = Math.round(cm / INCH_TO_CM * 10) / 10;
        document.getElementById('acrylicLogoWidthInches').value = state.acrylicLogo.widthInches || '';
        updateAcrylicLogoCalculation();
    });

    // Panel name
    document.getElementById('panelName').addEventListener('input', (e) => {
        state.panel.name = e.target.value;
        updateSignageSummary();
    });
    document.getElementById('panelWithSticker').addEventListener('change', (e) => {
        state.panel.hasSticker = e.target.checked;
        updatePanelCalculation();
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
        type: 'acrylicFomex',
        noLed: false,
        difficult: false,
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

// Utility function to count characters (excluding spaces, periods, commas)
function countCharacters(text) {
    if (!text) return 0;
    // Exclude spaces, periods, commas from count
    return text.replace(/[ .,]/g, '').length;
}

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
        <label class="checkbox-label">
          <input type="checkbox" class="letter-no-led" data-id="${letter.id}" ${letter.noLed ? 'checked' : ''}>
          <span>No LED</span>
        </label>
      </div>
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" class="letter-difficult" data-id="${letter.id}" ${letter.difficult ? 'checked' : ''}>
          <span>Difficult lettering</span>
        </label>
      </div>
      <div class="form-group" style="display: none;">
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
                // Auto-count characters from content
                letter.charCount = countCharacters(e.target.value);
                // Update the hidden input field value
                const countInput = container.querySelector(`.letter-count[data-id="${id}"]`);
                if (countInput) countInput.value = letter.charCount;
                // Recalculate price based on new character count
                updateLetterCalculation(id);
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

    container.querySelectorAll('.letter-no-led').forEach(input => {
        input.addEventListener('change', (e) => {
            const id = parseInt(e.target.dataset.id);
            const letter = state.letters.find(l => l.id === id);
            if (letter) {
                letter.noLed = e.target.checked;
                updateLetterCalculation(id);
            }
        });
    });

    container.querySelectorAll('.letter-difficult').forEach(input => {
        input.addEventListener('change', (e) => {
            const id = parseInt(e.target.dataset.id);
            const letter = state.letters.find(l => l.id === id);
            if (letter) {
                letter.difficult = e.target.checked;
                updateLetterCalculation(id);
            }
        });
    });

    container.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.dataset.id);
            removeLetterRow(id);
        });
    });

    // Update calculations for all existing letters
    state.letters.forEach(letter => {
        updateLetterCalculation(letter.id);
    });
}

// Minimum letter height in cm
const MIN_LETTER_HEIGHT = 15;         // For Illuminated letters
const MIN_LETTER_HEIGHT_NON_ILLUMINATED = 8; // For Non-illuminated letters

function isNonLedLetterType(letterType) {
    return ['cutOut', 'stainless'].includes(letterType);
}

function isLedCapableType(letterType) {
    return !isNonLedLetterType(letterType);
}

function getMinHeightForType(letterType) {
    if (isNonLedLetterType(letterType)) return MIN_LETTER_HEIGHT_NON_ILLUMINATED;
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

    const result = calculateLetterPrice(letter.height, letter.charCount, letter.type, state.prices, {
        noLed: letter.noLed,
        difficult: letter.difficult
    });
    priceEl.textContent = `${formatNumber(result.price)} ₱`;
    updateSignageSummary();
}

function updateLogoCalculation() {
    state.logo.type = document.getElementById('logoType').value;
    state.logo.noLed = document.getElementById('logoNoLed').checked;
    state.logo.difficult = document.getElementById('logoDifficult').checked;

    const result = calculateLogoPrice(state.logo.length, state.logo.width, state.logo.type, state.prices, {
        noLed: state.logo.noLed,
        difficult: state.logo.difficult
    });

    document.getElementById('logoResult').textContent = `${formatNumber(result.price)} ₱`;

    updateSignageSummary();
}

function updateAcrylicLogoCalculation() {
    state.acrylicLogo.shape = document.getElementById('acrylicLogoShape').value;
    state.acrylicLogo.complex = document.getElementById('acrylicLogoComplex').checked;

    const result = calculateAcrylicLogoPrice(
        state.acrylicLogo.length,
        state.acrylicLogo.width,
        state.prices,
        state.acrylicLogo.shape,
        state.acrylicLogo.complex
    );

    document.getElementById('acrylicLogoResult').textContent = `${formatNumber(result.price)} ₱`;

    updateSignageSummary();
}

function updatePanelCalculation() {
    state.panel.hasSticker = document.getElementById('panelWithSticker').checked;

    const result = calculatePanelPrice(state.panel.length, state.panel.width, state.prices, state.panel.hasSticker);

    document.getElementById('panelResult').textContent = `${formatNumber(result.price)} ₱`;

    updateSignageSummary();
}

function updateSignageSummary() {
    const summary = document.getElementById('signageSummary');
    let totalPrice = 0;
    let totalLetterPrice = 0; // Track total price of letters for surcharge calculation
    let rows = [];

    // First pass: Calculate total letter price to determine surcharge
    let lettersWithPrice = [];
    state.letters.forEach((letter, index) => {
        const minHeight = getMinHeightForType(letter.type);
        if (letter.height >= minHeight && letter.charCount > 0 && letter.isValid !== false) {
            const result = calculateLetterPrice(letter.height, letter.charCount, letter.type, state.prices, {
                noLed: letter.noLed,
                difficult: letter.difficult
            });
            lettersWithPrice.push({ ...letter, price: result.price, index: index });
            totalLetterPrice += result.price;
        }
    });

    // Calculate surcharge based on dynamic settings
    const threshold1 = state.prices.surchargeThreshold1 || DEFAULT_PRICES.surchargeThreshold1;
    const amount1 = state.prices.surchargeAmount1 || DEFAULT_PRICES.surchargeAmount1;
    const threshold2 = state.prices.surchargeThreshold2 || DEFAULT_PRICES.surchargeThreshold2;
    const amount2 = state.prices.surchargeAmount2 || DEFAULT_PRICES.surchargeAmount2;

    let surcharge = 0;
    if (totalLetterPrice > 0) {
        if (totalLetterPrice < threshold1) {
            surcharge = amount1;
        } else if (totalLetterPrice < threshold2) {
            surcharge = amount2;
        }
    }

    // Second pass: Generate rows and apply surcharge to the first valid letter item
    let surchargeApplied = false;

    lettersWithPrice.forEach((item) => {
        const typeInfo = LETTER_TYPES.find(t => t.id === item.type);
        const displayName = item.name || `Raised Letters ${item.index + 1}`;

        // Add surcharge to the first item if applicable
        let displayPrice = item.price;
        const optionText = [item.noLed ? 'No LED' : '', item.difficult ? 'Difficult lettering' : '']
            .filter(Boolean)
            .join(', ');
        let label = `${displayName}: ${typeInfo?.name || ''} (${item.height}cm × ${item.charCount} letters${optionText ? `, ${optionText}` : ''})`;

        if (surcharge > 0 && !surchargeApplied) {
            displayPrice += surcharge;
            surchargeApplied = true;
            // Surcharge is merged directly into item price.
            // We can just show the total price.
        }

        rows.push({
            label: label,
            value: displayPrice
        });
        totalPrice += displayPrice;
    });

    // Logo
    if (state.logo.length > 0 && state.logo.width > 0) {
        const result = calculateLogoPrice(state.logo.length, state.logo.width, state.logo.type, state.prices, {
            noLed: state.logo.noLed,
            difficult: state.logo.difficult
        });
        const typeInfo = LETTER_TYPES.find(t => t.id === state.logo.type);
        const displayName = state.logo.name || 'Logo';
        const logoOptionText = [state.logo.noLed ? 'No LED' : '', state.logo.difficult ? 'Difficult lettering' : '']
            .filter(Boolean)
            .join(', ');
        rows.push({
            label: `${displayName}: ${typeInfo?.name || ''} (${state.logo.length}×${state.logo.width}cm${logoOptionText ? `, ${logoOptionText}` : ''})`,
            value: result.price
        });
        totalPrice += result.price;
    }

    // Removed separate surcharge display block as it's now integrated

    // Acrylic Logo
    if (state.acrylicLogo.length > 0 && state.acrylicLogo.width > 0) {
        const result = calculateAcrylicLogoPrice(
            state.acrylicLogo.length,
            state.acrylicLogo.width,
            state.prices,
            state.acrylicLogo.shape,
            state.acrylicLogo.complex
        );
        const displayName = state.acrylicLogo.name || 'Illuminated Acrylic Logo';
        const shapeText = state.acrylicLogo.shape === 'square' ? 'square' : 'round';
        rows.push({
            label: `${displayName} (${state.acrylicLogo.length}×${state.acrylicLogo.width}cm, ${shapeText}${state.acrylicLogo.complex ? ', complex shape' : ''})`,
            value: result.price
        });
        totalPrice += result.price;
    }

    // Panel
    if (state.panel.length > 0 && state.panel.width > 0) {
        const result = calculatePanelPrice(state.panel.length, state.panel.width, state.prices, state.panel.hasSticker);
        const displayName = state.panel.name || 'Aluminum Panel';
        rows.push({
            label: `${displayName} (${state.panel.length}×${state.panel.width}cm${state.panel.hasSticker ? ', sticker print included' : ''})`,
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
    // Calculate total letter price for surcharge
    let totalLetterPrice = 0;
    let lettersWithPrice = [];

    // First pass: Calculate prices and total
    state.letters.forEach((letter, index) => {
        const minHeight = getMinHeightForType(letter.type);
        if (letter.height >= minHeight && letter.charCount > 0 && letter.isValid !== false) {
            const result = calculateLetterPrice(letter.height, letter.charCount, letter.type, state.prices, {
                noLed: letter.noLed,
                difficult: letter.difficult
            });
            lettersWithPrice.push({ ...letter, price: result.price, index: index });
            totalLetterPrice += result.price;
        }
    });

    // Calculate surcharge based on dynamic settings
    const threshold1 = state.prices.surchargeThreshold1 || DEFAULT_PRICES.surchargeThreshold1;
    const amount1 = state.prices.surchargeAmount1 || DEFAULT_PRICES.surchargeAmount1;
    const threshold2 = state.prices.surchargeThreshold2 || DEFAULT_PRICES.surchargeThreshold2;
    const amount2 = state.prices.surchargeAmount2 || DEFAULT_PRICES.surchargeAmount2;

    let surcharge = 0;
    if (totalLetterPrice > 0) {
        if (totalLetterPrice < threshold1) {
            surcharge = amount1;
        } else if (totalLetterPrice < threshold2) {
            surcharge = amount2;
        }
    }

    // Second pass: Add to quotation items
    let surchargeApplied = false;

    lettersWithPrice.forEach((item) => {
        const typeInfo = LETTER_TYPES.find(t => t.id === item.type);
        const displayName = item.name || `Raised Letters`;

        let displayPrice = item.price;

        // Add surcharge to first item
        if (surcharge > 0 && !surchargeApplied) {
            displayPrice += surcharge;
            surchargeApplied = true;
        }

        state.quotationItems.push({
            description: `${displayName} - ${typeInfo?.name || ''} (${item.height}cm x ${item.charCount} letters${item.noLed ? ', No LED' : ''}${item.difficult ? ', Difficult lettering' : ''})`,
            price: displayPrice,
            quantity: 1
        });

    });

    // Add logo
    if (state.logo.length > 0 && state.logo.width > 0) {
        const result = calculateLogoPrice(state.logo.length, state.logo.width, state.logo.type, state.prices, {
            noLed: state.logo.noLed,
            difficult: state.logo.difficult
        });
        const typeInfo = LETTER_TYPES.find(t => t.id === state.logo.type);
        const displayName = state.logo.name || 'Logo';
        state.quotationItems.push({
            description: `${displayName} - ${typeInfo?.name || ''} (${state.logo.length}×${state.logo.width}cm${state.logo.noLed ? ', No LED' : ''}${state.logo.difficult ? ', Difficult lettering' : ''})`,
            price: result.price,
            quantity: 1
        });

    }

    // Add acrylic logo
    if (state.acrylicLogo.length > 0 && state.acrylicLogo.width > 0) {
        const result = calculateAcrylicLogoPrice(
            state.acrylicLogo.length,
            state.acrylicLogo.width,
            state.prices,
            state.acrylicLogo.shape,
            state.acrylicLogo.complex
        );
        const displayName = state.acrylicLogo.name || 'Illuminated Acrylic Logo';
        const shapeText = state.acrylicLogo.shape === 'square' ? 'square' : 'round';
        state.quotationItems.push({
            description: `${displayName} - Illuminated Acrylic Logo (${shapeText}${state.acrylicLogo.complex ? ', complex shape' : ''}) (${state.acrylicLogo.length}×${state.acrylicLogo.width}cm)`,
            price: result.price,
            quantity: 1
        });

    }

    // Add panel
    if (state.panel.length > 0 && state.panel.width > 0) {
        const result = calculatePanelPrice(state.panel.length, state.panel.width, state.prices, state.panel.hasSticker);
        const displayName = state.panel.name || 'Aluminum Panel';
        state.quotationItems.push({
            description: `${displayName} (${state.panel.length}×${state.panel.width}cm${state.panel.hasSticker ? ', sticker print included' : ''})`,
            price: result.price,
            quantity: 1
        });
    }

    renderQuotationItems();
    clearSignage();

    // Scroll quotation panel to top to show new items
    const qPanel = document.querySelector('.quotation-panel');
    if (qPanel) qPanel.scrollTop = 0;

    showNotification('Added to quotation!', 'success');
}

function clearSignage() {
    state.letters = [];
    addLetterRow();

    state.logo = {
        name: '',
        type: 'acrylicFomex',
        noLed: false,
        difficult: false,
        length: 0,
        width: 0,
        lengthInches: 0,
        widthInches: 0
    };
    document.getElementById('logoName').value = '';
    document.getElementById('logoType').value = 'acrylicFomex';
    document.getElementById('logoNoLed').checked = false;
    document.getElementById('logoDifficult').checked = false;
    document.getElementById('logoLengthInches').value = '';
    document.getElementById('logoLength').value = '';
    document.getElementById('logoWidthInches').value = '';
    document.getElementById('logoWidth').value = '';
    document.getElementById('logoResult').textContent = '0 ₱';

    state.acrylicLogo = { name: '', shape: 'round', complex: false, length: 0, width: 0, lengthInches: 0, widthInches: 0 };
    document.getElementById('acrylicLogoName').value = '';
    document.getElementById('acrylicLogoShape').value = 'round';
    document.getElementById('acrylicLogoComplex').checked = false;
    document.getElementById('acrylicLogoLengthInches').value = '';
    document.getElementById('acrylicLogoLength').value = '';
    document.getElementById('acrylicLogoWidthInches').value = '';
    document.getElementById('acrylicLogoWidth').value = '';
    document.getElementById('acrylicLogoResult').textContent = '0 ₱';

    state.panel = { name: '', hasSticker: false, length: 0, width: 0, lengthInches: 0, widthInches: 0 };
    document.getElementById('panelName').value = '';
    document.getElementById('panelWithSticker').checked = false;
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
        price: result.totalPrice,
        quantity: 1
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

    // Scroll quotation panel to top to show new items
    const qPanel = document.querySelector('.quotation-panel');
    if (qPanel) qPanel.scrollTop = 0;

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
    document.getElementById('discountAmount').addEventListener('input', updateQuotationTotals);
    document.getElementById('vatCheck').addEventListener('change', updateQuotationTotals);

    // Customer Name listener (Quotation Tab)
    const customerNameInput = document.getElementById('customerName');
    if (customerNameInput) {
        customerNameInput.addEventListener('input', (e) => {
            state.customer.name = e.target.value;
            localStorage.setItem('customerName', e.target.value);
            // Sync with Anchor tab input
            const anchorInput = document.getElementById('anchorCustomerName');
            if (anchorInput) anchorInput.value = e.target.value;
        });
        // Initialize from state
        customerNameInput.value = state.customer.name;
    }

    // Phone listener (Quotation Tab)
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            state.customer.phone = e.target.value;
            localStorage.setItem('customerPhone', e.target.value);
            // Sync with Anchor tab input
            const anchorInput = document.getElementById('anchorCustomerPhone');
            if (anchorInput) anchorInput.value = e.target.value;
        });
        // Initialize from state
        phoneInput.value = state.customer.phone;
    }
}

function addManualItem() {
    state.quotationItems.push({
        description: '',
        price: 0,
        quantity: 1
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
      <tr class="ef-item-row">
        <td colspan="10" style="text-align: center; color: #999; padding: 12px; font-size: 10px;">
          No products yet. Add from Signage or Lightbox tab.
        </td>
      </tr>
    `;
        updateQuotationTotals();
        return;
    }

    tbody.innerHTML = state.quotationItems.map((item, index) => {
        const qty = item.quantity || 1;
        const price = item.price || 0;
        const amount = qty * price;
        return `
    <tr class="ef-item-row">
      <td class="ef-col-no">${index + 1}</td>
      <td class="ef-col-qty">
        <input type="number" placeholder="1" min="1" step="1"
               value="${qty}"
               data-index="${index}" data-field="quantity">
      </td>
      <td class="ef-col-unit">
        <input type="text" value="${item.unit || 'set'}"
               data-index="${index}" data-field="unit"
               style="width:36px;text-align:center;">
      </td>
      <td colspan="3" class="ef-col-desc">
        <input type="text" placeholder="Product name"
               value="${item.description}"
               data-index="${index}" data-field="description">
      </td>
      <td colspan="2" class="ef-col-price">
        <input type="number" placeholder="0" min="0" step="0.01"
               value="${price || ''}"
               data-index="${index}" data-field="price">
      </td>
      <td class="ef-col-amount">\u20B1${formatNumber(amount)}</td>
      <td class="ef-col-action">
        <button class="remove-item-btn" data-index="${index}">\u2715</button>
      </td>
    </tr>
  `;
    }).join('');

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

    if (field === 'price' || field === 'quantity') {
        value = parseFloat(value) || 0;
    }

    state.quotationItems[index][field] = value;

    // Re-render amount for this row without losing focus
    if (field === 'price' || field === 'quantity') {
        const row = e.target.closest('tr');
        const amountCell = row.querySelector('.ef-col-amount');
        if (amountCell) {
            const qty = state.quotationItems[index].quantity || 1;
            const price = state.quotationItems[index].price || 0;
            amountCell.textContent = '\u20B1' + formatNumber(qty * price);
        }
    }

    updateQuotationTotals();
}

function updateQuotationTotals() {
    // Calculate items subtotal (price * quantity)
    let subtotal = state.quotationItems.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);

    // Add installation if checked
    const installationChecked = document.getElementById('installationCheck').checked;
    const installationPrice = parseFloat(document.getElementById('installationPrice').value) || 0;

    if (installationChecked && installationPrice > 0) {
        subtotal += installationPrice;
    }

    // Discount
    state.discount = parseFloat(document.getElementById('discountAmount').value) || 0;
    const afterDiscount = subtotal - state.discount;

    // VAT
    state.vatEnabled = document.getElementById('vatCheck').checked;
    const vat = state.vatEnabled ? afterDiscount * 0.12 : 0;

    // Deposit
    state.dp = parseFloat(document.getElementById('dpAmount').value) || 0;

    // Remaining balance
    const remainingBalance = afterDiscount + vat - state.dp;

    document.getElementById('subtotalDisplay').textContent = '\u20B1' + formatNumber(subtotal);
    document.getElementById('vatDisplay').textContent = '\u20B1' + formatNumber(vat);
    document.getElementById('totalDisplay').textContent = '\u20B1' + formatNumber(remainingBalance);
    const totalBottom = document.getElementById('totalDisplayBottom');
    if (totalBottom) totalBottom.textContent = '\u20B1' + formatNumber(remainingBalance);
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
    const template = document.getElementById('pdfTemplate');

    // Customer info
    template.querySelector('#pdfCustomerName').textContent = document.getElementById('customerName').value || '';
    template.querySelector('#pdfAddress').textContent = document.getElementById('address').value || '';
    template.querySelector('#pdfPhone').textContent = document.getElementById('phone').value || '';
    const pdfCompany = template.querySelector('#pdfCompanyName');
    if (pdfCompany) pdfCompany.textContent = (document.getElementById('companyName')?.value) || '';
    const pdfEmail = template.querySelector('#pdfEmail');
    if (pdfEmail) pdfEmail.textContent = (document.getElementById('clientEmail')?.value) || '';

    // Date
    const dateFormat = { month: '2-digit', day: '2-digit', year: 'numeric' };
    const date = document.getElementById('quoteDate').value;
    const formattedDate = date ? new Date(date).toLocaleDateString('en-US', dateFormat) : '';
    template.querySelector('#pdfDate').textContent = formattedDate;

    // Valid Until
    const validUntil = document.getElementById('quoteValidUntil')?.value;
    const pdfValidUntil = template.querySelector('#pdfValidUntil');
    if (pdfValidUntil) {
        pdfValidUntil.textContent = validUntil ? new Date(validUntil).toLocaleDateString('en-US', dateFormat) : '';
    }

    // Items - Excel style with 10 rows (ITEM NO., QTY, PC, DESCRIPTION, UNIT PRICE, AMOUNT)
    const itemsBody = template.querySelector('#pdfItemsBody');
    itemsBody.innerHTML = '';

    let subtotal = 0;
    let itemIndex = 1;
    const itemRows = [];

    state.quotationItems.forEach(item => {
        if (item.description || item.price > 0) {
            const qty = item.quantity || 1;
            const unitPrice = item.price || 0;
            const amount = qty * unitPrice;
            subtotal += amount;

            itemRows.push({
                itemNo: itemIndex,
                qty: qty,
                unit: item.unit || 'set',
                description: item.description,
                unitPrice: unitPrice,
                amount: amount
            });
            itemIndex++;
        }
    });

    // Add installation if checked
    const installationChecked = document.getElementById('installationCheck').checked;
    const installationPrice = parseFloat(document.getElementById('installationPrice').value) || 0;

    if (installationChecked && installationPrice > 0) {
        subtotal += installationPrice;
        itemRows.push({
            itemNo: itemIndex,
            qty: 1,
            unit: 'set',
            description: 'Installation Fee',
            unitPrice: installationPrice,
            amount: installationPrice
        });
    }

    // Render item rows dynamically (only actual items, no empty rows)
    for (let i = 0; i < itemRows.length; i++) {
        const tr = document.createElement('tr');
        tr.className = 'excel-item-row';
        const r = itemRows[i];
        tr.innerHTML = `
            <td class="col-itemno">${r.itemNo}</td>
            <td class="col-qty">${r.qty}</td>
            <td class="col-unit">${r.unit}</td>
            <td colspan="4" class="col-desc">${r.description}</td>
            <td colspan="2" class="col-unitprice">${formatNumber(r.unitPrice)}</td>
            <td class="col-amount">\u20B1${formatNumber(r.amount)}</td>
        `;
        itemsBody.appendChild(tr);
    }

    // Totals
    const discount = parseFloat(document.getElementById('discountAmount').value) || 0;
    const afterDiscount = subtotal - discount;
    const vatChecked = document.getElementById('vatCheck').checked;
    const vat = vatChecked ? afterDiscount * 0.12 : 0;
    const dp = parseFloat(document.getElementById('dpAmount').value) || 0;
    const remainingBalance = afterDiscount + vat - dp;

    template.querySelector('#pdfSubtotal').textContent = '\u20B1' + formatNumber(subtotal);
    template.querySelector('#pdfDiscount').textContent = discount > 0 ? '\u20B1' + formatNumber(discount) : '';
    template.querySelector('#pdfDP').textContent = dp > 0 ? '\u20B1' + formatNumber(dp) : '';
    template.querySelector('#pdfVAT').textContent = '\u20B1' + formatNumber(vat);
    template.querySelector('#pdfTotal').textContent = '\u20B1' + formatNumber(remainingBalance);

    // Update payment terms note based on installation
    const termsNote = template.querySelector('.terms-note');
    if (termsNote) {
        if (installationChecked && installationPrice > 0) {
            termsNote.innerHTML = '<strong>Note:</strong> Price includes accompanying accessories.';
        } else {
            termsNote.innerHTML = '<strong>Note:</strong> Price includes accompanying accessories. Installation fees and shipping are not included.';
        }
    }

    // Also update the quotation form terms note
    const quoteTermsNote = document.querySelector('.quote-terms-note');
    if (quoteTermsNote) {
        if (installationChecked && installationPrice > 0) {
            quoteTermsNote.innerHTML = '<strong>Note:</strong> Price includes accompanying accessories. This is a NON-VAT receipt.';
        } else {
            quoteTermsNote.innerHTML = '<strong>Note:</strong> Price includes accompanying accessories. Installation fees and shipping are not included. This is a NON-VAT receipt.';
        }
    }

    // Images
    const layoutContainer = template.querySelector('#pdfLayoutImage');
    const imagesSection = template.querySelector('#pdfImagesSection');

    if (layoutContainer) {
        if (state.images.length > 0) {
            layoutContainer.innerHTML = state.images.map((img, i) =>
                `<div class="pdf-image-row">
          <img src="${img.data}" alt="Layout ${i + 1}">
          <div class="pdf-image-label">Layout ${i + 1} of ${state.images.length}</div>
        </div>`
            ).join('');
            imagesSection.style.display = 'table-row';
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
    updateAcrylicLogoCalculation();
    updatePanelCalculation();

    // Update lightbox
    updateLightboxCalculation();

    // Update summary
    updateSignageSummary();
}

// ==================== Flashing Mode Haus Sign ====================

// Flashing letters state
if (!state.flashingLetters) state.flashingLetters = [];

function addFlashingLetterRow() {
    state.flashingLetters.push({
        id: Date.now(),
        name: '',
        height: 0,
        heightInches: 0,
        charCount: 0,
        ledType: 'border'
    });
    renderFlashingLetterRows();
}

function removeFlashingLetterRow(id) {
    if (state.flashingLetters.length === 1) return;
    state.flashingLetters = state.flashingLetters.filter(l => l.id !== id);
    renderFlashingLetterRows();
    updateFlashingCalculation();
}

function renderFlashingLetterRows() {
    const container = document.getElementById('flashingLetterRows');
    container.innerHTML = state.flashingLetters.map((letter, index) => `
    <div class="letter-row" data-id="${letter.id}">
      <div class="form-group letter-name-group">
        <label>Letter Content</label>
        <input type="text" class="flashing-letter-name" data-id="${letter.id}"
               value="${letter.name || ''}" placeholder="E.g: HAUS SIGNS">
      </div>
      <div class="form-group">
        <label>LED Option</label>
        <select class="flashing-letter-led" data-id="${letter.id}">
          <option value="border" ${letter.ledType === 'border' ? 'selected' : ''}>Acrylic letter (no raised)</option>
          <option value="full" ${letter.ledType === 'full' ? 'selected' : ''}>LED Point Letter</option>
        </select>
      </div>
      <div class="form-group">
        <label>Height (inches) min 3.1"</label>
        <input type="number" class="flashing-letter-height-inches" data-id="${letter.id}"
               value="${letter.heightInches || ''}" placeholder="3.1" min="0" step="0.1">
      </div>
      <div class="form-group">
        <label>Height (cm) min 8</label>
        <input type="number" class="flashing-letter-height" data-id="${letter.id}"
               value="${letter.height || ''}" placeholder="8" min="0" step="0.1">
      </div>
      <div class="form-group result-display">
        <label>Price</label>
        <div class="result-value flashing-letter-price" data-id="${letter.id}">0 ₱</div>
      </div>
      <button class="btn-remove" onclick="removeFlashingLetterRow(${letter.id})" ${state.flashingLetters.length <= 1 ? 'disabled' : ''}>✕</button>
    </div>
    `).join('');

    // Attach event listeners
    container.querySelectorAll('.flashing-letter-name').forEach(input => {
        input.addEventListener('input', (e) => {
            const id = parseInt(e.target.dataset.id);
            const letter = state.flashingLetters.find(l => l.id === id);
            if (letter) {
                letter.name = e.target.value;
                letter.charCount = countCharacters(e.target.value);
                updateFlashingCalculation();
            }
        });
    });

    container.querySelectorAll('.flashing-letter-led').forEach(select => {
        select.addEventListener('change', (e) => {
            const id = parseInt(e.target.dataset.id);
            const letter = state.flashingLetters.find(l => l.id === id);
            if (letter) {
                letter.ledType = e.target.value;
                updateFlashingCalculation();
            }
        });
    });

    container.querySelectorAll('.flashing-letter-height-inches').forEach(input => {
        input.addEventListener('input', (e) => {
            const id = parseInt(e.target.dataset.id);
            const letter = state.flashingLetters.find(l => l.id === id);
            if (letter) {
                const inches = parseFloat(e.target.value) || 0;
                letter.heightInches = inches;
                letter.height = Math.round(inches * INCH_TO_CM * 10) / 10;
                const cmInput = container.querySelector(`.flashing-letter-height[data-id="${id}"]`);
                if (cmInput) cmInput.value = letter.height || '';
                updateFlashingCalculation();
            }
        });
    });

    container.querySelectorAll('.flashing-letter-height').forEach(input => {
        input.addEventListener('input', (e) => {
            const id = parseInt(e.target.dataset.id);
            const letter = state.flashingLetters.find(l => l.id === id);
            if (letter) {
                const cm = parseFloat(e.target.value) || 0;
                letter.height = cm;
                letter.heightInches = Math.round(cm / INCH_TO_CM * 10) / 10;
                const inchInput = container.querySelector(`.flashing-letter-height-inches[data-id="${id}"]`);
                if (inchInput) inchInput.value = letter.heightInches || '';
                updateFlashingCalculation();
            }
        });
    });
}

function setupFlashingListeners() {
    // Box dimension inches -> cm
    document.getElementById('flashingHInches').addEventListener('input', (e) => {
        const inches = parseFloat(e.target.value) || 0;
        document.getElementById('flashingH').value = inches ? Math.round(inches * INCH_TO_CM * 10) / 10 : '';
        updateFlashingCalculation();
    });
    document.getElementById('flashingLInches').addEventListener('input', (e) => {
        const inches = parseFloat(e.target.value) || 0;
        document.getElementById('flashingL').value = inches ? Math.round(inches * INCH_TO_CM * 10) / 10 : '';
        updateFlashingCalculation();
    });
    document.getElementById('flashingDInches').addEventListener('input', (e) => {
        const inches = parseFloat(e.target.value) || 0;
        document.getElementById('flashingD').value = inches ? Math.round(inches * INCH_TO_CM * 10) / 10 : '';
        updateFlashingCalculation();
    });

    // Box dimension cm -> inches
    document.getElementById('flashingH').addEventListener('input', (e) => {
        const cm = parseFloat(e.target.value) || 0;
        document.getElementById('flashingHInches').value = cm ? Math.round(cm / INCH_TO_CM * 10) / 10 : '';
        updateFlashingCalculation();
    });
    document.getElementById('flashingL').addEventListener('input', (e) => {
        const cm = parseFloat(e.target.value) || 0;
        document.getElementById('flashingLInches').value = cm ? Math.round(cm / INCH_TO_CM * 10) / 10 : '';
        updateFlashingCalculation();
    });
    document.getElementById('flashingD').addEventListener('input', (e) => {
        const cm = parseFloat(e.target.value) || 0;
        document.getElementById('flashingDInches').value = cm ? Math.round(cm / INCH_TO_CM * 10) / 10 : '';
        updateFlashingCalculation();
    });

    // Add letter row button
    document.getElementById('addFlashingLetterBtn').addEventListener('click', addFlashingLetterRow);

    // Add to Quotation
    document.getElementById('addFlashingToQuotationBtn').addEventListener('click', addFlashingToQuotation);

    // Clear
    document.getElementById('clearFlashingBtn').addEventListener('click', clearFlashing);

    // Initialize with one letter row
    addFlashingLetterRow();
}

function updateFlashingCalculation() {
    const hRaw = parseFloat(document.getElementById('flashingH').value) || 0;
    const lRaw = parseFloat(document.getElementById('flashingL').value) || 0;
    const dRaw = parseFloat(document.getElementById('flashingD').value) || 0;
    const prices = state.prices;

    // Enforce minimum dimensions for box
    const h = hRaw > 0 ? Math.max(hRaw, 30) : 0;
    const l = lRaw > 0 ? Math.max(lRaw, 30) : 0;
    const d = dRaw > 0 ? Math.max(dRaw, 10) : 0;

    // Calculate box
    const boxArea = calculateFlashingBoxArea(h, l, d);
    const boxBase = prices.flashingBoxBase || DEFAULT_PRICES.flashingBoxBase;
    const boxPerSqm = prices.flashingBox || DEFAULT_PRICES.flashingBox;
    const boxPrice = boxArea > 0 ? boxBase + boxArea * boxPerSqm : 0;

    document.getElementById('flashingBoxPrice').textContent = `${formatNumber(boxPrice)} ₱`;

    // Calculate each letter row (LED option per row)
    let totalLetterPrice = 0;
    state.flashingLetters.forEach(letter => {
        const ledPricePerSqm = letter.ledType === 'full'
            ? (prices.flashingLedFull || DEFAULT_PRICES.flashingLedFull)
            : (prices.flashingLedBorder || DEFAULT_PRICES.flashingLedBorder);
        // Enforce minimum letter height of 8cm
        const letterHeight = letter.height > 0 ? Math.max(letter.height, 8) : 0;
        const letterArea = calculateFlashingLetterArea(letterHeight, letter.charCount);
        const letterPrice = letterArea * ledPricePerSqm;
        totalLetterPrice += letterPrice;

        const priceEl = document.querySelector(`.flashing-letter-price[data-id="${letter.id}"]`);
        if (priceEl) priceEl.textContent = `${formatNumber(letterPrice)} ₱`;
    });

    const total = boxPrice + totalLetterPrice;
    document.getElementById('flashingSummaryBoxPrice').textContent = `${formatNumber(boxPrice)} ₱`;
    document.getElementById('flashingSummaryLetterPrice').textContent = `${formatNumber(totalLetterPrice)} ₱`;
    document.getElementById('flashingTotalPrice').textContent = `${formatNumber(total)} ₱`;
}

function addFlashingToQuotation() {
    const hRaw = parseFloat(document.getElementById('flashingH').value) || 0;
    const lRaw = parseFloat(document.getElementById('flashingL').value) || 0;
    const dRaw = parseFloat(document.getElementById('flashingD').value) || 0;
    const prices = state.prices;

    // Enforce minimum dimensions
    const h = hRaw > 0 ? Math.max(hRaw, 30) : 0;
    const l = lRaw > 0 ? Math.max(lRaw, 30) : 0;
    const d = dRaw > 0 ? Math.max(dRaw, 10) : 0;

    // Recalculate totals
    const boxArea = calculateFlashingBoxArea(h, l, d);
    const boxBase = prices.flashingBoxBase || DEFAULT_PRICES.flashingBoxBase;
    const boxPerSqm = prices.flashingBox || DEFAULT_PRICES.flashingBox;
    const boxPrice = boxArea > 0 ? boxBase + boxArea * boxPerSqm : 0;

    let totalLetterPrice = 0;
    state.flashingLetters.forEach(letter => {
        const ledPricePerSqm = letter.ledType === 'full'
            ? (prices.flashingLedFull || DEFAULT_PRICES.flashingLedFull)
            : (prices.flashingLedBorder || DEFAULT_PRICES.flashingLedBorder);
        const letterHeight = letter.height > 0 ? Math.max(letter.height, 8) : 0;
        const letterArea = calculateFlashingLetterArea(letterHeight, letter.charCount);
        totalLetterPrice += letterArea * ledPricePerSqm;
    });

    const total = boxPrice + totalLetterPrice;

    if (total <= 0) {
        showNotification('Please enter dimensions first!', 'error');
        return;
    }

    let description = `Flashing Mode Haus Sign - Box: ${h}×${l}×${d}cm`;
    const letterNames = state.flashingLetters.filter(l => l.name).map(l => {
        const ledLabel = l.ledType === 'full' ? 'LED Point Letter' : 'Acrylic';
        return `${l.name}(${ledLabel})`;
    }).join(' + ');
    if (letterNames) description += ` | ${letterNames}`;

    state.quotationItems.push({ description, price: total, quantity: 1 });
    renderQuotationItems();

    const qPanel = document.querySelector('.quotation-panel');
    if (qPanel) qPanel.scrollTop = 0;

    showNotification('Flashing Mode Haus Sign added to quotation!', 'success');
}

function clearFlashing() {
    document.getElementById('flashingH').value = '';
    document.getElementById('flashingHInches').value = '';
    document.getElementById('flashingL').value = '';
    document.getElementById('flashingLInches').value = '';
    document.getElementById('flashingD').value = '';
    document.getElementById('flashingDInches').value = '';
    state.flashingLetters = [];
    addFlashingLetterRow();
    updateFlashingCalculation();
}






// ==================== Start ====================
document.addEventListener('DOMContentLoaded', () => {
    init().catch((error) => {
        console.error('Initialization error:', error);
        showNotification('App initialization failed. Please refresh.', 'error');
    });
});
