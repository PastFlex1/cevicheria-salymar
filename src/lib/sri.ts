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
  xml += `        <razonSocial>${data.razonSocialEmisor}</razonSocial>\n`;
  xml += `        <nombreComercial>${data.nombreComercialEmisor || "CEVICHERIA SALYMAR"}</nombreComercial>\n`;
  xml += `        <ruc>${data.rucEmisor}</ruc>\n`;
  xml += `        <claveAcceso>${claveAcceso}</claveAcceso>\n`;
  xml += `        <codDoc>01</codDoc>\n`;
  xml += `        <estab>${data.estab.padStart(3, "0")}</estab>\n`;
  xml += `        <ptoEmi>${data.ptoEmi.padStart(3, "0")}</ptoEmi>\n`;
  xml += `        <secuencial>${data.secuencial.padStart(9, "0")}</secuencial>\n`;
  xml += `        <dirMatriz>${data.dirMatriz}</dirMatriz>\n`;
  xml += `    </infoTributaria>\n\n`;
  xml += `    <infoFactura>\n`;
  xml += `        <fechaEmision>${formattedFecha}</fechaEmision>\n`;
  xml += `        <dirEstablecimiento>${data.dirMatriz}</dirEstablecimiento>\n`;
  xml += `        <obligadoContabilidad>NO</obligadoContabilidad>\n`;
  xml += `        <tipoIdentificacionComprador>${tipoId}</tipoIdentificacionComprador>\n`;
  xml += `        <razonSocialComprador>${esConsumidorFinal ? "CONSUMIDOR FINAL" : data.cliente.razonSocial.toUpperCase()}</razonSocialComprador>\n`;
  xml += `        <identificacionComprador>${esConsumidorFinal ? "9999999999999" : data.cliente.identificacion}</identificacionComprador>\n`;
  xml += `        <direccionComprador>${esConsumidorFinal ? "CONSUMIDOR FINAL" : (data.cliente.direccion?.toUpperCase() || "CONSUMIDOR FINAL")}</direccionComprador>\n`;
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
    xml += `            <descripcion>${item.descripcion.toUpperCase()}</descripcion>\n`;
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
    xml += `        <campoAdicional nombre="email">${data.cliente.email}</campoAdicional>\n`;
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
    (acc, i) => acc + (safe(i.cantidad) * safe(i.precioUnitario)),
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

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<notaCredito id="comprobante" version="1.0.0">\n\n`;

  xml += `    <infoTributaria>
        <ambiente>1</ambiente>
        <tipoEmision>1</tipoEmision>\n`;
  xml += `        <razonSocial>${data.razonSocialEmisor}</razonSocial>\n`;
  xml += `        <nombreComercial>${data.nombreComercialEmisor || "CEVICHERIA SALYMAR"}</nombreComercial>\n`;
  xml += `        <ruc>${data.rucEmisor}</ruc>\n`;
  xml += `        <claveAcceso>${claveAcceso}</claveAcceso>\n`;
  xml += `        <codDoc>04</codDoc>\n`;
  xml += `        <estab>${data.estab.padStart(3, "0")}</estab>\n`;
  xml += `        <ptoEmi>${data.ptoEmi.padStart(3, "0")}</ptoEmi>\n`;
  xml += `        <secuencial>${data.secuencial.padStart(9, "0")}</secuencial>\n`;
  xml += `        <dirMatriz>${data.dirMatriz}</dirMatriz>\n`;
  xml += `    </infoTributaria>\n\n`;

  xml += `    <infoNotaCredito>\n`;
  xml += `        <fechaEmision>${data.fechaEmision}</fechaEmision>\n`;
  xml += `        <dirEstablecimiento>${data.dirMatriz}</dirEstablecimiento>\n`;
  xml += `        <tipoIdentificacionComprador>${tipoId}</tipoIdentificacionComprador>\n`;
  xml += `        <razonSocialComprador>${esConsumidorFinal ? "CONSUMIDOR FINAL" : data.cliente.razonSocial.toUpperCase()}</razonSocialComprador>\n`;
  xml += `        <identificacionComprador>${data.cliente.identificacion}</identificacionComprador>\n`;
  xml += `        <totalSinImpuestos>${safe(subtotal).toFixed(2)}</totalSinImpuestos>\n`;
  xml += `        <valorModificacion>${safe(total).toFixed(2)}</valorModificacion>\n`;
  xml += `        <moneda>DOLAR</moneda>\n`;
  xml += `        <codDocModificado>01</codDocModificado>\n`;
  xml += `        <numDocModificado>${data.facturaModificada?.numero}</numDocModificado>\n`;
  xml += `        <fechaEmisionDocSustento>${data.facturaModificada?.fecha}</fechaEmisionDocSustento>\n`;
  xml += `    </infoNotaCredito>\n\n`;

  xml += `    <detalles>\n`;
  (data.items || []).forEach((item) => {
    const base = safe(item.cantidad) * safe(item.precioUnitario);
    xml += `        <detalle>\n`;
    xml += `            <codigoInterno>0101</codigoInterno>\n`;
    xml += `            <codigoAdicional>0101</codigoAdicional>\n`;
    xml += `            <descripcion>${item.descripcion.toUpperCase()}</descripcion>\n`;
    xml += `            <cantidad>${safe(item.cantidad).toFixed(2)}</cantidad>\n`;
    xml += `            <precioUnitario>${safe(item.precioUnitario).toFixed(6)}</precioUnitario>\n`;
    xml += `            <descuento>0.00</descuento>\n`;
    xml += `            <precioTotalSinImpuesto>${safe(base).toFixed(2)}</precioTotalSinImpuesto>\n`;
    xml += `        </detalle>\n`;
  });
  xml += `    </detalles>\n\n`;

  xml += `    <motivos>\n`;
  xml += `        <motivo>\n`;
  xml += `            <razon>ANULACION DE FACTURA</razon>\n`;
  xml += `            <valor>${safe(total).toFixed(2)}</valor>\n`;
  xml += `        </motivo>\n`;
  xml += `    </motivos>\n`;

  if (data.cliente.email && !esConsumidorFinal) {
    xml += `    <infoAdicional>\n`;
    xml += `        <campoAdicional nombre="email">${data.cliente.email}</campoAdicional>\n`;
    xml += `    </infoAdicional>\n\n`;
  }

  xml += `</notaCredito>`;
  return xml;
}

export async function procesarYEnviarSRI(xml: string, apiBaseUrl = "http://localhost:8080/api/sri"): Promise<{ 
  success: boolean; 
  data?: any; 
  error?: string;
  sriAuth?: { authDate: string; authNumber: string; estado: string };
}> {
  try {
    // 1. Extraer la Clave de Acceso del XML generado
    const claveMatch = xml.match(/<claveAcceso>(\d+)<\/claveAcceso>/);
    if (!claveMatch) {
      throw new Error("No se pudo extraer la clave de acceso del XML");
    }
    const claveAcceso = claveMatch[1];

    // 2. Firmar el XML
    console.log("1. Enviando a firmar XML...");
    const firmarRes = await fetch(`${apiBaseUrl}/firmar`, {
      method: "POST",
      headers: { "Content-Type": "application/xml" }, // Asumiendo que el Body es un String plano
      body: xml
    });
    
    if (!firmarRes.ok) throw new Error("Error en la firma del XML. " + (await firmarRes.text()));
    const xmlFirmado = await firmarRes.text();

    // 3. Enviar a Recepción del SRI
    console.log("2. Enviando a Recepción del SRI...");
    const recepcionRes = await fetch(`${apiBaseUrl}/recepcion`, {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body: xmlFirmado
    });

    if (!recepcionRes.ok) throw new Error("Error en Recepción del SRI. " + (await recepcionRes.text()));
    const recepcionData = await recepcionRes.text(); // El SOAP crudo
    console.log("Respuesta de Recepción:", recepcionData);

    // 4. Solicitar Autorización al SRI
    console.log("3. Solicitando Autorización para la Clave:", claveAcceso);
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
      estado: estadoMatch ? estadoMatch[1] : 'DESCONOCIDO'
    };

    return {
      success: true,
      sriAuth,
      data: {
        recepcion: recepcionData,
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
