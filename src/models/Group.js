export default class Group {
    constructor({ id, name, members = [], createdAt = new Date() }) {
      this.id = id; // UUID
      this.name = name;
      this.members = members; // Array of Person instances
      this.createdAt = createdAt;
    }
  
    addMember(person) {
      this.members.push(person);
    }
  }
  