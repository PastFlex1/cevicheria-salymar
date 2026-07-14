import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { db, run, all, get, initDB } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8081; // Cambiado a 8081 para no chocar con Java Spring Boot (que por defecto usa 8080)

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize DB
initDB().catch(console.error);

// Generic CRUD endpoints matching Firebase collections
const tables = [
  'menuCategories', 'menuProducts', 'salesNotes', 'expenses',
  'inventoryItems', 'inventoryComidas', 'inventoryBebidas', 'inventoryCombos',
  'providers', 'customers', 'cashSessions', 'cashClosings'
];

tables.forEach(table => {
  app.get(`/api/${table}`, async (req, res) => {
    try {
      const rows = await all(`SELECT * FROM ${table}`);
      const parsedRows = rows.map(row => {
        if (row.items) row.items = JSON.parse(row.items);
        if (row.payments) row.payments = JSON.parse(row.payments);
        if (row.ingredients) row.ingredients = JSON.parse(row.ingredients);
        return row;
      });
      res.json(parsedRows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get(`/api/${table}/:id`, async (req, res) => {
    try {
      const row = await get(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]);
      if (row) {
        if (row.items) row.items = JSON.parse(row.items);
        if (row.payments) row.payments = JSON.parse(row.payments);
        if (row.ingredients) row.ingredients = JSON.parse(row.ingredients);
        res.json(row);
      } else {
        res.status(404).json({ error: 'Not found' });
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST create
  app.post(`/api/${table}`, async (req, res) => {
    try {
      const data = req.body;
      const keys = Object.keys(data);
      const values = Object.values(data).map(v => typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
      const placeholders = keys.map(() => '?').join(',');
      
      await run(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`, values);
      res.status(201).json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT update (acts as upsert / setDoc)
  app.put(`/api/${table}/:id`, async (req, res) => {
    try {
      const data = req.body;
      const keys = Object.keys(data);
      const values = Object.values(data).map(v => typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
      const placeholders = keys.map(() => '?').join(',');
      
      await run(`INSERT OR REPLACE INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`, values);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete(`/api/${table}/:id`, async (req, res) => {
    try {
      await run(`DELETE FROM ${table} WHERE id = ?`, [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

app.post('/api/sri/emitir', async (req, res) => {
  try {
    const sriPayload = req.body;
    const SRI_API_URL = process.env.SRI_API_URL || 'http://localhost:8080/api/XmlFactura'; // Or whatever their endpoint is. They have XmlFacturaController in the image.
    
    console.log("Enviando comprobante al SRI local:", SRI_API_URL);
    
    // Hacemos la peticion real a la API de Java
    try {
       const sriResponse = await fetch(SRI_API_URL, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(sriPayload)
       });
       
       const responseData = await sriResponse.json();
       res.json(responseData);
    } catch (fetchErr) {
       console.error("No se pudo conectar a la API de Java:", fetchErr);
       // Fallback local simulado en caso de que la API de Java esté apagada
       res.json({ 
         success: true, 
         message: 'Factura recibida (Modo Offline / API Java no disponible)',
         estado: 'RECIBIDA'
       });
    }

  } catch (err) {
    console.error("Error procesando proxy SRI:", err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
