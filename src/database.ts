import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";

let db: Database<sqlite3.Database, sqlite3.Statement>;

export async function initDB() {
  db = await open({
    filename: "./database.sqlite",
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      password TEXT
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      amount REAL,
      user_id INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
}

export function getDB() {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}