import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JsBarcode from 'jsbarcode';
import { Order, OrderItem } from '../types';
import { SRIInvoiceData, generateAccessKey } from './sri';

const PAYMENT_MAP: Record<string, string> = {
  "01": "01 - SIN UTILIZACIÓN DEL SISTEMA FINANCIERO",
  "16": "16 - TARJETA DE DÉBITO",
  "19": "19 - TARJETA DE CRÉDITO",
  "20": "20 - OTROS CON UTILIZACIÓN DEL SISTEMA FINANCIERO",
};

export function createNotaVentaPDF(order: Order, sriData: SRIInvoiceData) {
  const doc = new jsPDF() as any;
  const estab = sriData.estab || "001";
  const ptoEmi = sriData.ptoEmi || "001";
  const secuencial = sriData.secuencial || "000000001";
  const displayNum = `${estab}-${ptoEmi}-${secuencial}`;
  const esConsumidorFinal = !sriData.cliente.identificacion || sriData.cliente.identificacion === "9999999999999";

  // 1. Logo
  try {
    const img = new Image();
    img.src = '/Salymar.png';
    doc.addImage(img, 'PNG', 15, 12, 38, 38);
  } catch (e) {
    console.warn("Could not add logo to Nota de Venta", e);
  }

  // 2. Datos del Negocio (Izquierda)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(3, 105, 161); // Salymar Ocean Blue
  doc.text('CEVICHERÍA SALYMAR', 58, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Propietario: ${sriData.razonSocialEmisor}`, 58, 28);
  doc.text(`R.U.C.: ${sriData.rucEmisor}`, 58, 33);
  doc.text(`Dirección: ${sriData.dirMatriz}`, 58, 38, { maxWidth: 65 });
  doc.text(`Quito - Ecuador`, 58, 48);

  // 3. Tarjeta del Comprobante (Derecha)
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.setLineWidth(0.5);
  doc.roundedRect(128, 12, 68, 40, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('NOTA DE VENTA', 162, 22, { align: 'center' });

  // Badge: DOCUMENTO SIN VALIDEZ TRIBUTARIA
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(132, 26, 60, 6, 2, 2, 'FD');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38);
  doc.text('SIN VALIDEZ TRIBUTARIA', 162, 30.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(3, 105, 161);
  doc.text(`No. ${displayNum}`, 162, 40, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fecha: ${sriData.fechaEmision}`, 162, 46, { align: 'center' });

  // 4. Caja de Datos del Cliente
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, 58, 181, 24, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('CLIENTE:', 19, 65);
  doc.text('RUC / C.I.:', 19, 71);
  doc.text('DIRECCIÓN:', 19, 77);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const clienteNombre = esConsumidorFinal ? "CONSUMIDOR FINAL" : (sriData.cliente.razonSocial || "CONSUMIDOR FINAL");
  doc.setFont('helvetica', 'bold');
  doc.text(clienteNombre.toUpperCase(), 42, 65, { maxWidth: 75 });
  doc.setFont('helvetica', 'normal');
  doc.text(sriData.cliente.identificacion || "9999999999999", 42, 71);
  doc.text(esConsumidorFinal ? "QUITO" : (sriData.cliente.direccion || "QUITO"), 42, 77, { maxWidth: 75 });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('FORMA PAGO:', 125, 65);
  doc.text('MESA / PEDIDO:', 125, 71);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text((order.paymentMethod || "Efectivo").toUpperCase(), 155, 65);
  doc.text((order.tableNumber || "Mesa / Local").toUpperCase(), 155, 71);

  // 5. Tabla de Productos (autoTable)
  const items = sriData.items && sriData.items.length > 0 ? sriData.items : (order.items || []).map((it: any) => ({
    cantidad: it.quantity,
    descripcion: it.menuItem?.name || it.descripcion || "Item",
    precioUnitario: it.menuItem?.price || it.precioUnitario || 0,
    descuento: 0
  }));

  const tableRows = items.map((it: any) => {
    const cant = Number(it.cantidad || 1);
    const pUnit = Number(it.precioUnitario || 0);
    const totalRow = cant * pUnit;
    return [
      `${cant}x`,
      (it.descripcion || "").toUpperCase(),
      `$${pUnit.toFixed(2)}`,
      `$${totalRow.toFixed(2)}`
    ];
  });

  autoTable(doc, {
    startY: 86,
    margin: { left: 15, right: 15 },
    head: [['CANT.', 'DESCRIPCIÓN DE PRODUCTO', 'PRECIO UNIT.', 'TOTAL']],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [3, 105, 161],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
      cellPadding: 3
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
      1: { halign: 'left' },
      2: { halign: 'right', cellWidth: 28 },
      3: { halign: 'right', cellWidth: 28, fontStyle: 'bold' }
    }
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 140;

  // 6. Totales
  const totalBoxY = finalY + 6;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(120, totalBoxY, 76, 26, 2, 2, 'FD');

  const subtotalVal = order.subtotal || order.total || 0;
  const descVal = order.discount || 0;
  const totalVal = order.total || subtotalVal;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Subtotal:', 125, totalBoxY + 7);
  doc.setTextColor(15, 23, 42);
  doc.text(`$${Number(subtotalVal).toFixed(2)}`, 190, totalBoxY + 7, { align: 'right' });

  if (descVal > 0) {
    doc.setTextColor(100, 116, 139);
    doc.text('Descuento:', 125, totalBoxY + 13);
    doc.setTextColor(220, 38, 38);
    doc.text(`-$${Number(descVal).toFixed(2)}`, 190, totalBoxY + 13, { align: 'right' });
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(125, totalBoxY + 16, 191, totalBoxY + 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL A PAGAR:', 125, totalBoxY + 22);
  doc.setTextColor(22, 163, 74);
  doc.setFontSize(12);
  doc.text(`$${Number(totalVal).toFixed(2)}`, 190, totalBoxY + 22, { align: 'right' });

  // 7. Pie de Página y Agradecimiento
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('¡Gracias por su visita a Cevichería Salymar!', 15, totalBoxY + 8);
  doc.setFontSize(7.5);
  doc.text('El auténtico y más fresco sabor del mar en Quito.', 15, totalBoxY + 13);
  doc.setTextColor(148, 163, 184);
  doc.text('* Comprobante de consumo interno sin validez tributaria.', 15, totalBoxY + 22);

  return doc;
}

export function createPDFDoc(order: Order, sriData: SRIInvoiceData, sriAuth?: { authDate: string; authNumber: string }) {
  if (order.documentType === "nota") {
    return createNotaVentaPDF(order, sriData);
  }

  const doc = new jsPDF() as any;
  const isFactura = true;
  
  const estab = sriData.estab || "001";
  const ptoEmi = sriData.ptoEmi || "001";
  const secuencial = sriData.secuencial || "000000001";
  const displayNum = `${estab}-${ptoEmi}-${secuencial}`;

  if (isFactura) {
    const activeCodDoc = sriData.facturaModificada ? "04" : "01";
    const accessKey = generateAccessKey({ ...sriData, fechaEmision: sriData.fechaEmision }, activeCodDoc);
    const authNumber = sriAuth?.authNumber || accessKey;
    const esConsumidorFinal = sriData.cliente.identificacion === "9999999999999";
    
    // Convert public PNG to base64 or just try to add by URL (jsPDF can load images from URL in same origin if formatted correctly, but usually needs a base64 or Image element)
    // We'll create an Image object and add it. Since jsPDF addImage supports HTMLImageElement
    try {
      const img = new Image();
      img.src = '/Salymar.png';
      // For synchronous generation without waiting for load, we can just pass the path and hope jsPDF handles it, or skip if it fails.
      // Often, a pre-loaded base64 is better. But let's try with the path.
      doc.addImage(img, 'PNG', 10, 5, 45, 45);
    } catch (e) {
      console.warn("Could not add logo", e);
    }

    doc.setDrawColor(0);
    doc.setLineWidth(0.3); 
    doc.setTextColor(0);
    doc.roundedRect(10, 52, 90, 52, 3, 3, 'S');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(sriData.razonSocialEmisor, 15, 60);
    doc.setFontSize(11);
    doc.text(sriData.nombreComercialEmisor, 15, 66);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Dirección Matriz:', 15, 72);
    doc.text(sriData.dirMatriz, 15, 76, { maxWidth: 80 });
    
    doc.text('Dirección Sucursal:', 15, 82);
    doc.text(sriData.dirMatriz, 15, 86, { maxWidth: 80 });

    doc.setFont('helvetica', 'bold');
    doc.text('OBLIGADO A LLEVAR CONTABILIDAD: NO', 15, 101);

    doc.setLineWidth(0.3);
    doc.roundedRect(105, 10, 95, 94, 3, 3, 'S');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`R.U.C.: ${sriData.rucEmisor}`, 110, 20);
    
    doc.setFontSize(14);
    let docTitle = sriData.facturaModificada ? 'NOTA DE CRÉDITO' : 'FACTURA';
    doc.text(docTitle, 110, 30);
    
    doc.setFontSize(11);
    doc.text(`No. ${displayNum}`, 110, 40);
    
    doc.setFontSize(8);
    doc.text('NÚMERO DE AUTORIZACIÓN:', 110, 50);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(authNumber, 110, 55); 
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('FECHA Y HORA DE', 110, 65);
    doc.text('AUTORIZACIÓN:', 110, 69);
    doc.setFont('helvetica', 'normal');
    
    let authValue = sriAuth?.authDate || new Date(order.date).toLocaleString('es-ES');
    if (authValue && (authValue.includes('T') || authValue.includes('-'))) {
      try {
        const d = new Date(authValue);
        if (!isNaN(d.getTime())) {
          const day = d.getDate().toString().padStart(2, '0');
          const month = (d.getMonth() + 1).toString().padStart(2, '0');
          const year = d.getFullYear();
          const hours = d.getHours().toString().padStart(2, '0');
          const minutes = d.getMinutes().toString().padStart(2, '0');
          const seconds = d.getSeconds().toString().padStart(2, '0');
          authValue = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
        }
      } catch (e) {
        console.error("Error formatting authValue:", e);
      }
    }
    doc.text(authValue, 150, 69);
    
    doc.setFont('helvetica', 'bold');
    doc.text('AMBIENTE:', 110, 76);
    doc.setFont('helvetica', 'normal');
    const envLabel = "PRODUCCIÓN";
    doc.text(envLabel, 150, 76); 
    
    doc.setFont('helvetica', 'bold');
    doc.text('EMISIÓN:', 110, 83);
    doc.setFont('helvetica', 'normal');
    doc.text('NORMAL', 150, 83);

    if (typeof document !== 'undefined') {
      try {
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, authNumber, {
          format: "CODE128",
          displayValue: false,
          height: 40,
          width: 1,
          margin: 0
        });
        const barcodeData = canvas.toDataURL("image/png");
        doc.addImage(barcodeData, 'PNG', 110, 86, 85, 8);
        doc.setFontSize(6);
        doc.text(authNumber, 152.5, 97, { align: 'center' });
      } catch (e) {
        console.error("Error generating barcode for PDF:", e);
      }
    }

    doc.setLineWidth(0.3);
    doc.roundedRect(10, 108, 190, 30, 1, 1, 'S');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    doc.text(`Razón Social / Nombres y Apellidos:`, 12, 114);
    doc.setFont('helvetica', 'bold');
    doc.text(esConsumidorFinal ? "CONSUMIDOR FINAL" : sriData.cliente.razonSocial.toUpperCase(), 65, 114);
    doc.setFont('helvetica', 'normal');
    doc.text(`Placa / Matrícula:`, 130, 114);
    
    doc.text(`Identificación:`, 12, 120);
    doc.setFont('helvetica', 'bold');
    doc.text(sriData.cliente.identificacion, 65, 120);
    doc.setFont('helvetica', 'normal');
    doc.text(`Guía:`, 130, 120);
    
    doc.text(`Fecha:`, 12, 126);
    doc.setFont('helvetica', 'bold');
    doc.text(sriData.fechaEmision, 65, 126);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Dirección:`, 12, 132);
    const displayAddress = esConsumidorFinal 
      ? "CONSUMIDOR FINAL" 
      : (sriData.cliente.direccion || 'N/A');
    doc.text(displayAddress.toUpperCase(), 65, 132, { maxWidth: 130 });

    const tableRows = sriData.items.map((item) => {
      const pUnitSinIva = item.precioUnitario;
      const descSinIva = item.descuento || 0;
      const totalSinIva = (item.cantidad * pUnitSinIva) - descSinIva;
      
      return [
        '0101', '0101',
        item.cantidad.toFixed(2),
        item.descripcion.toUpperCase(),
        '', 
        `$${pUnitSinIva.toFixed(2)}`,
        '0.00', '0.00', 
        `$${descSinIva.toFixed(2)}`,
        `$${totalSinIva.toFixed(2)}`
      ];
    });

    let autoTableStartY = 142;
    if (sriData.facturaModificada) {
      doc.setLineWidth(0.3);
      doc.roundedRect(10, 140, 190, 15, 1, 1, 'S');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      
      doc.text(`Comprobante que modifica:`, 12, 144);
      doc.setFont('helvetica', 'bold');
      doc.text(`FACTURA ${sriData.facturaModificada.numero}`, 65, 144);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha Emisión (comprobante modificado):`, 12, 149);
      doc.setFont('helvetica', 'bold');
      doc.text(sriData.facturaModificada.fecha, 75, 149);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`Razón de Modificación:`, 130, 144);
      doc.setFont('helvetica', 'bold');
      doc.text(`ANULACION DE FACTURA`, 130, 149);
      
      autoTableStartY = 160;
    }

    autoTable(doc, {
      startY: autoTableStartY,
      margin: { left: 10, right: 10 },
      head: [['Cod. Principal', 'Cod. Auxiliar', 'Cantidad', 'Descripción', 'Detalle Adicional', 'Precio Unitario', 'Subsidio', 'Precio sin Subsidio', 'Descuento', 'Precio Total']],
      body: tableRows,
      theme: 'grid',
      styles: { 
        fontSize: 7, 
        cellPadding: 2, 
        lineWidth: 0.3, 
        lineColor: [0, 0, 0],
        valign: 'middle',
        textColor: [0, 0, 0]
      },
      headStyles: { 
        fillColor: [255, 255, 255], 
        textColor: [0, 0, 0], 
        lineWidth: 0.3, 
        fontStyle: 'bold',
        halign: 'center'
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 5;
    
    doc.setLineWidth(0.3);
    doc.rect(10, finalY, 110, 6, 'S'); 
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Información Adicional', 65, finalY + 4.5, { align: 'center' });
    
    doc.rect(10, finalY + 6, 110, 12, 'S'); 
    doc.text('email:', 12, finalY + 11.5);
    if (!esConsumidorFinal) {
      doc.text(sriData.cliente.email || '', 65, finalY + 11.5, { align: 'center' });
    }
    
    const tablePaymentY = finalY + 22;
    doc.setFont('helvetica', 'bold');
    doc.rect(10, tablePaymentY, 80, 6, 'S');
    doc.text('Forma de pago', 50, tablePaymentY + 4.5, { align: 'center' });
    doc.rect(90, tablePaymentY, 30, 6, 'S');
    doc.text('Valor', 105, tablePaymentY + 4.5, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.rect(10, tablePaymentY + 6, 80, 8, 'S');
    const methodDesc = PAYMENT_MAP[sriData.formaPago] || PAYMENT_MAP["01"];
    doc.text(methodDesc, 12, tablePaymentY + 11.5, { maxWidth: 76 });

    // Calculate total
    const totalDescuento = sriData.items.reduce((acc, item) => acc + (item.descuento || 0), 0);
    const subtotal = sriData.items.reduce((acc, item) => acc + (item.cantidad * item.precioUnitario), 0) - totalDescuento;
    const iva = subtotal * 0.15;
    const total = subtotal + iva;

    doc.rect(90, tablePaymentY + 6, 30, 8, 'S');
    doc.text(total.toFixed(2), 118, tablePaymentY + 11.5, { align: 'right' });

    const totalX = 125;
    const valueX = 195;
    let currentY = finalY;

    const drawTotalRow = (label: string, value: string, isBold = false) => {
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.rect(totalX, currentY, 75, 5, 'S');
      doc.text(label, totalX + 2, currentY + 3.5);
      doc.text(value, valueX - 2, currentY + 3.5, { align: 'right' });
      currentY += 5;
    };

    drawTotalRow('SUBTOTAL 15%', `${subtotal.toFixed(2)}`); 
      drawTotalRow('SUBTOTAL NO OBJETO DE IVA', '0.00');
      drawTotalRow('SUBTOTAL EXENTO DE IVA', '0.00');
      drawTotalRow('SUBTOTAL SIN IMPUESTOS', `${subtotal.toFixed(2)}`);
      drawTotalRow('TOTAL DESCUENTO', `${totalDescuento.toFixed(2)}`);
      drawTotalRow('ICE', '0.00');
      drawTotalRow('IRBPNR', '0.00');
      drawTotalRow('IVA 15%', `${iva.toFixed(2)}`); 
      drawTotalRow('PROPINA', '0.00');
      drawTotalRow('VALOR TOTAL', `${total.toFixed(2)}`, true);

    currentY += 2;
    doc.rect(totalX, currentY, 75, 10, 'S');
    doc.text('VALOR TOTAL SIN SUBSIDIO', totalX + 2, currentY + 4);
    doc.text('0.00', valueX - 2, currentY + 4, { align: 'right' });
    doc.text('AHORRO POR SUBSIDIO:', totalX + 2, currentY + 8);
    doc.text('0.00', valueX - 2, currentY + 8, { align: 'right' });
  }

  return doc;
}

export function generatePdfBase64(order: Order, sriData: SRIInvoiceData, sriAuth?: { authDate: string; authNumber: string }): string {
  try {
    const doc = createPDFDoc(order, sriData, sriAuth);
    const dataUri = doc.output('datauristring');
    return dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;
  } catch (err) {
    console.error("Error generating PDF base64:", err);
    return "";
  }
}

