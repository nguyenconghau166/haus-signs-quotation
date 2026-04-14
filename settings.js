/**
 * HAUS SIGNS - Quotation Calculator
 * Settings Management
 */

const STORAGE_KEY = 'haussigns_calculator_prices';
const LIGHTBOX_FORMULAS_KEY = 'haussigns_lightbox_formulas';
const SETTINGS_META_KEY = 'haussigns_calculator_settings_meta';
const SETTINGS_API_URL = '/api/settings';

function sanitizeLightboxFormulas(source) {
    const formulas = {};
    if (!source || typeof source !== 'object') return formulas;

    Object.entries(source).forEach(([styleId, formula]) => {
        if (typeof formula === 'string') {
            const trimmed = formula.trim();
            if (trimmed && trimmed !== DEFAULT_LIGHTBOX_FORMULA) {
                formulas[String(styleId)] = trimmed;
            }
        }
    });

    return formulas;
}

function sanitizePrices(source) {
    const prices = { ...DEFAULT_PRICES };
    if (!source || typeof source !== 'object') return prices;

    Object.keys(DEFAULT_PRICES).forEach((key) => {
        const val = source[key];
        if (typeof val === 'number' && !isNaN(val)) {
            prices[key] = val;
        }
    });

    return prices;
}

function getCachedPrices() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;
        return sanitizePrices(JSON.parse(stored));
    } catch (e) {
        console.error('Error reading cached prices:', e);
        return null;
    }
}

function cachePrices(prices) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizePrices(prices)));
    } catch (e) {
        console.error('Error caching prices:', e);
    }
}

function getCachedLightboxFormulas() {
    try {
        const stored = localStorage.getItem(LIGHTBOX_FORMULAS_KEY);
        if (!stored) return {};
        return sanitizeLightboxFormulas(JSON.parse(stored));
    } catch (e) {
        console.error('Error reading cached lightbox formulas:', e);
        return {};
    }
}

function cacheLightboxFormulas(formulas) {
    try {
        localStorage.setItem(LIGHTBOX_FORMULAS_KEY, JSON.stringify(sanitizeLightboxFormulas(formulas)));
    } catch (e) {
        console.error('Error caching lightbox formulas:', e);
    }
}

function setSettingsMeta(meta) {
    try {
        localStorage.setItem(SETTINGS_META_KEY, JSON.stringify(meta || {}));
    } catch (e) {
        console.error('Error saving settings metadata:', e);
    }
}

