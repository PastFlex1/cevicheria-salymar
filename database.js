import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize database
const dbFile = path.join(__dirname, 'local.db');
export const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.run('PRAGMA journal_mode = WAL;');
  }
});

export const run = promisify(db.run.bind(db));
export const get = promisify(db.get.bind(db));
export const all = promisify(db.all.bind(db));

// Initialize tables with names matching Firebase collections exactly
export async function initDB() {
  const tables = `
    CREATE TABLE IF NOT EXISTS menuCategories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT,
      "order" INTEGER
    );

    CREATE TABLE IF NOT EXISTS menuProducts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      category TEXT,
      categoryId TEXT,
      image TEXT,
      available INTEGER,
      sold INTEGER,
      cost REAL,
      aplicaIva INTEGER,
      status TEXT,
      stock INTEGER,
      stockMinimo INTEGER,
      recipe TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS salesNotes (
      id TEXT PRIMARY KEY,
      items TEXT NOT NULL,
      subtotal REAL NOT NULL,
      discount REAL,
      tax REAL NOT NULL,
      total REAL NOT NULL,
      date TEXT NOT NULL,
      customerName TEXT,
      tableNumber TEXT,
      orderType TEXT,
      status TEXT,
      documentType TEXT,
      clientId TEXT,
      ruc TEXT,
      businessName TEXT,
      clientPhone TEXT,
      clientEmail TEXT,
      clientAddress TEXT,
      paymentMethod TEXT,
      payments TEXT,
      cashReceived REAL,
      changeReturned REAL,
      transactionNumber TEXT,
      observation TEXT,
      createdBy TEXT,
      cancelReason TEXT,
      relatedOrderId TEXT,
      sriAuth TEXT
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventoryItems (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      minQuantity REAL NOT NULL,
      category TEXT NOT NULL,
      price REAL,
      unitCost REAL
    );

    CREATE TABLE IF NOT EXISTS inventoryComidas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      ingredients TEXT,
      price REAL
    );

    CREATE TABLE IF NOT EXISTS inventoryBebidas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      minQuantity REAL NOT NULL,
      category TEXT NOT NULL,
      price REAL,
      unitCost REAL
    );

    CREATE TABLE IF NOT EXISTS inventoryCombos (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      items TEXT,
      price REAL
    );

    CREATE TABLE IF NOT EXISTS providers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contactName TEXT,
      phone TEXT,
      category TEXT,
      address TEXT
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      documentType TEXT,
      documentNumber TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      status TEXT,
      totalPurchases REAL,
      numberOfPurchases INTEGER,
      lastPurchaseDate TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      createdBy TEXT,
      updatedBy TEXT
    );
    
    CREATE TABLE IF NOT EXISTS cashSessions (
      id TEXT PRIMARY KEY,
      status TEXT,
      openedBy TEXT,
      openTime TEXT,
      openingBalance REAL
    );
    
    CREATE TABLE IF NOT EXISTS cashClosings (
      id TEXT PRIMARY KEY,
      openTime TEXT,
      closeTime TEXT,
      openedBy TEXT,
      closedBy TEXT,
      openingBalance REAL,
      cashSales REAL,
      transferSales REAL,
      cardSales REAL,
      creditSales REAL,
      expenses REAL,
      expectedCash REAL,
      actualCash REAL,
      actualTransfers REAL,
      differenceCash REAL,
      differenceTransfers REAL,
      notes TEXT
    );
  `;

  return new Promise((resolve, reject) => {
    db.exec(tables, (err) => {
      if (err) {
        console.error("Error initializing tables:", err);
        reject(err);
      } else {
        console.log("Database tables initialized.");
        // Migración automática: Intentar agregar la columna sriAuth si no existe
        db.run("ALTER TABLE salesNotes ADD COLUMN sriAuth TEXT", (alterErr) => {
          // Ignoramos el error si la columna ya existe
          resolve();
        });
      }
    });
  });
}
