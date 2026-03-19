/**
 * HAUS SIGNS - Quotation Calculator
 * Settings Management
 */

const STORAGE_KEY = 'haussigns_calculator_prices';
const SETTINGS_API_ENDPOINT = '/api/settings';
const LIGHTBOX_FORMULAS_API_ENDPOINT = '/api/settings?resource=formulas';

/**
 * Normalize prices object against defaults
 * @param {object} raw - Raw prices object
 * @returns {object} Sanitized prices object
 */
function normalizePrices(raw) {
    const prices = { ...DEFAULT_PRICES };

    if (!raw || typeof raw !== 'object') {
        return prices;
    }

    Object.keys(DEFAULT_PRICES).forEach(key => {
        const value = Number(raw[key]);
        if (Number.isFinite(value)) {
            prices[key] = value;
        }
    });

    return prices;
}

/**
 * Load prices from localStorage
 * @returns {object|null} Prices object or null
 */
function loadPricesFromLocalStorage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return normalizePrices(JSON.parse(stored));
        }
    } catch (e) {
        console.error('Error loading local prices:', e);
    }

    return null;
}

/**
 * Save prices to localStorage
 * @param {object} prices - Prices to save
 * @returns {boolean} True if saved
 */
function savePricesToLocalStorage(prices) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prices));
        return true;
    } catch (e) {
        console.error('Error saving local prices:', e);
        return false;
    }
}

/**
 * Reset local prices
 * @returns {boolean} True if reset
 */
function resetLocalPrices() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        return true;
    } catch (e) {
        console.error('Error resetting local prices:', e);
        return false;
    }
}

/**
 * Load prices from shared backend storage
 * @returns {Promise<object|null>} Prices object or null
 */
async function loadRemotePrices() {
    try {
        const response = await fetch(SETTINGS_API_ENDPOINT, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            cache: 'no-store'
        });

        if (!response.ok) {
            return null;
        }

        const payload = await response.json();
        if (!payload || typeof payload !== 'object' || !payload.prices) {
            return null;
        }

        return normalizePrices(payload.prices);
    } catch (e) {
        console.error('Error loading remote prices:', e);
        return null;
    }
}

/**
 * Save prices to shared backend storage
 * @param {object} prices - Prices to save
 * @returns {Promise<boolean>} True if saved remotely
 */
async function saveRemotePrices(prices) {
    try {
        const response = await fetch(SETTINGS_API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prices })
        });

        return response.ok;
    } catch (e) {
        console.error('Error saving remote prices:', e);
        return false;
    }
}

/**
 * Reset shared backend prices
 * @returns {Promise<boolean>} True if reset remotely
 */
async function resetRemotePrices() {
    try {
        const response = await fetch(SETTINGS_API_ENDPOINT, {
            method: 'DELETE'
        });

        return response.ok;
    } catch (e) {
        console.error('Error resetting remote prices:', e);
        return false;
    }
}

/**
 * Load prices from backend first, then localStorage, then defaults
 * @returns {Promise<object>} Prices object
 */
async function loadPrices() {
    const remotePrices = await loadRemotePrices();
    if (remotePrices) {
        savePricesToLocalStorage(remotePrices);
        return remotePrices;
    }

    return loadPricesFromLocalStorage() || { ...DEFAULT_PRICES };
}

/**
 * Save prices to local and remote storage
 * @param {object} prices - Prices to save
 * @returns {Promise<object>} Save result
 */
async function savePrices(prices) {
    const normalized = normalizePrices(prices);
    const localSaved = savePricesToLocalStorage(normalized);
    const remoteSaved = await saveRemotePrices(normalized);

    return {
        ok: localSaved || remoteSaved,
        localSaved,
        remoteSaved,
        prices: normalized
    };
}

/**
 * Reset prices to defaults in local and remote storage
 * @returns {Promise<object>} Reset result
 */
async function resetPrices() {
    const localReset = resetLocalPrices();
    const remoteReset = await resetRemotePrices();

    return {
        ok: localReset || remoteReset,
        localReset,
        remoteReset
    };
}

/**
 * Update settings sync health UI
 * @param {string} status - loading | ok | error
 * @param {string} text - Message text
 */
