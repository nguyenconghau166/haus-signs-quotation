/**
 * HAUS SIGNS - Quotation Calculator
 * Lightbox Data & Default Prices
 */

// Default prices (PHP per m²)
const DEFAULT_PRICES = {
  letterAcrylicFomex: 18000, // Acrylic + Fomex letters
  letterFullAcrylic: 19000, // Full acrylic letters
  letterCutOut: 5500,       // Cut-out letters
  letterAluAcrylic: 16500,  // Aluminum + acrylic letters
  letterStainless: 45000,   // Stainless steel letters
  aluPanel: 2000,           // Aluminum Background Panel (Sign Board)
  lightbox: 10000,          // Lightbox (all styles)
  acrylicLogoRound: 11000,  // Illuminated Acrylic Logo (Round)
  acrylicLogoSquare: 10000, // Illuminated Acrylic Logo (Square)
  anchorMultiplier: 2.2,    // Anchor price multiplier for Inox
  logoRaised: 25000,        // Raised Logo (per m²)
  noLedMultiplier: 0.8,     // No LED option multiplier
  difficultMultiplier: 1.2, // Difficult lettering multiplier
  acrylicComplexMultiplier: 1.2, // Complex acrylic logo multiplier
  aluStickerMultiplier: 1.2, // Sticker print multiplier on alu panel
  surchargeThreshold1: 4000, // Threshold 1: Orders below this amount get surcharge 1
  surchargeAmount1: 1000,    // Surcharge 1 amount
  surchargeThreshold2: 5000, // Threshold 2: Orders below this amount (but >= threshold 1) get surcharge 2
  surchargeAmount2: 500      // Surcharge 2 amount
};

// Letter type options
const LETTER_TYPES = [
  { id: 'acrylicFomex', name: 'Acrylic + Fomex letters', priceKey: 'letterAcrylicFomex' },
  { id: 'fullAcrylic', name: 'Full acrylic letters', priceKey: 'letterFullAcrylic' },
  { id: 'cutOut', name: 'Cut-out letters', priceKey: 'letterCutOut' },
  { id: 'aluAcrylic', name: 'Aluminum + acrylic letters', priceKey: 'letterAluAcrylic' },
  { id: 'stainless', name: 'Stainless steel letters', priceKey: 'letterStainless' }
];

// Lightbox styles with preset sizes
// Area formula: All 5 emitting faces = Front (W×H) + 2 Sides (2×D×H) + Top+Bottom (2×W×D)
const LIGHTBOX_STYLES = {
  1: {
    name: 'Style 1 - Flat Lightbox (Wall)',
    printFace: '5 luminous faces',
    sizes: {
      S: { width: 100, height: 20, depth: 8, label: 'S: 100×20×8cm' },
      M: { width: 120, height: 24, depth: 8, label: 'M: 120×24×8cm' },
      L: { width: 150, height: 30, depth: 8, label: 'L: 150×30×8cm' }
    },
    calcArea: (w, h, d) => (w * h + 2 * d * h + 2 * w * d) / 10000
  },
  2: {
    name: 'Style 2 - Horizontal Bar Lightbox (Top install)',
    printFace: '5 luminous faces',
    sizes: {
      S: { width: 100, height: 20, depth: 12, label: 'S: 100×20×12cm' },
      M: { width: 120, height: 24, depth: 12, label: 'M: 120×24×12cm' },
      L: { width: 150, height: 30, depth: 12, label: 'L: 150×30×12cm' }
    },
    calcArea: (w, h, d) => (w * h + 2 * d * h + 2 * w * d) / 10000
  },
  3: {
    name: 'Style 3 - Hanging Bar Lightbox',
    printFace: '5 luminous faces',
    sizes: {
      S: { width: 100, height: 20, depth: 12, label: 'S: 100×20×12cm' },
      M: { width: 120, height: 24, depth: 12, label: 'M: 120×24×12cm' },
      L: { width: 150, height: 30, depth: 12, label: 'L: 150×30×12cm' }
    },
    calcArea: (w, h, d) => (w * h + 2 * d * h + 2 * w * d) / 10000
  },
  4: {
    name: 'Style 4 - Cube Lightbox',
    printFace: '5 luminous faces',
    sizes: {
      S: { width: 20, height: 20, depth: 20, label: 'S: 20×20×20cm' },
      M: { width: 30, height: 30, depth: 30, label: 'M: 30×30×30cm' },
      L: { width: 40, height: 40, depth: 40, label: 'L: 40×40×40cm' }
    },
    calcArea: (w, h, d) => (w * h + 2 * d * h + 2 * w * d) / 10000
  },
  5: {
    name: 'Style 5 - Corner Lightbox (Logo + Text)',
    printFace: '5 luminous faces',
    sizes: {
      S: { width: 45, height: 15, depth: 15, label: 'S: Logo 15×15 + Text 30cm' },
      M: { width: 60, height: 20, depth: 20, label: 'M: Logo 20×20 + Text 40cm' },
      L: { width: 75, height: 25, depth: 25, label: 'L: Logo 25×25 + Text 50cm' }
    },
    calcArea: (w, h, d) => (w * h + 2 * d * h + 2 * w * d) / 10000
  },
  6: {
    name: 'Style 6 - Double-sided Lightbox',
    printFace: '5 luminous faces',
    sizes: {
      S: { width: 30, height: 30, depth: 10, label: 'S: 30×30×10cm' },
      M: { width: 40, height: 40, depth: 10, label: 'M: 40×40×10cm' },
      L: { width: 50, height: 50, depth: 10, label: 'L: 50×50×10cm' }
    },
    calcArea: (w, h, d) => (w * h + 2 * d * h + 2 * w * d) / 10000
  },
  7: {
    name: 'Style 7 - Projecting Lightbox',
    printFace: '5 luminous faces',
    sizes: {
      S: { width: 40, height: 32, depth: 10, label: 'S: 40×32×10cm' },
      M: { width: 50, height: 40, depth: 10, label: 'M: 50×40×10cm' },
      L: { width: 60, height: 48, depth: 10, label: 'L: 60×48×10cm' }
    },
    calcArea: (w, h, d) => (w * h + 2 * d * h + 2 * w * d) / 10000
  },
  8: {
    name: 'Style 8 - Letter Box Lightbox',
    printFace: '5 luminous faces',
    sizes: {
      S: { width: 15, height: 20, depth: 15, label: 'S: 20×15×15cm' },
      M: { width: 30, height: 40, depth: 30, label: 'M: 40×30×30cm' },
      L: { width: 40, height: 55, depth: 40, label: 'L: 55×40×40cm' }
    },
    calcArea: (w, h, d) => (w * h + 2 * d * h + 2 * w * d) / 10000
  },
  9: {
    name: 'Style 9 - Horizontal Double-sided Lightbox',
    printFace: '5 luminous faces',
    sizes: {
      S: { width: 30, height: 30, depth: 8, label: 'S: 30×30×8cm' },
      M: { width: 40, height: 40, depth: 10, label: 'M: 40×40×10cm' },
      L: { width: 50, height: 50, depth: 12, label: 'L: 50×50×12cm' }
    },
    calcArea: (w, h, d) => (w * h + 2 * d * h + 2 * w * d) / 10000
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEFAULT_PRICES, LETTER_TYPES, LIGHTBOX_STYLES };
}
