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
app.use(express.text({ type: 'text/plain', limit: '10mb' }));

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
        if (row.recipe) row.recipe = JSON.parse(row.recipe);
        if (row.sriAuth) {
          try {
            row.sriAuth = JSON.parse(row.sriAuth);
          } catch (e) {}
        }
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
        if (row.recipe) row.recipe = JSON.parse(row.recipe);
        if (row.sriAuth) {
          try {
            row.sriAuth = JSON.parse(row.sriAuth);
          } catch (e) {}
        }
        res.json(row);
      } else {
        res.json(null);
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

app.post('/api/reset-database', async (req, res) => {
  try {
    const tablesToClear = [
      'salesNotes',
      'expenses',
      'cashSessions',
      'cashClosings',
      'customers'
    ];
    for (const table of tablesToClear) {
      await run(`DELETE FROM ${table}`);
    }
    if (req.query.all === 'true') {
      const configTables = [
        'menuCategories', 'menuProducts', 'inventoryItems', 
        'inventoryComidas', 'inventoryBebidas', 'inventoryCombos', 'providers'
      ];
      for (const table of configTables) {
        await run(`DELETE FROM ${table}`);
      }
    }
    console.log("Database cleared successfully.");
    res.json({ success: true, message: "Base de datos limpiada con éxito." });
  } catch (error) {
    console.error("Error clearing database:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});


app.post('/api/sri/procesar', async (req, res) => {
  try {
    const { xml, claveAcceso } = req.body;
    const JAVA_API_BASE = process.env.JAVA_API_BASE || 'http://localhost:8080/api/sri';
    
    console.log(`[SRI] Iniciando proceso para clave de acceso: ${claveAcceso}`);
    
    // 1. FIRMAR
    console.log(`[SRI] 1. Firmando XML...`);
    const firmarRes = await fetch(`${JAVA_API_BASE}/firmar`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: xml
    });
    if (!firmarRes.ok) throw new Error("Error al firmar: " + await firmarRes.text());
    const xmlFirmado = await firmarRes.text();
    
    // 2. RECEPCIÓN
    console.log(`[SRI] 2. Enviando a Recepción...`);
    const recepcionRes = await fetch(`${JAVA_API_BASE}/recepcion`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: xmlFirmado
    });
    if (!recepcionRes.ok) throw new Error("Error en recepción: " + await recepcionRes.text());
    const recepcionData = await recepcionRes.text(); // Podría ser SOAP XML
    
    // 3. AUTORIZACIÓN
    console.log(`[SRI] 3. Solicitando Autorización...`);
    const authRes = await fetch(`${JAVA_API_BASE}/autorizacion/${claveAcceso}`);
    if (!authRes.ok) throw new Error("Error en autorización: " + await authRes.text());
    const authData = await authRes.text(); // Podría ser SOAP XML
    
    console.log(`[SRI] ¡Proceso completado con éxito!`);
    
    res.json({ 
      success: true, 
      estado: "AUTORIZADO", 
      xmlFirmado,
      recepcionSoap: recepcionData,
      autorizacionSoap: authData
    });

  } catch (err) {
    console.error("Error procesando proxy SRI:", err);
    res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

// Proxy endpoints individuales para permitir progreso paso a paso en el UI sin CORS
app.post('/api/sri/proxy/firmar', async (req, res) => {
    try {
        const JAVA_API_BASE = process.env.JAVA_API_BASE || 'http://localhost:8080/api/sri';
        const javaRes = await fetch(`${JAVA_API_BASE}/firmar`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: req.body
        });
        const text = await javaRes.text();
        res.status(javaRes.status).send(text);
    } catch(e) { res.status(500).send(e.message); }
});

app.post('/api/sri/proxy/recepcion', async (req, res) => {
    try {
        const JAVA_API_BASE = process.env.JAVA_API_BASE || 'http://localhost:8080/api/sri';
        const javaRes = await fetch(`${JAVA_API_BASE}/recepcion`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: req.body
        });
        const text = await javaRes.text();
        res.status(javaRes.status).send(text);
    } catch(e) { res.status(500).send(e.message); }
});

app.get('/api/sri/proxy/autorizacion/:clave', async (req, res) => {
    try {
        const JAVA_API_BASE = process.env.JAVA_API_BASE || 'http://localhost:8080/api/sri';
        const javaRes = await fetch(`${JAVA_API_BASE}/autorizacion/${req.params.clave}`);
        const text = await javaRes.text();
        res.status(javaRes.status).send(text);
    } catch(e) { res.status(500).send(e.message); }
});

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`🚀 Servidor listo! Abre este enlace en tu navegador: http://localhost:${port}`);
});
