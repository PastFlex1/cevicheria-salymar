/**
 * Servicio para la generación de XML de Facturas bajo el estándar del SRI (Ecuador).
 * Implementa la Clave de Acceso de 49 dígitos y la lógica de identificación de comprador.
 * CONFIGURADO PARA: AMBIENTE 1 (PRUEBAS)
 */

export interface SRIInvoiceData {
  rucEmisor: string;
  razonSocialEmisor: string;
  nombreComercialEmisor?: string;
  dirMatriz: string;
  estab: string;
  ptoEmi: string;
  secuencial: string;
  fechaEmision: string; // Formato DD/MM/YYYY
  cliente: {
    razonSocial: string;
    identificacion: string;
    direccion?: string;
    email?: string;
  };
  items: Array<{
    codigo?: string;
    descripcion: string;
    cantidad: number;
    precioUnitario: number; // DEBE SER SIN IVA
    descuento?: number;    // DEBE SER SIN IVA
  }>;
  formaPago: string;
  codigoNumerico?: string; 
  facturaModificada?: {
    numero: string;
    fecha: string;
  };
}

export interface SRICreditNoteData extends SRIInvoiceData {
  numDocModificado: string; // Ej: 002-002-000000001
  fechaEmisionDocSustento: string; // Fecha de la factura original
  motivo: string;
}

function safe(v: any): number {
  return typeof v === 'number' && !isNaN(v) ? v : Number(v) || 0;
}

