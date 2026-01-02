import { Client, TablesDB, Account } from "react-native-appwrite";

const client = new Client();
client
  .setEndpoint("https://sgp.cloud.appwrite.io/v1")
  .setProject("6957bcb90000e9b1c206") // Replace with your project ID
  ;


export const account = new Account(client);
export const tablesDB = new TablesDB(client);