function getSettingsMeta() {
    try {
        const raw = localStorage.getItem(SETTINGS_META_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        console.error('Error reading settings metadata:', e);
        return {};
    }
}

async function fetchSettingsFromServer() {
    const response = await fetch(SETTINGS_API_URL, {
        method: 'GET',
        cache: 'no-store',
        headers: {
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to load shared settings (${response.status})`);
    }

    return response.json();
}

/**
 * Load prices from shared server (with local fallback)
 * @returns {object} Prices object
 */
async function loadPrices() {
    try {
        const payload = await fetchSettingsFromServer();
        const prices = sanitizePrices(payload.prices);
        const formulas = sanitizeLightboxFormulas(payload.lightboxFormulas);
        cachePrices(prices);
        cacheLightboxFormulas(formulas);
        setSettingsMeta({
            updatedAt: payload.updatedAt || null,
            source: 'server'
        });
        return prices;
    } catch (e) {
        console.warn('Shared settings unavailable, using cached/default prices:', e.message || e);

        const cached = getCachedPrices();
        if (cached) {
            setSettingsMeta({
                ...getSettingsMeta(),
                source: 'cache'
            });
            return cached;
        }

        return { ...DEFAULT_PRICES };
    }
}

/**
 * Save prices to shared server
 * @param {object} prices - Prices to save
 */
async function savePrices(prices) {
    const sanitizedPrices = sanitizePrices(prices);

    try {
        const response = await fetch(SETTINGS_API_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prices: sanitizedPrices })
        });

        if (!response.ok) {
            throw new Error(`Failed to save shared settings (${response.status})`);
        }

        const payload = await response.json();
        const confirmedPrices = sanitizePrices(payload.prices || sanitizedPrices);
        const confirmedFormulas = sanitizeLightboxFormulas(payload.lightboxFormulas || getCachedLightboxFormulas());
        cachePrices(confirmedPrices);
        cacheLightboxFormulas(confirmedFormulas);
        setSettingsMeta({
            updatedAt: payload.updatedAt || null,
            source: 'server'
        });
        return true;
    } catch (e) {
        cachePrices(sanitizedPrices);
        setSettingsMeta({
            ...getSettingsMeta(),
            source: 'cache'
        });
        console.error('Error saving shared prices:', e);
        return false;
    }
}

/**
 * Reset shared prices to defaults
 */
async function resetPrices() {
    return savePrices({ ...DEFAULT_PRICES });
}

/**
 * Initialize settings form with current prices
 * @param {object} prices - Current prices
 */
function initSettingsForm(prices) {
    document.getElementById('priceLetterAcrylicFomex').value = prices.letterAcrylicFomex;
    document.getElementById('priceLetterFullAcrylic').value = prices.letterFullAcrylic;
    document.getElementById('priceLetterCutOut').value = prices.letterCutOut;
    document.getElementById('priceLetterAluAcrylic').value = prices.letterAluAcrylic;
    document.getElementById('priceLetterStainless').value = prices.letterStainless;
    document.getElementById('noLedMultiplier').value = prices.noLedMultiplier;
    document.getElementById('difficultMultiplier').value = prices.difficultMultiplier;
    document.getElementById('priceAluPanel').value = prices.aluPanel;
    document.getElementById('aluStickerMultiplier').value = prices.aluStickerMultiplier;
    document.getElementById('priceLightbox').value = prices.lightbox;
    document.getElementById('priceAcrylicLogoRound').value = prices.acrylicLogoRound;
    document.getElementById('priceAcrylicLogoSquare').value = prices.acrylicLogoSquare;
    document.getElementById('acrylicComplexMultiplier').value = prices.acrylicComplexMultiplier;
    document.getElementById('priceLogoRaised').value = prices.logoRaised;

    // Flashing Mode settings
    document.getElementById('priceFlashingBox').value = prices.flashingBox;
    document.getElementById('priceFlashingBoxBase').value = prices.flashingBoxBase;
    document.getElementById('priceFlashingLedFull').value = prices.flashingLedFull;
    document.getElementById('priceFlashingLedBorder').value = prices.flashingLedBorder;

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
        letterAcrylicFomex: parseFloat(document.getElementById('priceLetterAcrylicFomex').value) || DEFAULT_PRICES.letterAcrylicFomex,
        letterFullAcrylic: parseFloat(document.getElementById('priceLetterFullAcrylic').value) || DEFAULT_PRICES.letterFullAcrylic,
        letterCutOut: parseFloat(document.getElementById('priceLetterCutOut').value) || DEFAULT_PRICES.letterCutOut,
        letterAluAcrylic: parseFloat(document.getElementById('priceLetterAluAcrylic').value) || DEFAULT_PRICES.letterAluAcrylic,
        letterStainless: parseFloat(document.getElementById('priceLetterStainless').value) || DEFAULT_PRICES.letterStainless,
        noLedMultiplier: parseFloat(document.getElementById('noLedMultiplier').value) || DEFAULT_PRICES.noLedMultiplier,
        difficultMultiplier: parseFloat(document.getElementById('difficultMultiplier').value) || DEFAULT_PRICES.difficultMultiplier,
        aluPanel: parseFloat(document.getElementById('priceAluPanel').value) || DEFAULT_PRICES.aluPanel,
        aluStickerMultiplier: parseFloat(document.getElementById('aluStickerMultiplier').value) || DEFAULT_PRICES.aluStickerMultiplier,
        lightbox: parseFloat(document.getElementById('priceLightbox').value) || DEFAULT_PRICES.lightbox,
        acrylicLogoRound: parseFloat(document.getElementById('priceAcrylicLogoRound').value) || DEFAULT_PRICES.acrylicLogoRound,
        acrylicLogoSquare: parseFloat(document.getElementById('priceAcrylicLogoSquare').value) || DEFAULT_PRICES.acrylicLogoSquare,
        acrylicComplexMultiplier: parseFloat(document.getElementById('acrylicComplexMultiplier').value) || DEFAULT_PRICES.acrylicComplexMultiplier,
        logoRaised: parseFloat(document.getElementById('priceLogoRaised').value) || DEFAULT_PRICES.logoRaised,

        // Flashing Mode settings
        flashingBox: parseFloat(document.getElementById('priceFlashingBox').value) || DEFAULT_PRICES.flashingBox,
        flashingBoxBase: parseFloat(document.getElementById('priceFlashingBoxBase').value) || DEFAULT_PRICES.flashingBoxBase,
        flashingLedFull: parseFloat(document.getElementById('priceFlashingLedFull').value) || DEFAULT_PRICES.flashingLedFull,
        flashingLedBorder: parseFloat(document.getElementById('priceFlashingLedBorder').value) || DEFAULT_PRICES.flashingLedBorder,

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
    const exportBtn = document.getElementById('exportSettingsBtn');
    const importInput = document.getElementById('importSettingsInput');

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const prices = getPricesFromForm();
            if (await savePrices(prices)) {
                const latest = await loadPrices();
                showNotification('Shared price settings saved successfully!', 'success');
                if (onSave) onSave(latest);
            } else {
                showNotification('Cannot update shared server. Saved only on this browser cache.', 'error');
            }
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to reset to default prices?')) {
                if (await resetPrices()) {
                    const latest = await loadPrices();
                    initSettingsForm(latest);
                    showNotification('Shared prices reset to default!', 'success');
                    if (onReset) onReset(latest);
                } else {
                    showNotification('Cannot reset shared prices. Please check server.', 'error');
                }
            }
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            try {
                const payload = {
                    exportedAt: new Date().toISOString(),
                    prices: await loadPrices(),
                    lightboxFormulas: loadLightboxFormulas()
                };
                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                const date = new Date().toISOString().split('T')[0];
                link.href = url;
                link.download = `haussigns-internal-prices-${date}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                showNotification('Internal price file exported!', 'success');
            } catch (e) {
                console.error('Error exporting settings:', e);
                showNotification('Error exporting settings file!', 'error');
            }
        });
    }

    if (importInput) {
        importInput.addEventListener('change', async (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const parsed = JSON.parse(text);
                const importedPrices = parsed.prices || parsed;

                const mergedPrices = { ...DEFAULT_PRICES };
                Object.keys(DEFAULT_PRICES).forEach(key => {
                    const value = importedPrices[key];
                    if (typeof value === 'number' && !isNaN(value)) {
                        mergedPrices[key] = value;
                    }
                });

                const saved = await savePrices(mergedPrices);
                if (!saved) {
                    showNotification('Cannot import to shared server. Please check server.', 'error');
                    return;
                }

                const latest = await loadPrices();
                initSettingsForm(latest);

                if (parsed.lightboxFormulas && typeof parsed.lightboxFormulas === 'object') {
                    await saveLightboxFormulas(parsed.lightboxFormulas);
                    applyCustomLightboxFormulas();
                    renderLightboxFormulaList();
                }

                if (onSave) onSave(latest);
                showNotification('Internal price file imported to shared server!', 'success');
            } catch (error) {
                console.error('Error importing settings:', error);
                showNotification('Invalid settings file!', 'error');
            } finally {
                e.target.value = '';
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

// Default formula for all lightbox styles (5 faces)
const DEFAULT_LIGHTBOX_FORMULA = '(w * h + 2 * d * h + 2 * w * d) / 10000';

/**
 * Load lightbox formulas from localStorage
 * @returns {object} Formulas object keyed by style ID
 */
function loadLightboxFormulas() {
    return getCachedLightboxFormulas();
}

/**
 * Save lightbox formulas to localStorage
 * @param {object} formulas - Formulas object
 */
async function saveLightboxFormulas(formulas) {
    const sanitizedFormulas = sanitizeLightboxFormulas(formulas);

    try {
        const response = await fetch(SETTINGS_API_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ lightboxFormulas: sanitizedFormulas })
        });

        if (!response.ok) {
            throw new Error(`Failed to save shared formulas (${response.status})`);
        }

        const payload = await response.json();
        cachePrices(sanitizePrices(payload.prices || getCachedPrices() || DEFAULT_PRICES));
        cacheLightboxFormulas(sanitizeLightboxFormulas(payload.lightboxFormulas || sanitizedFormulas));
        setSettingsMeta({
            updatedAt: payload.updatedAt || null,
            source: 'server'
        });
        return true;
    } catch (e) {
        cacheLightboxFormulas(sanitizedFormulas);
        setSettingsMeta({
            ...getSettingsMeta(),
            source: 'cache'
        });
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
    for (const styleId in LIGHTBOX_STYLES) {
        LIGHTBOX_STYLES[styleId].calcArea = createCalcAreaFunction(DEFAULT_LIGHTBOX_FORMULA);
    }

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

            if (await saveLightboxFormulas(formulas)) {
                applyCustomLightboxFormulas();
                renderLightboxFormulaList();
                showNotification('Lightbox formulas saved successfully!', 'success');
            } else {
                showNotification('Error saving formulas!', 'error');
            }
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to reset all lightbox formulas to default?')) {
                if (await saveLightboxFormulas({})) {
                    for (const styleId in LIGHTBOX_STYLES) {
                        LIGHTBOX_STYLES[styleId].calcArea = createCalcAreaFunction(DEFAULT_LIGHTBOX_FORMULA);
                    }

                    renderLightboxFormulaList();
                    showNotification('Formulas reset to default!', 'success');
                } else {
                    showNotification('Error resetting formulas!', 'error');
                }
            }
        });
    }
}
