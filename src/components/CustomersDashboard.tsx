import React, { useState, useMemo } from "react";
import { Customer, Order } from "../types";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  CheckCircle,
  XCircle,
  Eye,
  Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Pagination from "./Pagination";

interface CustomersDashboardProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  orders: Order[]; // to calculate historical data
}

export default function CustomersDashboard({
  customers,
  setCustomers,
  orders,
}: CustomersDashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      return (
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.documentNumber.includes(searchTerm) ||
        (c.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone || "").includes(searchTerm)
      );
    });
  }, [customers, searchTerm]);

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="flex-1 pb-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Clientes</h2>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, documento, teléfono..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Cliente</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Documento</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Contacto</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    No se encontraron clientes.
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                      customer.status === "inactivo" ? "opacity-60" : ""
                    }`}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{customer.name}</p>
                          {customer.address && (
                            <p className="text-xs text-slate-500 line-clamp-1">{customer.address}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-slate-700">{customer.documentNumber}</p>
                      <p className="text-xs text-slate-500">{customer.documentType}</p>
                    </td>
                    <td className="p-4">
                      {customer.phone && <p className="text-slate-600 text-xs mb-1">{customer.phone}</p>}
                      {customer.email && <p className="text-slate-600 text-xs">{customer.email}</p>}
                      {!customer.phone && !customer.email && <span className="text-slate-400 text-xs">Sin contacto</span>}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          customer.status === "activo"
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {customer.status === "activo" ? "Activo" : "Inactivo"}
                      </span>
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
  );
}
