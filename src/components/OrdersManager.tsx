import React, { useState } from "react";
import { Order, OrderStatus } from "../types";
import { 
  ClipboardList, Search, Filter, Edit, 
  Trash2, ChefHat, CheckCircle, Receipt, Play
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface OrdersManagerProps {
  salesNotes: Order[];
  updateOrderStatus: (orderId: string, newStatus: OrderStatus, cancelReason?: string) => void;
  editOrder: (order: Order) => void;
  checkoutOrder: (order: Order) => void;
}

export default function OrdersManager({
  salesNotes,
  updateOrderStatus,
  editOrder,
  checkoutOrder,
}: OrdersManagerProps) {
  const [filterStatus, setFilterStatus] = useState<string>("Abiertos");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [orderToAnular, setOrderToAnular] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const filteredOrders = salesNotes.filter((o) => {
    // 1. Status Filter
    if (filterStatus === "Abiertos") {
      if (["paid", "cobrado", "anulada"].includes(o.status)) return false;
    } else if (filterStatus === "Todos") {
      // all
    } else {
      if (o.status !== filterStatus && (filterStatus === "pendiente" ? o.status !== "pending" : true)) return false;
    }

    // 2. Search filter
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      const matchesId = o.id.toLowerCase().includes(query);
      const matchesCustomer = o.customerName?.toLowerCase().includes(query) || o.businessName?.toLowerCase().includes(query);
      const matchesTable = o.tableNumber?.toLowerCase().includes(query);
      if (!matchesId && !matchesCustomer && !matchesTable) return false;
    }

    return true;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getStatusBadge = (status: OrderStatus) => {
    switch(status) {
      case "pending":
      case "pendiente": return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">Pendiente</span>;
      case "en_preparacion": return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">En Preparación</span>;
      case "listo": return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">Listo</span>;
      case "entregado": return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">Entregado</span>;
      case "por_cobrar": return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">Por Cobrar</span>;
      case "cobrado":
      case "paid": return <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">Cobrado</span>;
      case "anulada": return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">Anulado</span>;
      default: return <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  const formatCurrency = (value: number) =>
    `USD/ ${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;

  const handleAnular = () => {
    if (orderToAnular) {
      updateOrderStatus(orderToAnular, "anulada", cancelReason || "Sin razón");
      setOrderToAnular(null);
      setCancelReason("");
    }
  };

  return (
    <div className="flex-1 pb-12 flex flex-col h-full overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-blue-600" />
          Gestión de Pedidos
        </h2>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm mb-6 shrink-0 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por #pedido, cliente o mesa..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
            />
          </div>
        </div>
        <div className="w-full md:w-64">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
          >
            <option value="Abiertos">Solo Abiertos</option>
            <option value="Todos">Todos los Pedidos</option>
            <option value="pendiente">Pendientes</option>
            <option value="en_preparacion">En Preparación</option>
            <option value="listo">Listos</option>
            <option value="por_cobrar">Por Cobrar</option>
            <option value="paid">Cobrados</option>
            <option value="anulada">Anulados</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-slate-50 rounded-2xl border border-slate-100">
              <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-500 mb-1">Sin Pedidos</h3>
              <p className="text-slate-400 text-sm">No se encontraron pedidos que coincidan con los filtros.</p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isClosed = order.status === "paid" || order.status === "cobrado" || order.status === "anulada";
              return (
                <div key={order.id} className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md ${isClosed ? "opacity-70" : ""}`}>
                  <div className="p-4 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg">{order.id}</h4>
                      <p className="text-xs font-medium text-slate-500">
                        {new Date(order.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                    <div>
                      {getStatusBadge(order.status)}
                    </div>
                  </div>
                  
                  <div className="p-4 flex-1">
                    <div className="mb-4 text-sm">
                      <p className="flex justify-between mb-1">
                        <span className="text-slate-500">Tipo:</span>
                        <span className="font-bold text-slate-700 capitalize">{order.orderType || "N/A"}</span>
                      </p>
                      {order.orderType === "mesa" && (
                        <p className="flex justify-between mb-1">
                          <span className="text-slate-500">Mesa:</span>
                          <span className="font-bold text-slate-700">{order.tableNumber || "N/A"}</span>
                        </p>
                      )}
                      <p className="flex justify-between">
                        <span className="text-slate-500">Cliente:</span>
                        <span className="font-bold text-slate-700 truncate max-w-[150px] text-right">
                          {order.customerName || order.businessName || "Consumidor Final"}
                        </span>
                      </p>
                    </div>
                    
                    <div className="bg-slate-50 rounded-lg p-3 text-sm">
                      <p className="font-bold text-slate-700 mb-2">{order.items.length} Productos</p>
                      <div className="space-y-1">
                        {order.items.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="flex justify-between text-slate-600 text-xs">
                            <span className="truncate pr-2">{item.quantity}x {item.menuItem.name}</span>
                            <span className="font-medium shrink-0">{formatCurrency(item.menuItem.price * item.quantity)}</span>
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <p className="text-xs text-blue-500 font-medium pt-1">+{order.items.length - 3} más...</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 flex justify-between items-end">
                      <span className="text-sm font-bold text-slate-500">TOTAL</span>
                      <span className="text-xl font-black text-blue-600">{formatCurrency(order.total)}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-2">
                    {!isClosed && (
                      <>
                        <button
                          onClick={() => editOrder(order)}
                          className="flex-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" /> Editar
                        </button>
                        
                        {(order.status === "pendiente" || order.status === "pending") && (
                          <button
                            onClick={() => updateOrderStatus(order.id, "en_preparacion")}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors"
                          >
                            <ChefHat className="w-3.5 h-3.5" /> Cocina
                          </button>
                        )}
                        
                        {order.status === "en_preparacion" && (
                          <button
                            onClick={() => updateOrderStatus(order.id, "listo")}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Listo
                          </button>
                        )}

                        {order.status === "listo" && (
                          <button
                            onClick={() => updateOrderStatus(order.id, "entregado")}
                            className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors"
                          >
                            <Play className="w-3.5 h-3.5" /> Entregar
                          </button>
                        )}

                        {(order.status === "listo" || order.status === "entregado" || order.status === "por_cobrar") && (
                          <button
                            onClick={() => checkoutOrder(order)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors"
                          >
                            <Receipt className="w-3.5 h-3.5" /> Facturar
                          </button>
                        )}
                        
                        <button
                          onClick={() => setOrderToAnular(order.id)}
                          className="bg-white border border-red-200 hover:bg-red-50 text-red-600 font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <AnimatePresence>
        {orderToAnular && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6"
            >
              <h3 className="text-xl font-bold text-slate-800 mb-2">Anular Pedido</h3>
              <p className="text-slate-500 text-sm mb-4">
                ¿Estás seguro de que deseas anular el pedido <strong>{orderToAnular}</strong>? Esta acción no se puede deshacer.
              </p>
              
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Motivo de la anulación (Requerido)
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="Ej: Cliente canceló el pedido..."
                  rows={3}
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setOrderToAnular(null);
                    setCancelReason("");
                  }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAnular}
                  disabled={!cancelReason.trim()}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl font-bold text-sm transition-colors shadow-sm shadow-red-200"
                >
                  Confirmar Anulación
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
