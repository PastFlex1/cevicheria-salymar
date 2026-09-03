import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';
import { Resend } from 'resend';
import { db, run, all, get, initDB } from './database.js';

dotenv.config();

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

// Endpoint para enviar facturas electrónicas y notas de venta por correo usando Resend
app.post('/api/send-invoice-email', async (req, res) => {
  try {
    const { 
      to, 
      customerName, 
      invoiceNumber, 
      documentType = 'factura',
      total, 
      date, 
      claveAcceso, 
      xml, 
      pdfBase64,
      items = [],
      paymentMethod = 'Efectivo'
    } = req.body;

    if (!to || !to.includes('@')) {
      return res.status(400).json({ error: 'Correo electrónico destinatario inválido' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ 
        error: 'RESEND_API_KEY no configurada. Por favor define RESEND_API_KEY en tu archivo .env' 
      });
    }

    const resend = new Resend(apiKey);
    const isFactura = documentType !== 'nota';
    const cleanInvoiceNumber = (invoiceNumber || '').replace(/^[FN]-/, '');
    const docTitle = isFactura ? 'Factura Electrónica' : 'Nota de Venta';
    const badgeColor = isFactura ? '#0284c7' : '#d97706';
    const badgeBg = isFactura ? '#e0f2fe' : '#fef3c7';

    const attachments = [];

    // Adjuntar PDF (RIDE si es Factura, o PDF de Nota de Venta)
    if (pdfBase64) {
      attachments.push({
        filename: `${isFactura ? 'Factura' : 'NotaVenta'}_${cleanInvoiceNumber}.pdf`,
        content: pdfBase64,
      });
    }

    // Si es Factura Electrónica, también se adjunta el XML firmado/autorizado del SRI
    if (isFactura && xml) {
      attachments.push({
        filename: `Factura_${cleanInvoiceNumber}.xml`,
        content: Buffer.from(xml).toString('base64'),
      });
    }

    const itemsRowsHtml = Array.isArray(items) && items.length > 0 ? `
      <div style="margin-top: 18px;">
        <p style="font-size: 13px; font-weight: bold; color: #334155; margin-bottom: 8px;">Detalle del Consumo:</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: #f1f5f9; text-align: left; color: #475569; font-size: 11px; text-transform: uppercase;">
              <th style="padding: 8px 10px; border-radius: 6px 0 0 6px;">Cant.</th>
              <th style="padding: 8px 10px;">Descripción</th>
              <th style="padding: 8px 10px; text-align: right; border-radius: 0 6px 6px 0;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(it => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 10px; color: #64748b; font-weight: bold;">${it.quantity || 1}x</td>
                <td style="padding: 8px 10px; color: #1e293b;">${it.descripcion || it.menuItem?.name || 'Producto'}</td>
                <td style="padding: 8px 10px; text-align: right; color: #0f172a; font-weight: bold;">$${Number((it.precioUnitario ? it.precioUnitario * (it.quantity || 1) : (it.menuItem?.price || 0) * (it.quantity || 1))).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 24px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); border: 1px solid #e2e8f0;">
          
          <!-- Header decorativo marino Salymar -->
          <div style="background: linear-gradient(135deg, #0369a1 0%, #0284c7 50%, #0ea5e9 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
            <div style="display: inline-block; background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(8px); padding: 4px 14px; border-radius: 9999px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 12px; text-transform: uppercase;">
              🐟 Cevichería Salymar &bull; Sabor del Mar 🦐
            </div>
            <h1 style="margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px;">CEVICHERÍA SALYMAR</h1>
            <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">¡Gracias por visitarnos y preferirnos!</p>
          </div>

          <!-- Contenido Principal -->
          <div style="padding: 28px 24px;">
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <span style="background: ${badgeBg}; color: ${badgeColor}; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                ${docTitle} ${isFactura ? '✓ SRI' : ''}
              </span>
              <span style="color: #64748b; font-size: 13px; font-weight: 600;">
                No. ${cleanInvoiceNumber}
              </span>
            </div>

            <p style="font-size: 16px; color: #0f172a; margin: 0 0 10px 0; font-weight: 600;">
              Estimado/a <span style="color: #0284c7;">${customerName || 'Cliente'}</span>,
            </p>
            <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
              Le agradecemos por su visita. Le enviamos su comprobante de pago emitido por <strong>Cevichería Salymar</strong>. A continuación los detalles:
            </p>

            <!-- Card de Datos -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; margin-bottom: 20px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Comprobante:</td>
                  <td style="padding: 6px 0; text-align: right; color: #0f172a; font-weight: bold;">${docTitle} #${cleanInvoiceNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Fecha de Emisión:</td>
                  <td style="padding: 6px 0; text-align: right; color: #0f172a; font-weight: bold;">${date || new Date().toLocaleDateString('es-EC')}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Forma de Pago:</td>
                  <td style="padding: 6px 0; text-align: right; color: #0f172a; font-weight: bold;">${paymentMethod}</td>
                </tr>
                <tr style="border-top: 1px dashed #cbd5e1;">
                  <td style="padding: 12px 0 6px 0; font-size: 14px; color: #0f172a; font-weight: 800;">VALOR TOTAL:</td>
                  <td style="padding: 12px 0 6px 0; text-align: right; font-size: 20px; color: #16a34a; font-weight: 900;">$${Number(total || 0).toFixed(2)}</td>
                </tr>
              </table>
            </div>

            ${itemsRowsHtml}

            ${isFactura && claveAcceso ? `
              <!-- Clave de Acceso SRI -->
              <div style="margin-top: 20px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 14px;">
                <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: bold; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px;">
                  Clave de Acceso y Autorización SRI:
                </p>
                <p style="margin: 0; font-size: 11px; font-family: monospace; color: #1e3a8a; word-break: break-all; background: #ffffff; padding: 8px; border-radius: 6px; border: 1px solid #dbeafe;">
                  ${claveAcceso}
                </p>
              </div>
            ` : ''}

            <!-- Aviso de adjuntos -->
            <div style="margin-top: 24px; padding: 14px; background: #fafaf9; border-radius: 12px; border-left: 4px solid #0284c7;">
              <p style="margin: 0; font-size: 13px; color: #44403c; line-height: 1.5;">
                📎 <strong>Archivos adjuntos:</strong> 
                ${isFactura 
                  ? 'Encontrará adjuntos su comprobante en formato <strong>PDF (RIDE)</strong> y el archivo oficial <strong>XML firmado</strong> y autorizado por el SRI.' 
                  : 'Encontrará adjunta su <strong>Nota de Venta en formato PDF</strong>.'}
              </p>
            </div>

          </div>

          <!-- Footer -->
          <div style="background: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
            <p style="margin: 0 0 4px 0; font-weight: bold; color: #334155;">CEVICHERÍA SALYMAR</p>
            <p style="margin: 0 0 4px 0;">RUC: 1714809025001 &bull; Quito, Ecuador</p>
            <p style="margin: 0 0 8px 0; font-size: 11px;">S10 Puruhá Oe6-203 y Oe6a Hualcopo</p>
            <p style="margin: 0; font-size: 11px; color: #94a3b8;">
              Este es un correo automático de notificación de comprobante electrónico.
            </p>
          </div>

        </div>
      </body>
      </html>
    `;

    const { data: resendData, error: resendError } = await resend.emails.send({
      from: 'Cevichería Salymar <facturacion@salymar.lat>',
      to: [to],
      subject: `${docTitle} No. ${cleanInvoiceNumber} - Cevichería Salymar`,
      html: htmlContent,
      attachments: attachments.length > 0 ? attachments : undefined
    });

    if (resendError) {
      console.error('[Resend Error]', resendError);
      return res.status(400).json({ error: resendError.message });
    }

    console.log(`[Resend] Correo enviado exitosamente a ${to} (${docTitle} ${cleanInvoiceNumber})`);
    res.json({ success: true, id: resendData?.id });

  } catch (err) {
    console.error('[Resend Exception]', err);
    res.status(500).json({ error: err.message || 'Error al enviar el correo con Resend' });
  }
});

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`🚀 Servidor listo! Abre este enlace en tu navegador: http://localhost:${port}`);
});
