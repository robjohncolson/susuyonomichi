/**
 * Pipette Tip Tracker - Core Logic Module
 * Extracted for testing purposes
 */

// Grid coordinate conventions
export const GRID_CONFIG = {
  // 10µL box: rows A-H, columns 1-12
  tip10: {
    rowLabels: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
    colLabels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
  },
  // 100µL box: columns A-L, rows 1-8 (transposed labeling)
  tip100: {
    colLabels: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'],
    rowLabels: ['1', '2', '3', '4', '5', '6', '7', '8'],
  },
  rows: 8,
  cols: 12,
};

/**
 * Parse a tip coordinate into grid position based on tip size
 * @param {string} coord - Coordinate like "A1", "D8", "L8"
 * @param {number} tipSize - 10 or 100
 * @returns {{row: number, col: number} | null} - Grid position (0-indexed) or null if invalid
 */
export function parseCoordToGridPosition(coord, tipSize) {
  if (!coord || coord.length < 2) return null;

  const letter = coord.charAt(0).toUpperCase();
  const number = coord.slice(1);

  if (tipSize === 10) {
    // 10µL: letter is row (A-H), number is column (1-12)
    const rowIndex = GRID_CONFIG.tip10.rowLabels.indexOf(letter);
    const colIndex = GRID_CONFIG.tip10.colLabels.indexOf(number);
    if (rowIndex === -1 || colIndex === -1) return null;
    return { row: rowIndex, col: colIndex };
  } else if (tipSize === 100) {
    // 100µL: letter is column (A-L), number is row (1-8)
    const colIndex = GRID_CONFIG.tip100.colLabels.indexOf(letter);
    const rowIndex = GRID_CONFIG.tip100.rowLabels.indexOf(number);
    if (rowIndex === -1 || colIndex === -1) return null;
    return { row: rowIndex, col: colIndex };
  }

  return null;
}

/**
 * Generate the expected coordinate for a grid position based on tip size
 * @param {number} row - Row index (0-7)
 * @param {number} col - Column index (0-11)
 * @param {number} tipSize - 10 or 100
 * @returns {string} - Coordinate string
 */
export function gridPositionToCoord(row, col, tipSize) {
  if (row < 0 || row >= GRID_CONFIG.rows || col < 0 || col >= GRID_CONFIG.cols) {
    return null;
  }

  if (tipSize === 10) {
    return GRID_CONFIG.tip10.rowLabels[row] + GRID_CONFIG.tip10.colLabels[col];
  } else if (tipSize === 100) {
    return GRID_CONFIG.tip100.colLabels[col] + GRID_CONFIG.tip100.rowLabels[row];
  }

  return null;
}

/**
 * Validate a tip entry
 * @param {Object} tip - Tip object
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateTip(tip) {
  const errors = [];

  if (!tip.ingredient || tip.ingredient.trim() === '') {
    errors.push('Ingredient is required');
  }

  if (![10, 100].includes(tip.tipSize)) {
    errors.push('Tip size must be 10 or 100');
  }

  if (!tip.coord || tip.coord.length < 2) {
    errors.push('Coordinate is required');
  }

  const gridPos = parseCoordToGridPosition(tip.coord, tip.tipSize);
  if (!gridPos) {
    errors.push(`Invalid coordinate "${tip.coord}" for ${tip.tipSize}µL tip`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a coordinate is occupied in a tips array (for a specific tip size)
 * @param {Array} tips - Array of tip objects
 * @param {string} coord - Coordinate to check
 * @param {number} tipSize - Tip size (10 or 100)
 * @returns {Object|null} - The existing tip or null
 */
export function findExistingTip(tips, coord, tipSize) {
  return tips.find(t => t.coord === coord && t.tipSize === tipSize) || null;
}

/**
 * Add a tip to the array, optionally replacing existing
 * @param {Array} tips - Existing tips array
 * @param {Object} newTip - New tip to add
 * @param {boolean} replace - Whether to replace existing tip at same coord/size
 * @returns {{tips: Array, replaced: Object|null}}
 */
export function addTip(tips, newTip, replace = false) {
  const existing = findExistingTip(tips, newTip.coord, newTip.tipSize);

  if (existing && !replace) {
    return { tips, replaced: null, error: 'Coordinate already occupied' };
  }

  let newTips = tips;
  if (existing) {
    newTips = tips.filter(t => !(t.coord === newTip.coord && t.tipSize === newTip.tipSize));
  }

  return {
    tips: [...newTips, newTip],
    replaced: existing,
    error: null,
  };
}

/**
 * Delete a tip from the array
 * @param {Array} tips - Existing tips array
 * @param {string} coord - Coordinate of tip to delete
 * @param {number} tipSize - Tip size
 * @returns {Array} - New tips array
 */
export function deleteTip(tips, coord, tipSize) {
  return tips.filter(t => !(t.coord === coord && t.tipSize === tipSize));
}

/**
 * Filter tips by search query
 * @param {Array} tips - Tips array
 * @param {string} query - Search query (matches ingredient name)
 * @returns {Array} - Filtered tips
 */
export function filterTips(tips, query) {
  if (!query || query.trim() === '') {
    return tips;
  }
  const lowerQuery = query.toLowerCase();
  return tips.filter(t => t.ingredient.toLowerCase().includes(lowerQuery));
}

/**
 * Sort tips by a field
 * @param {Array} tips - Tips array
 * @param {string} field - Field to sort by
 * @param {boolean} ascending - Sort direction
 * @returns {Array} - Sorted tips (new array)
 */
export function sortTips(tips, field, ascending = true) {
  return [...tips].sort((a, b) => {
    let valA = a[field];
    let valB = b[field];
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return ascending ? -1 : 1;
    if (valA > valB) return ascending ? 1 : -1;
    return 0;
  });
}

/**
 * Calculate statistics for tips array
 * @param {Array} tips - Tips array
 * @returns {Object} - Statistics object
 */
export function calculateStats(tips) {
  return {
    total: tips.length,
    tip10Count: tips.filter(t => t.tipSize === 10).length,
    tip100Count: tips.filter(t => t.tipSize === 100).length,
  };
}

/**
 * Token system: calculate tokens earned from tip count
 * @param {number} tipsAdded - Total tips added count
 * @param {number} tipsPerToken - Tips required per token (default 5)
 * @returns {number} - Total tokens earned
 */
export function calculateTokensEarned(tipsAdded, tipsPerToken = 5) {
  return Math.floor(tipsAdded / tipsPerToken);
}

/**
 * Check if adding a tip would earn a new token
 * @param {number} currentCount - Current tips added count (before adding)
 * @param {number} tipsPerToken - Tips required per token
 * @returns {boolean}
 */
export function wouldEarnToken(currentCount, tipsPerToken = 5) {
  return (currentCount + 1) % tipsPerToken === 0;
}

export default {
  GRID_CONFIG,
  parseCoordToGridPosition,
  gridPositionToCoord,
  validateTip,
  findExistingTip,
  addTip,
  deleteTip,
  filterTips,
  sortTips,
  calculateStats,
  calculateTokensEarned,
  wouldEarnToken,
};
