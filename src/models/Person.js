export default class Person {
    constructor({ id, name, phoneNumber = null, isContact = false }) {
      this.id = id; // UUID or contact ID
      this.name = name;
      this.phoneNumber = phoneNumber;
      this.isContact = isContact; // to differentiate between contact and manual entry
    }
  }
  