function escapeXml(text: string = ""): string {
  if (typeof text !== 'string') return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function calculateCheckDigit(key: string): string {
  let sum = 0;
  let factor = 2;
  for (let i = key.length - 1; i >= 0; i--) {
    sum += parseInt(key.charAt(i)) * factor;
    factor++;
    if (factor > 7) factor = 2;
  }
  const remainder = sum % 11;
  let checkDigit = 11 - remainder;
  if (checkDigit === 11) checkDigit = 0;
  else if (checkDigit === 10) checkDigit = 1;
  return checkDigit.toString();
}

export function generateAccessKey(data: any, codDoc: string = "01"): string {
  const dateParts = data.fechaEmision.split('/');
  const day = dateParts[0].padStart(2, '0');
  const month = dateParts[1].padStart(2, '0');
  const year = dateParts[2];
  const dateStr = day + month + year;

  const ruc = data.rucEmisor.replace(/\D/g, "").padStart(13, "0");
  const ambiente = "1"; // Ajustado a 1 (PRUEBAS)
  const serie = data.estab.padStart(3, "0") + data.ptoEmi.padStart(3, "0");
  const secuencial = data.secuencial.padStart(9, "0");
  const codigoNumerico = data.codigoNumerico || Math.floor(10000000 + Math.random() * 90000000).toString();
  const tipoEmision = "1";

  const activeCodDoc = data.tipoComprobante || data.codDoc || codDoc;

  const baseKey = dateStr + activeCodDoc + ruc + ambiente + serie + secuencial + codigoNumerico + tipoEmision;
  const dv = calculateCheckDigit(baseKey);
  return baseKey + dv;
}

export function generateInvoiceXML(data: SRIInvoiceData): string {
  const dateParts = data.fechaEmision.split('/');
  const dayPad = dateParts[0].padStart(2, '0');
  const monthPad = dateParts[1].padStart(2, '0');
  const yearPad = dateParts[2];
  const formattedFecha = `${dayPad}/${monthPad}/${yearPad}`;

  const internalNumericCode = data.codigoNumerico || Math.floor(10000000 + Math.random() * 90000000).toString();
  const claveAcceso = generateAccessKey({ ...data, fechaEmision: formattedFecha, codigoNumerico: internalNumericCode }, "01");
  
  const totalSinImpuestosCalculado = data.items.reduce((acc, item) => {
    return acc + (item.cantidad * item.precioUnitario - (item.descuento || 0));
  }, 0);

  const valorIVA = totalSinImpuestosCalculado * 0.15;
  const totalFinalConIVA = totalSinImpuestosCalculado + valorIVA;

  const esConsumidorFinal = data.cliente.identificacion === "9999999999999";
  let tipoId = "05"; 
  if (esConsumidorFinal) tipoId = "07"; 
  else if (data.cliente.identificacion.length === 13) tipoId = "04"; 

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<factura id="comprobante" version="1.1.0">\n\n`;
  xml += `    <infoTributaria>
        <ambiente>1</ambiente>
        <tipoEmision>1</tipoEmision>\n`;
  xml += `        <razonSocial>${escapeXml(data.razonSocialEmisor)}</razonSocial>\n`;
  xml += `        <nombreComercial>${escapeXml(data.nombreComercialEmisor || "CEVICHERIA SALYMAR")}</nombreComercial>\n`;
  xml += `        <ruc>${data.rucEmisor}</ruc>\n`;
  xml += `        <claveAcceso>${claveAcceso}</claveAcceso>\n`;
  xml += `        <codDoc>01</codDoc>\n`;
  xml += `        <estab>${data.estab.padStart(3, "0")}</estab>\n`;
  xml += `        <ptoEmi>${data.ptoEmi.padStart(3, "0")}</ptoEmi>\n`;
  xml += `        <secuencial>${data.secuencial.padStart(9, "0")}</secuencial>\n`;
  xml += `        <dirMatriz>${escapeXml(data.dirMatriz)}</dirMatriz>\n`;
  xml += `    </infoTributaria>\n\n`;
  xml += `    <infoFactura>\n`;
  xml += `        <fechaEmision>${formattedFecha}</fechaEmision>\n`;
  xml += `        <dirEstablecimiento>${escapeXml(data.dirMatriz)}</dirEstablecimiento>\n`;
  xml += `        <obligadoContabilidad>NO</obligadoContabilidad>\n`;
  xml += `        <tipoIdentificacionComprador>${tipoId}</tipoIdentificacionComprador>\n`;
  xml += `        <razonSocialComprador>${escapeXml(esConsumidorFinal ? "CONSUMIDOR FINAL" : data.cliente.razonSocial.toUpperCase())}</razonSocialComprador>\n`;
  xml += `        <identificacionComprador>${esConsumidorFinal ? "9999999999999" : data.cliente.identificacion}</identificacionComprador>\n`;
  xml += `        <direccionComprador>${escapeXml(esConsumidorFinal ? "CONSUMIDOR FINAL" : (data.cliente.direccion?.toUpperCase() || "CONSUMIDOR FINAL"))}</direccionComprador>\n`;
  xml += `        <totalSinImpuestos>${totalSinImpuestosCalculado.toFixed(2)}</totalSinImpuestos>\n`;
  xml += `        <totalDescuento>${data.items.reduce((acc, i) => acc + (i.descuento || 0), 0).toFixed(2)}</totalDescuento>\n\n`;
  xml += `        <totalConImpuestos>\n`;
  xml += `            <totalImpuesto>\n`;
  xml += `                <codigo>2</codigo>\n`; 
  xml += `                <codigoPorcentaje>4</codigoPorcentaje>\n`; 
  xml += `                <baseImponible>${totalSinImpuestosCalculado.toFixed(2)}</baseImponible>\n`;
  xml += `                <valor>${valorIVA.toFixed(2)}</valor>\n`;
  xml += `            </totalImpuesto>\n`;
  xml += `        </totalConImpuestos>\n\n`;
  xml += `        <propina>0.00</propina>\n`;
  xml += `        <importeTotal>${totalFinalConIVA.toFixed(2)}</importeTotal>\n`;
  xml += `        <moneda>DOLAR</moneda>\n`;
  xml += `\n        <pagos>\n`;
  xml += `            <pago>\n`;
  xml += `                <formaPago>${data.formaPago}</formaPago>\n`;
  xml += `                <total>${totalFinalConIVA.toFixed(2)}</total>\n`;
  xml += `            </pago>\n`;
  xml += `        </pagos>\n`;
  xml += `    </infoFactura>\n\n`;
  xml += `    <detalles>\n`;
  
  data.items.forEach((item) => {
    const baseLinea = item.cantidad * item.precioUnitario - (item.descuento || 0);
    const ivaLinea = baseLinea * 0.15;
    
    xml += `        <detalle>\n`;
    xml += `            <codigoPrincipal>0101</codigoPrincipal>\n`;
    xml += `            <codigoAuxiliar>0101</codigoAuxiliar>\n`;
    xml += `            <descripcion>${escapeXml(item.descripcion.toUpperCase())}</descripcion>\n`;
    xml += `            <cantidad>${item.cantidad.toFixed(2)}</cantidad>\n`;
    xml += `            <precioUnitario>${item.precioUnitario.toFixed(6)}</precioUnitario>\n`;
    xml += `            <descuento>${(item.descuento || 0).toFixed(2)}</descuento>\n`;
    xml += `            <precioTotalSinImpuesto>${baseLinea.toFixed(2)}</precioTotalSinImpuesto>\n\n`;
    xml += `            <impuestos>\n`;
    xml += `                <impuesto>\n`;
    xml += `                    <codigo>2</codigo>\n`; 
    xml += `                    <codigoPorcentaje>4</codigoPorcentaje>\n`; 
    xml += `                    <tarifa>15</tarifa>\n`; 
    xml += `                    <baseImponible>${baseLinea.toFixed(2)}</baseImponible>\n`;
    xml += `                    <valor>${ivaLinea.toFixed(2)}</valor>\n`;
    xml += `                </impuesto>\n`;
    xml += `            </impuestos>\n\n`;
    xml += `        </detalle>\n`;
  });
  xml += `    </detalles>\n\n`;
  
  if (data.cliente.email && !esConsumidorFinal) {
    xml += `    <infoAdicional>\n`;
    xml += `        <campoAdicional nombre="email">${escapeXml(data.cliente.email)}</campoAdicional>\n`;
    xml += `    </infoAdicional>\n\n`;
  }
  
  xml += `</factura>`;
  return xml;
}

export function downloadXML(xmlString: string, filename: string) {
  const blob = new Blob([xmlString], { type: "text/xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateCreditNoteXML(data: SRIInvoiceData): string {
  const claveAcceso = generateAccessKey({
    ...data,
    tipoComprobante: "04"
  });

  const subtotal = (data.items || []).reduce(
    (acc, i) => acc + (safe(i.cantidad) * Number(safe(i.precioUnitario).toFixed(2))),
    0
  );

  const valorIVA = subtotal * 0.15;
  const total = subtotal + valorIVA;

  let tipoId = "05";
  const idStr = data.cliente.identificacion || "";
  if (idStr === "9999999999999") {
    tipoId = "07";
  } else if (idStr.length === 13) {
    tipoId = "04";
  }

  const esConsumidorFinal = idStr === "9999999999999";

  let xmlStr = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xmlStr += `<notaCredito id="comprobante" version="1.0.0">\n\n`;

  xmlStr += `    <infoTributaria>
        <ambiente>1</ambiente>
        <tipoEmision>1</tipoEmision>\n`;
  xmlStr += `        <razonSocial>${escapeXml(data.razonSocialEmisor)}</razonSocial>\n`;
  xmlStr += `        <nombreComercial>${escapeXml(data.nombreComercialEmisor || "CEVICHERIA SALYMAR")}</nombreComercial>\n`;
  xmlStr += `        <ruc>${data.rucEmisor}</ruc>\n`;
  xmlStr += `        <claveAcceso>${claveAcceso}</claveAcceso>\n`;
  xmlStr += `        <codDoc>04</codDoc>\n`;
  xmlStr += `        <estab>${data.estab.padStart(3, "0")}</estab>\n`;
  xmlStr += `        <ptoEmi>${data.ptoEmi.padStart(3, "0")}</ptoEmi>\n`;
  xmlStr += `        <secuencial>${data.secuencial.padStart(9, "0")}</secuencial>\n`;
  xmlStr += `        <dirMatriz>${escapeXml(data.dirMatriz)}</dirMatriz>\n`;
  xmlStr += `    </infoTributaria>\n\n`;

  xmlStr += `    <infoNotaCredito>\n`;
  xmlStr += `        <fechaEmision>${data.fechaEmision}</fechaEmision>\n`;
  xmlStr += `        <dirEstablecimiento>${escapeXml(data.dirMatriz)}</dirEstablecimiento>\n`;
  xmlStr += `        <tipoIdentificacionComprador>${tipoId}</tipoIdentificacionComprador>\n`;
  xmlStr += `        <razonSocialComprador>${escapeXml(esConsumidorFinal ? "CONSUMIDOR FINAL" : data.cliente.razonSocial.toUpperCase())}</razonSocialComprador>\n`;
  xmlStr += `        <identificacionComprador>${data.cliente.identificacion}</identificacionComprador>\n`;
  xmlStr += `        <obligadoContabilidad>NO</obligadoContabilidad>\n`;
  xmlStr += `        <codDocModificado>01</codDocModificado>\n`;
  xmlStr += `        <numDocModificado>${data.facturaModificada?.numero}</numDocModificado>\n`;
  xmlStr += `        <fechaEmisionDocSustento>${data.facturaModificada?.fecha}</fechaEmisionDocSustento>\n`;
  xmlStr += `        <totalSinImpuestos>${subtotal.toFixed(2)}</totalSinImpuestos>\n`;
  xmlStr += `        <valorModificacion>${total.toFixed(2)}</valorModificacion>\n`;
  xmlStr += `        <moneda>DOLAR</moneda>\n\n`;
  xmlStr += `        <totalConImpuestos>\n`;
  xmlStr += `            <totalImpuesto>\n`;
  xmlStr += `                <codigo>2</codigo>\n`;
  xmlStr += `                <codigoPorcentaje>4</codigoPorcentaje>\n`;
  xmlStr += `                <baseImponible>${subtotal.toFixed(2)}</baseImponible>\n`;
  xmlStr += `                <valor>${valorIVA.toFixed(2)}</valor>\n`;
  xmlStr += `            </totalImpuesto>\n`;
  xmlStr += `        </totalConImpuestos>\n\n`;
  xmlStr += `        <motivo>${escapeXml("ANULACION DE COMPROBANTE")}</motivo>\n`;
  xmlStr += `    </infoNotaCredito>\n\n`;

  xmlStr += `    <detalles>\n`;
  (data.items || []).forEach((item) => {
    const priceUnit = Number(safe(item.precioUnitario).toFixed(2));
    const base = safe(item.cantidad) * priceUnit;
    const itemIVA = base * 0.15;
    xmlStr += `        <detalle>\n`;
    xmlStr += `            <descripcion>${escapeXml(item.descripcion.toUpperCase())}</descripcion>\n`;
    xmlStr += `            <cantidad>${safe(item.cantidad).toFixed(2)}</cantidad>\n`;
    xmlStr += `            <precioUnitario>${safe(item.precioUnitario).toFixed(2)}</precioUnitario>\n`;
    xmlStr += `            <descuento>0.00</descuento>\n`;
    xmlStr += `            <precioTotalSinImpuesto>${base.toFixed(2)}</precioTotalSinImpuesto>\n`;
    xmlStr += `            <impuestos>\n`;
    xmlStr += `                <impuesto>\n`;
    xmlStr += `                    <codigo>2</codigo>\n`;
    xmlStr += `                    <codigoPorcentaje>4</codigoPorcentaje>\n`;
    xmlStr += `                    <tarifa>15.00</tarifa>\n`;
    xmlStr += `                    <baseImponible>${base.toFixed(2)}</baseImponible>\n`;
    xmlStr += `                    <valor>${itemIVA.toFixed(2)}</valor>\n`;
    xmlStr += `                </impuesto>\n`;
    xmlStr += `            </impuestos>\n`;
    xmlStr += `        </detalle>\n`;
  });
  xmlStr += `    </detalles>\n\n`;

  if ((data.cliente.email && !esConsumidorFinal) || (data.cliente.direccion && !esConsumidorFinal)) {
    xmlStr += `    <infoAdicional>\n`;
    if (data.cliente.email && !esConsumidorFinal) {
      xmlStr += `        <campoAdicional nombre="email">${escapeXml(data.cliente.email)}</campoAdicional>\n`;
    }
    if (data.cliente.direccion && !esConsumidorFinal) {
      xmlStr += `        <campoAdicional nombre="Direccion">${escapeXml(data.cliente.direccion.toUpperCase())}</campoAdicional>\n`;
    }
    xmlStr += `    </infoAdicional>\n\n`;
  }

  xmlStr += `</notaCredito>`;
  return xmlStr;
}

export function generateNotaVentaXML(data: SRIInvoiceData): string {
  const claveAcceso = generateAccessKey({
    ...data,
    tipoComprobante: "02"
  });

  const subtotal = (data.items || []).reduce(
    (acc, i) => acc + (safe(i.cantidad) * safe(i.precioUnitario)),
    0
  );

  let tipoId = "05";
  const idStr = data.cliente.identificacion || "";
  if (idStr === "9999999999999") {
    tipoId = "07";
  } else if (idStr.length === 13) {
    tipoId = "04";
  }

  const esConsumidorFinal = idStr === "9999999999999";

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<notaVenta id="comprobante" version="1.0.0">\n\n`;

  xml += `    <infoTributaria>
        <ambiente>1</ambiente>
        <tipoEmision>1</tipoEmision>\n`;
  xml += `        <razonSocial>${escapeXml(data.razonSocialEmisor)}</razonSocial>\n`;
  xml += `        <nombreComercial>${escapeXml(data.nombreComercialEmisor || "CEVICHERIA SALYMAR")}</nombreComercial>\n`;
  xml += `        <ruc>${data.rucEmisor}</ruc>\n`;
  xml += `        <claveAcceso>${claveAcceso}</claveAcceso>\n`;
  xml += `        <codDoc>02</codDoc>\n`;
  xml += `        <estab>${data.estab.padStart(3, "0")}</estab>\n`;
  xml += `        <ptoEmi>${data.ptoEmi.padStart(3, "0")}</ptoEmi>\n`;
  xml += `        <secuencial>${data.secuencial.padStart(9, "0")}</secuencial>\n`;
  xml += `        <dirMatriz>${escapeXml(data.dirMatriz)}</dirMatriz>\n`;
  xml += `    </infoTributaria>\n\n`;
  xml += `    <infoNotaVenta>\n`;
  xml += `        <fechaEmision>${data.fechaEmision}</fechaEmision>\n`;
  xml += `        <dirEstablecimiento>${escapeXml(data.dirMatriz)}</dirEstablecimiento>\n`;
  xml += `        <obligadoContabilidad>NO</obligadoContabilidad>\n`;
  xml += `        <tipoIdentificacionSujetoRetenido>${tipoId}</tipoIdentificacionSujetoRetenido>\n`;
  xml += `        <razonSocialSujetoRetenido>${escapeXml(esConsumidorFinal ? "CONSUMIDOR FINAL" : data.cliente.razonSocial.toUpperCase())}</razonSocialSujetoRetenido>\n`;
  xml += `        <identificacionSujetoRetenido>${esConsumidorFinal ? "9999999999999" : data.cliente.identificacion}</identificacionSujetoRetenido>\n`;
  xml += `        <totalSinImpuestos>${subtotal.toFixed(2)}</totalSinImpuestos>\n`;
  xml += `        <importeTotal>${subtotal.toFixed(2)}</importeTotal>\n`;
  xml += `        <moneda>DOLAR</moneda>\n`;
  xml += `        <pagos>\n`;
  xml += `            <pago>\n`;
  xml += `                <formaPago>${data.formaPago || "01"}</formaPago>\n`;
  xml += `                <total>${subtotal.toFixed(2)}</total>\n`;
  xml += `            </pago>\n`;
  xml += `        </pagos>\n`;
  xml += `    </infoNotaVenta>\n\n`;

  xml += `    <detalles>\n`;
  (data.items || []).forEach((item) => {
    const base = safe(item.cantidad) * safe(item.precioUnitario);
    xml += `        <detalle>\n`;
    xml += `            <codigoPrincipal>${item.codigo || "0101"}</codigoPrincipal>\n`;
    xml += `            <descripcion>${escapeXml(item.descripcion.toUpperCase())}</descripcion>\n`;
    xml += `            <cantidad>${safe(item.cantidad).toFixed(2)}</cantidad>\n`;
    xml += `            <precioUnitario>${safe(item.precioUnitario).toFixed(6)}</precioUnitario>\n`;
    xml += `            <descuento>0.00</descuento>\n`;
    xml += `            <precioTotalSinImpuesto>${base.toFixed(2)}</precioTotalSinImpuesto>\n`;
    xml += `        </detalle>\n`;
  });
  xml += `    </detalles>\n`;

  if (data.cliente.email && !esConsumidorFinal) {
    xml += `    <infoAdicional>\n`;
    xml += `        <campoAdicional nombre="email">${escapeXml(data.cliente.email)}</campoAdicional>\n`;
    xml += `    </infoAdicional>\n\n`;
  }

  xml += `</notaVenta>`;
  return xml;
}

export async function procesarYEnviarSRI(
  xml: string, 
  apiBaseUrl = "/api/sri/proxy",
  onProgress?: (status: "signing" | "receiving" | "authorizing" | "done") => void
): Promise<{ 
  success: boolean; 
  data?: any; 
  error?: string;
  sriAuth?: { authDate: string; authNumber: string; estado: string; autorizacionXML?: string };
}> {
  try {
    // 1. Extraer la Clave de Acceso del XML generado
    const claveMatch = xml.match(/<claveAcceso>(\d+)<\/claveAcceso>/);
    if (!claveMatch) {
      throw new Error("No se pudo extraer la clave de acceso del XML");
    }
    const claveAcceso = claveMatch[1];

    // 2. Firmar el XML
    console.log("1. Enviando a firmar XML (Proxy)...");
    if (onProgress) onProgress("signing");
    const firmarRes = await fetch(`${apiBaseUrl}/firmar`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" }, // Proxy pasará esto como raw text
      body: xml
    });
    
    if (!firmarRes.ok) throw new Error("Error en la firma del XML. " + (await firmarRes.text()));
    const xmlFirmado = await firmarRes.text();

    // 3. Enviar a Recepción del SRI
    console.log("2. Enviando a Recepción del SRI (Proxy)...");
    if (onProgress) onProgress("receiving");
    const recepcionRes = await fetch(`${apiBaseUrl}/recepcion`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: xmlFirmado
    });

    const recepcionText = await recepcionRes.text();
    if (!recepcionRes.ok) throw new Error("Error HTTP en Recepción del SRI. " + recepcionText);
    
    const estadoRecepcionMatch = recepcionText.match(/<estado[^>]*>(.*?)<\/estado>/);
    const estadoRecepcion = estadoRecepcionMatch ? estadoRecepcionMatch[1] : null;

    if (estadoRecepcion === "DEVUELTA") {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(recepcionText, "text/xml");
        const mensajesList = doc.getElementsByTagName("mensaje");
        const errorDetails: string[] = [];
        
        for (let i = 0; i < mensajesList.length; i++) {
          const mNode = mensajesList[i];
          const identificador = mNode.getElementsByTagName("identificador")[0]?.textContent || "";
          const msgText = mNode.getElementsByTagName("mensaje")[0]?.textContent || "";
          const infoAdicional = mNode.getElementsByTagName("informacionAdicional")[0]?.textContent || "";
          
          if (identificador || infoAdicional) {
            let errorMsg = `[Cod: ${identificador}] ${msgText}`;
            if (infoAdicional) {
              errorMsg += ` - Detalle: ${infoAdicional}`;
            }
            if (!errorDetails.includes(errorMsg)) {
              errorDetails.push(errorMsg);
            }
          }
        }
        
        if (errorDetails.length > 0) {
          throw new Error(`SRI DEVOLVIÓ el comprobante en Recepción:\n` + errorDetails.join("\n"));
        }
      } catch (e: any) {
        if (e.message?.includes("SRI DEVOLVIÓ")) {
          throw e;
        }
      }

      const mensajesMatch = recepcionText.match(/<mensaje>(.*?)<\/mensaje>/g);
      let motivos = "Sin detalle de error";
      if (mensajesMatch) {
        motivos = mensajesMatch.map(m => m.replace(/<\/?mensaje>/g, '')).join(" | ");
      }
      throw new Error(`SRI DEVOLVIÓ el comprobante en Recepción: ${motivos}`);
    }
    
    console.log("Respuesta de Recepción (SOAP):", recepcionText);

    // 4. Solicitar Autorización al SRI
    console.log("3. Solicitando Autorización para la Clave (Proxy):", claveAcceso);
    if (onProgress) onProgress("authorizing");
    const autorizacionRes = await fetch(`${apiBaseUrl}/autorizacion/${claveAcceso}`, {
      method: "GET"
    });

    if (!autorizacionRes.ok) throw new Error("Error en Autorización del SRI. " + (await autorizacionRes.text()));
    const autorizacionData = await autorizacionRes.text();
    console.log("Respuesta de Autorización:", autorizacionData);

    // Extraer datos de autorización
    const authDateMatch = autorizacionData.match(/<fechaAutorizacion[^>]*>(.*?)<\/fechaAutorizacion>/);
    const authNumberMatch = autorizacionData.match(/<numeroAutorizacion[^>]*>(.*?)<\/numeroAutorizacion>/);
    const estadoMatch = autorizacionData.match(/<estado[^>]*>(.*?)<\/estado>/);

    const sriAuth = {
      authDate: authDateMatch ? authDateMatch[1] : new Date().toLocaleString('es-ES'),
      authNumber: authNumberMatch ? authNumberMatch[1] : claveAcceso,
      estado: estadoMatch ? estadoMatch[1] : 'DESCONOCIDO',
      autorizacionXML: autorizacionData
    };

    if (onProgress) onProgress("done");
    return {
      success: true,
      sriAuth,
      data: {
        recepcion: recepcionText,
        autorizacion: autorizacionData,
        xmlFirmado,
        claveAcceso
      }
    };
  } catch (error: any) {
    console.error("Error en proceso SRI:", error);
    return {
      success: false,
      error: error.message
    };
  }
}
