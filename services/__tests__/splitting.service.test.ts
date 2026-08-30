import {
  calculateWeightedSplit,
  calculateEqualSplit,
  calculateExactSplit,
  calculatePercentSplit,
  calculateSharesSplit,
  calculateRationSplit,
  calculateIncomeSplit,
} from '../splitting.service';

function sumOwed(rows: { owedAmount: number }[]): number {
  return Math.round(rows.reduce((sum, r) => sum + r.owedAmount, 0) * 100) / 100;
}

describe('calculateWeightedSplit', () => {
  it('splits evenly when weights are equal and the amount divides cleanly', () => {
    expect(calculateWeightedSplit(90, { a: 1, b: 1, c: 1 })).toEqual({ a: 30, b: 30, c: 30 });
  });

  it('distributes the remainder cent(s) to the largest-remainder users so the sum matches exactly', () => {
    // 100 / 3 = 33.333... — one user must get the extra cent.
    const result = calculateWeightedSplit(100, { a: 1, b: 1, c: 1 });
    const values = Object.values(result);
    expect(values.reduce((s, v) => s + v, 0)).toBeCloseTo(100, 2);
    expect(values.filter((v) => v === 33.34)).toHaveLength(1);
    expect(values.filter((v) => v === 33.33)).toHaveLength(2);
  });

  it('is proportional to weight, not headcount', () => {
    const result = calculateWeightedSplit(100, { a: 1, b: 3 });
    expect(result).toEqual({ a: 25, b: 75 });
  });

  it('handles a weight of zero (participant owes nothing)', () => {
    const result = calculateWeightedSplit(50, { a: 1, b: 0 });
    expect(result).toEqual({ a: 50, b: 0 });
  });

  it('produces a deterministic result for the same input (tie-break by input order)', () => {
    const first = calculateWeightedSplit(10, { a: 1, b: 1, c: 1 });
    const second = calculateWeightedSplit(10, { a: 1, b: 1, c: 1 });
    expect(first).toEqual(second);
  });

  it('throws for an empty weight map', () => {
    expect(() => calculateWeightedSplit(100, {})).toThrow();
  });

  it('throws when weights are all zero', () => {
    expect(() => calculateWeightedSplit(100, { a: 0, b: 0 })).toThrow();
  });

  it('throws for a negative weight', () => {
    expect(() => calculateWeightedSplit(100, { a: 1, b: -1 })).toThrow();
  });

  it('distributes remainder cents correctly across many participants (7-way split)', () => {
    const weights = Object.fromEntries(['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => [id, 1]));
    const result = calculateWeightedSplit(100, weights);
    const values = Object.values(result);
    expect(values.reduce((s, v) => s + v, 0)).toBeCloseTo(100, 2);
    // 10000 cents / 7 = 1428 cents each with 4 left over -> 4 users get the
    // extra cent (14.29), the remaining 3 stay at 14.28.
    expect(values.filter((v) => v === 14.29)).toHaveLength(4);
    expect(values.filter((v) => v === 14.28)).toHaveLength(3);
  });

  it('handles decimal (non-integer) weights, e.g. ration values entered as fractions', () => {
    const result = calculateWeightedSplit(100, { a: 1.5, b: 2.5 });
    expect(result.a + result.b).toBeCloseTo(100, 2);
    expect(result).toEqual({ a: 37.5, b: 62.5 });
  });

  it('gives a single participant the entire amount', () => {
    expect(calculateWeightedSplit(45.5, { a: 1 })).toEqual({ a: 45.5 });
  });

  it('splits a sub-cent-precision total by rounding to the nearest cent before allocating', () => {
    // 10.005 rounds to 1001 cents (banker's/half-up per Math.round), which must
    // then be exactly recoverable by summing the split.
    const result = calculateWeightedSplit(10.005, { a: 1, b: 1 });
    expect(Object.values(result).reduce((s, v) => s + v, 0)).toBeCloseTo(Math.round(10.005 * 100) / 100, 2);
  });

  it('splits a single-cent total among many participants without losing or duplicating the cent', () => {
    const weights = Object.fromEntries(['a', 'b', 'c', 'd', 'e'].map((id) => [id, 1]));
    const result = calculateWeightedSplit(0.01, weights);
    const values = Object.values(result);
    expect(values.filter((v) => v === 0.01)).toHaveLength(1);
    expect(values.filter((v) => v === 0)).toHaveLength(4);
  });
});

describe('calculateEqualSplit', () => {
  it('splits equally among participants and records who paid', () => {
    const rows = calculateEqualSplit(90, ['a', 'b', 'c'], [{ userId: 'a', paidAmount: 90 }]);
    expect(rows).toEqual(
      expect.arrayContaining([
        { userId: 'a', paidAmount: 90, owedAmount: 30, weightValue: null },
        { userId: 'b', paidAmount: 0, owedAmount: 30, weightValue: null },
        { userId: 'c', paidAmount: 0, owedAmount: 30, weightValue: null },
      ])
    );
    expect(rows).toHaveLength(3);
    expect(sumOwed(rows)).toBe(90);
  });

  it('handles an odd total that does not divide evenly across 3 people', () => {
    const rows = calculateEqualSplit(10, ['a', 'b', 'c'], []);
    expect(sumOwed(rows)).toBe(10);
    const owed = rows.map((r) => r.owedAmount).sort((x, y) => y - x);
    expect(owed).toEqual([3.34, 3.33, 3.33]);
  });

  it('sums split-among-two payers correctly into a single paidAmount per user', () => {
    const rows = calculateEqualSplit(
      100,
      ['a', 'b'],
      [
        { userId: 'a', paidAmount: 60 },
        { userId: 'a', paidAmount: 10 },
      ]
    );
    expect(rows.find((r) => r.userId === 'a')?.paidAmount).toBe(70);
    expect(rows.find((r) => r.userId === 'b')?.paidAmount).toBe(0);
  });

  it('gives a payer who is not a participant a row with owedAmount 0', () => {
    const rows = calculateEqualSplit(50, ['b'], [{ userId: 'a', paidAmount: 50 }]);
    expect(rows).toEqual(
      expect.arrayContaining([
        { userId: 'a', paidAmount: 50, owedAmount: 0, weightValue: null },
        { userId: 'b', paidAmount: 0, owedAmount: 50, weightValue: null },
      ])
    );
  });

  it('throws with no participants', () => {
    expect(() => calculateEqualSplit(100, [], [])).toThrow();
  });

  it('collapses a duplicate participant id to one share instead of double-counting them', () => {
    // participantUserIds -> weights via Object.fromEntries, which dedupes by
    // key: a duplicate 'a' does not give them 2x the weight of 'b'.
    const rows = calculateEqualSplit(90, ['a', 'a', 'b'], []);
    expect(rows).toHaveLength(2);
    expect(sumOwed(rows)).toBe(90);
    expect(rows.find((r) => r.userId === 'a')?.owedAmount).toBe(45);
    expect(rows.find((r) => r.userId === 'b')?.owedAmount).toBe(45);
  });
});

describe('calculateExactSplit', () => {
  it('uses the given amounts directly, bypassing weighting', () => {
    const rows = calculateExactSplit(100, { a: 70, b: 30 }, [{ userId: 'a', paidAmount: 100 }]);
    expect(rows).toEqual(
      expect.arrayContaining([
        { userId: 'a', paidAmount: 100, owedAmount: 70, weightValue: null },
        { userId: 'b', paidAmount: 0, owedAmount: 30, weightValue: null },
      ])
    );
  });

  it('throws when the given amounts do not sum to totalAmount', () => {
    expect(() => calculateExactSplit(100, { a: 70, b: 20 }, [])).toThrow();
  });

  it('tolerates floating-point cent rounding that nets to the exact total', () => {
    // 0.1 + 0.2 !== 0.3 in raw floating point — must not false-positive as a mismatch.
    expect(() => calculateExactSplit(0.3, { a: 0.1, b: 0.2 }, [])).not.toThrow();
  });

  it('throws for an empty amounts map', () => {
    expect(() => calculateExactSplit(0, {}, [])).toThrow();
  });

  // Documents current behavior, not a requirement: EXACT only validates the
  // sum against totalAmount, not each individual amount's sign. A negative
  // entry (e.g. crediting one user while another covers more than the total)
  // is accepted as long as the sum still matches.
  it('does not reject a negative individual amount as long as the sum still matches totalAmount', () => {
    const rows = calculateExactSplit(100, { a: 120, b: -20 }, []);
    expect(rows.find((r) => r.userId === 'a')?.owedAmount).toBe(120);
    expect(rows.find((r) => r.userId === 'b')?.owedAmount).toBe(-20);
  });
});

describe('calculatePercentSplit', () => {
  it('splits by percentage and records weightValue as the percent given', () => {
    const rows = calculatePercentSplit(200, { a: 25, b: 75 }, [{ userId: 'a', paidAmount: 200 }]);
    expect(rows).toEqual(
      expect.arrayContaining([
        { userId: 'a', paidAmount: 200, owedAmount: 50, weightValue: 25 },
        { userId: 'b', paidAmount: 0, owedAmount: 150, weightValue: 75 },
      ])
    );
  });

  it('rounds a 3-way even percentage split to sum exactly to totalAmount', () => {
    const rows = calculatePercentSplit(100, { a: 33.33, b: 33.33, c: 33.34 }, []);
    expect(sumOwed(rows)).toBe(100);
  });

  it('throws when percentages do not sum to 100', () => {
    expect(() => calculatePercentSplit(100, { a: 50, b: 40 }, [])).toThrow();
  });

  it('throws for a negative percentage even when the total still sums to 100', () => {
    // 150 + -50 = 100, but a negative weight is rejected by the underlying
    // calculateWeightedSplit call rather than silently producing a negative owedAmount.
    expect(() => calculatePercentSplit(100, { a: 150, b: -50 }, [])).toThrow('Weights cannot be negative.');
  });

  it('tolerates a sum within the 0.01 floating-point tolerance (e.g. 33.33 x 3)', () => {
    expect(() => calculatePercentSplit(100, { a: 33.33, b: 33.33, c: 33.34 }, [])).not.toThrow();
  });
});

describe('calculateSharesSplit', () => {
  it('splits proportionally to share counts and records weightValue as the share count', () => {
    const rows = calculateSharesSplit(90, { a: 1, b: 2 }, [{ userId: 'b', paidAmount: 90 }]);
    expect(rows).toEqual(
      expect.arrayContaining([
        { userId: 'a', paidAmount: 0, owedAmount: 30, weightValue: 1 },
        { userId: 'b', paidAmount: 90, owedAmount: 60, weightValue: 2 },
      ])
    );
  });

  it('handles shares that do not divide the total evenly', () => {
    const rows = calculateSharesSplit(10, { a: 1, b: 1, c: 1 }, []);
    expect(sumOwed(rows)).toBe(10);
  });

  it('throws for an empty shares map', () => {
    expect(() => calculateSharesSplit(100, {}, [])).toThrow();
  });

  it('throws for a negative share count', () => {
    expect(() => calculateSharesSplit(100, { a: 3, b: -1 }, [])).toThrow('Weights cannot be negative.');
  });
});

describe('calculateRationSplit', () => {
  it('splits proportionally to entered ration values and records weightValue as the ration value', () => {
    const rows = calculateRationSplit(90, { a: 2, b: 1 }, [{ userId: 'a', paidAmount: 90 }]);
    expect(rows).toEqual(
      expect.arrayContaining([
        { userId: 'a', paidAmount: 90, owedAmount: 60, weightValue: 2 },
        { userId: 'b', paidAmount: 0, owedAmount: 30, weightValue: 1 },
      ])
    );
  });

  it('handles ration values that do not divide the total evenly', () => {
    const rows = calculateRationSplit(10, { a: 1, b: 1, c: 1 }, []);
    expect(sumOwed(rows)).toBe(10);
  });

  it('handles a participant with a zero ration value (owes nothing)', () => {
    const rows = calculateRationSplit(50, { a: 1, b: 0 }, []);
    expect(rows).toEqual(
      expect.arrayContaining([
        { userId: 'a', paidAmount: 0, owedAmount: 50, weightValue: 1 },
        { userId: 'b', paidAmount: 0, owedAmount: 0, weightValue: 0 },
      ])
    );
  });

  it('throws for an empty ration value map', () => {
    expect(() => calculateRationSplit(100, {}, [])).toThrow();
  });

  it('throws when all ration values are zero', () => {
    expect(() => calculateRationSplit(100, { a: 0, b: 0 }, [])).toThrow();
  });

  it('throws for a negative ration value', () => {
    expect(() => calculateRationSplit(100, { a: 2, b: -1 }, [])).toThrow('Weights cannot be negative.');
  });
});

describe('calculateIncomeSplit', () => {
  it('splits proportionally to stored monthly income and records weightValue as the income', () => {
    const rows = calculateIncomeSplit(400, { a: 3000, b: 1000 }, [{ userId: 'a', paidAmount: 400 }]);
    expect(rows).toEqual(
      expect.arrayContaining([
        { userId: 'a', paidAmount: 400, owedAmount: 300, weightValue: 3000 },
        { userId: 'b', paidAmount: 0, owedAmount: 100, weightValue: 1000 },
      ])
    );
  });

  it('handles incomes that do not divide the total evenly', () => {
    const rows = calculateIncomeSplit(100, { a: 2500, b: 2500, c: 5000 }, []);
    expect(sumOwed(rows)).toBe(100);
  });

  it('throws for an empty income map', () => {
    expect(() => calculateIncomeSplit(100, {}, [])).toThrow();
  });

  it('throws when all incomes are zero', () => {
    expect(() => calculateIncomeSplit(100, { a: 0, b: 0 }, [])).toThrow();
  });
});
