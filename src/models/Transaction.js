export default class Transaction {
    constructor({ id, description, amount, paidBy, splits, createdAt }) {
      this.id = id;
      this.description = description;
      this.amount = amount;
      this.paidBy = paidBy; // personId
      this.splits = splits; // array of { personId, amount }
      this.createdAt = createdAt || new Date().toISOString();
    }
  }
  