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

export function createPDFDoc(order: Order, sriData: SRIInvoiceData, sriAuth?: { authDate: string; authNumber: string }) {
  const doc = new jsPDF() as any;
  const isFactura = true;
  
  const estab = sriData.estab || "001";
  const ptoEmi = sriData.ptoEmi || "001";
  const secuencial = sriData.secuencial || "000000001";
  const displayNum = `${estab}-${ptoEmi}-${secuencial}`;

  if (isFactura) {
    const accessKey = generateAccessKey({ ...sriData, fechaEmision: sriData.fechaEmision }, "01");
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
    doc.text('FACTURA', 110, 30);
    
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
    
    const authValue = sriAuth?.authDate || new Date().toLocaleString('es-ES');
    doc.text(authValue, 150, 69);
    
    doc.setFont('helvetica', 'bold');
    doc.text('AMBIENTE:', 110, 76);
    doc.setFont('helvetica', 'normal');
    doc.text('PRUEBAS', 150, 76); 
    
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

    autoTable(doc, {
      startY: 142,
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
