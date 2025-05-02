export default class Person {
    constructor({ id, name, phoneNumber = null }) {
      this.id = id; // UUID or contact ID
      this.name = name;
      this.phoneNumber = phoneNumber;
    }
  }
  