function updateSettingsHealthUI(status, text) {
    const dot = document.getElementById('settingsHealthDot');
    const label = document.getElementById('settingsHealthText');

    if (!dot || !label) return;

    dot.classList.remove('is-loading', 'is-ok', 'is-error');

    if (status === 'loading') {
        dot.classList.add('is-loading');
    } else if (status === 'ok') {
        dot.classList.add('is-ok');
    } else {
        dot.classList.add('is-error');
    }

    label.textContent = text;
}

/**
 * Check shared settings sync health
 * @param {boolean} showNotificationToast - Show toast after check
 * @returns {Promise<boolean>} True if API is healthy
 */
async function checkSettingsSyncHealth(showNotificationToast = false) {
    const refreshBtn = document.getElementById('refreshSettingsHealthBtn');

    if (refreshBtn) {
        refreshBtn.disabled = true;
    }

    updateSettingsHealthUI('loading', 'Checking shared sync status...');

    try {
        const [priceResponse, formulaResponse] = await Promise.all([
            fetch(SETTINGS_API_ENDPOINT, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                cache: 'no-store'
            }),
            fetch(LIGHTBOX_FORMULAS_API_ENDPOINT, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                cache: 'no-store'
            })
        ]);

        if (priceResponse.ok && formulaResponse.ok) {
            updateSettingsHealthUI('ok', 'Shared sync is connected (prices + formulas)');
            if (showNotificationToast) {
                showNotification('Shared settings sync is connected.', 'success');
            }
            return true;
        }

        const statusText = `${priceResponse.status}/${formulaResponse.status}`;
        updateSettingsHealthUI('error', `Shared sync unavailable (${statusText})`);
        if (showNotificationToast) {
            showNotification('Shared sync is unavailable. Check KV env vars.', 'error');
        }
        return false;
    } catch (e) {
        console.error('Error checking settings sync health:', e);
        updateSettingsHealthUI('error', 'Shared sync unavailable (network error)');
        if (showNotificationToast) {
            showNotification('Cannot reach shared sync API.', 'error');
        }
        return false;
    } finally {
        if (refreshBtn) {
            refreshBtn.disabled = false;
        }
    }
}

/**
 * Setup settings sync health check listeners
 */
