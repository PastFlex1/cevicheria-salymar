import React, { useState, useMemo, useEffect, useRef } from "react";
import { Order, OrderItem, MenuItem, OrderStatus, Customer } from "../types";
import { Search, Plus, Trash2, Printer, Download, Receipt, X, ArrowLeft, DollarSign, CreditCard, Wallet, User, CheckCircle, SearchCode, AlertCircle, XCircle, FileCode } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import * as ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { validarDocumento, detectarTipoDocumento, obtenerNombreTipoDocumento, limpiarDocumento } from "../lib/validators";
import { generateInvoiceXML, generateAccessKey, SRIInvoiceData, procesarYEnviarSRI } from "../lib/sri";
import Pagination from "./Pagination";
import { createPDFDoc } from "../lib/pdfGenerator";

export interface BillingDashboardProps {
  salesNotes: Order[];
  updateOrder: (order: Order) => void;
  addInvoice: (invoice: Order) => void;
  menuItems: MenuItem[];
  initialOrderToBill?: Order | null;
  onClearInitialOrder?: () => void;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  onPrint?: (order: Order) => void;
}

export default function BillingDashboard({
  salesNotes,
  updateOrder,
  addInvoice,
  menuItems,
  initialOrderToBill,
  onClearInitialOrder,
  customers,
  setCustomers,
  onPrint,
}: BillingDashboardProps) {
  const [view, setView] = useState<"list" | "create">(initialOrderToBill ? "create" : "list");
  
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "info" | "success" | "error" | "warning";
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info"
  });

  const showAlert = (message: string, title = "Notificación", type: "info" | "success" | "error" | "warning" = "info") => {
    setAlertModal({
      isOpen: true,
      title,
      message,
      type
    });
  };
  
  // Form State
  const [items, setItems] = useState<OrderItem[]>(initialOrderToBill ? initialOrderToBill.items : []);
  const [searchProduct, setSearchProduct] = useState("");
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");

  const [clientForm, setClientForm] = useState({
    clientId: initialOrderToBill?.clientId || "",
    documentId: initialOrderToBill?.ruc || "",
    businessName: initialOrderToBill?.customerName || initialOrderToBill?.businessName || "",
    phone: initialOrderToBill?.clientPhone || "",
    email: initialOrderToBill?.clientEmail || "",
    address: initialOrderToBill?.clientAddress || "",
  });

  const validacionDoc = validarDocumento(detectarTipoDocumento(clientForm.documentId), clientForm.documentId);

  
  const [documentType, setDocumentType] = useState<"factura" | "nota">("factura");
  const [discount, setDiscount] = useState<number>(initialOrderToBill?.discount || 0);
  const [paymentMethod, setPaymentMethod] = useState<Order["paymentMethod"]>(initialOrderToBill?.paymentMethod || "Efectivo");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [mixedPayments, setMixedPayments] = useState<{method: string, amount: number}[]>([]);
  const [transactionNumber, setTransactionNumber] = useState<string>(initialOrderToBill?.transactionNumber || "");
  
  // Filtering for List View
  const [searchInvoice, setSearchInvoice] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Calculate Totals
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  }, [items]);
  
  const totalAfterDiscount = Math.max(0, subtotal - discount);
  const tax = totalAfterDiscount * 0.15; // Assuming 15% IVA for example, or we can make it configurable
  const total = totalAfterDiscount + tax;
  
  const cashReceivedNum = parseFloat(cashReceived) || 0;
  const change = paymentMethod === "Efectivo" ? Math.max(0, cashReceivedNum - total) : 0;
  
  const mixedTotal = mixedPayments.reduce((sum, p) => sum + p.amount, 0);

  const formatCurrency = (value: number) =>
    `USD/ ${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;

  // Actions
  const handleAddItem = (menuItem: MenuItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.menuItem.id === menuItem.id);
      if (existing) {
        return prev.map((i) => i.menuItem.id === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { menuItem, quantity: 1 }];
    });
    setSearchProduct("");
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.menuItem.id !== id));
  };
  
  const handleUpdateQuantity = (id: string, qty: number) => {
    if (qty <= 0) return;
    setItems((prev) => prev.map((i) => i.menuItem.id === id ? { ...i, quantity: qty } : i));
  };

  const handleSaveInvoice = async (printAfter: boolean = false) => {
    if (items.length === 0) {
      showAlert("No hay productos para facturar.", "Sin Productos", "warning");
      return;
    }
    
    if (paymentMethod === "Mixto" && Math.abs(mixedTotal - total) > 0.01) {
      showAlert("En pago mixto, la suma de los pagos debe ser igual al total.", "Error de Monto", "error");
      return;
    }

    if (!validacionDoc.valido) {
      showAlert("El documento del cliente no es válido: " + validacionDoc.mensaje, "Documento Inválido", "error");
      return;
    }

    // Si es factura, procesar con el SRI localmente a través de la API
    let sriAuthResult = null;
    if (documentType === "factura") {
      try {
        showAlert("Conectando con el SRI localmente (Firma, Recepción, Autorización)...", "Procesando", "info");
        
        // Armar el objeto para SRI
        const sriData: SRIInvoiceData = {
          rucEmisor: "1714809025001",
          razonSocialEmisor: "ACHI LOPEZ JOSUE ANDRES",
          nombreComercialEmisor: "CEVICHERIA SALYMAR",
          dirMatriz: "PICHINCHA / QUITO / CHILIBULO / LA MAGDALENA ALTA S10 PURUHA OE6-203 Y OE6A HUALCOPO",
          estab: "001", // Por defecto o extraer
          ptoEmi: "001", 
          secuencial: "000000001", // Aquí idealmente deberíamos calcular el secuencial antes
          fechaEmision: new Date().toLocaleDateString("es-EC", { day: "2-digit", month: "2-digit", year: "numeric" }),
          cliente: {
            razonSocial: clientForm.businessName || "CONSUMIDOR FINAL",
            identificacion: clientForm.documentId || "9999999999999",
            direccion: clientForm.address || undefined,
            email: clientForm.email || undefined
          },
          items: items.map(item => ({
            codigo: item.menuItem.id,
            descripcion: item.menuItem.name,
            cantidad: item.quantity,
            precioUnitario: item.menuItem.price,
            descuento: 0
          })),
          formaPago: paymentMethod === "Efectivo" ? "01" : "20",
        };

        const xml = generateInvoiceXML(sriData);
        
        const result = await procesarYEnviarSRI(xml);
        if (!result.success) {
          showAlert("Error con el SRI: " + result.error, "Fallo SRI", "error");
          return; // Detenemos la facturación si falla el SRI
        }
        
        if (result.sriAuth?.estado !== "AUTORIZADO" && result.sriAuth?.estado !== "RECIBIDA") {
           showAlert("El SRI respondió pero el estado es: " + result.sriAuth?.estado, "Advertencia SRI", "warning");
        }
        
        sriAuthResult = result.sriAuth;

      } catch (err: any) {
        showAlert("Excepción al contactar API local: " + err.message, "Error crítico", "error");
        return;
      }
    }

    // Generate Invoice Number
    let newId = "";
    if (documentType === "factura") {
      const existingInvoices = salesNotes.filter(n => n.documentType === "factura" && n.id.startsWith("FAC-"));
      let nextNum = 1;
      if (existingInvoices.length > 0) {
        const maxId = Math.max(...existingInvoices.map(n => {
          const num = parseInt(n.id.replace("FAC-", ""), 10);
          return isNaN(num) ? 0 : num;
        }));
        nextNum = maxId + 1;
      }
      newId = `FAC-${nextNum.toString().padStart(6, "0")}`;
    } else {
      const currentMaxId = salesNotes.reduce((max, note) => {
        const noteId = note.id;
        const numId = parseInt(noteId.replace(/\D/g, ""), 10);
        return !isNaN(numId) && numId > max ? numId : max;
      }, 0);
      const nextIdNum = currentMaxId + 1;
      newId = `#${nextIdNum.toString().padStart(6, "0")}`;
    }

    const newInvoice: Order = {
      id: newId,
      documentType,
      status: paymentMethod === "Crédito" ? "por_cobrar" : "paid",
      items: [...items],
      subtotal,
      discount,
      tax,
      total,
      date: new Date().toISOString(),
      clientId: clientForm.clientId,
      customerName: clientForm.businessName || "Consumidor Final",
      businessName: clientForm.businessName || "Consumidor Final",
      ruc: clientForm.documentId || "9999999999999",
      clientPhone: clientForm.phone,
      clientEmail: clientForm.email,
      clientAddress: clientForm.address,
      paymentMethod,
      sriAuth: sriAuthResult, // Guardamos la autorización en la orden para usarla en el RIDE PDF
      payments: paymentMethod === "Mixto" ? mixedPayments : [{ method: paymentMethod, amount: total }],
      transactionNumber: paymentMethod === "Transferencia" ? transactionNumber : undefined,
      cashReceived: paymentMethod === "Efectivo" ? cashReceivedNum : undefined,
      changeReturned: change,
      relatedOrderId: initialOrderToBill?.id,
      orderType: initialOrderToBill?.orderType || "mesa",
      tableNumber: initialOrderToBill?.tableNumber,
    };

    
    let finalClientId = newInvoice.clientId;
    if (!finalClientId && newInvoice.ruc && newInvoice.ruc !== "9999999999999") {
        // Create new customer
        const newCustomer = {
            id: "CUST-" + Date.now(),
            name: newInvoice.businessName || "Cliente",
            documentType: obtenerNombreTipoDocumento(detectarTipoDocumento(newInvoice.ruc)),
            documentNumber: limpiarDocumento(newInvoice.ruc),
            phone: newInvoice.clientPhone || "",
            email: newInvoice.clientEmail || "",
            address: newInvoice.clientAddress || "",
            status: "activo" as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            totalPurchases: 0,
            numberOfPurchases: 0
        };
        setCustomers(prev => [newCustomer, ...prev]);
        finalClientId = newCustomer.id;
        newInvoice.clientId = finalClientId;
    }

    addInvoice(newInvoice);
    setTransactionNumber("");

    if (initialOrderToBill) {
      updateOrder({
        ...initialOrderToBill,
        status: "cobrado",
        relatedOrderId: newId,
      });
    }

    showAlert(documentType === "factura" ? "Factura generada con éxito." : "Nota de venta generada con éxito.", "Venta Completada", "success");
    
    if (printAfter && onPrint) {
      onPrint(newInvoice);
    }

    setView("list");
    setItems([]);
    setClientForm({ clientId: "", documentId: "", businessName: "", phone: "", email: "", address: "" });
    setDiscount(0);
    setCashReceived("");
    setMixedPayments([]);
    if (onClearInitialOrder) onClearInitialOrder();
  };

  const [invoiceToAnular, setInvoiceToAnular] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const handleAnular = () => {
    if (invoiceToAnular) {
      const inv = salesNotes.find(s => s.id === invoiceToAnular);
      if (inv) {
        updateOrder({ ...inv, status: "anulada", cancelReason });
      }
      setInvoiceToAnular(null);
      setCancelReason("");
    }
  };

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return salesNotes.filter(o => o.documentType === "factura").filter((inv) => {
      let match = true;
      if (searchInvoice) {
        const q = searchInvoice.toLowerCase();
        match = inv.id.toLowerCase().includes(q) || 
                (inv.customerName || "").toLowerCase().includes(q) ||
                (inv.ruc || "").toLowerCase().includes(q);
      }
      if (match && filterDateFrom) {
        const [year, month, day] = filterDateFrom.split("-");
        const fromDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 0, 0, 0, 0);
        match = new Date(inv.date) >= fromDate;
      }
      if (match && filterDateTo) {
        const [year, month, day] = filterDateTo.split("-");
        const toDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 23, 59, 59, 999);
        match = new Date(inv.date) <= toDate;
      }
      return match;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [salesNotes, searchInvoice, filterDateFrom, filterDateTo]);

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Download PDF
  const downloadPdf = (inv: Order) => {
    showAlert(`Generando PDF de ${inv.id}...`, "Generando RIDE", "info");
    const sriData: SRIInvoiceData = {
      rucEmisor: "1714809025001",
      razonSocialEmisor: "ACHI LOPEZ JOSUE ANDRES",
      nombreComercialEmisor: "CEVICHERIA SALYMAR",
      dirMatriz: "PICHINCHA / QUITO / CHILIBULO / LA MAGDALENA ALTA S10 PURUHA OE6-203 Y OE6A HUALCOPO",
      estab: inv.id.includes("-") ? inv.id.split("-")[0] : "001",
      ptoEmi: inv.id.includes("-") ? inv.id.split("-")[1] : "001",
      secuencial: inv.id.includes("-") ? inv.id.split("-")[2] : inv.id.replace("#", "").padStart(9, "0"),
      fechaEmision: new Date(inv.date).toLocaleDateString("es-EC", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }),
      cliente: {
        razonSocial: inv.businessName || inv.customerName || "CONSUMIDOR FINAL",
        identificacion: inv.ruc || inv.clientId || "9999999999999",
        direccion: inv.clientAddress || undefined,
        email: inv.clientEmail || undefined
      },
      items: inv.items.map(item => ({
        codigo: item.menuItem.id,
        descripcion: item.menuItem.name,
        cantidad: item.quantity,
        precioUnitario: item.menuItem.price,
        descuento: 0
      })),
      formaPago: inv.paymentMethod === "Efectivo" ? "01" : "20",
    };
    try {
      const doc = createPDFDoc(inv, sriData, inv.sriAuth);
      doc.save(`Factura_${inv.id}.pdf`);
      showAlert(`RIDE descargado exitosamente.`, "Éxito", "success");
    } catch (e) {
      console.error(e);
      showAlert(`Error al generar el PDF.`, "Error", "error");
    }
  };

  const downloadXML = (inv: Order) => {
    try {
      if (inv.sriAuth?.autorizacionXML) {
        const blob = new Blob([inv.sriAuth.autorizacionXML], { type: "application/xml;charset=utf-8" });
        saveAs(blob, `autorizacion_${inv.id}.xml`);
        showAlert(`XML original de autorización descargado`, "Éxito", "success");
        return;
      }

      const sriData: SRIInvoiceData = {
        rucEmisor: "1714809025001",
        razonSocialEmisor: "ACHI LOPEZ JOSUE ANDRES",
        nombreComercialEmisor: "CEVICHERIA SALYMAR",
        dirMatriz: "PICHINCHA / QUITO / CHILIBULO / LA MAGDALENA ALTA S10 PURUHA OE6-203 Y OE6A HUALCOPO",
        estab: inv.id.includes("-") ? inv.id.split("-")[0] : "001",
        ptoEmi: inv.id.includes("-") ? inv.id.split("-")[1] : "001",
        secuencial: inv.id.includes("-") ? inv.id.split("-")[2] : inv.id.replace("#", "").padStart(9, "0"),
        fechaEmision: new Date(inv.date).toLocaleDateString("es-EC", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        }),
        cliente: {
          razonSocial: inv.businessName || inv.customerName || "CONSUMIDOR FINAL",
          identificacion: inv.ruc || inv.clientId || "9999999999999",
          direccion: inv.clientAddress || undefined,
          email: inv.clientEmail || undefined
        },
        items: inv.items.map(item => ({
          codigo: item.menuItem.id,
          descripcion: item.menuItem.name,
          cantidad: item.quantity,
          precioUnitario: item.menuItem.price,
          descuento: 0
        })),
        formaPago: inv.paymentMethod === "Efectivo" ? "01" : "20",
      };
      
      const xml = generateInvoiceXML(sriData);
      const claveAcceso = generateAccessKey({ ...sriData, fechaEmision: sriData.fechaEmision }, "01");
      const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
      saveAs(blob, `factura_${claveAcceso}.xml`);
      showAlert(`XML generado con clave de acceso: ${claveAcceso}`, "XML Descargado", "success");
    } catch (error) {
      console.error(error);
      showAlert("Error al generar el XML.", "Error", "error");
    }
  };

  const printInvoice = (inv: Order) => {
    if (onPrint) {
      onPrint(inv);
    } else {
      showAlert(`Imprimiendo ${inv.id}...`, "Impresión Iniciada", "info");
    }
  };

  return (
    <div className="flex-1 pb-12 flex flex-col h-full bg-slate-50/50">
      <div className="flex justify-between items-center mb-6 px-6 pt-6 shrink-0">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Receipt className="w-6 h-6 text-blue-600" />
          Facturación y Cobros
        </h2>
        {view === "list" ? (
          <button
            onClick={() => {
              if (onClearInitialOrder) onClearInitialOrder();
              setItems([]);
              setClientForm({ clientId: "", documentId: "", businessName: "", phone: "", email: "", address: "" });
              setTransactionNumber("");
              setView("create");
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl text-sm flex items-center gap-2 shadow-sm shadow-blue-200 transition-colors"
          >
            <Plus className="w-4 h-4" /> Nueva Factura
          </button>
        ) : (
          <button
            onClick={() => {
              if (onClearInitialOrder) onClearInitialOrder();
              setView("list");
            }}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold py-2 px-4 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al Listado
          </button>
        )}
      </div>

      {view === "list" && (
        <div className="flex-1 flex flex-col px-6 overflow-hidden">
          <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm mb-6 shrink-0 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por #, Cliente, RUC..."
                value={searchInvoice}
                onChange={(e) => {
                  setSearchInvoice(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => {
                  setFilterDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => {
                  setFilterDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="p-4 font-bold">Número</th>
                  <th className="p-4 font-bold">Fecha</th>
                  <th className="p-4 font-bold">Cliente</th>
                  <th className="p-4 font-bold">Total</th>
                  <th className="p-4 font-bold">Estado</th>
                  <th className="p-4 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {paginatedInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                      No se encontraron facturas.
                    </td>
                  </tr>
                ) : (
                  paginatedInvoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-800">{inv.id}</td>
                      <td className="p-4 text-slate-600 whitespace-nowrap">
                        {new Date(inv.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="p-4 text-slate-800 font-medium">
                        {inv.customerName || "Consumidor Final"}
                        <div className="text-xs text-slate-400 font-normal">{inv.ruc || "-"}</div>
                      </td>
                      <td className="p-4 font-bold text-blue-600">{formatCurrency(inv.total)}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          inv.status === "anulada" ? "bg-red-100 text-red-700" :
                          inv.status === "por_cobrar" ? "bg-orange-100 text-orange-700" :
                          "bg-emerald-100 text-emerald-700"
                        }`}>
                          {inv.status === "paid" || inv.status === "cobrado" ? "PAGADA" : inv.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        <button onClick={() => printInvoice(inv)} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-600 rounded-md transition-colors" title="Imprimir">
                          <Printer className="w-4 h-4" />
                        </button>
                        <button onClick={() => downloadXML(inv)} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-600 rounded-md transition-colors" title="Descargar XML (SRI)">
                          <FileCode className="w-4 h-4" />
                        </button>
                        <button onClick={() => downloadPdf(inv)} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-600 rounded-md transition-colors" title="Descargar PDF">
                          <Download className="w-4 h-4" />
                        </button>
                        {inv.status !== "anulada" && (
                          <button onClick={() => setInvoiceToAnular(inv.id)} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-600 rounded-md transition-colors" title="Anular">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      )}

      {view === "create" && (
        <div className="flex-1 flex flex-col xl:flex-row gap-6 px-6 overflow-hidden">
          {/* Left Panel: Invoice Details & Products */}
          <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2">
            
            {/* Client Info */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm shrink-0 relative">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-500" />
                  Datos del Cliente
                </h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            const cf = customers.find(c => c.documentNumber === "9999999999999");
                            if (cf) {
                                setClientForm({
                                    clientId: cf.id,
                                    documentId: cf.documentNumber,
                                    businessName: cf.name,
                                    phone: cf.phone || "",
                                    email: cf.email || "",
                                    address: cf.address || ""
                                });
                            }
                        }}
                        className="text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        Consumidor Final
                    </button>
                    <button
                        onClick={() => setShowCustomerSearch(!showCustomerSearch)}
                        className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                    >
                        <SearchCode className="w-4 h-4" />
                        Buscar Cliente
                    </button>
                </div>
              </div>
              
              {showCustomerSearch && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-100 relative">
                      <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                              type="text"
                              autoFocus
                              placeholder="Buscar por cédula, RUC, nombre..."
                              value={customerSearchTerm}
                              onChange={(e) => setCustomerSearchTerm(e.target.value)}
                              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                      </div>
                      {customerSearchTerm && (
                          <div className="absolute z-20 left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-100 max-h-60 overflow-y-auto">
                              {customers
                                .filter(c => c.status === "activo" && c.documentType !== "Consumidor Final" && (c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) || c.documentNumber.includes(customerSearchTerm)))
                                .map(c => (
                                  <button
                                      key={c.id}
                                      onClick={() => {
                                          setClientForm({
                                              clientId: c.id,
                                              documentId: c.documentNumber,
                                              businessName: c.name,
                                              phone: c.phone || "",
                                              email: c.email || "",
                                              address: c.address || ""
                                          });
                                          setShowCustomerSearch(false);
                                          setCustomerSearchTerm("");
                                      }}
                                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 flex justify-between items-center"
                                  >
                                      <div>
                                          <p className="font-bold text-sm text-slate-800">{c.name}</p>
                                          <p className="text-xs text-slate-500">{c.documentNumber}</p>
                                      </div>
                                  </button>
                              ))}
                              {customers.filter(c => c.status === "activo" && c.documentType !== "Consumidor Final" && (c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) || c.documentNumber.includes(customerSearchTerm))).length === 0 && (
                                  <div className="p-4 text-center text-sm text-slate-500">
                                      No se encontraron clientes. 
                                      <button 
                                          onClick={() => {
                                              setClientForm(prev => ({...prev, businessName: customerSearchTerm, documentId: "", clientId: ""}));
                                              setShowCustomerSearch(false);
                                          }}
                                          className="block w-full mt-2 text-blue-600 font-bold hover:underline"
                                      >
                                          Llenar formulario con este nombre
                                      </button>
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              )}

              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="billingDocType"
                    checked={documentType === "nota"}
                    onChange={() => setDocumentType("nota")}
                    className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-slate-300 accent-blue-600"
                  />
                  <span className="text-sm font-bold text-slate-700">Nota de Venta</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="billingDocType"
                    checked={documentType === "factura"}
                    onChange={() => setDocumentType("factura")}
                    className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-slate-300 accent-blue-600"
                  />
                  <span className="text-sm font-bold text-slate-700">Factura Electrónica</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cédula/RUC</label>
                  <input
                    type="text"
                    value={clientForm.documentId}
                    onChange={(e) => {
                      const val = e.target.value;
                      const existingCustomer = customers.find(c => limpiarDocumento(c.documentNumber) === limpiarDocumento(val));
                      if (existingCustomer) {
                        setClientForm({
                          clientId: existingCustomer.id,
                          documentId: existingCustomer.documentNumber,
                          businessName: existingCustomer.name,
                          phone: existingCustomer.phone || "",
                          email: existingCustomer.email || "",
                          address: existingCustomer.address || ""
                        });
                      } else {
                        setClientForm({...clientForm, documentId: val, clientId: ""});
                      }
                    }}
                    onBlur={(e) => {
                      const val = e.target.value;
                      const limpio = limpiarDocumento(val);
                      const existingCustomer = customers.find(c => limpiarDocumento(c.documentNumber) === limpio);
                      if (existingCustomer) {
                        setClientForm({
                          clientId: existingCustomer.id,
                          documentId: existingCustomer.documentNumber,
                          businessName: existingCustomer.name,
                          phone: existingCustomer.phone || "",
                          email: existingCustomer.email || "",
                          address: existingCustomer.address || ""
                        });
                      } else if (limpio !== val) {
                        setClientForm({...clientForm, documentId: limpio});
                      }
                    }}
                    placeholder="Ej: 0912345678"
                    className={`w-full bg-slate-50 border rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none ${clientForm.documentId ? (validacionDoc.valido ? "border-green-400" : "border-red-400") : "border-slate-200"}`}
                  />
                  {clientForm.documentId && clientForm.documentId !== "9999999999999" && (
                      <p className={`text-xs mt-1 font-medium ${validacionDoc.valido ? "text-green-600" : "text-red-500"}`}>
                          {validacionDoc.mensaje}
                          {validacionDoc.datos?.provincia && ` • Provincia: ${validacionDoc.datos.provincia}`}
                          {validacionDoc.datos?.tipoRuc && ` • Tipo: ${validacionDoc.datos.tipoRuc.replace("_", " ")}`}
                      </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Razón Social / Nombre</label>
                  <input
                    type="text"
                    value={clientForm.businessName}
                    onChange={(e) => setClientForm({...clientForm, businessName: e.target.value, clientId: ""})}
                    placeholder="Ej: Juan Pérez"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({...clientForm, phone: e.target.value, clientId: ""})}
                    placeholder="Opcional"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Correo</label>
                  <input
                    type="email"
                    value={clientForm.email}
                    onChange={(e) => setClientForm({...clientForm, email: e.target.value, clientId: ""})}
                    placeholder="Opcional"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Dirección</label>
                  <input
                    type="text"
                    value={clientForm.address}
                    onChange={(e) => setClientForm({...clientForm, address: e.target.value, clientId: ""})}
                    placeholder="Opcional"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Products Selection */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-500" />
                  Productos
                </h3>
                <div className="relative w-64">
                  <Search className="w-4 h-4 absolute left-3 top-2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar producto para agregar..."
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  {searchProduct && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {menuItems.filter(m => m.name.toLowerCase().includes(searchProduct.toLowerCase())).map(mi => (
                        <button
                          key={mi.id}
                          onClick={() => handleAddItem(mi)}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex justify-between items-center border-b border-slate-100 last:border-0"
                        >
                          <span className="font-medium text-slate-700">{mi.name}</span>
                          <span className="font-bold text-blue-600">{formatCurrency(mi.price)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto border border-slate-100 rounded-xl bg-slate-50">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 sticky top-0">
                    <tr className="text-xs uppercase text-slate-500 tracking-wider">
                      <th className="p-3 font-bold">Producto</th>
                      <th className="p-3 font-bold w-24">Precio</th>
                      <th className="p-3 font-bold w-24">Cant.</th>
                      <th className="p-3 font-bold w-24 text-right">Subtotal</th>
                      <th className="p-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-400">Sin productos agregados</td>
                      </tr>
                    ) : (
                      items.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-100 last:border-0 bg-white">
                          <td className="p-3 font-medium text-slate-800">{item.menuItem.name}</td>
                          <td className="p-3 text-slate-600">{formatCurrency(item.menuItem.price)}</td>
                          <td className="p-3">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateQuantity(item.menuItem.id, parseInt(e.target.value) || 1)}
                              className="w-16 border border-slate-200 rounded px-2 py-1 text-center outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className="p-3 font-bold text-slate-800 text-right">
                            {formatCurrency(item.menuItem.price * item.quantity)}
                          </td>
                          <td className="p-3 text-right">
                            <button onClick={() => handleRemoveItem(item.menuItem.id)} className="text-red-400 hover:text-red-600 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Panel: Summary & Payment */}
          <div className="w-full xl:w-96 flex flex-col gap-6 shrink-0 overflow-y-auto">
            {/* Totals Box */}
            <div className="bg-slate-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl"></div>
              
              <h3 className="font-bold text-slate-300 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                Resumen de Venta
              </h3>
              
              <div className="space-y-3 mb-6 font-medium text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Descuento</span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">-</span>
                    <input
                      type="number"
                      min="0"
                      value={discount}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      className="w-20 bg-slate-700/50 border border-slate-600 rounded px-2 py-1 text-right text-white outline-none focus:border-blue-400"
                    />
                  </div>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Base Imponible</span>
                  <span>{formatCurrency(totalAfterDiscount)}</span>
                </div>
                <div className="flex justify-between text-slate-300 border-b border-slate-700 pb-3">
                  <span>IVA (15%)</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between items-end pt-2">
                  <span className="text-slate-400 font-bold">TOTAL A PAGAR</span>
                  <span className="text-3xl font-black text-emerald-400 tracking-tight">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm shrink-0">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-blue-500" />
                Forma de Pago
              </h3>
              
              <div className="grid grid-cols-2 gap-2 mb-4">
                {["Efectivo", "Transferencia", "Tarjeta", "Crédito", "Mixto"].map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method as any)}
                    className={`py-2 px-3 rounded-xl text-sm font-bold border transition-colors ${paymentMethod === method ? "bg-blue-50 border-blue-600 text-blue-700 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                  >
                    {method}
                  </button>
                ))}
              </div>

              {paymentMethod === "Transferencia" && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Número de Comprobante</label>
                    <input
                      type="text"
                      value={transactionNumber}
                      onChange={(e) => setTransactionNumber(e.target.value)}
                      placeholder="Ingrese el número de transferencia"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {paymentMethod === "Efectivo" && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Efectivo Recibido</label>
                    <input
                      type="number"
                      min={total}
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder={total.toFixed(2)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-lg font-bold text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-slate-600">Cambio:</span>
                    <span className="font-black text-emerald-600 text-lg">{formatCurrency(change)}</span>
                  </div>
                </div>
              )}

              {paymentMethod === "Mixto" && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-sm">
                  <p className="text-xs text-slate-500 mb-2">Ingrese los montos para cada método:</p>
                  {["Efectivo", "Transferencia", "Tarjeta"].map((m) => {
                    const existing = mixedPayments.find(p => p.method === m);
                    return (
                      <div key={m} className="flex justify-between items-center gap-2">
                        <span className="font-medium text-slate-700 w-24">{m}</span>
                        <input
                          type="number"
                          min="0"
                          value={existing?.amount || ""}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setMixedPayments(prev => {
                              const filtered = prev.filter(p => p.method !== m);
                              if (val > 0) return [...filtered, { method: m, amount: val }];
                              return filtered;
                            });
                          }}
                          className="w-full max-w-[120px] bg-white border border-slate-200 rounded-md px-2 py-1 text-right outline-none focus:border-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                    );
                  })}
                  <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between font-bold">
                    <span className="text-slate-600">Suma total:</span>
                    <span className={Math.abs(mixedTotal - total) < 0.01 ? "text-emerald-600" : "text-red-500"}>
                      {formatCurrency(mixedTotal)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 mt-6">
                <button
                  onClick={() => handleSaveInvoice(true)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl text-lg shadow-sm shadow-slate-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Printer className="w-5 h-5" />
                  GENERAR E IMPRIMIR
                </button>
                <button
                  onClick={() => handleSaveInvoice(false)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl text-lg shadow-sm shadow-emerald-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  SOLO GENERAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Anular Modal */}
      <AnimatePresence>
        {invoiceToAnular && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6"
            >
              <h3 className="text-xl font-bold text-slate-800 mb-2">Anular Factura</h3>
              <p className="text-slate-500 text-sm mb-4">
                ¿Seguro que deseas anular la factura <strong>{invoiceToAnular}</strong>?
              </p>
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">Motivo</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setInvoiceToAnular(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-sm">Cancelar</button>
                <button onClick={handleAnular} disabled={!cancelReason} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm disabled:opacity-50">Confirmar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Custom Alert Modal */}
      <AnimatePresence>
        {alertModal.isOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6 overflow-hidden relative"
            >
              <div className="flex flex-col items-center text-center">
                {alertModal.type === "success" && (
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                )}
                {alertModal.type === "error" && (
                  <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-4">
                    <XCircle className="w-10 h-10" />
                  </div>
                )}
                {alertModal.type === "warning" && (
                  <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-4">
                    <AlertCircle className="w-10 h-10" />
                  </div>
                )}
                {alertModal.type === "info" && (
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-4">
                    <AlertCircle className="w-10 h-10" />
                  </div>
                )}

                <h3 className="text-xl font-bold text-slate-800 mb-2">{alertModal.title}</h3>
                <p className="text-slate-600 text-sm mb-6 whitespace-pre-wrap">{alertModal.message}</p>
                
                <button
                  type="button"
                  onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-sm transition-colors"
                >
                  Aceptar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
