/**
 * HAUS SIGNS - Quotation Calculator
 * Calculation Functions
 */

// Formula: Area = 0.9 * (height in meters)² per character
const LETTER_AREA_COEFFICIENT = 0.9;

/**
 * Calculate letter area in m²
 * @param {number} heightCm - Letter height in cm
 * @param {number} charCount - Number of characters
 * @returns {number} Area in m²
 */
function calculateLetterArea(heightCm, charCount) {
    if (!heightCm || !charCount) return 0;
    // Formula: 0.9 * (height in meters)² * charCount
    const heightInMeters = heightCm / 100;
    return LETTER_AREA_COEFFICIENT * (heightInMeters * heightInMeters) * charCount;
}

/**
 * Calculate letter price with small order markup
 * @param {number} heightCm - Letter height in cm
 * @param {number} charCount - Number of characters
 * @param {string} letterType - Letter type ID
 * @param {object} prices - Current prices object
 * @param {object} modifiers - { noLed, difficult }
 * @returns {object} { area, basePrice, multiplier, markup, price }
 */
function calculateLetterPrice(heightCm, charCount, letterType, prices, modifiers = {}) {
    const area = calculateLetterArea(heightCm, charCount);
    const letterTypeInfo = LETTER_TYPES.find(t => t.id === letterType);
    if (!letterTypeInfo) return { area: 0, basePrice: 0, markup: 0, price: 0 };

    const pricePerSqm = prices[letterTypeInfo.priceKey] || DEFAULT_PRICES[letterTypeInfo.priceKey];
    const basePrice = area * pricePerSqm;

    const noLedMultiplier = prices.noLedMultiplier || DEFAULT_PRICES.noLedMultiplier;
    const difficultMultiplier = prices.difficultMultiplier || DEFAULT_PRICES.difficultMultiplier;

    let multiplier = 1;
    if (modifiers.noLed) multiplier *= noLedMultiplier;
    if (modifiers.difficult) multiplier *= difficultMultiplier;

    const adjustedPrice = basePrice * multiplier;

    // Small order markup removed as per new policy (total order surcharge instead)
    const markup = 0;
    const markupPercent = 0;
    const price = adjustedPrice;

    return { area, basePrice, multiplier, markup, markupPercent, price };
}

/**
 * Calculate rectangle area (for logo or panel)
 * @param {number} lengthCm - Length in cm
 * @param {number} widthCm - Width in cm
 * @returns {number} Area in m²
 */
function calculateRectangleArea(lengthCm, widthCm) {
    if (!lengthCm || !widthCm) return 0;
    return (lengthCm * widthCm) / 10000; // Convert cm² to m²
}

/**
 * Calculate logo price
 * @param {number} lengthCm - Logo length in cm
 * @param {number} widthCm - Logo width in cm
 * @param {string} logoType - Logo type (with LED or without)
 * @param {object} prices - Current prices
 * @param {object} modifiers - { noLed, difficult }
 * @returns {object} { area, basePrice, multiplier, price }
 */
function calculateLogoPrice(lengthCm, widthCm, logoType, prices, modifiers = {}) {
    const area = calculateRectangleArea(lengthCm, widthCm);
    // Logo now uses a specific logoRaised price, regardless of the material selected
    const pricePerSqm = prices.logoRaised || DEFAULT_PRICES.logoRaised;
    const basePrice = area * pricePerSqm;

    const noLedMultiplier = prices.noLedMultiplier || DEFAULT_PRICES.noLedMultiplier;
    const difficultMultiplier = prices.difficultMultiplier || DEFAULT_PRICES.difficultMultiplier;

    let multiplier = 1;
    if (modifiers.noLed) multiplier *= noLedMultiplier;
    if (modifiers.difficult) multiplier *= difficultMultiplier;

    const price = basePrice * multiplier;

    return { area, basePrice, multiplier, price };
}

/**
 * Calculate acrylic logo area (circular illuminated logo)
 * Formula: (L × W + (2L + 2W) × 8) / 10000
 * @param {number} lengthCm - Length in cm
 * @param {number} widthCm - Width in cm
 * @param {string} shape - round or square
 * @returns {number} Area in m²
 */
function calculateAcrylicLogoArea(lengthCm, widthCm, shape = 'round') {
    if (!lengthCm || !widthCm) return 0;
    if (shape === 'square') {
        return (lengthCm * widthCm) / 10000;
    }
    return (lengthCm * widthCm + (2 * lengthCm + 2 * widthCm) * 8) / 10000;
}

/**
 * Calculate acrylic logo price
 * @param {number} lengthCm - Length in cm
 * @param {number} widthCm - Width in cm
 * @param {object} prices - Current prices
 * @param {string} shape - round or square
 * @param {boolean} isComplex - complex shape option
 * @returns {object} { area, basePrice, multiplier, price }
 */
