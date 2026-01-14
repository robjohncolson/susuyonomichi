/**
 * Pipette Tip Tracker - Regression Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
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
} from '../src/tip-tracker.js';

describe('Grid Configuration', () => {
  it('should have correct dimensions', () => {
    expect(GRID_CONFIG.rows).toBe(8);
    expect(GRID_CONFIG.cols).toBe(12);
  });

  it('should have correct 10µL labels', () => {
    expect(GRID_CONFIG.tip10.rowLabels).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    expect(GRID_CONFIG.tip10.colLabels).toHaveLength(12);
    expect(GRID_CONFIG.tip10.colLabels[0]).toBe('1');
    expect(GRID_CONFIG.tip10.colLabels[11]).toBe('12');
  });

  it('should have correct 100µL labels', () => {
    expect(GRID_CONFIG.tip100.colLabels).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']);
    expect(GRID_CONFIG.tip100.rowLabels).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
  });
});

describe('parseCoordToGridPosition', () => {
  describe('10µL tips (rows A-H, columns 1-12)', () => {
    it('should parse A1 to position (0, 0)', () => {
      expect(parseCoordToGridPosition('A1', 10)).toEqual({ row: 0, col: 0 });
    });

    it('should parse H12 to position (7, 11)', () => {
      expect(parseCoordToGridPosition('H12', 10)).toEqual({ row: 7, col: 11 });
    });

    it('should parse D8 to position (3, 7)', () => {
      expect(parseCoordToGridPosition('D8', 10)).toEqual({ row: 3, col: 7 });
    });

    it('should handle lowercase input', () => {
      expect(parseCoordToGridPosition('a1', 10)).toEqual({ row: 0, col: 0 });
    });

    it('should return null for invalid row letter (I)', () => {
      expect(parseCoordToGridPosition('I1', 10)).toBeNull();
    });

    it('should return null for invalid column (13)', () => {
      expect(parseCoordToGridPosition('A13', 10)).toBeNull();
    });
  });

  describe('100µL tips (columns A-L, rows 1-8)', () => {
    it('should parse A1 to position (0, 0)', () => {
      expect(parseCoordToGridPosition('A1', 100)).toEqual({ row: 0, col: 0 });
    });

    it('should parse L8 to position (7, 11)', () => {
      expect(parseCoordToGridPosition('L8', 100)).toEqual({ row: 7, col: 11 });
    });

    it('should parse D4 to position (3, 3)', () => {
      // D is column index 3, 4 is row index 3
      expect(parseCoordToGridPosition('D4', 100)).toEqual({ row: 3, col: 3 });
    });

    it('should return null for invalid column letter (M)', () => {
      expect(parseCoordToGridPosition('M1', 100)).toBeNull();
    });

    it('should return null for invalid row (9)', () => {
      expect(parseCoordToGridPosition('A9', 100)).toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('should return null for empty string', () => {
      expect(parseCoordToGridPosition('', 10)).toBeNull();
    });

    it('should return null for single character', () => {
      expect(parseCoordToGridPosition('A', 10)).toBeNull();
    });

    it('should return null for invalid tip size', () => {
      expect(parseCoordToGridPosition('A1', 50)).toBeNull();
    });
  });
});

describe('gridPositionToCoord', () => {
  describe('10µL tips', () => {
    it('should convert (0, 0) to A1', () => {
      expect(gridPositionToCoord(0, 0, 10)).toBe('A1');
    });

    it('should convert (7, 11) to H12', () => {
      expect(gridPositionToCoord(7, 11, 10)).toBe('H12');
    });
  });

  describe('100µL tips', () => {
    it('should convert (0, 0) to A1', () => {
      expect(gridPositionToCoord(0, 0, 100)).toBe('A1');
    });

    it('should convert (7, 11) to L8', () => {
      expect(gridPositionToCoord(7, 11, 100)).toBe('L8');
    });
  });

  it('should return null for out of bounds', () => {
    expect(gridPositionToCoord(-1, 0, 10)).toBeNull();
    expect(gridPositionToCoord(0, 12, 10)).toBeNull();
    expect(gridPositionToCoord(8, 0, 10)).toBeNull();
  });
});

describe('Coordinate round-trip', () => {
  it('should round-trip 10µL coordinates', () => {
    const coords = ['A1', 'B5', 'H12', 'D8'];
    coords.forEach((coord) => {
      const pos = parseCoordToGridPosition(coord, 10);
      const result = gridPositionToCoord(pos.row, pos.col, 10);
      expect(result).toBe(coord);
    });
  });

  it('should round-trip 100µL coordinates', () => {
    const coords = ['A1', 'F4', 'L8', 'I6'];
    coords.forEach((coord) => {
      const pos = parseCoordToGridPosition(coord, 100);
      const result = gridPositionToCoord(pos.row, pos.col, 100);
      expect(result).toBe(coord);
    });
  });
});

describe('validateTip', () => {
  it('should validate a correct 10µL tip', () => {
    const tip = { ingredient: 'Castoreum', tipSize: 10, coord: 'A1' };
    const result = validateTip(tip);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate a correct 100µL tip', () => {
    const tip = { ingredient: 'Bergamot', tipSize: 100, coord: 'L8' };
    const result = validateTip(tip);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject missing ingredient', () => {
    const tip = { ingredient: '', tipSize: 10, coord: 'A1' };
    const result = validateTip(tip);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Ingredient is required');
  });

  it('should reject invalid tip size', () => {
    const tip = { ingredient: 'Test', tipSize: 50, coord: 'A1' };
    const result = validateTip(tip);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Tip size must be 10 or 100');
  });

  it('should reject invalid coordinate for tip size', () => {
    // I1 is invalid for 10µL (only A-H valid)
    const tip = { ingredient: 'Test', tipSize: 10, coord: 'I1' };
    const result = validateTip(tip);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Invalid coordinate'))).toBe(true);
  });
});

describe('findExistingTip', () => {
  const tips = [
    { ingredient: 'Musk', tipSize: 10, coord: 'A1' },
    { ingredient: 'Rose', tipSize: 100, coord: 'A1' },
    { ingredient: 'Cedar', tipSize: 10, coord: 'B2' },
  ];

  it('should find tip with matching coord and tipSize', () => {
    const result = findExistingTip(tips, 'A1', 10);
    expect(result).toEqual({ ingredient: 'Musk', tipSize: 10, coord: 'A1' });
  });

  it('should return null when coord matches but tipSize differs', () => {
    // A1 exists for both 10 and 100, but searching for wrong combination
    const result = findExistingTip(tips, 'A1', 50);
    expect(result).toBeNull();
  });

  it('should return null when tip does not exist', () => {
    const result = findExistingTip(tips, 'Z9', 10);
    expect(result).toBeNull();
  });

  it('should distinguish between same coord in different boxes', () => {
    const tip10 = findExistingTip(tips, 'A1', 10);
    const tip100 = findExistingTip(tips, 'A1', 100);
    expect(tip10.ingredient).toBe('Musk');
    expect(tip100.ingredient).toBe('Rose');
  });
});

describe('addTip', () => {
  let tips;

  beforeEach(() => {
    tips = [{ ingredient: 'Musk', tipSize: 10, coord: 'A1', date: '2024-01-01' }];
  });

  it('should add a new tip', () => {
    const newTip = { ingredient: 'Rose', tipSize: 10, coord: 'B2' };
    const result = addTip(tips, newTip);
    expect(result.tips).toHaveLength(2);
    expect(result.replaced).toBeNull();
    expect(result.error).toBeNull();
  });

  it('should not replace without flag', () => {
    const newTip = { ingredient: 'Cedar', tipSize: 10, coord: 'A1' };
    const result = addTip(tips, newTip, false);
    expect(result.tips).toHaveLength(1);
    expect(result.error).toBe('Coordinate already occupied');
  });

  it('should replace with flag', () => {
    const newTip = { ingredient: 'Cedar', tipSize: 10, coord: 'A1' };
    const result = addTip(tips, newTip, true);
    expect(result.tips).toHaveLength(1);
    expect(result.tips[0].ingredient).toBe('Cedar');
    expect(result.replaced.ingredient).toBe('Musk');
  });

  it('should allow same coord in different boxes', () => {
    const newTip = { ingredient: 'Rose', tipSize: 100, coord: 'A1' };
    const result = addTip(tips, newTip);
    expect(result.tips).toHaveLength(2);
    expect(result.error).toBeNull();
  });
});

describe('deleteTip', () => {
  const tips = [
    { ingredient: 'Musk', tipSize: 10, coord: 'A1' },
    { ingredient: 'Rose', tipSize: 100, coord: 'A1' },
    { ingredient: 'Cedar', tipSize: 10, coord: 'B2' },
  ];

  it('should delete matching tip', () => {
    const result = deleteTip(tips, 'A1', 10);
    expect(result).toHaveLength(2);
    expect(result.find((t) => t.ingredient === 'Musk')).toBeUndefined();
  });

  it('should only delete tip with matching tipSize', () => {
    const result = deleteTip(tips, 'A1', 10);
    expect(result.find((t) => t.ingredient === 'Rose')).toBeDefined();
  });

  it('should return same array if tip not found', () => {
    const result = deleteTip(tips, 'Z9', 10);
    expect(result).toHaveLength(3);
  });
});

describe('filterTips', () => {
  const tips = [
    { ingredient: 'Castoreum Absolute', tipSize: 10 },
    { ingredient: 'Bulgarian Rose', tipSize: 10 },
    { ingredient: 'Rose Oxide', tipSize: 100 },
    { ingredient: 'Cedar Texas', tipSize: 10 },
  ];

  it('should filter by ingredient name (case insensitive)', () => {
    const result = filterTips(tips, 'rose');
    expect(result).toHaveLength(2);
  });

  it('should return all tips for empty query', () => {
    expect(filterTips(tips, '')).toHaveLength(4);
    expect(filterTips(tips, null)).toHaveLength(4);
  });

  it('should return empty array for no matches', () => {
    expect(filterTips(tips, 'vanilla')).toHaveLength(0);
  });
});

describe('sortTips', () => {
  const tips = [
    { ingredient: 'Cedar', tipSize: 10 },
    { ingredient: 'Apple', tipSize: 100 },
    { ingredient: 'Banana', tipSize: 10 },
  ];

  it('should sort ascending by ingredient', () => {
    const result = sortTips(tips, 'ingredient', true);
    expect(result[0].ingredient).toBe('Apple');
    expect(result[2].ingredient).toBe('Cedar');
  });

  it('should sort descending by ingredient', () => {
    const result = sortTips(tips, 'ingredient', false);
    expect(result[0].ingredient).toBe('Cedar');
    expect(result[2].ingredient).toBe('Apple');
  });

  it('should sort by tipSize', () => {
    const result = sortTips(tips, 'tipSize', true);
    expect(result[0].tipSize).toBe(10);
  });

  it('should not mutate original array', () => {
    const result = sortTips(tips, 'ingredient', true);
    expect(tips[0].ingredient).toBe('Cedar'); // Original unchanged
    expect(result).not.toBe(tips);
  });
});

describe('calculateStats', () => {
  it('should calculate correct stats', () => {
    const tips = [
      { tipSize: 10 },
      { tipSize: 10 },
      { tipSize: 100 },
      { tipSize: 10 },
      { tipSize: 100 },
    ];
    const stats = calculateStats(tips);
    expect(stats.total).toBe(5);
    expect(stats.tip10Count).toBe(3);
    expect(stats.tip100Count).toBe(2);
  });

  it('should handle empty array', () => {
    const stats = calculateStats([]);
    expect(stats.total).toBe(0);
    expect(stats.tip10Count).toBe(0);
    expect(stats.tip100Count).toBe(0);
  });
});

describe('Token System', () => {
  describe('calculateTokensEarned', () => {
    it('should return 0 for less than 5 tips', () => {
      expect(calculateTokensEarned(0)).toBe(0);
      expect(calculateTokensEarned(4)).toBe(0);
    });

    it('should return 1 for 5-9 tips', () => {
      expect(calculateTokensEarned(5)).toBe(1);
      expect(calculateTokensEarned(9)).toBe(1);
    });

    it('should return correct count for larger numbers', () => {
      expect(calculateTokensEarned(10)).toBe(2);
      expect(calculateTokensEarned(25)).toBe(5);
      expect(calculateTokensEarned(100)).toBe(20);
    });

    it('should work with custom tipsPerToken', () => {
      expect(calculateTokensEarned(10, 10)).toBe(1);
      expect(calculateTokensEarned(10, 3)).toBe(3);
    });
  });

  describe('wouldEarnToken', () => {
    it('should return true when next tip earns token', () => {
      expect(wouldEarnToken(4)).toBe(true); // 4 + 1 = 5
      expect(wouldEarnToken(9)).toBe(true); // 9 + 1 = 10
    });

    it('should return false when next tip does not earn token', () => {
      expect(wouldEarnToken(0)).toBe(false);
      expect(wouldEarnToken(5)).toBe(false);
      expect(wouldEarnToken(6)).toBe(false);
    });
  });
});
