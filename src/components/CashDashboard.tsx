import React, { useState, useMemo, useEffect } from "react";
import Pagination from "./Pagination";
import { Order, Expense } from "../types";
import { 
  Calculator, Landmark, ArrowRight, CheckCircle2, 
  AlertTriangle, AlertCircle, FileSpreadsheet, Lock, Printer, Calendar, Clock, User
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface CashSession {
  id: string;
  status: "open";
  openedBy: string;
  openTime: string;
  openingBalance: number;
}

interface CashDashboardProps {
  salesNotes: Order[];
  expenses: Expense[];
  activeSession: CashSession | null;
  cashClosings: any[];
  onOpenSession: (openingBalance: number) => void;
  onCloseSession: (
    actualCash: number,
    actualTransfers: number,
    differenceCash: number,
    differenceTransfers: number,
    notes: string,
    totals: {
      openingBalance: number;
      cashSales: number;
      transferSales: number;
      cardSales: number;
      creditSales: number;
      expenses: number;
      expectedCash: number;
    }
  ) => void;
  onPrintReport: (
    isClosing: boolean,
    totals: {
      openingBalance: number;
      cashSales: number;
      transferSales: number;
      cardSales: number;
      creditSales: number;
      expenses: number;
      expectedCash: number;
      actualCash: number;
      actualTransfers: number;
      differenceCash: number;
      differenceTransfers: number;
      notes: string;
    }
  ) => void;
}

export default function CashDashboard({
  salesNotes,
  expenses,
  activeSession,
  cashClosings,
  onOpenSession,
  onCloseSession,
  onPrintReport,
}: CashDashboardProps) {
  const [viewTab, setViewTab] = useState<"caja" | "historial">("caja");
  const [openingInput, setOpeningInput] = useState<string>("");
  const [actualCashInput, setActualCashInput] = useState<string>("");
  const [actualTransfersInput, setActualTransfersInput] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showConfirmClose, setShowConfirmClose] = useState<boolean>(false);

  const formatCurrency = (value: number) =>
    `USD/ ${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;

  // Calculate session data when box is open
  const sessionTotals = useMemo(() => {
    if (!activeSession) return {
      openingBalance: 0,
      cashSales: 0,
      transferSales: 0,
      cardSales: 0,
      creditSales: 0,
      expenses: 0,
      expectedCash: 0,
    };

    const openTime = new Date(activeSession.openTime).getTime();

    // Filter sales notes for this session (created after openTime and not canceled)
    const sessionOrders = salesNotes.filter(
      (order) => new Date(order.date).getTime() >= openTime && order.status !== "anulada"
    );

    let cashSales = 0;
    let transferSales = 0;
    let cardSales = 0;
    let creditSales = 0;

    sessionOrders.forEach((order) => {
      // Look at payments if mixed, otherwise paymentMethod
      if (order.paymentMethod === "Mixto" && order.payments) {
        order.payments.forEach((p) => {
          if (p.method === "Efectivo") cashSales += p.amount;
          else if (p.method === "Transferencia") transferSales += p.amount;
          else if (p.method === "Tarjeta") cardSales += p.amount;
          else if (p.method === "Crédito") creditSales += p.amount;
        });
      } else {
        const amt = order.total;
        if (order.paymentMethod === "Efectivo" || !order.paymentMethod) cashSales += amt;
        else if (order.paymentMethod === "Transferencia") transferSales += amt;
        else if (order.paymentMethod === "Tarjeta") cardSales += amt;
        else if (order.paymentMethod === "Crédito") creditSales += amt;
      }
    });

    // Filter expenses for this session
    const sessionExpenses = expenses.filter(
      (exp) => new Date(exp.date).getTime() >= openTime
    );
    const totalExpenses = sessionExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    const expectedCash = activeSession.openingBalance + cashSales - totalExpenses;

    return {
      openingBalance: activeSession.openingBalance,
      cashSales,
      transferSales,
      cardSales,
      creditSales,
      expenses: totalExpenses,
      expectedCash,
    };
  }, [activeSession, salesNotes, expenses]);

  const actualCash = parseFloat(actualCashInput) || 0;
  const actualTransfers = parseFloat(actualTransfersInput) || 0;

  const differenceCash = actualCash - sessionTotals.expectedCash;
  const differenceTransfers = actualTransfers - sessionTotals.transferSales;

  const handleOpen = (e: React.FormEvent) => {
    e.preventDefault();
    const balance = parseFloat(openingInput);
    if (isNaN(balance) || balance < 0) {
      setErrorMsg("Ingrese un valor numérico válido y mayor o igual a 0.");
      return;
    }
    setErrorMsg(null);
    onOpenSession(balance);
    setOpeningInput("");
  };

  const handleClose = () => {
    if (!actualCashInput) {
      setErrorMsg("Debe ingresar el efectivo contado físicamente en caja.");
      return;
    }
    if (!actualTransfersInput) {
      setErrorMsg("Debe ingresar el monto verificado en transferencia.");
      return;
    }
    setErrorMsg(null);
    setShowConfirmClose(true);
  };

  const confirmClose = () => {
    onCloseSession(actualCash, actualTransfers, differenceCash, differenceTransfers, notes, sessionTotals);
    setActualCashInput("");
    setActualTransfersInput("");
    setNotes("");
    setShowConfirmClose(false);
  };

  const handlePrintX = () => {
    onPrintReport(false, {
      ...sessionTotals,
      actualCash: actualCashInput ? actualCash : sessionTotals.expectedCash,
      actualTransfers: actualTransfersInput ? actualTransfers : sessionTotals.transferSales,
      differenceCash: actualCashInput ? differenceCash : 0,
      differenceTransfers: actualTransfersInput ? differenceTransfers : 0,
      notes,
    });
  };

  // Sort cash closings by closeTime descending
  const sortedClosings = useMemo(() => {
    return [...cashClosings].sort((a, b) => new Date(b.closeTime).getTime() - new Date(a.closeTime).getTime());
  }, [cashClosings]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(sortedClosings.length / itemsPerPage);
  const paginatedClosings = useMemo(() => {
    return sortedClosings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [sortedClosings, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [sortedClosings]);

  return (
    <div className="flex-1 pb-12 flex flex-col h-full bg-slate-50/50">
      {/* Title & Navigation Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center px-6 pt-6 shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-blue-600" />
            Control de Caja
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Gestión de turnos, arqueo y reporte de cierres de caja
          </p>
        </div>
      </div>

      {/* Sub-tabs menu */}
      <div className="flex border-b border-slate-200 mt-6 px-6 gap-6 shrink-0">
        <button
          onClick={() => setViewTab("caja")}
          className={`py-3 font-bold text-sm border-b-2 transition-colors ${viewTab === "caja" ? "text-blue-600 border-blue-600" : "text-slate-500 border-transparent hover:text-slate-800"}`}
        >
          {activeSession ? "Turno Activo" : "Apertura de Caja"}
        </button>
        <button
          onClick={() => setViewTab("historial")}
          className={`py-3 font-bold text-sm border-b-2 transition-colors ${viewTab === "historial" ? "text-blue-600 border-blue-600" : "text-slate-500 border-transparent hover:text-slate-800"}`}
        >
          Historial de Cierres
        </button>
      </div>

      {/* Sub-tab view area */}
      <div className="flex-1 overflow-y-auto mt-6">
        {viewTab === "caja" ? (
          !activeSession ? (
            /* Closed Cash View */
            <div className="flex items-center justify-center p-6 h-full min-h-[350px]">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-8 max-w-md w-full text-center"
              >
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Lock className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">Apertura de Caja</h2>
                <p className="text-slate-500 text-sm mb-8">
                  La caja se encuentra cerrada. Para comenzar a procesar ventas e ingresos, por favor abra la caja con un saldo inicial en efectivo (fondo de caja).
                </p>

                <form onSubmit={handleOpen} className="space-y-6">
                  <div className="text-left">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Fondo Inicial en Efectivo
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={openingInput}
                        onChange={(e) => setOpeningInput(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-8 pr-4 py-4 text-lg font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-300"
                        autoFocus
                      />
                    </div>
                    {errorMsg && (
                      <p className="text-xs text-red-500 font-medium mt-2 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errorMsg}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
                  >
                    Abrir Caja y Empezar Turno
                  </button>
                </form>
              </motion.div>
            </div>
          ) : (
            /* Open Cash View */
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 px-6 h-full">
              {/* Financial summary */}
              <div className="xl:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <Landmark className="w-5 h-5 text-blue-500" />
                      Resumen Financiero del Turno
                    </h3>
                    <button
                      onClick={handlePrintX}
                      className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500" /> Reporte Parcial (X)
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block mb-1">
                        Fondo Inicial
                      </span>
                      <span className="text-xl font-black text-slate-800">
                        {formatCurrency(sessionTotals.openingBalance)}
                      </span>
                    </div>

                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100/50">
                      <span className="text-emerald-700 text-xs font-bold uppercase tracking-wider block mb-1">
                        Ventas en Efectivo
                      </span>
                      <span className="text-xl font-black text-emerald-700">
                        +{formatCurrency(sessionTotals.cashSales)}
                      </span>
                    </div>

                    <div className="bg-red-50 p-4 rounded-2xl border border-red-100/50">
                      <span className="text-red-700 text-xs font-bold uppercase tracking-wider block mb-1">
                        Egresos en Efectivo
                      </span>
                      <span className="text-xl font-black text-red-700">
                        -{formatCurrency(sessionTotals.expenses)}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-slate-200 my-6 pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                      <span className="text-blue-700 text-xs font-bold uppercase tracking-wider block mb-1">
                        Ventas por Transferencia
                      </span>
                      <span className="text-lg font-bold text-blue-700">
                        {formatCurrency(sessionTotals.transferSales)}
                      </span>
                    </div>

                    <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50">
                      <span className="text-indigo-700 text-xs font-bold uppercase tracking-wider block mb-1">
                        Ventas con Tarjeta
                      </span>
                      <span className="text-lg font-bold text-indigo-700">
                        {formatCurrency(sessionTotals.cardSales)}
                      </span>
                    </div>

                    <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100/50">
                      <span className="text-amber-700 text-xs font-bold uppercase tracking-wider block mb-1">
                        Ventas a Crédito
                      </span>
                      <span className="text-lg font-bold text-amber-700">
                        {formatCurrency(sessionTotals.creditSales)}
                      </span>
                    </div>
                  </div>

                  {/* Expected values computation cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                    <div className="bg-blue-600 text-white p-6 rounded-2xl flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-blue-100 text-xs uppercase tracking-wider">
                          Efectivo Esperado en Caja
                        </h4>
                        <p className="text-[10px] text-blue-200 mt-0.5">
                          (Fondo + Ventas Efectivo - Egresos)
                        </p>
                      </div>
                      <div className="text-right mt-4">
                        <span className="text-2xl font-black">
                          {formatCurrency(sessionTotals.expectedCash)}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-800 text-white p-6 rounded-2xl flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-slate-300 text-xs uppercase tracking-wider">
                          Transferencias Esperadas
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          (Ventas Registradas por Transferencia)
                        </p>
                      </div>
                      <div className="text-right mt-4">
                        <span className="text-2xl font-black">
                          {formatCurrency(sessionTotals.transferSales)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Physical Audit Panel */}
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-6">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-orange-500" />
                    Arqueo y Reconciliación
                  </h3>

                  <div className="space-y-5">
                    {/* Cash count input */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Efectivo Real Contado
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={actualCashInput}
                          onChange={(e) => setActualCashInput(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-8 pr-4 py-3.5 text-lg font-black text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-300"
                        />
                      </div>
                      {actualCashInput && (
                        <div className={`p-3 rounded-xl border flex items-center gap-2 mt-2 text-xs font-bold ${differenceCash === 0 ? "bg-emerald-50 border-emerald-100 text-emerald-800" : differenceCash > 0 ? "bg-blue-50 border-blue-100 text-blue-800" : "bg-red-50 border-red-100 text-red-800"}`}>
                          <span>Diferencia Efectivo: {differenceCash >= 0 ? "+" : ""}{formatCurrency(differenceCash)}</span>
                        </div>
                      )}
                    </div>

                    {/* Transfer check input */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Transferencias Verificadas en Banco
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={actualTransfersInput}
                          onChange={(e) => setActualTransfersInput(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-8 pr-4 py-3.5 text-lg font-black text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-300"
                        />
                      </div>
                      {actualTransfersInput && (
                        <div className={`p-3 rounded-xl border flex items-center gap-2 mt-2 text-xs font-bold ${differenceTransfers === 0 ? "bg-emerald-50 border-emerald-100 text-emerald-800" : differenceTransfers > 0 ? "bg-blue-50 border-blue-100 text-blue-800" : "bg-red-50 border-red-100 text-red-800"}`}>
                          <span>Diferencia Transferencia: {differenceTransfers >= 0 ? "+" : ""}{formatCurrency(differenceTransfers)}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Observaciones / Notas
                      </label>
                      <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Detalles sobre diferencias, egresos excepcionales, etc..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-shadow placeholder:text-slate-400"
                      />
                    </div>

                    {errorMsg && (
                      <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errorMsg}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleClose}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <Lock className="w-4 h-4" /> Cerrar Caja y Generar Reporte
                  </button>
                </div>
              </div>
            </div>
          )
        ) : (
          /* Closings History View */
          <div className="px-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                      <th className="py-4 px-6">Fecha de Cierre</th>
                      <th className="py-4 px-6">ID Cierre</th>
                      <th className="py-4 px-6">Abierto por</th>
                      <th className="py-4 px-6 text-right">Fondo Inicial</th>
                      <th className="py-4 px-6 text-right">Efectivo Real</th>
                      <th className="py-4 px-6 text-right">Transf. Reales</th>
                      <th className="py-4 px-6 text-right">Dif. Efectivo</th>
                      <th className="py-4 px-6 text-right">Dif. Transf.</th>
                      <th className="py-4 px-6 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {sortedClosings.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                          No se han realizado cierres de caja todavía.
                        </td>
                      </tr>
                    ) : (
                      paginatedClosings.map((c) => (
                        <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-6">
                            <span className="font-semibold text-slate-800 block">
                              {new Date(c.closeTime).toLocaleDateString("es-PE")}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {new Date(c.closeTime).toLocaleTimeString("es-PE")}
                            </span>
                          </td>
                          <td className="py-4 px-6 font-mono text-xs text-slate-500">
                            {c.id}
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-medium text-slate-700">{c.openedBy}</span>
                          </td>
                          <td className="py-4 px-6 text-right font-bold text-slate-800">
                            {formatCurrency(c.openingBalance || 0)}
                          </td>
                          <td className="py-4 px-6 text-right font-bold text-slate-800">
                            {formatCurrency(c.actualCash || 0)}
                          </td>
                          <td className="py-4 px-6 text-right font-bold text-slate-800">
                            {formatCurrency(c.actualTransfers || 0)}
                          </td>
                          <td className={`py-4 px-6 text-right font-bold ${(c.differenceCash || 0) === 0 ? "text-slate-600" : (c.differenceCash || 0) > 0 ? "text-blue-600" : "text-red-500"}`}>
                            {(c.differenceCash || 0) >= 0 ? "+" : ""}{formatCurrency(c.differenceCash || 0)}
                          </td>
                          <td className={`py-4 px-6 text-right font-bold ${(c.differenceTransfers || 0) === 0 ? "text-slate-600" : (c.differenceTransfers || 0) > 0 ? "text-blue-600" : "text-red-500"}`}>
                            {(c.differenceTransfers || 0) >= 0 ? "+" : ""}{formatCurrency(c.differenceTransfers || 0)}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => onPrintReport(true, c)}
                              className="text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center gap-1 justify-end ml-auto"
                              title="Reimprimir Reporte"
                            >
                              <Printer className="w-3.5 h-3.5" /> Reimprimir
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmClose && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center"
            >
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                Confirmar Cierre de Caja
              </h3>
              <p className="text-slate-500 text-sm mb-6">
                ¿Está seguro de que desea realizar el cierre de caja? Esto dará por terminado el turno actual y registrará los saldos.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmClose(false)}
                  className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmClose}
                  className="flex-1 bg-amber-500 text-white font-bold py-3 rounded-xl hover:bg-amber-600 transition-colors"
                >
                  Sí, cerrar caja
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
