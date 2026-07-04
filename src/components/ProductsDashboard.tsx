import React, { useState, useMemo, useEffect } from "react";
import { MenuItem, Category, InventoryItem, RecipeIngredient } from "../types";
import { Search, Plus, Edit2, Trash2, CheckCircle, XCircle, Package, Tag, Archive, Image as ImageIcon, Check, X, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Pagination from "./Pagination";
import { getInitials, getProductColor, hasImage } from "../lib/utils";

interface ProductsDashboardProps {
  products: MenuItem[];
  setProducts: React.Dispatch<React.SetStateAction<MenuItem[]>>;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  inventoryItems?: InventoryItem[];
}

export default function ProductsDashboard({
  products,
  setProducts,
  categories,
  setCategories,
  inventoryItems,
}: ProductsDashboardProps) {
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
  const getProductStock = (product: MenuItem) => {
    if (!product.recipe || product.recipe.length === 0) {
      return product.stock || 0;
    }
    if (!inventoryItems || inventoryItems.length === 0) {
      return 0;
    }
    let maxPortions = Infinity;
    for (const ing of product.recipe) {
      const raw = inventoryItems.find((item) => item.id === ing.itemId);
      if (!raw) return 0;
      const portions = Math.floor(raw.quantity / ing.quantity);
      if (portions < maxPortions) {
        maxPortions = portions;
      }
    }
    return maxPortions === Infinity ? 0 : maxPortions;
  };

  const [view, setView] = useState<"list" | "grid" | "form">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("Todos");
  const [filterStatus, setFilterStatus] = useState<string>("Todos");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [editingProduct, setEditingProduct] = useState<MenuItem | null>(null);

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Form State
  const [form, setForm] = useState({
    id: "",
    name: "",
    categoryId: "",
    category: "",
    description: "",
    price: "",
    cost: "",
    aplicaIva: true,
    image: "",
    stock: "",
    status: "activo" as "activo" | "inactivo",
    recipe: [] as RecipeIngredient[],
  });

  const [tempRecipeIng, setTempRecipeIng] = useState({ itemId: "", quantity: "" });
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({ ...prev, image: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  };

  const handleSaveCategory = () => {
    if (newCategoryName.trim()) {
      const newCat: Category = { id: 'CAT-' + Date.now(), name: newCategoryName.trim(), status: "activo" };
      setCategories(prev => [...prev, newCat]);
      setForm({ ...form, categoryId: newCat.id, category: newCat.name });
    }
    setIsCategoryModalOpen(false);
    setNewCategoryName("");
  };

  const handleEdit = (prod: MenuItem) => {
    setEditingProduct(prod);
    setForm({
      id: prod.id,
      name: prod.name,
      categoryId: prod.categoryId || "",
      category: prod.category,
      description: prod.description,
      price: prod.price.toString(),
      cost: prod.cost?.toString() || "",
      aplicaIva: prod.aplicaIva ?? true,
      image: prod.image,
      stock: prod.stock?.toString() || "",
      status: prod.status || "activo",
      recipe: prod.recipe || [],
    });
    setView("form");
  };

  const handleCreate = () => {
    setEditingProduct(null);
    setForm({
      id: `PROD-${Date.now()}`,
      name: "",
      categoryId: categories.length > 0 ? categories[0].id : "",
      category: categories.length > 0 ? categories[0].name : "",
      description: "",
      price: "",
      cost: "",
      aplicaIva: true,
      image: "",
      stock: "",
      status: "activo",
      recipe: [],
    });
    setView("form");
  };

  const computedCost = form.recipe.reduce((total, ing) => {
    const raw = inventoryItems.find(i => i.id === ing.itemId);
    return total + (raw?.unitCost || 0) * ing.quantity;
  }, 0);
  const isCostAuto = form.recipe.length > 0;

  const handleSave = () => {
    const finalCost = isCostAuto ? computedCost.toFixed(2) : form.cost;

    if (!form.name || !form.price || !form.category || !finalCost) {
      showAlert("Por favor, complete todos los campos obligatorios, incluyendo el costo.", "Campos Requeridos", "warning");
      return;
    }

    if (form.recipe.length === 0) {
      showAlert("La receta es obligatoria. Debe agregar al menos un ingrediente de la bodega.", "Receta Requerida", "warning");
      return;
    }

    const newProduct: MenuItem = {
      id: form.id,
      name: form.name,
      categoryId: form.categoryId,
      category: form.category,
      description: form.description,
      price: parseFloat(form.price) || 0,
      cost: parseFloat(finalCost) || 0,
      aplicaIva: form.aplicaIva,
      image: form.image || "",
      available: parseInt(form.stock) || 0,
      sold: editingProduct?.sold || 0,
      status: form.status,
      stock: parseInt(form.stock) || 0,
      stockMinimo: 10,
      recipe: form.recipe,
      createdAt: editingProduct?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingProduct) {
      setProducts((prev) => prev.map((p) => (p.id === newProduct.id ? newProduct : p)));
    } else {
      // Check for duplicates
      if (products.some((p) => p.name.toLowerCase() === newProduct.name.toLowerCase() && p.category === newProduct.category)) {
        showAlert("Ya existe un producto con el mismo nombre y categoría.", "Producto Duplicado", "error");
        return;
      }
      setProducts((prev) => [newProduct, ...prev]);
    }
    setView("list");
  };

  const toggleStatus = (prod: MenuItem) => {
    const newStatus = prod.status === "inactivo" ? "activo" : "inactivo";
    setProducts((prev) =>
      prev.map((p) => (p.id === prod.id ? { ...p, status: newStatus } : p))
    );
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      let match = true;
      if (searchQuery) {
        match =
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.id.toLowerCase().includes(searchQuery.toLowerCase());
      }
      if (match && filterCategory !== "Todos") {
        match = p.category === filterCategory;
      }
      if (match && filterStatus !== "Todos") {
        match = p.status === filterStatus;
      }
      return match;
    });
  }, [products, searchQuery, filterCategory, filterStatus]);

  const formatCurrency = (value: number) => {
    return `USD/ ${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
  };
  
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Auto-update categoryName when categoryId changes
  useEffect(() => {
    if (form.categoryId) {
      const cat = categories.find((c) => c.id === form.categoryId);
      if (cat) {
        setForm((prev) => ({ ...prev, category: cat.name }));
      }
    }
  }, [form.categoryId, categories]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 pb-12">
      <div className="flex justify-between items-center mb-6 px-6 pt-6 shrink-0">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Package className="w-6 h-6 text-indigo-600" />
          Productos y Menú
        </h2>
        {view !== "form" ? (
          <div className="flex gap-2">
            <button
              onClick={() => setView(view === "list" ? "grid" : "list")}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold py-2 px-4 rounded-xl text-sm transition-colors shadow-sm"
            >
              Vista {view === "list" ? "Tarjetas" : "Lista"}
            </button>
            <button
              onClick={handleCreate}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl text-sm flex items-center gap-2 shadow-sm shadow-indigo-200 transition-colors"
            >
              <Plus className="w-4 h-4" /> Nuevo Producto
            </button>
          </div>
        ) : (
          <button
            onClick={() => setView("list")}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold py-2 px-4 rounded-xl text-sm transition-colors shadow-sm"
          >
            Volver
          </button>
        )}
      </div>

      {view !== "form" && (
        <div className="flex-1 flex flex-col px-6 overflow-hidden">
          <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm mb-6 shrink-0 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar producto por nombre o código..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="Todos">Todas las Categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="Todos">Todos los Estados</option>
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto rounded-2xl flex flex-col">
            {paginatedProducts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm">
                <Archive className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="font-bold text-slate-500 mb-1">No hay productos</h3>
                <p className="text-sm text-slate-400">Intenta buscar con otros filtros o crea uno nuevo.</p>
              </div>
            ) : view === "list" ? (
              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                      <th className="p-4 font-bold">Producto</th>
                      <th className="p-4 font-bold">Categoría</th>
                      <th className="p-4 font-bold">Precio</th>
                      <th className="p-4 font-bold">IVA</th>
                      <th className="p-4 font-bold">Stock</th>
                      <th className="p-4 font-bold text-center">Estado</th>
                      <th className="p-4 font-bold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {paginatedProducts.map((p) => (
                      <tr key={p.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${p.status === 'inactivo' ? 'opacity-70' : ''}`}>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {hasImage(p.image) ? (
                              <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover bg-slate-100" />
                            ) : (
                              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getProductColor(p.name)} flex items-center justify-center font-bold text-[11px] shadow-sm select-none`}>
                                {getInitials(p.name)}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-slate-800">{p.name}</div>
                              <div className="text-xs text-slate-400">{p.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-slate-600 font-medium">
                          <span className="bg-slate-100 px-2 py-1 rounded-md text-xs">{p.category}</span>
                        </td>
                        <td className="p-4 font-bold text-indigo-600">{formatCurrency(p.price)}</td>
                        <td className="p-4 text-slate-600">{p.aplicaIva ? "Sí (15%)" : "No"}</td>
                        <td className="p-4">
                          {(() => {
                            const currentStock = getProductStock(p);
                            return (
                              <span className={`font-bold ${currentStock <= (p.stockMinimo || 0) ? "text-red-500" : "text-slate-600"}`}>
                                {currentStock}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => toggleStatus(p)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                              p.status === "activo"
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            }`}
                          >
                            {p.status === "activo" ? "ACTIVO" : "INACTIVO"}
                          </button>
                        </td>
                        <td className="p-4 text-right space-x-2 whitespace-nowrap">
                          <button onClick={() => handleEdit(p)} className="p-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 rounded-lg transition-all shadow-sm" title="Editar">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {paginatedProducts.map((p) => (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md ${p.status === 'inactivo' ? 'opacity-70 grayscale-[0.3]' : ''}`}
                  >
                    <div className="h-40 bg-slate-100 relative">
                      {hasImage(p.image) ? (
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${getProductColor(p.name)} flex items-center justify-center font-extrabold text-3xl shadow-inner select-none`}>
                          {getInitials(p.name)}
                        </div>
                      )}
                      <div className="absolute top-3 right-3 flex gap-2">
                        <span className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold text-slate-700 shadow-sm">
                          {p.category}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-slate-800 text-lg leading-tight">{p.name}</h3>
                          <p className="text-xs text-slate-400 mt-1">{p.id}</p>
                        </div>
                        <span className="font-black text-indigo-600">{formatCurrency(p.price)}</span>
                      </div>
                      <p className="text-sm text-slate-500 mb-4 line-clamp-2 flex-1">{p.description || "Sin descripción"}</p>
                      
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                        <button
                          onClick={() => toggleStatus(p)}
                          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                            p.status === "activo" ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {p.status === "activo" ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          {p.status === "activo" ? "Activo" : "Inactivo"}
                        </button>
                        <button onClick={() => handleEdit(p)} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                          Editar
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            {totalPages > 1 && (
              <div className="mt-6">
                <Pagination 
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {view === "form" && (
        <div className="flex-1 overflow-y-auto px-6">
          <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-800 p-6 md:p-8 text-white">
              <h3 className="text-2xl font-bold flex items-center gap-3">
                <Tag className="w-6 h-6 text-indigo-400" />
                {editingProduct ? "Editar Producto" : "Nuevo Producto"}
              </h3>
              <p className="text-slate-400 mt-2 text-sm">
                {editingProduct ? `Modificando detalles de ${editingProduct.name}` : "Completa la información para registrar un nuevo producto en el menú."}
              </p>
            </div>
            
            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Image Preview */}
              <div className="col-span-1 flex flex-col gap-4">
                <label 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  htmlFor="product-image-upload"
                  className={`w-full aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden relative group cursor-pointer transition-all ${isDragging ? 'bg-indigo-50 border-indigo-400' : 'bg-slate-100 border-slate-200 hover:bg-slate-50'}`}
                >
                  {hasImage(form.image) ? (
                    <>
                      <img src={form.image} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <span className="text-white font-medium text-sm">Cambiar Imagen</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={`absolute inset-0 bg-gradient-to-br ${getProductColor(form.name || "Nuevo Producto")} flex items-center justify-center font-extrabold text-4xl shadow-inner select-none opacity-80 group-hover:opacity-50 transition-opacity`}>
                        {getInitials(form.name)}
                      </div>
                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-4">
                        <ImageIcon className="w-10 h-10 mb-2" />
                        <span className="font-bold text-xs text-center">{isDragging ? 'Suelta la imagen aquí' : 'Subir o arrastrar imagen'}</span>
                      </div>
                    </>
                  )}
                  <input
                    id="product-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Form Fields */}
              <div className="col-span-1 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre del Producto *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ej. Hamburguesa Clásica"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Categoría *</label>
                  <select
                    value={form.categoryId || form.category}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'new') {
                        setIsCategoryModalOpen(true);
                        return;
                      }
                      
                      const cat = categories.find(c => c.id === val);
                      if (cat) {
                        setForm({ ...form, categoryId: cat.id, category: cat.name });
                      } else {
                        setForm({ ...form, categoryId: "", category: val });
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Seleccionar...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                    <option value="new" className="font-bold text-indigo-600">+ Crear nueva categoría</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Estado</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as "activo"|"inactivo" })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="activo">Activo (Visible en ventas)</option>
                    <option value="inactivo">Inactivo (Oculto)</option>
                  </select>
                </div>



                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Precio de Venta *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      placeholder="0.00"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-3 text-sm font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Monto Invertido (Calculado Automáticamente)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-slate-400 font-bold">USD/</span>
                    <input
                      type="text"
                      value={computedCost.toFixed(2)}
                      readOnly
                      className="w-full bg-slate-100 border border-slate-200 text-slate-600 rounded-xl pl-14 pr-4 py-3 text-sm font-bold focus:outline-none cursor-not-allowed opacity-80"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Se suma con el precio de compra en materia prima.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Stock Disponible (Calculado de Bodega)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-slate-400 font-bold">Cant.</span>
                    <input
                      type="text"
                      value={(() => {
                        const tempProduct = { ...(editingProduct || {}), recipe: form.recipe } as MenuItem;
                        return getProductStock(tempProduct);
                      })()}
                      readOnly
                      className="w-full bg-slate-100 border border-slate-200 text-slate-600 rounded-xl pl-14 pr-4 py-3 text-sm font-bold focus:outline-none cursor-not-allowed opacity-80"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Calculado según el ingrediente con menor disponibilidad en bodega.</p>
                </div>



              </div>
              
              {/* Recipe / BOM Section */}
              <div className="mt-8 border-t border-slate-100 pt-8">
                <h4 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-500" />
                  Receta / Ficha Técnica
                </h4>
                <p className="text-sm text-slate-500 mb-6">Agrega los ingredientes de la Bodega que componen este plato. Se descontarán automáticamente al vender.</p>
                
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-4">
                  <div className="flex flex-col md:flex-row gap-3">
                    <select
                      value={tempRecipeIng.itemId}
                      onChange={(e) => setTempRecipeIng({ ...tempRecipeIng, itemId: e.target.value })}
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="">Seleccionar ingrediente de Bodega...</option>
                      {inventoryItems?.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.unit})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={tempRecipeIng.quantity}
                      onChange={(e) => setTempRecipeIng({ ...tempRecipeIng, quantity: e.target.value })}
                      placeholder="Cantidad"
                      className="w-full md:w-32 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (tempRecipeIng.itemId && parseFloat(tempRecipeIng.quantity) > 0) {
                          setForm({
                            ...form,
                            recipe: [...form.recipe, { itemId: tempRecipeIng.itemId, quantity: parseFloat(tempRecipeIng.quantity) }]
                          });
                          setTempRecipeIng({ itemId: "", quantity: "" });
                        }
                      }}
                      className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors whitespace-nowrap"
                    >
                      Añadir
                    </button>
                  </div>
                </div>

                {form.recipe.length > 0 && (
                  <div className="space-y-2">
                    {form.recipe.map((ing, idx) => {
                      const raw = inventoryItems?.find((i) => i.id === ing.itemId);
                      return (
                        <div key={idx} className="flex justify-between items-center bg-white border border-slate-200 p-3 rounded-xl shadow-sm">
                          <span className="font-medium text-slate-700">{raw?.name || "Ingrediente"}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-lg font-bold">
                              {ing.quantity} {raw?.unit || ""}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const newRecipe = [...form.recipe];
                                newRecipe.splice(idx, 1);
                                setForm({ ...form, recipe: newRecipe });
                              }}
                              className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 p-6 md:px-8 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setView("list")}
                className="px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-transform active:scale-95 flex items-center gap-2"
              >
                <Check className="w-5 h-5" />
                Guardar Producto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Nueva Categoría</h3>
              <button 
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre de la categoría</label>
              <input
                type="text"
                autoFocus
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveCategory()}
                placeholder="Ej. Postres"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setNewCategoryName("");
                  setForm({ ...form, categoryId: "", category: "" }); // Reset select
                }}
                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCategory}
                className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
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
