// Splitting Engine — CLAUDE.md Module 4.
//
// One generic weighted-split calculator (Section 2: "Percentage, ration, and
// income splits are all weighted splits — same math, different weight
// source. Do not implement three separate calculators."). EQUAL, PERCENT,
// and SHARES all route through it with a different weight map; EXACT
// bypasses weighting entirely since the caller already supplies owedAmount
// per user. Ration/income wrappers land in Module 6 — same function, just a
// different weight source, per the CLAUDE.md note on that module.
//
// Pure, DB-free: returns rows shaped like `expense_splits` (minus `id` /
// `expenseId`, which the repository layer assigns on insert in Module 5).

export interface ParticipantPayment {
  userId: string;
  paidAmount: number;
}

export interface ExpenseSplitCalculation {
  userId: string;
  paidAmount: number;
  owedAmount: number;
  weightValue: number | null;
}

// Splits `totalAmount` across `weights` in proportion to each weight, in
// cents, so the result always sums EXACTLY to totalAmount regardless of
// rounding (CLAUDE.md Module 4: "splits must sum exactly to totalAmount").
// Uses the largest-remainder method: give every user floor(their exact
// share), then hand the leftover cents one each to the users with the
// largest fractional remainder, breaking ties by input key order so the
// same input always produces the same output.
export function calculateWeightedSplit(totalAmount: number, weights: Record<string, number>): Record<string, number> {
  const userIds = Object.keys(weights);
  if (userIds.length === 0) {
    throw new Error('calculateWeightedSplit requires at least one weight.');
  }
  if (userIds.some((id) => weights[id] < 0)) {
    throw new Error('Weights cannot be negative.');
  }
  const sumWeights = userIds.reduce((sum, id) => sum + weights[id], 0);
  if (sumWeights <= 0) {
    throw new Error('Weights must sum to a positive value.');
  }

  const totalCents = Math.round(totalAmount * 100);
  const shares = userIds.map((userId) => {
    const exactCents = (totalCents * weights[userId]) / sumWeights;
    const baseCents = Math.floor(exactCents);
    return { userId, baseCents, remainder: exactCents - baseCents };
  });

  const allocatedCents = shares.reduce((sum, s) => sum + s.baseCents, 0);
  const leftoverCents = totalCents - allocatedCents;
  const byRemainderDesc = [...shares].sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < leftoverCents; i++) {
    byRemainderDesc[i].baseCents += 1;
  }

  const owedAmounts: Record<string, number> = {};
  for (const s of shares) {
    owedAmounts[s.userId] = s.baseCents / 100;
  }
  return owedAmounts;
}

function paidAmountsByUser(paidBy: ParticipantPayment[]): Record<string, number> {
  const paidAmounts: Record<string, number> = {};
  for (const payment of paidBy) {
    paidAmounts[payment.userId] = (paidAmounts[payment.userId] ?? 0) + payment.paidAmount;
  }
  return paidAmounts;
}

// Merges owedAmounts (from calculateWeightedSplit or, for EXACT, the raw
// input) with who-paid-what into expense_splits-shaped rows. The row set is
// the union of both sides so a payer who isn't an owing participant (e.g.
// covering a friend's share entirely) still gets a row, with owedAmount 0.
function buildSplitRows(
  owedAmounts: Record<string, number>,
  paidBy: ParticipantPayment[],
  weightValues: Record<string, number>
): ExpenseSplitCalculation[] {
  const paidAmounts = paidAmountsByUser(paidBy);
  const userIds = new Set([...Object.keys(owedAmounts), ...Object.keys(paidAmounts)]);
  return Array.from(userIds).map((userId) => ({
    userId,
    paidAmount: paidAmounts[userId] ?? 0,
    owedAmount: owedAmounts[userId] ?? 0,
    weightValue: weightValues[userId] ?? null,
  }));
}

