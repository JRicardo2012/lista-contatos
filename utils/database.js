// utils/database.js

export const createTables = async (db) => {
  await db.execAsync(`
    -- Tabela de despesas
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      date TEXT NOT NULL,
      location_id INTEGER,
      categoryId INTEGER,
      FOREIGN KEY (location_id) REFERENCES locations(id),
      FOREIGN KEY (categoryId) REFERENCES categories(id)
    );

    -- Tabela de locais (com coordenadas e nome do estabelecimento)
    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      address TEXT,
      establishment TEXT
    );

    -- Tabela de contatos (agenda)
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL
    );

    -- Tabela de categorias para despesas
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT
    );
  `);
};
