export default class Transaction {
    constructor({ id, description, amount, paidBy, splits, splitType, createdAt, groupId, note }) {
      this.id = id;
      this.description = description;
      this.amount = amount;
      this.paidBy = paidBy; // array of {personId, amount}
      this.splits = splits; // array of { personId, amount }
      this.splitType = splitType,
      this.createdAt = createdAt || new Date().toISOString();
      this.groupId = groupId,
      this.note = note
    }
  }
  