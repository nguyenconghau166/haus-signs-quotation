/**
 * HAUS SIGNS - Quotation Calculator
 * Settings Management
 */

const STORAGE_KEY = 'haussigns_calculator_prices';

/**
 * Load prices from localStorage or return defaults
 * @returns {object} Prices object
 */
function loadPrices() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Merge with defaults to ensure all keys exist
            return { ...DEFAULT_PRICES, ...parsed };
        }
    } catch (e) {
        console.error('Error loading prices:', e);
    }
    return { ...DEFAULT_PRICES };
}

/**
 * Save prices to localStorage
 * @param {object} prices - Prices to save
 */
function savePrices(prices) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prices));
        return true;
    } catch (e) {
        console.error('Error saving prices:', e);
        return false;
    }
}

/**
 * Reset prices to defaults
 */
function resetPrices() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        return true;
    } catch (e) {
        console.error('Error resetting prices:', e);
        return false;
    }
}

/**
 * Initialize settings form with current prices
 * @param {object} prices - Current prices
 */
function initSettingsForm(prices) {
    document.getElementById('priceLetterIlluminated').value = prices.letterIlluminated;
    document.getElementById('priceLetterNonIlluminated').value = prices.letterNonIlluminated;
    document.getElementById('priceLetterCutOut').value = prices.letterCutOut;
    document.getElementById('priceLetterInox').value = prices.letterInox;
    document.getElementById('priceAluPanel').value = prices.aluPanel;
    document.getElementById('priceLightbox').value = prices.lightbox;
    document.getElementById('anchorMultiplier').value = prices.anchorMultiplier;
}

/**
 * Get prices from settings form
 * @returns {object} Prices from form inputs
 */
function getPricesFromForm() {
    return {
        letterIlluminated: parseFloat(document.getElementById('priceLetterIlluminated').value) || DEFAULT_PRICES.letterIlluminated,
        letterNonIlluminated: parseFloat(document.getElementById('priceLetterNonIlluminated').value) || DEFAULT_PRICES.letterNonIlluminated,
        letterCutOut: parseFloat(document.getElementById('priceLetterCutOut').value) || DEFAULT_PRICES.letterCutOut,
        letterInox: parseFloat(document.getElementById('priceLetterInox').value) || DEFAULT_PRICES.letterInox,
        aluPanel: parseFloat(document.getElementById('priceAluPanel').value) || DEFAULT_PRICES.aluPanel,
        lightbox: parseFloat(document.getElementById('priceLightbox').value) || DEFAULT_PRICES.lightbox,
        anchorMultiplier: parseFloat(document.getElementById('anchorMultiplier').value) || DEFAULT_PRICES.anchorMultiplier
    };
}

/**
 * Setup settings event listeners
 * @param {function} onSave - Callback when prices are saved
 * @param {function} onReset - Callback when prices are reset
 */
function setupSettingsListeners(onSave, onReset) {
    const saveBtn = document.getElementById('saveSettingsBtn');
    const resetBtn = document.getElementById('resetSettingsBtn');

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const prices = getPricesFromForm();
            if (savePrices(prices)) {
                showNotification('Price settings saved successfully!', 'success');
                if (onSave) onSave(prices);
            } else {
                showNotification('Error saving settings!', 'error');
            }
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset to default prices?')) {
                resetPrices();
                initSettingsForm(DEFAULT_PRICES);
                showNotification('Prices reset to default!', 'success');
                if (onReset) onReset(DEFAULT_PRICES);
            }
        });
    }
}

/**
 * Show notification toast
 * @param {string} message - Message to show
 * @param {string} type - 'success' or 'error'
 */
function showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
    <span class="notification-icon">${type === 'success' ? '✓' : '✕'}</span>
    <span class="notification-message">${message}</span>
  `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => notification.classList.add('show'), 10);

    // Remove after delay
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ==================== Lightbox Formula Management ====================
const LIGHTBOX_FORMULAS_KEY = 'haussigns_lightbox_formulas';

// Default formula for all lightbox styles (5 faces)
const DEFAULT_LIGHTBOX_FORMULA = '(w * h + 2 * d * h + 2 * w * d) / 10000';

/**
 * Load lightbox formulas from localStorage
 * @returns {object} Formulas object keyed by style ID
 */
function loadLightboxFormulas() {
    try {
        const stored = localStorage.getItem(LIGHTBOX_FORMULAS_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Error loading lightbox formulas:', e);
    }
    return {};
}

/**
 * Save lightbox formulas to localStorage
 * @param {object} formulas - Formulas object
 */
function saveLightboxFormulas(formulas) {
    try {
        localStorage.setItem(LIGHTBOX_FORMULAS_KEY, JSON.stringify(formulas));
        return true;
    } catch (e) {
        console.error('Error saving lightbox formulas:', e);
        return false;
    }
}

/**
 * Get formula for a specific lightbox style
 * @param {number} styleId - Style ID
 * @returns {string} Formula string
 */
function getLightboxFormula(styleId) {
    const formulas = loadLightboxFormulas();
    return formulas[styleId] || DEFAULT_LIGHTBOX_FORMULA;
}

/**
 * Create calcArea function from formula string
 * @param {string} formula - Formula string using w, h, d variables
 * @returns {function} calcArea function
 */
function createCalcAreaFunction(formula) {
    try {
        return new Function('w', 'h', 'd', `return ${formula};`);
    } catch (e) {
        console.error('Invalid formula:', formula, e);
        return (w, h, d) => 0;
    }
}

/**
 * Apply custom formulas to LIGHTBOX_STYLES
 */
function applyCustomLightboxFormulas() {
    const formulas = loadLightboxFormulas();
    for (const [styleId, formula] of Object.entries(formulas)) {
        if (LIGHTBOX_STYLES[styleId]) {
            LIGHTBOX_STYLES[styleId].calcArea = createCalcAreaFunction(formula);
        }
    }
}

/**
 * Test formula with sample dimensions
 * @param {string} formula - Formula string
 * @param {number} w - Width
 * @param {number} h - Height
 * @param {number} d - Depth
 * @returns {object} { valid: boolean, result: number, error: string }
 */
function testFormula(formula, w = 100, h = 50, d = 10) {
    try {
        const fn = createCalcAreaFunction(formula);
        const result = fn(w, h, d);
        if (typeof result !== 'number' || isNaN(result)) {
            return { valid: false, result: 0, error: 'Invalid result' };
        }
        return { valid: true, result, error: null };
    } catch (e) {
        return { valid: false, result: 0, error: e.message };
    }
}

/**
 * Render lightbox formula list in settings
 */
function renderLightboxFormulaList() {
    const container = document.getElementById('lightboxFormulaList');
    if (!container) return;

    const formulas = loadLightboxFormulas();

    container.innerHTML = Object.entries(LIGHTBOX_STYLES).map(([id, style]) => {
        const currentFormula = formulas[id] || DEFAULT_LIGHTBOX_FORMULA;
        const testResult = testFormula(currentFormula, 100, 50, 10);

        return `
        <div class="lightbox-formula-item" data-style-id="${id}">
          <div class="formula-header">
            <span class="formula-name">Style ${id}: ${style.name}</span>
            <span class="formula-preview">w=width, h=height, d=depth</span>
          </div>
          <div class="formula-input-row">
            <label>Formula:</label>
            <input type="text" class="formula-input" value="${currentFormula}" data-style-id="${id}">
          </div>
          <div class="formula-result" data-style-id="${id}">
            ${testResult.valid
                ? `Example: 100×50×10cm = ${testResult.result.toFixed(4)} m²`
                : `❌ Error: ${testResult.error}`}
          </div>
        </div>
      `;
    }).join('');

    // Add input listeners for live preview
    container.querySelectorAll('.formula-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const styleId = e.target.dataset.styleId;
            const formula = e.target.value;
            const testResult = testFormula(formula, 100, 50, 10);
            const resultEl = container.querySelector(`.formula-result[data-style-id="${styleId}"]`);

            if (testResult.valid) {
                resultEl.innerHTML = `Example: 100×50×10cm = ${testResult.result.toFixed(4)} m²`;
                resultEl.style.color = 'var(--success)';
            } else {
                resultEl.innerHTML = `❌ Error: ${testResult.error}`;
                resultEl.style.color = 'var(--danger)';
            }
        });
    });
}

/**
 * Get formulas from the formula list UI
 * @returns {object} Formulas object
 */
function getFormulasFromUI() {
    const formulas = {};
    document.querySelectorAll('.formula-input').forEach(input => {
        const styleId = input.dataset.styleId;
        const formula = input.value.trim();
        if (formula && formula !== DEFAULT_LIGHTBOX_FORMULA) {
            formulas[styleId] = formula;
        }
    });
    return formulas;
}

/**
 * Setup lightbox formula settings listeners
 */
function setupLightboxFormulaListeners() {
    const saveBtn = document.getElementById('saveLightboxFormulasBtn');
    const resetBtn = document.getElementById('resetLightboxFormulasBtn');

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const formulas = getFormulasFromUI();

            // Validate all formulas
            let allValid = true;
            for (const [styleId, formula] of Object.entries(formulas)) {
                const test = testFormula(formula);
                if (!test.valid) {
                    allValid = false;
                    break;
                }
            }

            if (!allValid) {
                showNotification('Some formulas are invalid!', 'error');
                return;
            }

            if (saveLightboxFormulas(formulas)) {
                applyCustomLightboxFormulas();
                showNotification('Lightbox formulas saved successfully!', 'success');
            } else {
                showNotification('Error saving formulas!', 'error');
            }
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all lightbox formulas to default?')) {
                localStorage.removeItem(LIGHTBOX_FORMULAS_KEY);

                // Reset LIGHTBOX_STYLES calcArea functions
                for (const styleId in LIGHTBOX_STYLES) {
                    LIGHTBOX_STYLES[styleId].calcArea = createCalcAreaFunction(DEFAULT_LIGHTBOX_FORMULA);
                }

                renderLightboxFormulaList();
                showNotification('Formulas reset to default!', 'success');
            }
        });
    }
}
