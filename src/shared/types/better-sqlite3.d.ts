declare module "better-sqlite3" {
  namespace Database {
    type Database = any;
  }
  interface DatabaseInstance {
    [key: string]: any;
  }
  interface DatabaseConstructor {
    new (filename: string | Buffer, options?: any): DatabaseInstance;
    (filename: string | Buffer, options?: any): DatabaseInstance;
  }
  const Database: DatabaseConstructor;
  export = Database;
}