// EQUAL: every participant gets weight 1 — an equal split is a weighted
// split with a uniform weight source, not a special case.
export function calculateEqualSplit(
  totalAmount: number,
  participantUserIds: string[],
  paidBy: ParticipantPayment[]
): ExpenseSplitCalculation[] {
  if (participantUserIds.length === 0) {
    throw new Error('EQUAL split requires at least one participant.');
  }
  const weights = Object.fromEntries(participantUserIds.map((id) => [id, 1]));
  return buildSplitRows(calculateWeightedSplit(totalAmount, weights), paidBy, {});
}

// EXACT: bypasses calculateWeightedSplit entirely (CLAUDE.md Module 4) —
// the caller supplies each user's owedAmount directly, and it must already
// sum to totalAmount.
export function calculateExactSplit(
  totalAmount: number,
  exactAmounts: Record<string, number>,
  paidBy: ParticipantPayment[]
): ExpenseSplitCalculation[] {
  if (Object.keys(exactAmounts).length === 0) {
    throw new Error('EXACT split requires at least one amount.');
  }
  const totalCents = Math.round(totalAmount * 100);
  const sumCents = Object.values(exactAmounts).reduce((sum, amount) => sum + Math.round(amount * 100), 0);
  if (sumCents !== totalCents) {
    throw new Error(`EXACT split amounts must sum to totalAmount (${totalAmount}), got ${sumCents / 100}.`);
  }
  return buildSplitRows(exactAmounts, paidBy, {});
}

// PERCENT: weight source is each user's percentage, which must sum to 100
// so the split is unambiguous to whoever entered it.
export function calculatePercentSplit(
  totalAmount: number,
  percents: Record<string, number>,
  paidBy: ParticipantPayment[]
): ExpenseSplitCalculation[] {
  if (Object.keys(percents).length === 0) {
    throw new Error('PERCENT split requires at least one percentage.');
  }
  const sumPercents = Object.values(percents).reduce((sum, p) => sum + p, 0);
  if (Math.abs(sumPercents - 100) > 0.01) {
    throw new Error(`PERCENT split must sum to 100, got ${sumPercents}.`);
  }
  return buildSplitRows(calculateWeightedSplit(totalAmount, percents), paidBy, percents);
}

// SHARES: weight source is each user's raw share count (e.g. 2 shares vs 1).
export function calculateSharesSplit(
  totalAmount: number,
  shares: Record<string, number>,
  paidBy: ParticipantPayment[]
): ExpenseSplitCalculation[] {
  if (Object.keys(shares).length === 0) {
    throw new Error('SHARES split requires at least one share.');
  }
  return buildSplitRows(calculateWeightedSplit(totalAmount, shares), paidBy, shares);
}

// RATION (Module 6): weight source is a value the user enters per-expense
// against some metric (e.g. "Meals Eaten") — the metric's label is stored on
// the expense as rationMetric, not part of this calculation. Same weighted
// math as PERCENT/SHARES, different weight source (CLAUDE.md Module 6).
export function calculateRationSplit(
  totalAmount: number,
  rationValues: Record<string, number>,
  paidBy: ParticipantPayment[]
): ExpenseSplitCalculation[] {
  if (Object.keys(rationValues).length === 0) {
    throw new Error('RATION split requires at least one ration value.');
  }
  return buildSplitRows(calculateWeightedSplit(totalAmount, rationValues), paidBy, rationValues);
}

// INCOME (Module 6): weight source is each user's stored monthlyIncome
// (users.monthlyIncome, CLAUDE.md Section 3). Callers look that value up and
// pass it in — this module stays DB-free like the rest of the split
// calculators.
export function calculateIncomeSplit(
  totalAmount: number,
  incomes: Record<string, number>,
  paidBy: ParticipantPayment[]
): ExpenseSplitCalculation[] {
  if (Object.keys(incomes).length === 0) {
    throw new Error('INCOME split requires at least one income value.');
  }
  return buildSplitRows(calculateWeightedSplit(totalAmount, incomes), paidBy, incomes);
}
