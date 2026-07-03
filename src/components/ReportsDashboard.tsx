import React, { useState, useMemo, useRef, useEffect } from "react";
import * as ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { toPng } from 'html-to-image';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import {
  Download,
  Calendar,
  Filter,
  DollarSign,
  Receipt,
  AlertCircle,
  TrendingUp,
  Users,
  CreditCard,
  Search,
} from "lucide-react";
import { Order, Expense, Customer } from "../types";
import Pagination from "./Pagination";

interface ReportsDashboardProps {
  salesNotes: Order[];
  expenses: Expense[];
  customers?: Customer[];
}

export default function ReportsDashboard({
  salesNotes,
  expenses,
  customers = []
}: ReportsDashboardProps) {
  const paymentChartRef = useRef<HTMLDivElement>(null);
  const productsChartRef = useRef<HTMLDivElement>(null);
  const profitChartRef = useRef<HTMLDivElement>(null);

  const [reportStartDate, setReportStartDate] = useState<string>("");
  const [reportEndDate, setReportEndDate] = useState<string>("");
  const [reportCustomer, setReportCustomer] = useState<string>("");
  const [reportInvoiceNumber, setReportInvoiceNumber] = useState<string>("");
  const [reportStatus, setReportStatus] = useState<string>("Todos");
  const [reportPaymentMethod, setReportPaymentMethod] =
    useState<string>("Todos");
  const [reportDocType, setReportDocType] = useState<string>("Todos");

  const [activeReportTab, setActiveReportTab] = useState<
    "general" | "facturas" | "productos" | "clientes" | "egresos"
  >("general");

  const [salesPage, setSalesPage] = useState(1);
  const [productsPage, setProductsPage] = useState(1);
  const [customersPage, setCustomersPage] = useState(1);
  const [expensesPage, setExpensesPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setSalesPage(1);
    setProductsPage(1);
    setCustomersPage(1);
    setExpensesPage(1);
  }, [reportStartDate, reportEndDate, reportCustomer, reportInvoiceNumber, reportStatus, reportPaymentMethod, reportDocType, activeReportTab]);

  // Format Helpers
  const formatCurrency = (val: number) =>
    `USD/ ${new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val)}`;

  // Filters
  const filteredSales = useMemo(() => {
    let filtered = salesNotes;

    if (reportStartDate) {
      const startObj = new Date(reportStartDate);
      const [year, month, day] = reportStartDate.split("-");
      startObj.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
      startObj.setHours(0, 0, 0, 0);
      filtered = filtered.filter((o) => new Date(o.date) >= startObj);
    }
    if (reportEndDate) {
      const endObj = new Date(reportEndDate);
      const [year, month, day] = reportEndDate.split("-");
      endObj.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
      endObj.setHours(23, 59, 59, 999);
      filtered = filtered.filter((o) => new Date(o.date) <= endObj);
    }
    if (reportCustomer.trim()) {
      filtered = filtered.filter(
        (o) =>
          o.customerName
            ?.toLowerCase()
            .includes(reportCustomer.toLowerCase()) ||
          o.businessName?.toLowerCase().includes(reportCustomer.toLowerCase()),
      );
    }
    if (reportInvoiceNumber.trim()) {
      filtered = filtered.filter((o) =>
        o.id.toLowerCase().includes(reportInvoiceNumber.toLowerCase()),
      );
    }
    if (reportStatus !== "Todos") {
      filtered = filtered.filter((o) => o.status === reportStatus);
    }
    if (reportPaymentMethod !== "Todos") {
      filtered = filtered.filter(
        (o) => o.paymentMethod === reportPaymentMethod,
      );
    }
    if (reportDocType !== "Todos") {
      filtered = filtered.filter((o) => o.documentType === reportDocType);
    }

    return filtered;
  }, [
    salesNotes,
    reportStartDate,
    reportEndDate,
    reportCustomer,
    reportInvoiceNumber,
    reportStatus,
    reportPaymentMethod,
    reportDocType,
  ]);

  const filteredExpenses = useMemo(() => {
    let filtered = expenses;
    if (reportStartDate) {
      const startObj = new Date(reportStartDate);
      const [year, month, day] = reportStartDate.split("-");
      startObj.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
      startObj.setHours(0, 0, 0, 0);
      filtered = filtered.filter((e) => new Date(e.date) >= startObj);
    }
    if (reportEndDate) {
      const endObj = new Date(reportEndDate);
      const [year, month, day] = reportEndDate.split("-");
      endObj.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
      endObj.setHours(23, 59, 59, 999);
      filtered = filtered.filter((e) => new Date(e.date) <= endObj);
    }
    return filtered;
  }, [expenses, reportStartDate, reportEndDate]);

  // Derived Data
  const validSales = filteredSales.filter(
    (o) =>
      o.status !== "anulada" &&
      (o.status === "paid" || o.status === "cobrado" || o.status === "por_cobrar") &&
      !o.relatedOrderId
  );
  const totalIngresos = validSales.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const totalEgresos = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const utilidad = totalIngresos - totalEgresos;
  const totalIva = validSales.reduce((sum, o) => sum + (Number(o.tax) || 0), 0);
  const totalSubtotal = validSales.reduce(
    (sum, o) => sum + (Number(o.subtotal) || 0),
    0,
  );

  const facturasEmitidas = filteredSales.filter(
    (o) => o.documentType === "factura",
  ).length;
  const facturasAnuladas = filteredSales.filter(
    (o) => o.documentType === "factura" && o.status === "anulada",
  ).length;
  const ventasPromedio =
    validSales.length > 0 ? totalIngresos / validSales.length : 0;

  // Productos Rankings
  const topProductsObj = validSales.reduce(
    (acc, order) => {
      order.items.forEach((item) => {
        const name = item.menuItem.name;
        if (!acc[name])
          acc[name] = { quantity: 0, revenue: 0, price: item.menuItem.price };
        acc[name].quantity += item.quantity;
        acc[name].revenue += item.menuItem.price * item.quantity;
      });
      return acc;
    },
    {} as Record<string, { quantity: number; revenue: number; price: number }>,
  );

  const topProductsArray = Object.entries(topProductsObj)
    .map(([name, stats]: [string, any]) => ({
      name,
      quantity: stats.quantity,
      revenue: stats.revenue,
      price: stats.price,
    }))
    .sort((a, b) => b.quantity - a.quantity);
  const bestProduct = topProductsArray[0];

  // Payment methods chart data
  const paymentMethodsData = useMemo(() => {
    const data = validSales.reduce(
      (acc, order) => {
        const pm = order.paymentMethod || "Efectivo";
        acc[pm] = (acc[pm] || 0) + order.total;
        return acc;
      },
      {} as Record<string, number>,
    );
    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a: any, b: any) => b.value - a.value);
  }, [validSales]);

  const COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#64748b",
  ];

  // Customer Rankings
  const customersData = useMemo(() => {
    const customers = validSales.reduce(
      (acc, order) => {
        const name =
          order.customerName || order.businessName || "Consumidor Final";
        if (name.toLowerCase() === "consumidor final") return acc;
        if (!acc[name])
          acc[name] = { total: 0, count: 0, lastDate: order.date };
        acc[name].total += order.total;
        acc[name].count += 1;
        if (new Date(order.date) > new Date(acc[name].lastDate))
          acc[name].lastDate = order.date;
        return acc;
      },
      {} as Record<string, { total: number; count: number; lastDate: string }>,
    );
    return Object.entries(customers)
      .map(([name, stats]: [string, any]) => ({
        name,
        total: stats.total,
        count: stats.count,
        lastDate: stats.lastDate,
      }))
      .sort((a, b) => b.total - a.total);
  }, [validSales]);

  // Profit and Loss Data
  const profitAndLossData = useMemo(() => {
    const dataByDate: Record<string, { date: string; ingresos: number; egresos: number; utilidad: number; timestamp: number }> = {};
    
    validSales.forEach(o => {
      const dateStr = new Date(o.date).toLocaleDateString();
      if (!dataByDate[dateStr]) {
        dataByDate[dateStr] = { date: dateStr, ingresos: 0, egresos: 0, utilidad: 0, timestamp: new Date(new Date(o.date).setHours(0,0,0,0)).getTime() };
      }
      dataByDate[dateStr].ingresos += (Number(o.total) || 0);
    });

    filteredExpenses.forEach(e => {
      const dateStr = new Date(e.date).toLocaleDateString();
      if (!dataByDate[dateStr]) {
        dataByDate[dateStr] = { date: dateStr, ingresos: 0, egresos: 0, utilidad: 0, timestamp: new Date(new Date(e.date).setHours(0,0,0,0)).getTime() };
      }
      dataByDate[dateStr].egresos += (Number(e.amount) || 0);
    });

    Object.values(dataByDate).forEach(d => {
      d.utilidad = d.ingresos - d.egresos;
    });

    return Object.values(dataByDate).sort((a, b) => a.timestamp - b.timestamp);
  }, [validSales, filteredExpenses]);

  // Export to Excel
  const downloadReport = async () => {
    const wb = new ExcelJS.Workbook();
    wb.creator = "SalyMar";
    wb.created = new Date();
    const formatCurrencyStr = '"$"#,##0.00';

    // Sheet 1: Resumen Dashboard
    const wsSummary = wb.addWorksheet("Dashboard y Gráficos");

    wsSummary.mergeCells("A1", "E2");
    const titleCell = wsSummary.getCell("A1");
    titleCell.value = "REPORTE GENERAL - SALYMAR";
    titleCell.font = {
      name: "Arial",
      size: 16,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A8A" },
    };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };

    wsSummary.mergeCells("A3", "B3");
    wsSummary.getCell("A3").value =
      `Desde: ${reportStartDate ? new Date(reportStartDate).toLocaleDateString() : "Inicio"}`;
    wsSummary.getCell("A3").font = { bold: true };

    wsSummary.mergeCells("C3", "D3");
    wsSummary.getCell("C3").value =
      `Hasta: ${reportEndDate ? new Date(reportEndDate).toLocaleDateString() : "Hoy"}`;
    wsSummary.getCell("C3").font = { bold: true };

    wsSummary.addRow([]);
    const kpiHeaders = wsSummary.addRow([
      "TOTAL INGRESOS",
      "TOTAL SIN IMPUESTOS",
      "TOTAL IVA",
      "TOTAL EGRESOS",
      "UTILIDAD NETA",
    ]);
    kpiHeaders.font = { bold: true, color: { argb: "FFFFFFFF" } };
    kpiHeaders.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF334155" },
      };
      cell.alignment = { horizontal: "center" };
    });

    const kpiValues = wsSummary.addRow([
      totalIngresos,
      totalSubtotal,
      totalIva,
      totalEgresos,
      utilidad,
    ]);
    kpiValues.font = { size: 12, bold: true };
    kpiValues.eachCell((cell, colNumber) => {
      cell.numFmt = formatCurrencyStr;
      cell.alignment = { horizontal: "center" };
      if (colNumber === 1)
        cell.font = { ...(cell.font as any), color: { argb: "FF16A34A" } };
      if (colNumber === 4)
        cell.font = { ...(cell.font as any), color: { argb: "FFDC2626" } };
      if (colNumber === 5)
        cell.font = {
          ...(cell.font as any),
          color: { argb: utilidad >= 0 ? "FF2563EB" : "FFDC2626" },
        };
    });

    wsSummary.addRow([]);
    wsSummary.addRow(["MÉTRICAS ADICIONALES", "VALOR"]);
    wsSummary.lastRow!.font = { bold: true };
    wsSummary.addRow([
      "Número total de transacciones (Válidas)",
      validSales.length,
    ]);
    wsSummary
      .addRow(["Promedio de venta por transacción", ventasPromedio])
      .getCell(2).numFmt = formatCurrencyStr;
    wsSummary.addRow(["Facturas emitidas", facturasEmitidas]);
    wsSummary.addRow([
      "Documentos Anulados",
      filteredSales.length - validSales.length,
    ]);

    wsSummary.columns = [
      { width: 30 },
      { width: 25 },
      { width: 20 },
      { width: 25 },
      { width: 25 },
    ];

    // Add charts to wsSummary
    try {
      const captureChart = async (ref: React.RefObject<HTMLDivElement | null>) => {
        if (ref.current) {
          const dataUrl = await toPng(ref.current, { backgroundColor: '#ffffff' });
          return dataUrl;
        }
        return null;
      };

      const paymentImg = await captureChart(paymentChartRef);
      const productsImg = await captureChart(productsChartRef);
      const profitImg = await captureChart(profitChartRef);

      if (paymentImg) {
        const paymentImageId = wb.addImage({
          base64: paymentImg,
          extension: 'png',
        });
        wsSummary.addImage(paymentImageId, {
          tl: { col: 0, row: 14 },
          ext: { width: 400, height: 300 }
        });
      }

      if (productsImg) {
        const productsImageId = wb.addImage({
          base64: productsImg,
          extension: 'png',
        });
        wsSummary.addImage(productsImageId, {
          tl: { col: 3, row: 14 },
          ext: { width: 400, height: 300 }
        });
      }

      if (profitImg) {
        const profitImageId = wb.addImage({
          base64: profitImg,
          extension: 'png',
        });
        wsSummary.addImage(profitImageId, {
          tl: { col: 0, row: 32 },
          ext: { width: 800, height: 350 }
        });
      }
    } catch (error) {
      console.error("Error capturing charts:", error);
    }

    // Sheet 2: Transacciones (Invoices & Receipts)
    const wsInvoices = wb.addWorksheet("Transacciones");
    wsInvoices.columns = [
      { header: "Fecha", key: "fecha", width: 20 },
      { header: "Documento", key: "doc", width: 15 },
      { header: "ID", key: "id", width: 15 },
      { header: "Estado", key: "estado", width: 15 },
      { header: "Cliente", key: "cliente", width: 30 },
      { header: "Forma Pago", key: "pago", width: 15 },
      { header: "Subtotal", key: "subtotal", width: 15 },
      { header: "IVA", key: "iva", width: 15 },
      { header: "Total", key: "total", width: 15 },
    ];
    wsInvoices.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    wsInvoices.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0284C7" },
    };

    filteredSales.forEach((o) => {
      const row = wsInvoices.addRow({
        fecha: new Date(o.date).toLocaleString(),
        doc: o.documentType?.toUpperCase() || "NOTA",
        id: o.id,
        estado: o.status.toUpperCase(),
        cliente: o.customerName || o.businessName || "Consumidor Final",
        pago: o.paymentMethod || "Efectivo",
        subtotal: o.subtotal,
        iva: o.tax,
        total: o.total,
      });
      row.getCell("subtotal").numFmt = formatCurrencyStr;
      row.getCell("iva").numFmt = formatCurrencyStr;
      row.getCell("total").numFmt = formatCurrencyStr;
      if (o.status === "anulada")
        row.font = { color: { argb: "FF94A3B8" }, strike: true };
    });

    // Sheet 3: Productos Vendidos
    const wsProducts = wb.addWorksheet("Productos Vendidos");
    wsProducts.columns = [
      { header: "Ranking", key: "rank", width: 10 },
      { header: "Producto", key: "nombre", width: 30 },
      { header: "Cantidad", key: "cant", width: 15 },
      { header: "P. Unitario", key: "precio", width: 15 },
      { header: "Total Generado", key: "total", width: 20 },
    ];
    wsProducts.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    wsProducts.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF059669" },
    };

    topProductsArray.forEach((p, i) => {
      const row = wsProducts.addRow({
        rank: i + 1,
        nombre: p.name,
        cant: p.quantity,
        precio: p.price,
        total: p.revenue,
      });
      row.getCell("precio").numFmt = formatCurrencyStr;
      row.getCell("total").numFmt = formatCurrencyStr;
    });

    // Sheet 4: Clientes
    const wsCustomers = wb.addWorksheet("Mejores Clientes");
    wsCustomers.columns = [
      { header: "Ranking", key: "rank", width: 10 },
      { header: "Cliente", key: "nombre", width: 40 },
      { header: "No. Compras", key: "cant", width: 15 },
      { header: "Última Compra", key: "fecha", width: 20 },
      { header: "Total Comprado", key: "total", width: 20 },
    ];
    wsCustomers.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    wsCustomers.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF7C3AED" },
    };

    customersData.forEach((c, i) => {
      const row = wsCustomers.addRow({
        rank: i + 1,
        nombre: c.name,
        cant: c.count,
        fecha: new Date(c.lastDate).toLocaleDateString(),
        total: c.total,
      });
      row.getCell("total").numFmt = formatCurrencyStr;
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(
      blob,
      `Reporte-Completo-${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  const totalSalesPages = Math.ceil(filteredSales.length / itemsPerPage);
  const paginatedSales = filteredSales.slice((salesPage - 1) * itemsPerPage, salesPage * itemsPerPage);

  const totalProductsPages = Math.ceil(topProductsArray.length / itemsPerPage);
  const paginatedProducts = topProductsArray.slice((productsPage - 1) * itemsPerPage, productsPage * itemsPerPage);

  const totalCustomersPages = Math.ceil(customersData.length / itemsPerPage);
  const paginatedCustomers = customersData.slice((customersPage - 1) * itemsPerPage, customersPage * itemsPerPage);

  const totalExpensesPages = Math.ceil(filteredExpenses.length / itemsPerPage);
  const paginatedExpenses = filteredExpenses.slice((expensesPage - 1) * itemsPerPage, expensesPage * itemsPerPage);

  return (
    <div className="flex-1 pb-12 flex flex-col">
      {/* Header & Export */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <h2 className="text-2xl font-bold text-slate-800">
          Reportes Financieros
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={downloadReport}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm shadow-emerald-600/20 transition-all"
          >
            <Download className="w-4 h-4" /> Exportar a Excel
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
          >
            Imprimir
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm mb-6 shrink-0">
        <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold">
          <Filter className="w-5 h-5 text-blue-600" />
          <h3>Filtros de Búsqueda</h3>
          <button
            className="ml-auto text-sm text-blue-600 hover:underline font-medium"
            onClick={() => {
              setReportStartDate("");
              setReportEndDate("");
              setReportCustomer("");
              setReportInvoiceNumber("");
              setReportStatus("Todos");
              setReportPaymentMethod("Todos");
              setReportDocType("Todos");
            }}
          >
            Limpiar filtros
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Desde
            </label>
            <input
              type="date"
              value={reportStartDate}
              onChange={(e) => setReportStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Hasta
            </label>
            <input
              type="date"
              value={reportEndDate}
              onChange={(e) => setReportEndDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Cliente
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={reportCustomer}
                onChange={(e) => setReportCustomer(e.target.value)}
                placeholder="Buscar cliente..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Nº Comprobante
            </label>
            <input
              type="text"
              value={reportInvoiceNumber}
              onChange={(e) => setReportInvoiceNumber(e.target.value)}
              placeholder="Ej: #000123"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Estado
            </label>
            <select
              value={reportStatus}
              onChange={(e) => setReportStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="Todos">Todos</option>
              <option value="paid">Pagada / Completada</option>
              <option value="anulada">Anulada</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Forma de Pago
            </label>
            <select
              value={reportPaymentMethod}
              onChange={(e) => setReportPaymentMethod(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="Todos">Todas</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Tarjeta">Tarjeta</option>
              <option value="Crédito">Crédito</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Tipo de Doc
            </label>
            <select
              value={reportDocType}
              onChange={(e) => setReportDocType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="Todos">Todos</option>
              <option value="factura">Factura Electrónica</option>
              <option value="nota">Nota de Venta</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-2 border-b border-slate-200 mb-6 shrink-0 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveReportTab("general")}
          className={`flex items-center gap-2 px-4 py-2 font-bold text-sm rounded-t-lg transition-colors whitespace-nowrap ${activeReportTab === "general" ? "text-blue-600 bg-blue-50 border-b-2 border-blue-600" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
        >
          <TrendingUp className="w-4 h-4" /> Dashboard General
        </button>
        <button
          onClick={() => setActiveReportTab("facturas")}
          className={`flex items-center gap-2 px-4 py-2 font-bold text-sm rounded-t-lg transition-colors whitespace-nowrap ${activeReportTab === "facturas" ? "text-blue-600 bg-blue-50 border-b-2 border-blue-600" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
        >
          <Receipt className="w-4 h-4" /> Comprobantes
        </button>
        <button
          onClick={() => setActiveReportTab("productos")}
          className={`flex items-center gap-2 px-4 py-2 font-bold text-sm rounded-t-lg transition-colors whitespace-nowrap ${activeReportTab === "productos" ? "text-blue-600 bg-blue-50 border-b-2 border-blue-600" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
        >
          <Calendar className="w-4 h-4" /> Productos Vendidos
        </button>
        <button
          onClick={() => setActiveReportTab("clientes")}
          className={`flex items-center gap-2 px-4 py-2 font-bold text-sm rounded-t-lg transition-colors whitespace-nowrap ${activeReportTab === "clientes" ? "text-blue-600 bg-blue-50 border-b-2 border-blue-600" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
        >
          <Users className="w-4 h-4" /> Clientes
        </button>
        <button
          onClick={() => setActiveReportTab("egresos")}
          className={`flex items-center gap-2 px-4 py-2 font-bold text-sm rounded-t-lg transition-colors whitespace-nowrap ${activeReportTab === "egresos" ? "text-blue-600 bg-blue-50 border-b-2 border-blue-600" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
        >
          <AlertCircle className="w-4 h-4" /> Egresos
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1">
        {activeReportTab === "general" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-slate-500 text-sm font-medium mb-1">
                  Ventas Totales
                </h3>
                <p className="text-2xl font-black text-slate-800">
                  {formatCurrency(totalIngresos)}
                </p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Receipt className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-slate-500 text-sm font-medium mb-1">
                  Total IVA
                </h3>
                <p className="text-2xl font-black text-slate-800">
                  {formatCurrency(totalIva)}
                </p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-slate-500 text-sm font-medium mb-1">
                  Total Egresos
                </h3>
                <p className="text-2xl font-black text-slate-800">
                  {formatCurrency(totalEgresos)}
                </p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${utilidad >= 0 ? "bg-blue-100 text-blue-600" : "bg-red-100 text-red-600"}`}
                  >
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-slate-500 text-sm font-medium mb-1">
                  Utilidad Neta
                </h3>
                <p
                  className={`text-2xl font-black ${utilidad >= 0 ? "text-blue-600" : "text-red-600"}`}
                >
                  {formatCurrency(utilidad)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-800 text-white p-5 rounded-2xl shadow-sm">
                <h3 className="text-slate-400 text-sm font-medium mb-1">
                  Transacciones Válidas
                </h3>
                <p className="text-2xl font-bold">{validSales.length}</p>
              </div>
              <div className="bg-slate-800 text-white p-5 rounded-2xl shadow-sm">
                <h3 className="text-slate-400 text-sm font-medium mb-1">
                  Ticket Promedio
                </h3>
                <p className="text-2xl font-bold">
                  {formatCurrency(ventasPromedio)}
                </p>
              </div>
              <div className="bg-slate-800 text-white p-5 rounded-2xl shadow-sm">
                <h3 className="text-slate-400 text-sm font-medium mb-1">
                  Producto Estrella
                </h3>
                <p className="text-2xl font-bold truncate">
                  {bestProduct ? bestProduct.name : "N/A"}
                </p>
              </div>
              <div className="bg-slate-800 text-white p-5 rounded-2xl shadow-sm">
                <h3 className="text-slate-400 text-sm font-medium mb-1">
                  Mejor Cliente
                </h3>
                <p className="text-2xl font-bold truncate">
                  {customersData[0] ? customersData[0].name : "N/A"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-500" />
                  Ingresos por Forma de Pago
                </h3>
                <div className="h-[300px]" ref={paymentChartRef}>
                  {paymentMethodsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentMethodsData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {paymentMethodsData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400">
                      Sin datos
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  Top 5 Productos Más Vendidos (Ingresos)
                </h3>
                <div className="h-[300px]" ref={productsChartRef}>
                  {topProductsArray.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={topProductsArray.slice(0, 5)}
                        layout="vertical"
                        margin={{ left: 50 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          horizontal={false}
                        />
                        <XAxis type="number" tickFormatter={(v) => `$${v}`} />
                        <YAxis type="category" dataKey="name" width={100} />
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Bar
                          dataKey="revenue"
                          fill="#10b981"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400">
                      Sin datos
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mt-6">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-indigo-500" />
                Ganancias y Pérdidas (En el Tiempo)
              </h3>
              <div className="h-[350px]" ref={profitChartRef}>
                {profitAndLossData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={profitAndLossData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" />
                      <YAxis tickFormatter={(v) => `$${v}`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="egresos" name="Egresos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="utilidad" name="Utilidad" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    Sin datos en este rango
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeReportTab === "facturas" && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Doc.</th>
                    <th className="px-4 py-3 font-medium">ID</th>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Pago</th>
                    <th className="px-4 py-3 font-medium text-right">
                      Subtotal
                    </th>
                    <th className="px-4 py-3 font-medium text-right">IVA</th>
                    <th className="px-4 py-3 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedSales.map((o) => (
                    <tr
                      key={o.id}
                      className={`hover:bg-slate-50 ${o.status === "anulada" ? "opacity-60 bg-slate-50/50" : ""}`}
                    >
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {new Date(o.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-medium uppercase text-xs">
                        <span
                          className={`px-2 py-1 rounded-md ${o.documentType === "factura" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"}`}
                        >
                          {o.documentType || "nota"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{o.id}</td>
                      <td className="px-4 py-3 text-slate-700 truncate max-w-[200px]">
                        {o.customerName || o.businessName || "Consumidor Final"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${o.status === "anulada" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {o.paymentMethod || "Efectivo"}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {formatCurrency(o.subtotal)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {formatCurrency(o.tax)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        {formatCurrency(o.total)}
                      </td>
                    </tr>
                  ))}
                  {filteredSales.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-8 text-center text-slate-400"
                      >
                        No hay transacciones para los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalSalesPages > 1 && (
              <div className="p-4 border-t border-slate-100">
                <Pagination currentPage={salesPage} totalPages={totalSalesPages} onPageChange={setSalesPage} />
              </div>
            )}
          </div>
        )}

        {activeReportTab === "productos" && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Rank</th>
                    <th className="px-4 py-3 font-medium">Producto</th>
                    <th className="px-4 py-3 font-medium text-center">
                      Cantidad Vendida
                    </th>
                    <th className="px-4 py-3 font-medium text-right">
                      P. Unitario Aprox
                    </th>
                    <th className="px-4 py-3 font-medium text-right">
                      Total Ingresos
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedProducts.map((p, i) => (
                    <tr key={p.name} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-400">
                        #{i + 1}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {p.name}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-700">
                        {p.quantity} u.
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500">
                        {formatCurrency(p.price)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600">
                        {formatCurrency(p.revenue)}
                      </td>
                    </tr>
                  ))}
                  {topProductsArray.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-slate-400"
                      >
                        No hay productos vendidos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalProductsPages > 1 && (
              <div className="p-4 border-t border-slate-100">
                <Pagination currentPage={productsPage} totalPages={totalProductsPages} onPageChange={setProductsPage} />
              </div>
            )}
          </div>
        )}

        {activeReportTab === "clientes" && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Rank</th>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium text-center">
                      Frecuencia (Compras)
                    </th>
                    <th className="px-4 py-3 font-medium text-center">
                      Última Compra
                    </th>
                    <th className="px-4 py-3 font-medium text-right">
                      Total Consumido
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedCustomers.map((c, i) => (
                    <tr key={c.name} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-400">
                        #{i + 1}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {c.name}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-700">
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">
                          {c.count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-500">
                        {new Date(c.lastDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-blue-600">
                        {formatCurrency(c.total)}
                      </td>
                    </tr>
                  ))}
                  {customersData.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-slate-400"
                      >
                        No hay datos de clientes.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalCustomersPages > 1 && (
              <div className="p-4 border-t border-slate-100">
                <Pagination currentPage={customersPage} totalPages={totalCustomersPages} onPageChange={setCustomersPage} />
              </div>
            )}
          </div>
        )}
        {activeReportTab === "egresos" && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Categoría</th>
                    <th className="px-4 py-3 font-medium">Descripción</th>
                    <th className="px-4 py-3 font-medium text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedExpenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {new Date(e.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        <span className="px-2 py-1 rounded-md bg-purple-100 text-purple-700 text-xs">
                          {e.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {e.description}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        {formatCurrency(e.amount)}
                      </td>
                    </tr>
                  ))}
                  {filteredExpenses.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                        No hay egresos registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalExpensesPages > 1 && (
              <div className="p-4 border-t border-slate-100">
                <Pagination currentPage={expensesPage} totalPages={totalExpensesPages} onPageChange={setExpensesPage} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