function setupSettingsHealthCheck() {
    const refreshBtn = document.getElementById('refreshSettingsHealthBtn');

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            checkSettingsSyncHealth(true);
        });
    }

    checkSettingsSyncHealth(false);
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
    document.getElementById('priceAcrylicLogo').value = prices.acrylicLogo;
    document.getElementById('priceLogoRaised').value = prices.logoRaised;
    document.getElementById('anchorMultiplier').value = prices.anchorMultiplier;

    // Surcharge settings (with fallbacks to defaults if not present in saved settings)
    document.getElementById('surchargeThreshold1').value = prices.surchargeThreshold1 || DEFAULT_PRICES.surchargeThreshold1;
    document.getElementById('surchargeAmount1').value = prices.surchargeAmount1 || DEFAULT_PRICES.surchargeAmount1;
    document.getElementById('surchargeThreshold2').value = prices.surchargeThreshold2 || DEFAULT_PRICES.surchargeThreshold2;
    document.getElementById('surchargeAmount2').value = prices.surchargeAmount2 || DEFAULT_PRICES.surchargeAmount2;
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
        acrylicLogo: parseFloat(document.getElementById('priceAcrylicLogo').value) || DEFAULT_PRICES.acrylicLogo,
        logoRaised: parseFloat(document.getElementById('priceLogoRaised').value) || DEFAULT_PRICES.logoRaised,
        anchorMultiplier: parseFloat(document.getElementById('anchorMultiplier').value) || DEFAULT_PRICES.anchorMultiplier,

        // Surcharge settings
        surchargeThreshold1: parseFloat(document.getElementById('surchargeThreshold1').value) || DEFAULT_PRICES.surchargeThreshold1,
        surchargeAmount1: parseFloat(document.getElementById('surchargeAmount1').value) || DEFAULT_PRICES.surchargeAmount1,
        surchargeThreshold2: parseFloat(document.getElementById('surchargeThreshold2').value) || DEFAULT_PRICES.surchargeThreshold2,
        surchargeAmount2: parseFloat(document.getElementById('surchargeAmount2').value) || DEFAULT_PRICES.surchargeAmount2
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
        saveBtn.addEventListener('click', async () => {
            const prices = getPricesFromForm();
            const result = await savePrices(prices);

            if (result.ok) {
                if (result.remoteSaved) {
                    showNotification('Price settings saved and synced!', 'success');
                } else {
                    showNotification('Saved only on this device. Check API storage!', 'error');
                }
                if (onSave) onSave(result.prices);
            } else {
                showNotification('Error saving settings!', 'error');
            }
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to reset to default prices?')) {
                const result = await resetPrices();
                initSettingsForm(DEFAULT_PRICES);

                if (result.ok) {
                    if (result.remoteReset) {
                        showNotification('Prices reset to default and synced!', 'success');
                    } else {
                        showNotification('Reset only on this device. Check API storage!', 'error');
                    }
                } else {
                    showNotification('Error resetting settings!', 'error');
                }

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
 * Load lightbox formulas from shared backend storage
 * @returns {Promise<object|null>} Formulas object or null
 */
async function loadRemoteLightboxFormulas() {
    try {
        const response = await fetch(LIGHTBOX_FORMULAS_API_ENDPOINT, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            cache: 'no-store'
        });

        if (!response.ok) {
            return null;
        }

        const payload = await response.json();
        if (!payload || typeof payload !== 'object' || !payload.formulas || typeof payload.formulas !== 'object') {
            return null;
        }

        return payload.formulas;
    } catch (e) {
        console.error('Error loading remote lightbox formulas:', e);
        return null;
    }
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
 * Save lightbox formulas to shared backend storage
 * @param {object} formulas - Formulas object
 * @returns {Promise<boolean>} True if saved remotely
 */
async function saveRemoteLightboxFormulas(formulas) {
    try {
        const response = await fetch(LIGHTBOX_FORMULAS_API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ formulas })
        });

        return response.ok;
    } catch (e) {
        console.error('Error saving remote lightbox formulas:', e);
        return false;
    }
}

/**
 * Reset lightbox formulas in shared backend storage
 * @returns {Promise<boolean>} True if reset remotely
 */
async function resetRemoteLightboxFormulas() {
    try {
        const response = await fetch(LIGHTBOX_FORMULAS_API_ENDPOINT, {
            method: 'DELETE'
        });

        return response.ok;
    } catch (e) {
        console.error('Error resetting remote lightbox formulas:', e);
        return false;
    }
}

/**
 * Sync local formulas from remote storage (if available)
 * @returns {Promise<boolean>} True if remote formulas were loaded
 */
async function syncLightboxFormulasFromRemote() {
    const remoteFormulas = await loadRemoteLightboxFormulas();
    if (!remoteFormulas) {
        return false;
    }

    saveLightboxFormulas(remoteFormulas);
    return true;
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
        saveBtn.addEventListener('click', async () => {
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

            const localSaved = saveLightboxFormulas(formulas);
            const remoteSaved = await saveRemoteLightboxFormulas(formulas);

            if (localSaved || remoteSaved) {
                applyCustomLightboxFormulas();

                if (remoteSaved) {
                    showNotification('Lightbox formulas saved and synced!', 'success');
                } else {
                    showNotification('Formulas saved only on this device. Check API storage!', 'error');
                }
            } else {
                showNotification('Error saving formulas!', 'error');
            }
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to reset all lightbox formulas to default?')) {
                localStorage.removeItem(LIGHTBOX_FORMULAS_KEY);
                const remoteReset = await resetRemoteLightboxFormulas();

                // Reset LIGHTBOX_STYLES calcArea functions
                for (const styleId in LIGHTBOX_STYLES) {
                    LIGHTBOX_STYLES[styleId].calcArea = createCalcAreaFunction(DEFAULT_LIGHTBOX_FORMULA);
                }

                renderLightboxFormulaList();

                if (remoteReset) {
                    showNotification('Formulas reset to default and synced!', 'success');
                } else {
                    showNotification('Formulas reset only on this device. Check API storage!', 'error');
                }
            }
        });
    }
}