function calculateAcrylicLogoPrice(lengthCm, widthCm, prices, shape = 'round', isComplex = false) {
    const area = calculateAcrylicLogoArea(lengthCm, widthCm, shape);
    const priceKey = shape === 'square' ? 'acrylicLogoSquare' : 'acrylicLogoRound';
    const pricePerSqm = prices[priceKey] || DEFAULT_PRICES[priceKey];
    const basePrice = area * pricePerSqm;
    const complexMultiplier = prices.acrylicComplexMultiplier || DEFAULT_PRICES.acrylicComplexMultiplier;
    const multiplier = isComplex ? complexMultiplier : 1;
    const price = basePrice * multiplier;
    return { area, basePrice, multiplier, price };
}

/**
 * Calculate panel price (Alu background)
 * @param {number} lengthCm - Panel length in cm
 * @param {number} widthCm - Panel width in cm
 * @param {object} prices - Current prices
 * @param {boolean} hasSticker - sticker print option
 * @returns {object} { area, basePrice, multiplier, price }
 */
function calculatePanelPrice(lengthCm, widthCm, prices, hasSticker = false) {
    const area = calculateRectangleArea(lengthCm, widthCm);
    const pricePerSqm = prices.aluPanel || DEFAULT_PRICES.aluPanel;
    const basePrice = area * pricePerSqm;
    const stickerMultiplier = prices.aluStickerMultiplier || DEFAULT_PRICES.aluStickerMultiplier;
    const multiplier = hasSticker ? stickerMultiplier : 1;
    const price = basePrice * multiplier;

    return { area, basePrice, multiplier, price };
}

/**
 * Calculate lightbox area based on style
 * @param {number} styleId - Lightbox style ID (1-9)
 * @param {string} size - Size ('S', 'M', 'L', or 'custom')
 * @param {object} customDimensions - { width, height, depth } for custom size
 * @returns {number} Area in m²
 */
function calculateLightboxArea(styleId, size, customDimensions = null) {
    const style = LIGHTBOX_STYLES[styleId];
    if (!style) return 0;

    let w, h, d;

    if (size === 'custom' && customDimensions) {
        w = customDimensions.width || 0;
        h = customDimensions.height || 0;
        d = customDimensions.depth || 0;
    } else {
        const sizeData = style.sizes[size];
        if (!sizeData) return 0;
        w = sizeData.width;
        h = sizeData.height;
        d = sizeData.depth;
    }

    return style.calcArea(w, h, d);
}

/**
 * Calculate lightbox price
 * @param {number} styleId - Lightbox style ID
 * @param {string} size - Size
 * @param {number} quantity - Number of lightboxes
 * @param {object} customDimensions - Custom dimensions if applicable
 * @param {object} prices - Current prices
 * @returns {object} { area, price, totalPrice }
 */
function calculateLightboxPrice(styleId, size, quantity, customDimensions, prices) {
    const area = calculateLightboxArea(styleId, size, customDimensions);
    const pricePerSqm = prices.lightbox || DEFAULT_PRICES.lightbox;
    const baseUnitPrice = area * pricePerSqm;
    const baseTotalPrice = baseUnitPrice * quantity;

    // Small order markup rules (same as letters):
    // - Orders under 3000 PHP: +30%
    // - Orders under 5000 PHP: +20%
    let markupPercent = 0;
    if (baseTotalPrice > 0 && baseTotalPrice < 3000) {
        markupPercent = 30;
    } else if (baseTotalPrice >= 3000 && baseTotalPrice < 5000) {
        markupPercent = 20;
    }

    const markup = baseTotalPrice * (markupPercent / 100);
    const totalPrice = baseTotalPrice + markup;
    const unitPrice = quantity > 0 ? totalPrice / quantity : 0;

    return { area, unitPrice, totalPrice, quantity, markupPercent, markup };
}

/**
 * Calculate flashing box area in m²
 * Formula: 2 * (H*L + L*D + D*H) / 10000
 */
function calculateFlashingBoxArea(hCm, lCm, dCm) {
    if (!hCm || !lCm || !dCm) return 0;
    return 2 * (hCm * lCm + lCm * dCm + dCm * hCm) / 10000;
}

/**
 * Calculate flashing letter area in m²
 * Formula: 1.8 * heightCm * heightCm per character, converted to m²
 */
function calculateFlashingLetterArea(heightCm, charCount) {
    if (!heightCm || !charCount) return 0;
    return 1.8 * heightCm * heightCm * charCount / 10000;
}

/**
 * Format number with thousand separators
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
function formatNumber(num) {
    return Math.round(num).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

/**
 * Format area with 4 decimal places
 * @param {number} area - Area in m²
 * @returns {string} Formatted area
 */
function formatArea(area) {
    return area.toLocaleString('en-US', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
    });
}
