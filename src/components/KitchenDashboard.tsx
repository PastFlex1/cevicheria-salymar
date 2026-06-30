import React, { useState, useMemo } from "react";
import { Order, OrderStatus } from "../types";
import { Clock, ChefHat, CheckCircle, Search, Filter, Play } from "lucide-react";
import { motion } from "motion/react";

interface KitchenDashboardProps {
  salesNotes: Order[];
  updateOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
}

  const OrderCard = ({ order, currentStatus, updateOrderStatus }: { order: Order, currentStatus: OrderStatus, updateOrderStatus: (id: string, status: OrderStatus) => void, key?: string }) => (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-3"
    >
      <div className="flex justify-between items-start border-b border-slate-100 pb-2">
        <div>
          <h4 className="font-bold text-slate-800 text-lg">
            {order.id}
          </h4>
          <p className="text-xs text-slate-500 font-medium">
            {order.orderType === "mesa"
              ? `Mesa: ${order.tableNumber || "N/A"}`
              : order.orderType
              ? order.orderType.toUpperCase()
              : "PARA LLEVAR"}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1 justify-end">
            <Clock className="w-3 h-3" />
            {new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
      
      <div className="flex-1 space-y-2">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex justify-between items-start text-sm">
            <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md min-w-[32px] text-center">
              x{item.quantity}
            </span>
            <div className="flex-1 ml-2">
              <span className="font-medium text-slate-800">{item.menuItem.name}</span>
              {item.observation && (
                <p className="text-xs text-red-500 font-medium mt-0.5 leading-tight">
                  * {item.observation}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {order.observation && (
        <div className="bg-amber-50 text-amber-800 p-2 rounded-lg text-xs font-medium border border-amber-100">
          Nota: {order.observation}
        </div>
      )}

      <div className="pt-2 border-t border-slate-100 flex gap-2">
        {(currentStatus === "pendiente" || currentStatus === "pending") && (
          <button
            onClick={() => updateOrderStatus(order.id, "en_preparacion")}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-1 transition-colors shadow-sm shadow-blue-200"
          >
            <ChefHat className="w-4 h-4" /> Preparar
          </button>
        )}
        {currentStatus === "en_preparacion" && (
          <button
            onClick={() => updateOrderStatus(order.id, "listo")}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-1 transition-colors shadow-sm shadow-emerald-200"
          >
            <CheckCircle className="w-4 h-4" /> Terminar
          </button>
        )}
        {currentStatus === "listo" && (
          <button
            onClick={() => updateOrderStatus(order.id, "entregado")}
            className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-1 transition-colors shadow-sm shadow-slate-200"
          >
            <Play className="w-4 h-4" /> Entregar
          </button>
        )}
      </div>
    </motion.div>
  );

export default function KitchenDashboard({
  salesNotes,
  updateOrderStatus,
}: KitchenDashboardProps) {
  const activeOrders = useMemo(() => {
    return salesNotes.filter(
      (o) =>
        o.status === "pendiente" ||
        o.status === "pending" ||
        o.status === "en_preparacion" ||
        o.status === "listo"
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [salesNotes]);

  const pendientes = activeOrders.filter(
    (o) => o.status === "pendiente" || o.status === "pending"
  );
  const enPreparacion = activeOrders.filter(
    (o) => o.status === "en_preparacion"
  );
  const listos = activeOrders.filter((o) => o.status === "listo");



  return (
    <div className="flex-1 pb-12 flex flex-col h-full bg-slate-50/50">
      <div className="flex justify-between items-center mb-6 px-6 pt-6 shrink-0">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ChefHat className="w-6 h-6 text-orange-500" />
          Vista de Cocina
        </h2>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
          <Clock className="w-4 h-4 text-blue-500" />
          {new Date().toLocaleTimeString()}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 px-6 overflow-hidden">
        {/* Column: Pendientes */}
        <div className="flex flex-col bg-slate-100/50 rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 bg-amber-100 text-amber-800 font-bold flex justify-between items-center shrink-0">
            <span>Pendientes</span>
            <span className="bg-amber-800 text-amber-50 px-2 py-0.5 rounded-full text-xs">{pendientes.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {pendientes.length === 0 ? (
              <p className="text-center text-slate-400 text-sm mt-10">Sin pedidos pendientes</p>
            ) : (
              pendientes.map((order) => <OrderCard key={order.id} order={order} currentStatus="pendiente" updateOrderStatus={updateOrderStatus} />)
            )}
          </div>
        </div>

        {/* Column: En Preparación */}
        <div className="flex flex-col bg-slate-100/50 rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 bg-blue-100 text-blue-800 font-bold flex justify-between items-center shrink-0">
            <span>En Preparación</span>
            <span className="bg-blue-800 text-blue-50 px-2 py-0.5 rounded-full text-xs">{enPreparacion.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {enPreparacion.length === 0 ? (
              <p className="text-center text-slate-400 text-sm mt-10">Sin pedidos en preparación</p>
            ) : (
              enPreparacion.map((order) => <OrderCard key={order.id} order={order} currentStatus="en_preparacion" updateOrderStatus={updateOrderStatus} />)
            )}
          </div>
        </div>

        {/* Column: Listos */}
        <div className="flex flex-col bg-slate-100/50 rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 bg-emerald-100 text-emerald-800 font-bold flex justify-between items-center shrink-0">
            <span>Listos para Entregar</span>
            <span className="bg-emerald-800 text-emerald-50 px-2 py-0.5 rounded-full text-xs">{listos.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {listos.length === 0 ? (
              <p className="text-center text-slate-400 text-sm mt-10">Sin pedidos listos</p>
            ) : (
              listos.map((order) => <OrderCard key={order.id} order={order} currentStatus="listo" updateOrderStatus={updateOrderStatus} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
