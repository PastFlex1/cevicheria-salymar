import React, { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { collection, doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import * as ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { motion, AnimatePresence } from "motion/react";
import { validarDocumento } from "./lib/validators";
import {
  Plus,
  Minus,
  LayoutGrid,
  ClipboardList,
  History,
  ReceiptText,
  FileText,
  Bell,
  ChevronRight,
  Sunrise,
  Package,
  X,
  Truck,
  Phone,
  MapPin,
  Store,
  User,
  Wallet,
  Search,
  UserPlus,
  Send,
  ShieldCheck,
  Globe,
  CheckCircle,
  Printer,
  Pencil,
  Trash2,
  BarChart3,
  AlertCircle,
  Download,
  ChefHat,
  PackageOpen,
  Users,
} from "lucide-react";
import {
  CATEGORIES,
  INVENTORY_ITEMS,
  INVENTORY_COMIDAS,
  INVENTORY_BEBIDAS,
  INVENTORY_COMBOS,
  PROVIDERS,
} from "./data";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  MenuItem,
  OrderItem,
  InventoryItem,
  ComidaItem,
  ComboItem,
  Provider,
  RecipeIngredient,
  Order,
  Expense,
  OrderType,
  OrderStatus,
  Customer,
  Category,
} from "./types";
import { CustomSelect } from "./components/CustomSelect";
import ReportsDashboard from "./components/ReportsDashboard";
import KitchenDashboard from "./components/KitchenDashboard";
import OrdersManager from "./components/OrdersManager";
import BillingDashboard from "./components/BillingDashboard";
import ProductsDashboard from "./components/ProductsDashboard";
import CustomersDashboard from "./components/CustomersDashboard";

// Utility for currency formatting
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};



export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("Dashboard");
  const [billingOrder, setBillingOrder] = useState<Order | null>(null);
  const [reportStartDate, setReportStartDate] = useState<string>("");
  const [reportEndDate, setReportEndDate] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string>("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [tableNumber, setTableNumber] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("mesa");
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);
  const [checkoutForm, setCheckoutForm] = useState({
    documentId: "",
    businessName: "",
    email: "",
    phone: "",
    address: "",
    paymentMethod: "Efectivo" as
      "Efectivo" | "Transferencia" | "Tarjeta" | "Crédito" | "Otro",
  });
  const [sriStatus, setSriStatus] = useState<
    "idle" | "signing" | "receiving" | "authorizing" | "done"
  >("idle");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [validationError, setValidationError] = useState<string | null>(null);

  const [categoriesSeeded, setCategoriesSeeded] = useState(false);
  const [customerSeeded, setCustomerSeeded] = useState(false);

  // Inventory and Other States
  const [providers, setProvidersState] = useState<Provider[]>([]);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [newProviderForm, setNewProviderForm] = useState({
    id: "",
    name: "",
    contactName: "",
    phone: "",
    category: "Pescados y Mariscos",
    address: "",
  });
  const [providerToDelete, setProviderToDelete] = useState<string | null>(null);

  // Expense State
  const [expenses, setExpensesState] = useState<Expense[]>([]);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [newExpenseForm, setNewExpenseForm] = useState({
    description: "",
    amount: "",
    category: "Servicios" as Expense["category"],
  });

  const [inventoryTab, setInventoryTab] = useState<
    "Materia Prima" | "Comidas" | "Bebidas" | "Combos"
  >("Materia Prima");
  const [inventoryItems, setInventoryItemsState] = useState<InventoryItem[]>([]);
  const [inventoryComidas, setInventoryComidasState] = useState<ComidaItem[]>([]);
  const [inventoryBebidas, setInventoryBebidasState] = useState<InventoryItem[]>([]);

  const [menuCategories, setMenuCategoriesState] = useState<Category[]>([]);
  const [menuProducts, setMenuProductsState] = useState<MenuItem[]>([]);
  const [inventoryCombos, setInventoryCombosState] = useState<ComboItem[]>([]);
  const [salesNotes, setSalesNotesState] = useState<Order[]>([]);
  const [customers, setCustomersState] = useState<Customer[]>([]);

  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [newItemForm, setNewItemForm] = useState({
    id: "",
    name: "",
    quantity: "",
    unit: "kg",
    minQuantity: "",
    category: "Pescados y Mariscos",
    price: "",
    ingredients: [] as RecipeIngredient[],
    comboItems: [] as RecipeIngredient[],
    purchaseCost: "",
  });
  const [tempIng, setTempIng] = useState({ itemId: "", quantity: "" });
  const [tempComboItem, setTempComboItem] = useState({
    itemId: "",
    quantity: "",
  });

  const checkoutValidation = validarDocumento(checkoutForm.documentId === "9999999999999" ? "CONSUMIDOR_FINAL" : (checkoutForm.documentId.length === 10 ? "CEDULA" : (checkoutForm.documentId.length === 13 ? "RUC" : "PASAPORTE")), checkoutForm.documentId);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Sincronización en tiempo real con Firestore
  useEffect(() => {
    const unsubProviders = onSnapshot(collection(db, "providers"), (snapshot) => {
      setProvidersState(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Provider)));
    });
    const unsubExpenses = onSnapshot(collection(db, "expenses"), (snapshot) => {
      setExpensesState(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Expense)));
    });
    const unsubInvItems = onSnapshot(collection(db, "inventoryItems"), (snapshot) => {
      setInventoryItemsState(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as InventoryItem)));
    });
    const unsubInvComidas = onSnapshot(collection(db, "inventoryComidas"), (snapshot) => {
      setInventoryComidasState(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ComidaItem)));
    });
    const unsubInvBebidas = onSnapshot(collection(db, "inventoryBebidas"), (snapshot) => {
      setInventoryBebidasState(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as InventoryItem)));
    });
    const unsubInvCombos = onSnapshot(collection(db, "inventoryCombos"), (snapshot) => {
      setInventoryCombosState(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ComboItem)));
    });
    const unsubCategories = onSnapshot(collection(db, "menuCategories"), (snapshot) => {
      setMenuCategoriesState(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Category)));
    });
    const unsubProducts = onSnapshot(collection(db, "menuProducts"), (snapshot) => {
      setMenuProductsState(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as MenuItem)));
    });
    const unsubSalesNotes = onSnapshot(collection(db, "salesNotes"), (snapshot) => {
      setSalesNotesState(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order)));
    });
    const unsubCustomers = onSnapshot(collection(db, "customers"), (snapshot) => {
      setCustomersState(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Customer)));
    });

    return () => {
      unsubProviders();
      unsubExpenses();
      unsubInvItems();
      unsubInvComidas();
      unsubInvBebidas();
      unsubInvCombos();
      unsubCategories();
      unsubProducts();
      unsubSalesNotes();
      unsubCustomers();
    };
  }, []);

  // Inicializar datos base en Firestore si están vacíos
  useEffect(() => {
    if (menuCategories.length === 0 && !isLoading && !categoriesSeeded) {
      setCategoriesSeeded(true);
      const defaultCategories = [
        { id: "CAT-1", name: "Ceviches", status: "activo" },
        { id: "CAT-2", name: "Chicharrones y Jaleas", status: "activo" },
        { id: "CAT-3", name: "Chaulafan y Arroz", status: "activo" },
        { id: "CAT-4", name: "Sopas y Sudados", status: "activo" },
        { id: "CAT-5", name: "Bebidas", status: "activo" },
        { id: "CAT-6", name: "Cervezas", status: "activo" },
        { id: "CAT-7", name: "Guarniciones / Extras", status: "activo" },
        { id: "CAT-8", name: "Combos", status: "activo" },
      ];
      defaultCategories.forEach(async (cat) => {
        await setDoc(doc(db, "menuCategories", cat.id), cat);
      });
    }
  }, [menuCategories, isLoading, categoriesSeeded]);

  useEffect(() => {
    if (customers.length === 0 && !isLoading && !customerSeeded) {
      setCustomerSeeded(true);
      const defaultCustomer = {
        id: "CUST-DEFAULT",
        name: "Consumidor Final",
        documentType: "Consumidor Final",
        documentNumber: "9999999999999",
        address: "Sin dirección",
        status: "activo",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        totalPurchases: 0,
        numberOfPurchases: 0
      };
      setDoc(doc(db, "customers", defaultCustomer.id), defaultCustomer);
    }
  }, [customers, isLoading, customerSeeded]);


  const syncDiff = async <Item extends { id: string }>(
    collectionName: string,
    current: Item[],
    next: Item[]
  ) => {
    const nextMap = new Map(next.map(item => [item.id, item]));
    const currentMap = new Map(current.map(item => [item.id, item]));

    for (const item of next) {
      const curItem = currentMap.get(item.id);
      if (!curItem || JSON.stringify(curItem) !== JSON.stringify(item)) {
        await setDoc(doc(db, collectionName, item.id), item);
      }
    }

    for (const item of current) {
      if (!nextMap.has(item.id)) {
        await deleteDoc(doc(db, collectionName, item.id));
      }
    }
  };

  const setProviders = (value: React.SetStateAction<Provider[]>) => {
    const next = typeof value === "function" ? (value as Function)(providers) : value;
    setProvidersState(next);
    syncDiff("providers", providers, next);
  };

  const setExpenses = (value: React.SetStateAction<Expense[]>) => {
    const next = typeof value === "function" ? (value as Function)(expenses) : value;
    setExpensesState(next);
    syncDiff("expenses", expenses, next);
  };

  const setInventoryItems = (value: React.SetStateAction<InventoryItem[]>) => {
    const next = typeof value === "function" ? (value as Function)(inventoryItems) : value;
    setInventoryItemsState(next);
    syncDiff("inventoryItems", inventoryItems, next);
  };

  const setInventoryComidas = (value: React.SetStateAction<ComidaItem[]>) => {
    const next = typeof value === "function" ? (value as Function)(inventoryComidas) : value;
    setInventoryComidasState(next);
    syncDiff("inventoryComidas", inventoryComidas, next);
  };

  const setInventoryBebidas = (value: React.SetStateAction<InventoryItem[]>) => {
    const next = typeof value === "function" ? (value as Function)(inventoryBebidas) : value;
    setInventoryBebidasState(next);
    syncDiff("inventoryBebidas", inventoryBebidas, next);
  };

  const setMenuCategories = (value: React.SetStateAction<Category[]>) => {
    const next = typeof value === "function" ? (value as Function)(menuCategories) : value;
    setMenuCategoriesState(next);
    syncDiff("menuCategories", menuCategories, next);
  };

  const setMenuProducts = (value: React.SetStateAction<MenuItem[]>) => {
    const next = typeof value === "function" ? (value as Function)(menuProducts) : value;
    setMenuProductsState(next);
    syncDiff("menuProducts", menuProducts, next);
  };

  const setInventoryCombos = (value: React.SetStateAction<ComboItem[]>) => {
    const next = typeof value === "function" ? (value as Function)(inventoryCombos) : value;
    setInventoryCombosState(next);
    syncDiff("inventoryCombos", inventoryCombos, next);
  };

  const setSalesNotes = (value: React.SetStateAction<Order[]>) => {
    const next = typeof value === "function" ? (value as Function)(salesNotes) : value;
    setSalesNotesState(next);
    syncDiff("salesNotes", salesNotes, next);
  };

  const setCustomers = (value: React.SetStateAction<Customer[]>) => {
    const next = typeof value === "function" ? (value as Function)(customers) : value;
    setCustomersState(next);
    syncDiff("customers", customers, next);
  };


  const handleOpenModal = () => {
    let defaultCategory = "Pescados y Mariscos";
    if (inventoryTab === "Bebidas") defaultCategory = "Gaseosas";
    else if (inventoryTab === "Comidas") defaultCategory = "Ceviches";
    else if (inventoryTab === "Combos") defaultCategory = "Combos";

    setNewItemForm({
      id: "",
      name: "",
      quantity: "",
      unit: inventoryTab === "Bebidas" ? "L" : "kg",
      minQuantity: "",
      category: defaultCategory,
      price: "",
      ingredients: [],
      comboItems: [],
      purchaseCost: "",
    });
    setTempIng({ itemId: "", quantity: "" });
    setTempComboItem({ itemId: "", quantity: "" });
    setIsInventoryModalOpen(true);
  };

  const calculateMaxComidas = (comida: ComidaItem) => {
    let max = Infinity;
    if (!comida.ingredients || comida.ingredients.length === 0) return -1;
    for (const ing of comida.ingredients) {
      const rawMaterial = inventoryItems.find((i) => i.id === ing.itemId);
      if (!rawMaterial) return 0;
      const canMake = Math.floor(rawMaterial.quantity / ing.quantity);
      if (canMake < max) max = canMake;
    }
    return max === Infinity ? 0 : max;
  };

  const calculateMaxCombos = (combo: ComboItem) => {
    let max = Infinity;
    if (!combo.items || combo.items.length === 0) return -1;
    for (const item of combo.items) {
      const isComida = inventoryComidas.find((c) => c.id === item.itemId);
      const isBebida = inventoryBebidas.find((b) => b.id === item.itemId);

      if (isBebida) {
        const canMake = Math.floor(isBebida.quantity / item.quantity);
        if (canMake < max) max = canMake;
      } else if (isComida) {
        const canMakeComida = calculateMaxComidas(isComida);
        const canMakeCombo = Math.floor(canMakeComida / item.quantity);
        if (canMakeCombo < max) max = canMakeCombo;
      } else {
        return 0;
      }
    }
    return max === Infinity ? 0 : max;
  };

  // Derived state for cart
  const total = cartItems.reduce(
    (sum, item) => sum + item.menuItem.price * item.quantity,
    0,
  );
  const taxRate = 0.15; // 15% IVA
  const subtotal = total / (1 + taxRate);
  const tax = total - subtotal;

  // Seed cevicheria categories if empty
  useEffect(() => {
    if (menuCategories.length === 0) {
      setMenuCategories([
        { id: "CAT-1", name: "Ceviches", status: "activo" },
        { id: "CAT-2", name: "Chicharrones y Jaleas", status: "activo" },
        { id: "CAT-3", name: "Chaulafan y Arroz", status: "activo" },
        { id: "CAT-4", name: "Sopas y Sudados", status: "activo" },
        { id: "CAT-5", name: "Bebidas", status: "activo" },
        { id: "CAT-6", name: "Cervezas", status: "activo" },
        { id: "CAT-7", name: "Guarniciones / Extras", status: "activo" },
        { id: "CAT-8", name: "Combos", status: "activo" },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Migrate legacy inventory to new products module if needed
  useEffect(() => {
    if (menuProducts.length === 0 && inventoryComidas.length > 0) {
      let nextCats = [...menuCategories];
      let nextProds = [...menuProducts];

      const addCategory = (name: string) => {
        let cat = nextCats.find(c => c.name === name);
        if (!cat) {
          cat = { id: 'CAT-' + Date.now() + Math.floor(Math.random()*1000), name, status: 'activo' };
          nextCats.push(cat);
        }
        return cat;
      };

      inventoryComidas.forEach(c => {
        const cat = addCategory(c.category);
        nextProds.push({
          id: c.id,
          name: c.name,
          categoryId: cat.id,
          category: cat.name,
          description: c.ingredients
            ?.map(i => inventoryItems.find(inv => inv.id === i.itemId)?.name)
            .filter(Boolean).join(", ") || "Plato especial",
          price: c.price || 0,
          aplicaIva: true,
          image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",
          available: 0,
          sold: 0,
          status: "activo",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
      inventoryBebidas.forEach(b => {
        const cat = addCategory(b.category);
        nextProds.push({
          id: b.id,
          name: b.name,
          categoryId: cat.id,
          category: cat.name,
          description: `Bebida (${b.quantity} ${b.unit} stock)`,
          price: typeof b.price === 'string' ? parseFloat(b.price) || 0 : b.price || 0,
          aplicaIva: true,
          image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",
          available: b.quantity,
          sold: 0,
          status: "activo",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
      inventoryCombos.forEach(c => {
        const cat = addCategory(c.category || "Combos");
        nextProds.push({
          id: c.id,
          name: c.name,
          categoryId: cat.id,
          category: cat.name,
          description: "Combo especial",
          price: c.price || 0,
          aplicaIva: true,
          image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",
          available: 0,
          sold: 0,
          status: "activo",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });

      setMenuCategories(nextCats);
      setMenuProducts(nextProds);
    }
  }, [inventoryComidas, inventoryBebidas, inventoryCombos, menuProducts.length, menuCategories]);

  // Generate menu items from inventory
  const activeProducts = menuProducts.filter(p => p.status !== "inactivo");
  const menuItems: MenuItem[] = activeProducts.map((p) => {
    let dynamicAvailable = p.stock || 999;
    const isComida = inventoryComidas.find((c) => c.id === p.id);
    if (isComida) dynamicAvailable = calculateMaxComidas(isComida);
    const isBebida = inventoryBebidas.find((b) => b.id === p.id);
    if (isBebida) dynamicAvailable = isBebida.quantity;
    const isCombo = inventoryCombos.find((c) => c.id === p.id);
    if (isCombo) dynamicAvailable = calculateMaxCombos(isCombo);

    return {
      ...p,
      available: dynamicAvailable,
    };
  });

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory =
      activeCategory === "Todos" || item.category === activeCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getQuantity = (id: string) => {
    return cartItems.find((item) => item.menuItem.id === id)?.quantity || 0;
  };

  const updateObservation = (menuItem: MenuItem, observation: string) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.menuItem.id === menuItem.id);
      if (existing) {
        return prev.map((item) =>
          item.menuItem.id === menuItem.id
            ? { ...item, observation }
            : item
        );
      }
      return prev;
    });
  };

  const updateQuantity = (menuItem: MenuItem, delta: number) => {
    // Validar inventario si se agrega al carrito
    if (delta > 0 && menuItem.recipe && menuItem.recipe.length > 0) {
      let isStockSufficient = true;
      let missingIngredient = "";

      for (const ing of menuItem.recipe) {
        const raw = inventoryItems.find((r) => r.id === ing.itemId);
        if (raw) {
          let totalRequiredInCart = 0;
          for (const cItem of cartItems) {
            if (cItem.menuItem.id === menuItem.id) {
              totalRequiredInCart += ing.quantity * (cItem.quantity + delta);
            } else if (cItem.menuItem.recipe) {
              const matchingIng = cItem.menuItem.recipe.find(r => r.itemId === ing.itemId);
              if (matchingIng) {
                totalRequiredInCart += matchingIng.quantity * cItem.quantity;
              }
            }
          }
          
          if (!cartItems.some(cItem => cItem.menuItem.id === menuItem.id)) {
            totalRequiredInCart += ing.quantity * delta;
          }

          if (totalRequiredInCart > raw.quantity) {
            isStockSufficient = false;
            missingIngredient = raw.name;
            break;
          }
        }
      }

      if (!isStockSufficient) {
        alert(`No hay suficiente stock de "${missingIngredient}" en la Bodega para preparar este producto.`);
        return;
      }
    }

    setCartItems((prev) => {
      const existing = prev.find((item) => item.menuItem.id === menuItem.id);
      if (existing) {
        const newQuantity = Math.max(0, existing.quantity + delta);
        if (newQuantity === 0) {
          return prev.filter((item) => item.menuItem.id !== menuItem.id);
        }
        return prev.map((item) =>
          item.menuItem.id === menuItem.id
            ? { ...item, quantity: newQuantity }
            : item,
        );
      }
      if (delta > 0) {
        return [...prev, { menuItem, quantity: 1 }];
      }
      return prev;
    });
  };


  const [documentType, setDocumentType] = useState<"nota" | "factura">("nota");

  const updateInventory = (
    orderItems: OrderItem[],
    isRestore: boolean = false,
  ) => {
    let updatedMateriaPrima = [...inventoryItems];
    let updatedBebidas = [...inventoryBebidas];
    const multiplier = isRestore ? 1 : -1;

    for (const orderItem of orderItems) {
      const { id, quantity } = {
        id: orderItem.menuItem.id,
        quantity: orderItem.quantity,
      };

      // check if it's a bebida
      const bebida = updatedBebidas.find((b) => b.id === id);
      if (bebida) {
        bebida.quantity += quantity * multiplier;
        continue;
      }

      // check if the menuItem has a recipe
      if (orderItem.menuItem.recipe && orderItem.menuItem.recipe.length > 0) {
        for (const ing of orderItem.menuItem.recipe) {
          const raw = updatedMateriaPrima.find((r) => r.id === ing.itemId);
          if (raw) {
            raw.quantity += ing.quantity * quantity * multiplier;
          }
        }
      }

      // check if it's a comida
      const comida = inventoryComidas.find((c) => c.id === id);
      if (comida) {
        for (const ing of comida.ingredients) {
          const raw = updatedMateriaPrima.find((r) => r.id === ing.itemId);
          if (raw) {
            raw.quantity += ing.quantity * quantity * multiplier;
          }
        }
        continue;
      }

      // check if it's a combo
      const combo = inventoryCombos.find((c) => c.id === id);
      if (combo) {
        for (const comboItem of combo.items) {
          const isComida = inventoryComidas.find(
            (c) => c.id === comboItem.itemId,
          );
          const isBebida = updatedBebidas.find(
            (b) => b.id === comboItem.itemId,
          );
          if (isBebida) {
            isBebida.quantity += comboItem.quantity * quantity * multiplier;
          } else if (isComida) {
            for (const ing of isComida.ingredients) {
              const raw = updatedMateriaPrima.find((r) => r.id === ing.itemId);
              if (raw) {
                raw.quantity +=
                  ing.quantity * comboItem.quantity * quantity * multiplier;
              }
            }
          }
        }
      }
    }

    setInventoryItems(updatedMateriaPrima);
    setInventoryBebidas(updatedBebidas);
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    setCheckoutForm({
      documentId: "9999999999999",
      businessName: "Consumidor Final",
      email: "",
      phone: "",
      address: "",
      paymentMethod: "Efectivo",
    });
    setSriStatus("idle");
    setIsCheckoutModalOpen(true);
  };

  const updateOrderStatus = (orderId: string, newStatus: OrderStatus, cancelReason?: string) => {
    setSalesNotes((prev) => 
      prev.map((order) => {
        if (order.id === orderId) {
          if (newStatus === "anulada") {
            updateInventory(order.items, true);
          }
          return { ...order, status: newStatus, cancelReason };
        }
        return order;
      })
    );
  };

  const editOrder = (order: Order) => {
    setCartItems(order.items);
    setCheckoutForm({
      documentId: order.ruc || "",
      businessName: order.businessName || order.customerName || "",
      email: "",
      phone: "",
      address: "",
      paymentMethod: order.paymentMethod || "Efectivo",
    });
    setTableNumber(order.tableNumber || "");
    setOrderType(order.orderType || "mesa");
    setEditingOrderId(order.id);
    setActiveTab("Dashboard");
  };

  const checkoutOrder = (order: Order) => {
    setBillingOrder(order);
    setActiveTab("Facturación");
  };

  const checkoutOrderLegacy = (order: Order) => {
    setCartItems(order.items);
    setCheckoutForm({
      documentId: order.ruc || "9999999999999",
      businessName: order.businessName || order.customerName || "Consumidor Final",
      email: "",
      phone: "",
      address: "",
      paymentMethod: order.paymentMethod || "Efectivo",
    });
    setTableNumber(order.tableNumber || "");
    setOrderType(order.orderType || "mesa");
    setEditingOrderId(order.id);
    setSriStatus("idle");
    setIsCheckoutModalOpen(true);
  };

  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [orderToAnular, setOrderToAnular] = useState<string | null>(null);

  const reportStartObj = reportStartDate ? new Date(reportStartDate) : null;
  if (reportStartObj) {
    const [year, month, day] = reportStartDate.split("-");
    reportStartObj.setFullYear(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
    );
    reportStartObj.setHours(0, 0, 0, 0);
  }
  const reportEndObj = reportEndDate ? new Date(reportEndDate) : null;
  if (reportEndObj) {
    const [year, month, day] = reportEndDate.split("-");
    reportEndObj.setFullYear(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
    );
    reportEndObj.setHours(23, 59, 59, 999);
  }

  const isDateInReportRange = (dateString: string) => {
    if (!dateString) return true;
    const d = new Date(dateString);
    if (reportStartObj && d < reportStartObj) return false;
    if (reportEndObj && d > reportEndObj) return false;
    return true;
  };

  const filteredSalesNotes = salesNotes.filter((o) =>
    isDateInReportRange(o.date),
  );
  const filteredExpensesList = expenses.filter((e) =>
    isDateInReportRange(e.date),
  );

  const downloadReport = async () => {
    const wb = new ExcelJS.Workbook();
    wb.creator = "SalyMar";
    wb.created = new Date();

    const formatCurrencyStr = '"$"#,##0.00';

    // Sheet 1: Resumen Dashboard
    const wsSummary = wb.addWorksheet("Dashboard y Gráficos");

    // Title
    wsSummary.mergeCells("A1", "D2");
    const titleCell = wsSummary.getCell("A1");
    titleCell.value = "REPORTE FINANCIERO - SALYMAR";
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
    }; // Blue-900
    titleCell.alignment = { vertical: "middle", horizontal: "center" };

    // Dates
    wsSummary.mergeCells("A3", "B3");
    wsSummary.getCell("A3").value =
      `Desde: ${reportStartDate ? new Date(reportStartDate).toLocaleDateString() : "Inicio"}`;
    wsSummary.getCell("A3").font = { bold: true };

    wsSummary.mergeCells("C3", "D3");
    wsSummary.getCell("C3").value =
      `Hasta: ${reportEndDate ? new Date(reportEndDate).toLocaleDateString() : "Hoy"}`;
    wsSummary.getCell("C3").font = { bold: true };

    const totalIngresos = filteredSalesNotes
      .filter((o) => o.status !== "anulada")
      .reduce((sum, o) => sum + o.total, 0);
    const totalEgresos = filteredExpensesList.reduce(
      (sum, e) => sum + e.amount,
      0,
    );
    const utilidad = totalIngresos - totalEgresos;

    // KPI Cards in Excel
    wsSummary.addRow([]);
    const kpiHeaders = wsSummary.addRow([
      "TOTAL INGRESOS",
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

    const kpiValues = wsSummary.addRow([totalIngresos, totalEgresos, utilidad]);
    kpiValues.font = { size: 14, bold: true };
    kpiValues.eachCell((cell, colNumber) => {
      cell.numFmt = formatCurrencyStr;
      cell.alignment = { horizontal: "center" };
      if (colNumber === 1)
        cell.font = { ...(cell.font as any), color: { argb: "FF16A34A" } };
      if (colNumber === 2)
        cell.font = { ...(cell.font as any), color: { argb: "FFDC2626" } };
      if (colNumber === 3)
        cell.font = {
          ...(cell.font as any),
          color: { argb: utilidad >= 0 ? "FF2563EB" : "FFDC2626" },
        };
    });

    // Breakdown for Charts Data
    wsSummary.addRow([]);
    wsSummary.addRow([]);

    const chartHeadersRow = wsSummary.addRow([
      "INGRESOS POR CATEGORÍA",
      "",
      "EGRESOS POR CATEGORÍA",
      "",
    ]);
    chartHeadersRow.font = { bold: true };
    chartHeadersRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFDBEAFE" },
    };
    chartHeadersRow.getCell(3).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFEE2E2" },
    };
    wsSummary.mergeCells(
      `A${chartHeadersRow.number}`,
      `B${chartHeadersRow.number}`,
    );
    wsSummary.mergeCells(
      `C${chartHeadersRow.number}`,
      `D${chartHeadersRow.number}`,
    );

    const subHeadersRow = wsSummary.addRow([
      "Categoría",
      "Total",
      "Categoría",
      "Total",
    ]);
    subHeadersRow.font = { bold: true };

    const salesByCategory = filteredSalesNotes
      .filter((o) => o.status !== "anulada")
      .reduce(
        (acc, order) => {
          order.items.forEach((item) => {
            const cat = item.menuItem.category || "Otros";
            acc[cat] = (acc[cat] || 0) + item.menuItem.price * item.quantity;
          });
          return acc;
        },
        {} as Record<string, number>,
      );

    const expensesByCategory = filteredExpensesList.reduce(
      (acc, exp) => {
        const cat = exp.category || "Otros";
        acc[cat] = (acc[cat] || 0) + exp.amount;
        return acc;
      },
      {} as Record<string, number>,
    );

    const salesKeys = Object.keys(salesByCategory);
    const expKeys = Object.keys(expensesByCategory);
    const maxRows = Math.max(salesKeys.length, expKeys.length);

    for (let i = 0; i < maxRows; i++) {
      const row = wsSummary.addRow([
        salesKeys[i] || "",
        salesKeys[i] ? salesByCategory[salesKeys[i]] : "",
        expKeys[i] || "",
        expKeys[i] ? expensesByCategory[expKeys[i]] : "",
      ]);
      row.getCell(2).numFmt = formatCurrencyStr;
      row.getCell(4).numFmt = formatCurrencyStr;
    }

    // TOP 5 Productos Más Vendidos
    wsSummary.addRow([]);
    wsSummary.addRow([]);
    const topProdHeader = wsSummary.addRow([
      "RANKING 5 PRODUCTOS MÁS VENDIDOS",
      "",
      "",
      "",
    ]);
    topProdHeader.font = { bold: true };
    topProdHeader.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFEF3C7" },
    }; // Amber-100
    wsSummary.mergeCells(
      `A${topProdHeader.number}`,
      `D${topProdHeader.number}`,
    );

    const topProdSubheader = wsSummary.addRow([
      "Producto",
      "Cantidad Vendida",
      "Total Recaudado",
      "",
    ]);
    topProdSubheader.font = { bold: true };
    wsSummary.mergeCells(
      `C${topProdSubheader.number}`,
      `D${topProdSubheader.number}`,
    );

    const topProductsObj = filteredSalesNotes
      .filter((o) => o.status !== "anulada")
      .reduce(
        (acc, order) => {
          order.items.forEach((item) => {
            const name = item.menuItem.name;
            if (!acc[name]) {
              acc[name] = { quantity: 0, revenue: 0 };
            }
            acc[name].quantity += item.quantity;
            acc[name].revenue += item.menuItem.price * item.quantity;
          });
          return acc;
        },
        {} as Record<string, { quantity: number; revenue: number }>,
      );

    const topProductsArray = Object.entries(topProductsObj)
      .map(([name, stats]: [string, any]) => ({
        name,
        quantity: stats.quantity,
        revenue: stats.revenue,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    topProductsArray.forEach((prod) => {
      const row = wsSummary.addRow([
        prod.name,
        prod.quantity,
        prod.revenue,
        "",
      ]);
      wsSummary.mergeCells(`C${row.number}`, `D${row.number}`);
      row.getCell(3).numFmt = formatCurrencyStr;
    });

    wsSummary.columns = [
      { width: 25 },
      { width: 20 },
      { width: 25 },
      { width: 20 },
    ];

    // Sheet 2: Ingresos
    const wsIngresos = wb.addWorksheet("Detalle Ingresos");
    wsIngresos.columns = [
      { header: "Fecha", key: "fecha", width: 20 },
      { header: "Documento", key: "doc", width: 15 },
      { header: "Estado", key: "estado", width: 15 },
      { header: "Total", key: "total", width: 15 },
      { header: "Productos", key: "productos", width: 50 },
    ];
    wsIngresos.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    wsIngresos.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF16A34A" },
    };

    filteredSalesNotes.forEach((o) => {
      const row = wsIngresos.addRow({
        fecha: new Date(o.date).toLocaleString(),
        doc: o.documentType,
        estado: o.status === "anulada" ? "Anulada" : "Completada",
        total: o.total,
        productos: o.items
          .map((i) => `${i.quantity}x ${i.menuItem.name}`)
          .join(", "),
      });
      row.getCell("total").numFmt = formatCurrencyStr;
      if (o.status === "anulada")
        row.font = { color: { argb: "FF94A3B8" }, strike: true };
    });

    // Sheet 3: Egresos
    const wsEgresos = wb.addWorksheet("Detalle Egresos");
    wsEgresos.columns = [
      { header: "Fecha", key: "fecha", width: 20 },
      { header: "Concepto", key: "concepto", width: 30 },
      { header: "Categoría", key: "categoria", width: 20 },
      { header: "Monto", key: "monto", width: 15 },
    ];
    wsEgresos.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    wsEgresos.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFDC2626" },
    };

    filteredExpensesList.forEach((e) => {
      const row = wsEgresos.addRow({
        fecha: new Date(e.date).toLocaleString(),
        concepto: e.concept,
        categoria: e.category,
        monto: e.amount,
      });
      row.getCell("monto").numFmt = formatCurrencyStr;
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(
      blob,
      `Reporte-Financiero-${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  const handleAnularOrder = (orderId: string) => {
    setOrderToAnular(orderId);
  };

  const confirmAnularOrder = () => {
    if (!orderToAnular) return;
    const orderIndex = salesNotes.findIndex((o) => o.id === orderToAnular);
    if (orderIndex !== -1 && salesNotes[orderIndex].status !== "anulada") {
      const newNotes = [...salesNotes];
      newNotes[orderIndex] = { ...newNotes[orderIndex], status: "anulada" };
      setSalesNotes(newNotes);
      updateInventory(newNotes[orderIndex].items, true);
    }
    setOrderToAnular(null);
  };

  const handleDeleteOrder = (orderId: string) => {
    setOrderToDelete(orderId);
  };

  const confirmDeleteOrder = () => {
    if (!orderToDelete) return;
    const orderIndex = salesNotes.findIndex((o) => o.id === orderToDelete);
    if (orderIndex !== -1) {
      const order = salesNotes[orderIndex];
      if (order.status !== "anulada") {
        updateInventory(order.items, true);
      }
      const newNotes = salesNotes.filter((o) => o.id !== orderToDelete);
      setSalesNotes(newNotes);
      if (previewOrder?.id === orderToDelete) {
        setPreviewOrder(null);
      }
    }
    setOrderToDelete(null);
  };


  const saveOrder = (status: OrderStatus = "pendiente") => {
    if (cartItems.length === 0) return;

    if (editingOrderId) {
      setSalesNotes((prev) => 
        prev.map((order) => {
          if (order.id === editingOrderId) {
            return {
              ...order,
              items: [...cartItems],
              subtotal,
              tax,
              total,
              tableNumber,
              orderType,
              customerName: checkoutForm.businessName || "Cliente Final",
              clientPhone: checkoutForm.phone,
              clientAddress: checkoutForm.address,
              status,
            };
          }
          return order;
        })
      );
    } else {
      const currentMaxId = salesNotes.reduce((max, note) => {
        const numId = parseInt(note.id.replace(/\D/g, ""), 10);
        return !isNaN(numId) && numId > max ? numId : max;
      }, 0);
      const nextIdNum = currentMaxId + 1;
      const nextIdStr = nextIdNum.toString().padStart(6, "0");

      const newOrder: Order = {
        id: `$${nextIdStr}`,
        items: [...cartItems],
        subtotal,
        tax,
        total,
        date: new Date().toISOString(),
        customerName: checkoutForm.businessName || "Cliente Final",
              clientPhone: checkoutForm.phone,
              clientAddress: checkoutForm.address,
        tableNumber,
        orderType,
        status,
      };

      setSalesNotes([newOrder, ...salesNotes]);
    }

    setCartItems([]);
    setCheckoutForm({
      documentId: "",
      businessName: "",
      email: "",
      phone: "",
      address: "",
      paymentMethod: "Efectivo",
    });
    setTableNumber("");
    setOrderType("mesa");
    setEditingOrderId(null);
    setActiveTab("Lista de Pedidos");
  };

  const processTransaction = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (
      documentType === "factura" &&
      (!checkoutForm.documentId || !checkoutForm.businessName)
    ) {
      setValidationError(
        "Por favor ingrese RUC y Razón Social para emitir factura.",
      );
      return;
    }

    if (documentType === "factura") {
      const validacionDoc = validarDocumento(checkoutForm.documentId === "9999999999999" ? "CONSUMIDOR_FINAL" : (checkoutForm.documentId.length === 10 ? "CEDULA" : (checkoutForm.documentId.length === 13 ? "RUC" : "PASAPORTE")), checkoutForm.documentId);
      if (!validacionDoc.valido) {
        setValidationError(`Documento inválido: ${validacionDoc.mensaje}`);
        return;
      }
    }

    if (documentType === "factura") {
      setSriStatus("signing");
      await new Promise((r) => setTimeout(r, 1000));
      setSriStatus("receiving");
      await new Promise((r) => setTimeout(r, 1000));
      setSriStatus("authorizing");
      await new Promise((r) => setTimeout(r, 1000));
      setSriStatus("done");
      await new Promise((r) => setTimeout(r, 1500)); // Show "Factura Autorizada" before closing
    }

    updateInventory(cartItems, false);
    
    if (documentType === "factura" && checkoutForm.documentId && checkoutForm.documentId !== "9999999999999") {
      const existingCustomer = customers.find((c: any) => c.documentNumber === checkoutForm.documentId);
      if (!existingCustomer) {
        const newCustomer: Customer = {
          id: "CUST-" + Date.now(),
          name: checkoutForm.businessName || "Cliente",
          documentType: checkoutForm.documentId.length === 13 ? "RUC" : "Cédula",
          documentNumber: checkoutForm.documentId,
          phone: checkoutForm.phone || "",
          email: checkoutForm.email || "",
          address: checkoutForm.address || "",
          status: "activo",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          totalPurchases: 0,
          numberOfPurchases: 0
        };
        setCustomers(prev => [newCustomer, ...prev]);
      }
    }

    if (editingOrderId) {
      setSalesNotes((prev) => 
        prev.map((order) => {
          if (order.id === editingOrderId) {
            return {
              ...order,
              items: [...cartItems],
              subtotal,
              tax,
              total,
              customerName: checkoutForm.businessName || "Cliente Final",
              clientPhone: checkoutForm.phone,
              clientAddress: checkoutForm.address,
              tableNumber: tableNumber || "Barra",
              status: "paid",
              documentType,
              ruc: documentType === "factura" ? checkoutForm.documentId : undefined,
              businessName:
                documentType === "factura" ? checkoutForm.businessName : undefined,
              paymentMethod: checkoutForm.paymentMethod,
            };
          }
          return order;
        })
      );
    } else {
      const currentMaxId = salesNotes.reduce((max, note) => {
        const numId = parseInt(note.id.replace(/\D/g, ""), 10);
        return !isNaN(numId) && numId > max ? numId : max;
      }, 0);
      const nextIdNum = currentMaxId + 1;
      const nextIdStr = nextIdNum.toString().padStart(6, "0");

      const newOrder: Order = {
        id: `$${nextIdStr}`,
        items: [...cartItems],
        subtotal,
        tax,
        total,
        date: new Date().toISOString(),
        customerName: checkoutForm.businessName || "Cliente Final",
              clientPhone: checkoutForm.phone,
              clientAddress: checkoutForm.address,
        tableNumber: tableNumber || "Barra",
        status: "paid",
        documentType,
        ruc: documentType === "factura" ? checkoutForm.documentId : undefined,
        businessName:
          documentType === "factura" ? checkoutForm.businessName : undefined,
        paymentMethod: checkoutForm.paymentMethod,
      };
      
      setSalesNotes([newOrder, ...salesNotes]);
    }
    setCartItems([]);
    setCheckoutForm({
      documentId: "",
      businessName: "",
      email: "",
      phone: "",
      address: "",
      paymentMethod: "Efectivo",
    });
    setTableNumber("");
    setIsCheckoutModalOpen(false);
    setTimeout(() => setSriStatus("idle"), 300);

    if (documentType === "factura") {
      setSuccessMessage("¡Factura autorizada exitosamente por el SRI!");
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseForm.description || !newExpenseForm.amount) return;

    const newExpense: Expense = {
      id: Date.now().toString(),
      description: newExpenseForm.description,
      amount: parseFloat(newExpenseForm.amount),
      category: newExpenseForm.category,
      date: new Date().toISOString(),
    };

    setExpenses([newExpense, ...expenses]);
    setIsExpenseModalOpen(false);
    setNewExpenseForm({
      description: "",
      amount: "",
      category: "Servicios",
    });
  };

  const handleSaveProvider = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProviderForm.name) return;

    const newProvider: Provider = {
      id: newProviderForm.id || Date.now().toString(),
      name: newProviderForm.name,
      contactName: newProviderForm.contactName,
      phone: newProviderForm.phone,
      category: newProviderForm.category,
      address: newProviderForm.address,
    };

    if (newProviderForm.id) {
      setProviders(providers.map(p => p.id === newProviderForm.id ? newProvider : p));
    } else {
      setProviders([newProvider, ...providers]);
    }

    setIsProviderModalOpen(false);
    setNewProviderForm({
      id: "",
      name: "",
      contactName: "",
      phone: "",
      category: "Pescados y Mariscos",
      address: "",
    });
  };

  const handleEditProvider = (provider: Provider) => {
    setNewProviderForm({
      id: provider.id,
      name: provider.name,
      contactName: provider.contactName || "",
      phone: provider.phone || "",
      category: provider.category || "Pescados y Mariscos",
      address: provider.address || "",
    });
    setIsProviderModalOpen(true);
  };

  const handleDeleteProvider = (id: string) => {
    setProviderToDelete(id);
  };

  const confirmDeleteProvider = () => {
    if (providerToDelete) {
      setProviders(providers.filter(p => p.id !== providerToDelete));
      setProviderToDelete(null);
    }
  };

  const handleSaveInventory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemForm.name) return;

    const isEditing = !!newItemForm.id;
    const itemId = isEditing ? newItemForm.id : Date.now().toString();

    if (inventoryTab === "Materia Prima" || inventoryTab === "Bebidas") {
      const qty = parseFloat(newItemForm.quantity) || 0;
      const existingItem = isEditing ? inventoryItems.find((i) => i.id === itemId) : null;
      let unitCost = existingItem?.unitCost || 0;

      if (inventoryTab === "Materia Prima") {
        const inputUnitCost = parseFloat(newItemForm.purchaseCost);
        if (!isNaN(inputUnitCost) && inputUnitCost > 0) {
          unitCost = inputUnitCost;
        }
      }

      const newItem: InventoryItem = {
        id: itemId,
        name: newItemForm.name,
        quantity: qty,
        unit: newItemForm.unit,
        minQuantity: 10,
        category: newItemForm.category,
        price: parseFloat(newItemForm.price) || 0,
        unitCost: unitCost,
      };

      if (inventoryTab === "Materia Prima") {
        const inputUnitCost = parseFloat(newItemForm.purchaseCost);
        if (!isNaN(inputUnitCost) && inputUnitCost > 0) {
          const totalExpense = inputUnitCost * qty;
          const newExpense: Expense = {
            id: Date.now().toString() + "-exp",
            description: `Compra de Insumo: ${newItemForm.name} (${newItemForm.quantity} ${newItemForm.unit} a USD/ ${inputUnitCost.toFixed(2)} c/u)`,
            amount: totalExpense,
            category: "Materia Prima",
            date: new Date().toISOString(),
          };
          setExpenses((prev) => [newExpense, ...prev]);
        }

        if (isEditing) {
          setInventoryItems(
            inventoryItems.map((i) => (i.id === itemId ? newItem : i)),
          );
        } else {
          setInventoryItems([newItem, ...inventoryItems]);
        }
      } else {
        if (isEditing) {
          setInventoryBebidas(
            inventoryBebidas.map((i) => (i.id === itemId ? newItem : i)),
          );
        } else {
          setInventoryBebidas([newItem, ...inventoryBebidas]);
        }
      }
    } else if (inventoryTab === "Comidas") {
      const newItem: ComidaItem = {
        id: itemId,
        name: newItemForm.name,
        category: newItemForm.category,
        ingredients: newItemForm.ingredients,
        price: parseFloat(newItemForm.price) || 0,
      };
      if (isEditing) {
        setInventoryComidas(
          inventoryComidas.map((i) => (i.id === itemId ? newItem : i)),
        );
      } else {
        setInventoryComidas([newItem, ...inventoryComidas]);
      }
    } else if (inventoryTab === "Combos") {
      const newItem: ComboItem = {
        id: itemId,
        name: newItemForm.name,
        category: newItemForm.category,
        items: newItemForm.comboItems,
        price: parseFloat(newItemForm.price) || 0,
      };
      if (isEditing) {
        setInventoryCombos(
          inventoryCombos.map((i) => (i.id === itemId ? newItem : i)),
        );
      } else {
        setInventoryCombos([newItem, ...inventoryCombos]);
      }
    }

    setIsInventoryModalOpen(false);
  };

  const handleEditItem = (item: any) => {
    setNewItemForm({
      id: item.id,
      name: item.name,
      quantity: item.quantity?.toString() || "",
      unit: item.unit || "kg",
      minQuantity: "10",
      category: item.category,
      price: item.price?.toString() || "",
      ingredients: item.ingredients || [],
      comboItems: item.items || [],
      purchaseCost: "",
    });
    setTempIng({ itemId: "", quantity: "" });
    setTempComboItem({ itemId: "", quantity: "" });
    setIsInventoryModalOpen(true);
  };

  const handleDeleteItem = (id: string) => {
    if (inventoryTab === "Materia Prima") {
      setInventoryItems(inventoryItems.filter((i) => i.id !== id));
    } else if (inventoryTab === "Bebidas") {
      setInventoryBebidas(inventoryBebidas.filter((i) => i.id !== id));
    } else if (inventoryTab === "Comidas") {
      setInventoryComidas(inventoryComidas.filter((i) => i.id !== id));
    } else if (inventoryTab === "Combos") {
      setInventoryCombos(inventoryCombos.filter((i) => i.id !== id));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f4f7fe] flex flex-col items-center justify-center font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-6"
        >
          <img
            src="/Salymar.png"
            alt="SalyMar Logo"
            className="w-48 h-auto object-contain animate-pulse"
          />
          <div className="flex gap-2">
            <span
              className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            ></span>
            <span
              className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            ></span>
            <span
              className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            ></span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7fe] p-4 md:p-8 font-sans text-slate-800 flex items-center justify-center relative overflow-hidden">
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="absolute top-10 left-1/2 -translate-x-1/2 z-[100] bg-emerald-500 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-lg"
          >
            <CheckCircle className="w-6 h-6" />
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Main App Container */}
      <div className="w-full max-w-[1500px] h-[90vh] min-h-[800px] bg-white rounded-[2.5rem] shadow-xl flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-20 px-4 md:px-8 flex items-center justify-between border-b border-slate-100 shrink-0 gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <img
              src="/Salymar.png"
              alt="SalyMar Logo"
              className="h-10 w-auto object-contain"
            />
            <h1 className="text-xl font-bold tracking-tight hidden lg:block">
              SalyMar
            </h1>
          </div>

          {/* Center Navigation */}
          <nav className="flex items-center gap-1 xl:gap-2 overflow-x-auto hide-scrollbar flex-1">
            {[
              { id: "Dashboard", icon: LayoutGrid, label: "Nuevo Pedido" },
              { id: "Lista de Pedidos", icon: ClipboardList, label: "Gestión de Pedidos" },
              { id: "Cocina", icon: ChefHat, label: "Cocina" },
              { id: "Notas de Venta", icon: ReceiptText, label: "Notas de Venta" },
              { id: "Facturación", icon: FileText, label: "Facturación" },
              { id: "Productos", icon: PackageOpen, label: "Menú de Ventas" },
              { id: "Inventario", icon: Package, label: "Bodega" },
              { id: "Proveedores", icon: Truck, label: "Proveedores" },
              { id: "Clientes", icon: Users, label: "Clientes" },
              { id: "Egresos", icon: Wallet, label: "Egresos" },
              { id: "Reportes", icon: BarChart3, label: "Reportes" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 md:gap-1.5 text-[10px] lg:text-[11px] xl:text-xs font-bold py-6 px-1 lg:px-1.5 border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? "text-blue-600 border-blue-600" : "text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-50"}`}
              >
                <tab.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </nav>
        </header>

        {/* Main Body */}
        <main className="flex-1 flex overflow-hidden">
          {/* Left Area (Menu) */}
          <div className="flex-1 flex flex-col overflow-y-auto px-8 py-6">
            {activeTab === "Dashboard" ? (
              <>
                {/* Categories */}
                <div className="mb-8 flex justify-center">
                  <div className="bg-slate-100/80 p-1.5 rounded-full inline-flex gap-1 overflow-x-auto w-full max-w-3xl">
                    {CATEGORIES.map((category) => (
                      <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={`flex-1 min-w-[120px] px-4 py-3 rounded-full text-sm font-bold transition-all duration-300
                      ${
                        activeCategory === category
                          ? "bg-white text-slate-800 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Menu Grid Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h2 className="text-xl font-bold">Menú</h2>
                  <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                      <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Buscar producto..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow placeholder:text-slate-400"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <span className="text-sm text-slate-400 font-medium whitespace-nowrap hidden sm:block">
                      Mostrando {filteredItems.length} Platos
                    </span>
                  </div>
                </div>

                {/* Menu Grid */}
                {filteredItems.length === 0 ? (
                  <div className="text-center py-16 bg-slate-50/50 rounded-[2rem] border border-slate-100 border-dashed">
                    <Store className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-800 mb-1">
                      No hay productos
                    </h3>
                    <p className="text-sm text-slate-400 max-w-sm mx-auto">
                      Aún no has agregado productos a esta categoría. Ve a
                      Menú de Ventas para registrar tus primeros platos.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
                    <AnimatePresence mode="popLayout">
                      {filteredItems.map((item) => {
                        const qty = getQuantity(item.id);
                        return (
                          <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white border border-slate-100 rounded-[1.5rem] p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow h-[220px]"
                          >
                            <div className="flex gap-4">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-24 h-24 rounded-2xl object-cover shadow-sm"
                              />
                              <div className="flex-1">
                                <h3 className="font-bold text-sm text-slate-800 leading-tight mb-2 line-clamp-2">
                                  {item.name}
                                </h3>
                                <p className="text-[11px] text-slate-400 line-clamp-3 mb-2 leading-relaxed">
                                  {item.description}
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium">
                                  {item.available} Disponibles • {item.sold}{" "}
                                  Vendidos
                                </p>
                              </div>
                            </div>
                            <div className="flex justify-between items-end mt-4">
                              <span className="font-black text-xl text-slate-800">
                                {formatCurrency(item.price)}
                              </span>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => updateQuantity(item, -1)}
                                  disabled={qty === 0}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors
                              ${qty > 0 ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-slate-50 text-slate-300"}`}
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <span className="font-bold w-4 text-center text-sm">
                                  {qty}
                                </span>
                                <button
                                  onClick={() => updateQuantity(item, 1)}
                                  className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-200 hover:bg-blue-700 transition-colors"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </>
            ) : activeTab === "Lista de Pedidos" ? (
              <OrdersManager
                salesNotes={salesNotes}
                updateOrderStatus={updateOrderStatus}
                editOrder={editOrder}
                checkoutOrder={checkoutOrder}
              />
            ) : activeTab === "Cocina" ? (
              <KitchenDashboard
                salesNotes={salesNotes}
                updateOrderStatus={updateOrderStatus}
              />
            ) : activeTab === "Notas de Venta" ? (
              <div className="flex-1 pb-12">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-800">
                    Notas de Venta
                  </h2>
                  <button
                    onClick={() => {
                      setDocumentType("nota");
                      setActiveTab("Dashboard");
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Crear Nota de Venta
                  </button>
                </div>
                {salesNotes.filter(
                  (n) => n.documentType === "nota" || !n.documentType,
                ).length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-3xl border border-slate-100">
                    <ReceiptText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="font-bold text-slate-500 mb-1">
                      Sin Notas de Venta Aún
                    </h3>
                    <p className="text-sm text-slate-400">
                      Procesa tu primera transacción como Nota de Venta para
                      verla aquí.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {salesNotes
                      .filter(
                        (n) => n.documentType === "nota" || !n.documentType,
                      )
                      .map((note) => (
                        <div
                          key={note.id}
                          onClick={() => setPreviewOrder(note)}
                          className={`bg-white border border-slate-100 rounded-2xl shadow-sm p-6 flex flex-col transition-shadow relative overflow-hidden cursor-pointer ${note.status === "anulada" ? "opacity-60" : "hover:shadow-md"}`}
                        >
                          {/* Status Ribbon */}
                          <div
                            className={`absolute top-4 right-[-30px] text-white text-[10px] font-bold py-1 px-8 rotate-45 text-center shadow-sm ${note.status === "anulada" ? "bg-red-500" : "bg-emerald-500"}`}
                          >
                            {note.status === "anulada" ? "ANULADA" : "PAGADO"}
                          </div>

                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="font-black text-lg text-slate-800">
                                {note.id}
                              </h4>
                              <p className="text-xs text-slate-400 font-medium">
                                {new Date(note.date).toLocaleString("es-PE")}
                              </p>
                            </div>
                          </div>

                          <div className="mb-4">
                            <p className="text-sm font-bold text-slate-700 mb-1">
                              Cliente:{" "}
                              <span className="font-medium text-slate-600">
                                {note.customerName}
                              </span>
                            </p>
                            <p className="text-sm font-bold text-slate-700">
                              Mesa/Ubicación:{" "}
                              <span className="font-medium text-slate-600">
                                {note.tableNumber}
                              </span>
                            </p>
                          </div>

                          <div className="flex-1 bg-slate-50 rounded-xl p-4 mb-4">
                            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                              Detalle del Pedido
                            </h5>
                            <div className="space-y-2">
                              {note.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="flex justify-between text-sm"
                                >
                                  <span className="text-slate-600">
                                    <span className="font-bold text-slate-400 mr-2">
                                      {item.quantity}x
                                    </span>
                                    {item.menuItem.name}
                                  </span>
                                  <span className="font-medium text-slate-700">
                                    {formatCurrency(
                                      item.menuItem.price * item.quantity,
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="border-t border-dashed border-slate-200 pt-4 flex justify-between items-center">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-bold text-slate-500">
                                Total Pagado
                              </span>
                              {note.status !== "anulada" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAnularOrder(note.id);
                                  }}
                                  className="text-[10px] text-left text-orange-500 hover:text-orange-700 font-bold uppercase tracking-wider py-1"
                                >
                                  Anular Venta
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteOrder(note.id);
                                }}
                                className="text-[10px] text-left text-red-500 hover:text-red-700 font-bold uppercase tracking-wider py-1"
                              >
                                Eliminar
                              </button>
                            </div>
                            <span className="text-xl font-black text-blue-600">
                              {formatCurrency(note.total)}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ) : activeTab === "Productos" ? (
              <ProductsDashboard
                products={menuProducts}
                setProducts={setMenuProducts}
                categories={menuCategories}
                setCategories={setMenuCategories}
                inventoryItems={inventoryItems}
              />
            ) : activeTab === "Facturación" ? (
              <BillingDashboard
                customers={customers}
                setCustomers={setCustomers}
                salesNotes={salesNotes}
                updateOrder={(updated) => {
                  setSalesNotes(prev => prev.map(o => o.id === updated.id ? updated : o));
                }}
                addInvoice={(invoice) => {
                  setSalesNotes(prev => [invoice, ...prev]);
                }}
                menuItems={menuItems}
                initialOrderToBill={billingOrder}
                onClearInitialOrder={() => setBillingOrder(null)}
              />
            ) : activeTab === "Inventario" ? (
              <div className="flex-1 pb-12">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-800">
                    Control de Inventario
                  </h2>
                  <button
                    onClick={handleOpenModal}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Nuevo Ingreso
                  </button>
                </div>

                <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Item
                          </th>
                          <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Categoría
                          </th>
                          {["Materia Prima", "Bebidas"].includes(
                            inventoryTab,
                          ) ? (
                            <>
                              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                                Stock Actual
                              </th>
                              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                                Estado
                              </th>
                            </>
                          ) : (
                            <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                              Producción Posible
                            </th>
                          )}
                          <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {["Materia Prima", "Bebidas"].includes(inventoryTab)
                          ? (inventoryTab === "Materia Prima"
                              ? inventoryItems
                              : inventoryBebidas
                            ).map((item) => {
                              const stockRatio =
                                item.quantity / item.minQuantity;
                              let statusColor =
                                "bg-emerald-100 text-emerald-700";
                              let statusText = "Óptimo";

                              if (stockRatio <= 1) {
                                statusColor = "bg-red-100 text-red-700";
                                statusText = "Crítico";
                              } else if (stockRatio <= 1.5) {
                                statusColor = "bg-orange-100 text-orange-700";
                                statusText = "Bajo";
                              }

                              return (
                                <tr
                                  key={item.id}
                                  className="hover:bg-slate-50 transition-colors"
                                >
                                  <td className="py-4 px-6">
                                    <span className="font-bold text-slate-800 text-sm">
                                      {item.name}
                                    </span>
                                  </td>
                                  <td className="py-4 px-6">
                                    <span className="text-sm text-slate-500">
                                      {item.category}
                                    </span>
                                  </td>
                                  <td className="py-4 px-6 text-right">
                                    <span className="font-bold text-slate-800">
                                      {item.quantity}
                                    </span>
                                    <span className="text-slate-500 text-xs ml-1">
                                      {item.unit}
                                    </span>
                                  </td>
                                  <td className="py-4 px-6 text-center">
                                    <span
                                      className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase ${statusColor}`}
                                    >
                                      {statusText}
                                    </span>
                                  </td>
                                  <td className="py-4 px-6 text-right">
                                    <div className="flex justify-end gap-2">
                                      <button
                                        onClick={() => handleEditItem(item)}
                                        className="text-slate-400 hover:text-blue-500 transition-colors"
                                        title="Editar"
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleDeleteItem(item.id)
                                        }
                                        className="text-slate-400 hover:text-red-500 transition-colors"
                                        title="Eliminar"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          : (inventoryTab === "Comidas"
                              ? inventoryComidas
                              : inventoryCombos
                            ).map((item) => {
                              const maxProduction =
                                inventoryTab === "Comidas"
                                  ? calculateMaxComidas(item as ComidaItem)
                                  : calculateMaxCombos(item as ComboItem);

                              return (
                                <tr
                                  key={item.id}
                                  className="hover:bg-slate-50 transition-colors"
                                >
                                  <td className="py-4 px-6">
                                    <span className="font-bold text-slate-800 text-sm">
                                      {item.name}
                                    </span>
                                    <div className="text-[10px] text-slate-400 mt-1">
                                      {(item as any).ingredients
                                        ? (item as ComidaItem).ingredients
                                            .length + " ingredientes"
                                        : (item as ComboItem).items.length +
                                          " elementos"}
                                    </div>
                                  </td>
                                  <td className="py-4 px-6">
                                    <span className="text-sm text-slate-500">
                                      {item.category}
                                    </span>
                                  </td>
                                  <td className="py-4 px-6 text-right">
                                    {maxProduction === -1 ? (
                                      <span className="font-bold text-sm text-slate-400">
                                        Sin receta
                                      </span>
                                    ) : (
                                      <span
                                        className={`font-bold text-sm ${maxProduction > 0 ? "text-emerald-600" : "text-red-500"}`}
                                      >
                                        {maxProduction}{" "}
                                        <span className="text-xs font-normal">
                                          porciones
                                        </span>
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-4 px-6 text-right">
                                    <div className="flex justify-end gap-2">
                                      <button
                                        onClick={() => handleEditItem(item)}
                                        className="text-slate-400 hover:text-blue-500 transition-colors"
                                        title="Editar"
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleDeleteItem(item.id)
                                        }
                                        className="text-slate-400 hover:text-red-500 transition-colors"
                                        title="Eliminar"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : activeTab === "Proveedores" ? (
              <div className="flex-1 pb-12">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-800">
                    Gestión de Proveedores
                  </h2>
                  <button
                    onClick={() => {
                      setNewProviderForm({ id: "", name: "", contactName: "", phone: "", category: "Pescados y Mariscos", address: "" });
                      setIsProviderModalOpen(true);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Nuevo Proveedor
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {providers.map((provider) => (
                    <div
                      key={provider.id}
                      className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 flex flex-col hover:shadow-md transition-shadow relative"
                    >
                      <div className="absolute top-4 right-4 flex gap-1">
                        <button
                          onClick={() => handleEditProvider(provider)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar Proveedor"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProvider(provider.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar Proveedor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                          <Store className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg text-slate-800 leading-tight">
                            {provider.name}
                          </h4>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {provider.category}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3 mt-2 flex-1">
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-slate-500" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                              Contacto
                            </span>
                            <span className="font-medium text-slate-700">
                              {provider.contactName}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
                            <Phone className="w-4 h-4 text-slate-500" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                              Teléfono
                            </span>
                            <span className="font-medium text-slate-700">
                              {provider.phone}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
                            <MapPin className="w-4 h-4 text-slate-500" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                              Dirección
                            </span>
                            <span className="font-medium text-slate-700">
                              {provider.address}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : activeTab === "Clientes" ? (
              <CustomersDashboard
                customers={customers}
                setCustomers={setCustomers}
                orders={salesNotes}
              />
            ) : activeTab === "Egresos" ? (
              <div className="flex-1 pb-12">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-800">
                    Registro de Egresos
                  </h2>
                  <button
                    onClick={() => setIsExpenseModalOpen(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Nuevo Gasto
                  </button>
                </div>
                {expenses.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-3xl border border-slate-100">
                    <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="font-bold text-slate-500 mb-1">
                      Sin Egresos Registrados
                    </h3>
                    <p className="text-sm text-slate-400">
                      Registra tu primer egreso operativo para verlo aquí.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {expenses.map((expense) => (
                      <div
                        key={expense.id}
                        className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 flex flex-col hover:shadow-md transition-shadow relative"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase tracking-wider mb-2 inline-block">
                              {expense.category}
                            </span>
                            <h4 className="font-bold text-lg text-slate-800 leading-tight">
                              {expense.description}
                            </h4>
                          </div>
                        </div>

                        <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-end">
                          <p className="text-xs text-slate-400 font-medium">
                            {new Date(expense.date).toLocaleString("es-PE")}
                          </p>
                          <span className="text-xl font-black text-slate-800">
                            {formatCurrency(expense.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : activeTab === "Reportes" ? (
              <ReportsDashboard salesNotes={salesNotes} expenses={expenses} customers={customers} />
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <h3 className="text-lg font-medium mb-2">
                    Vista de {activeTab}
                  </h3>
                  <p className="text-sm">Sección en construcción</p>
                </div>
              </div>
            )}
          </div>

          {activeTab === "Dashboard" && (
            <div className="w-[380px] bg-slate-50/30 border-l border-slate-100 flex flex-col shrink-0">
              <div className="p-6 flex-1 flex flex-col overflow-y-auto">
                {/* Table Information */}
                <div className="mb-6 shrink-0">
                  <h3 className="font-bold text-lg mb-4 text-slate-800">
                    Detalles Generales
                  </h3>
                  <div className="flex gap-2 mb-3">
                    {["mesa", "llevar", "delivery", "rapido"].map((type) => (
                      <button
                        key={type}
                        onClick={() => setOrderType(type as any)}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold capitalize transition-colors ${orderType === type ? "bg-blue-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  {orderType === "mesa" && (
                    <CustomSelect
                      value={tableNumber}
                      onChange={(value) => setTableNumber(value)}
                      options={[
                        { label: "Mesa 1", value: "1" },
                        { label: "Mesa 2", value: "2" },
                        { label: "Mesa 3", value: "3" },
                        { label: "Mesa 4", value: "4" },
                        { label: "Barra", value: "Barra" },
                      ]}
                      placeholder="Seleccionar Mesa"
                      className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 text-sm font-medium text-slate-500 hover:bg-slate-50"
                    />
                  )}
                  {orderType === "delivery" && (
                    <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Datos de Envío</p>
                      <input
                        type="text"
                        placeholder="Nombre del cliente (Opcional)"
                        value={checkoutForm.businessName}
                        onChange={(e) => setCheckoutForm({...checkoutForm, businessName: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Teléfono (Opcional)"
                        value={checkoutForm.phone}
                        onChange={(e) => setCheckoutForm({...checkoutForm, phone: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <textarea
                        rows={2}
                        placeholder="Dirección exacta (Opcional)"
                        value={checkoutForm.address}
                        onChange={(e) => setCheckoutForm({...checkoutForm, address: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      />
                    </div>
                  )}
                </div>

                {/* Order Details */}
                <h3 className="font-bold text-lg mb-4 text-slate-800 shrink-0">
                  Detalles del Pedido
                </h3>
                <div className="flex-1 space-y-5 pr-2 mb-6 shrink-0 min-h-[150px]">
                  <AnimatePresence initial={false}>
                    {cartItems.map((item) => (
                      <motion.div
                        key={item.menuItem.id}
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex gap-4"
                      >
                        <img
                          src={item.menuItem.image}
                          alt={item.menuItem.name}
                          className="w-16 h-16 rounded-2xl object-cover shadow-sm"
                        />
                        <div className="flex-1 flex flex-col justify-between py-0.5">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-bold text-sm text-slate-800 leading-tight line-clamp-2">
                              {item.menuItem.name}
                            </h4>
                            <span className="font-bold text-sm text-slate-800">
                              {formatCurrency(
                                item.menuItem.price * item.quantity,
                              )}
                            </span>
                          </div>
                                                    <div className="flex flex-col gap-2 mt-2">
                            <div className="flex items-center gap-4">
                              <button
                                onClick={() => updateQuantity(item.menuItem, -1)}
                                className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-bold text-sm w-2 text-center">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.menuItem, 1)}
                                className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-sm hover:bg-blue-700 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <input 
                              type="text" 
                              placeholder="Observaciones (ej. sin hielo)" 
                              className="text-xs w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                              value={item.observation || ""}
                              onChange={(e) => updateObservation(item.menuItem, e.target.value)}
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {cartItems.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center opacity-70">
                      <ReceiptText className="w-12 h-12 mb-3 text-slate-300" />
                      <p className="font-medium text-sm">
                        Ningún plato seleccionado
                      </p>
                    </div>
                  )}
                </div>

                {/* Order Summary */}
                <div className="pt-6 mt-auto border-t-2 border-dashed border-slate-200 shrink-0">
                  <h3 className="font-bold text-lg mb-4 text-slate-800">
                    Resumen del Pedido
                  </h3>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 font-medium">
                        Subtotal
                      </span>
                      <span className="font-bold text-slate-800">
                        {formatCurrency(subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 font-medium">
                        IVA (15%)
                      </span>
                      <span className="font-bold text-slate-800">
                        {formatCurrency(tax)}
                      </span>
                    </div>
                  </div>

                  <div className="border-t-2 border-dashed border-slate-200 pt-4 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-800">
                        Total
                      </span>
                      <span className="text-2xl font-black text-slate-800">
                        {formatCurrency(total)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={cartItems.length === 0}
                    className={`w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2
                    ${
                      cartItems.length > 0
                        ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.98]"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    Procesar Transacción
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Checkout Modal */}
      <AnimatePresence>
        {isCheckoutModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col md:flex-row relative"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsCheckoutModalOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Left Column: Form */}
              <div className="flex-1 p-8 md:p-10 border-b md:border-b-0 md:border-r border-slate-100 overflow-y-auto max-h-[90vh]">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 border-b border-slate-100 pb-4 gap-4">
                  <h3 className="text-2xl font-bold text-slate-800">
                    Información del Comprador
                  </h3>
                  <div className="flex gap-3 shrink-0">
                    <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors">
                      <Search className="w-4 h-4" /> BUSCAR
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 text-blue-600 text-sm font-bold hover:bg-blue-50 transition-colors">
                      <UserPlus className="w-4 h-4" /> GUARDAR
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-4 mb-6">
                  <div className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="docType"
                        checked={documentType === "nota"}
                        onChange={() => setDocumentType("nota")}
                        className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-slate-300 accent-blue-600"
                      />
                      <span className="text-sm font-bold text-slate-700">
                        Nota de Venta
                      </span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer ml-4">
                      <input
                        type="radio"
                        name="docType"
                        checked={documentType === "factura"}
                        onChange={() => setDocumentType("factura")}
                        className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-slate-300 accent-blue-600"
                      />
                      <span className="text-sm font-bold text-slate-700">
                        Factura
                      </span>
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-sm font-bold text-slate-700 w-full mb-1">
                      Forma de Pago:
                    </span>
                    {[
                      "Efectivo",
                      "Transferencia",
                      "Tarjeta",
                      "Crédito",
                      "Otro",
                    ].map((method) => (
                      <label
                        key={method}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={checkoutForm.paymentMethod === method}
                          onChange={() =>
                            setCheckoutForm({
                              ...checkoutForm,
                              paymentMethod: method as any,
                            })
                          }
                          className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-slate-300 accent-blue-600"
                        />
                        <span className="text-sm font-medium text-slate-700">
                          {method}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <form
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                  onSubmit={processTransaction}
                >
                  <div>
                    <label className="block text-[10px] font-bold text-slate-800 uppercase tracking-wider mb-2">
                      R.U.C / C.I.
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={checkoutForm.documentId}
                        onChange={(e) => {
                          const val = e.target.value;
                          const existingCustomer = customers.find((c: any) => c.documentNumber === val);
                          if (existingCustomer) {
                            setCheckoutForm({
                              ...checkoutForm,
                              documentId: existingCustomer.documentNumber,
                              businessName: existingCustomer.name,
                              phone: existingCustomer.phone || "",
                              email: existingCustomer.email || "",
                              address: existingCustomer.address || ""
                            });
                          } else {
                            setCheckoutForm({
                              ...checkoutForm,
                              documentId: val,
                            });
                          }
                        }}
                        className={`flex-1 min-w-0 bg-white border rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-shadow ${checkoutForm.documentId ? (checkoutValidation.valido ? "border-green-400" : "border-red-400") : "border-slate-200"}`}
                        placeholder="Ej: 1725389454001"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCheckoutForm({
                            ...checkoutForm,
                            documentId: "9999999999999",
                            businessName: "Consumidor Final",
                          });
                          setDocumentType("nota");
                        }}
                        className="px-4 py-3 shrink-0 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors flex items-center gap-2"
                      >
                        <User className="w-4 h-4" /> C. FINAL
                      </button>
                    </div>
                    {checkoutForm.documentId && checkoutForm.documentId !== "9999999999999" && (
                        <p className={`text-[10px] mt-1 font-medium ${checkoutValidation.valido ? "text-green-600" : "text-red-500"}`}>
                            {checkoutValidation.mensaje}
                        </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-800 uppercase tracking-wider mb-2">
                      RAZÓN SOCIAL:
                    </label>
                    <input
                      type="text"
                      value={checkoutForm.businessName}
                      onChange={(e) =>
                        setCheckoutForm({
                          ...checkoutForm,
                          businessName: e.target.value,
                        })
                      }
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                      placeholder="Nombre completo"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-800 uppercase tracking-wider mb-2">
                      EMAIL NOTIFICACIÓN:
                    </label>
                    <input
                      type="email"
                      value={checkoutForm.email}
                      onChange={(e) =>
                        setCheckoutForm({
                          ...checkoutForm,
                          email: e.target.value,
                        })
                      }
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                      placeholder="ejemplo@correo.com"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-800 uppercase tracking-wider mb-2">
                      TELÉFONO:
                    </label>
                    <input
                      type="tel"
                      value={checkoutForm.phone}
                      onChange={(e) =>
                        setCheckoutForm({
                          ...checkoutForm,
                          phone: e.target.value,
                        })
                      }
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                      placeholder="Ej: 0998765432"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-800 uppercase tracking-wider mb-2">
                      DIRECCIÓN:
                    </label>
                    <input
                      type="text"
                      value={checkoutForm.address}
                      onChange={(e) =>
                        setCheckoutForm({
                          ...checkoutForm,
                          address: e.target.value,
                        })
                      }
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                      placeholder="Calle, Número, Ciudad"
                    />
                  </div>
                </form>
              </div>

              {/* Right Column: Actions */}
              <div className="w-full md:w-[320px] bg-slate-50/50 p-8 md:p-10 flex flex-col shrink-0">
                <h3 className="text-xl font-bold text-slate-800 mb-8">
                  {documentType === "factura" ? "Acciones SRI" : "Acciones"}
                </h3>

                <button
                  onClick={processTransaction}
                  disabled={sriStatus !== "idle" && sriStatus !== "done"}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm mb-8 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {documentType === "factura" ? (
                    <>
                      {sriStatus === "idle" ? (
                        <>
                          <Send className="w-4 h-4" />
                          Enviar al SRI
                        </>
                      ) : sriStatus === "done" ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Factura Autorizada
                        </>
                      ) : (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Procesando SRI...
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Emitir Nota
                    </>
                  )}
                </button>

                {documentType === "factura" && (
                  <div className="space-y-4">
                    <div
                      className={`flex items-center gap-3 px-4 py-4 bg-white border ${sriStatus === "idle" ? "border-slate-100 opacity-60 text-slate-400" : sriStatus === "signing" ? "border-blue-200 opacity-100 text-blue-600 shadow-md shadow-blue-100" : "border-emerald-200 opacity-100 text-emerald-600 bg-emerald-50"} rounded-2xl transition-all`}
                    >
                      <ShieldCheck className="w-5 h-5" />
                      <span
                        className={`text-sm font-bold ${sriStatus === "idle" ? "text-slate-500" : sriStatus === "signing" ? "text-blue-700" : "text-emerald-700"}`}
                      >
                        Firma Digital
                      </span>
                      {sriStatus !== "idle" && sriStatus !== "signing" && (
                        <CheckCircle className="w-4 h-4 ml-auto text-emerald-500" />
                      )}
                    </div>
                    <div
                      className={`flex items-center gap-3 px-4 py-4 bg-white border ${["idle", "signing"].includes(sriStatus) ? "border-slate-100 opacity-60 text-slate-400" : sriStatus === "receiving" ? "border-blue-200 opacity-100 text-blue-600 shadow-md shadow-blue-100" : "border-emerald-200 opacity-100 text-emerald-600 bg-emerald-50"} rounded-2xl transition-all`}
                    >
                      <Globe className="w-5 h-5" />
                      <span
                        className={`text-sm font-bold ${["idle", "signing"].includes(sriStatus) ? "text-slate-500" : sriStatus === "receiving" ? "text-blue-700" : "text-emerald-700"}`}
                      >
                        Recepción SRI
                      </span>
                      {["authorizing", "done"].includes(sriStatus) && (
                        <CheckCircle className="w-4 h-4 ml-auto text-emerald-500" />
                      )}
                    </div>
                    <div
                      className={`flex items-center gap-3 px-4 py-4 bg-white border ${["idle", "signing", "receiving"].includes(sriStatus) ? "border-slate-100 opacity-60 text-slate-400" : sriStatus === "authorizing" ? "border-blue-200 opacity-100 text-blue-600 shadow-md shadow-blue-100" : "border-emerald-200 opacity-100 text-emerald-600 bg-emerald-50"} rounded-2xl transition-all`}
                    >
                      <CheckCircle className="w-5 h-5" />
                      <span
                        className={`text-sm font-bold ${["idle", "signing", "receiving"].includes(sriStatus) ? "text-slate-500" : sriStatus === "authorizing" ? "text-blue-700" : "text-emerald-700"}`}
                      >
                        Autorización SRI
                      </span>
                      {sriStatus === "done" && (
                        <CheckCircle className="w-4 h-4 ml-auto text-emerald-500" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Inventory Modal */}
      <AnimatePresence>
        {isInventoryModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
            >
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-800">
                  {newItemForm.id
                    ? "Editar Item"
                    : "Nuevo Ingreso a Inventario"}
                </h3>
                <button
                  onClick={() => setIsInventoryModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form
                onSubmit={handleSaveInventory}
                className="p-6 flex flex-col gap-5"
              >
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Nombre del{" "}
                    {inventoryTab === "Materia Prima"
                      ? "Insumo"
                      : inventoryTab === "Bebidas"
                        ? "Bebida"
                        : inventoryTab === "Comidas"
                          ? "Plato"
                          : "Combo"}
                  </label>
                  <input
                    required
                    type="text"
                    value={newItemForm.name}
                    onChange={(e) =>
                      setNewItemForm({ ...newItemForm, name: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                    placeholder={`Ej. ${inventoryTab === "Comidas" ? "Arroz con Mariscos" : "Pulpo Fresco"}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div
                    className={
                      inventoryTab === "Comidas" || inventoryTab === "Combos"
                        ? "col-span-2"
                        : ""
                    }
                  >
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Categoría
                    </label>
                    <CustomSelect
                      value={newItemForm.category}
                      onChange={(value) =>
                        setNewItemForm({ ...newItemForm, category: value })
                      }
                      options={
                        inventoryTab === "Bebidas"
                          ? [
                              { label: "Gaseosas", value: "Gaseosas" },
                              { label: "Cervezas", value: "Cervezas" },
                              {
                                label: "Bebidas Naturales",
                                value: "Bebidas Naturales",
                              },
                              { label: "Otros", value: "Otros" },
                            ]
                          : inventoryTab === "Comidas"
                            ? [
                                { label: "Ceviches", value: "Ceviches" },
                                {
                                  label: "Platos Fuertes",
                                  value: "Platos Fuertes",
                                },
                                { label: "Entradas", value: "Entradas" },
                                { label: "Otros", value: "Otros" },
                              ]
                            : inventoryTab === "Combos"
                              ? [
                                  { label: "Combos", value: "Combos" },
                                  {
                                    label: "Promociones",
                                    value: "Promociones",
                                  },
                                ]
                              : [
                                  {
                                    label: "Pescados y Mariscos",
                                    value: "Pescados y Mariscos",
                                  },
                                  { label: "Verduras", value: "Verduras" },
                                  { label: "Abarrotes", value: "Abarrotes" },
                                  { label: "Bebidas", value: "Bebidas" },
                                  { label: "Otros", value: "Otros" },
                                ]
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium hover:bg-slate-100"
                    />
                  </div>
                  {(inventoryTab === "Materia Prima" ||
                    inventoryTab === "Bebidas") && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Unidad de Medida
                      </label>
                      <CustomSelect
                        value={newItemForm.unit}
                        onChange={(value) =>
                          setNewItemForm({ ...newItemForm, unit: value })
                        }
                        options={[
                          {
                            label: "Kilogramos (kg)",
                            value: "kg",
                            group: "Peso",
                          },
                          { label: "Gramos (g)", value: "g", group: "Peso" },
                          {
                            label: "Miligramos (mg)",
                            value: "mg",
                            group: "Peso",
                          },
                          { label: "Libras (lb)", value: "lb", group: "Peso" },
                          { label: "Onzas (oz)", value: "oz", group: "Peso" },
                          { label: "Litros (L)", value: "L", group: "Volumen" },
                          {
                            label: "Mililitros (ml)",
                            value: "ml",
                            group: "Volumen",
                          },
                          {
                            label: "Galones (gal)",
                            value: "gal",
                            group: "Volumen",
                          },
                          {
                            label: "Unidades (und)",
                            value: "und",
                            group: "Unidades",
                          },
                          {
                            label: "Docenas",
                            value: "docena",
                            group: "Unidades",
                          },
                          {
                            label: "Paquetes (pqte)",
                            value: "pqte",
                            group: "Empaques",
                          },
                          { label: "Cajas", value: "caja", group: "Empaques" },
                          { label: "Sacos", value: "saco", group: "Empaques" },
                          { label: "Latas", value: "lata", group: "Empaques" },
                          {
                            label: "Botellas",
                            value: "botella",
                            group: "Empaques",
                          },
                        ]}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium hover:bg-slate-100"
                      />
                    </div>
                  )}
                </div>

                {inventoryTab !== "Materia Prima" && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Precio de Venta (USD)
                    </label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      value={newItemForm.price}
                      onChange={(e) =>
                        setNewItemForm({
                          ...newItemForm,
                          price: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                      placeholder="0.00"
                    />
                  </div>
                )}

                {inventoryTab === "Materia Prima" && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Costo Unitario de Compra (USD) - Opcional
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newItemForm.purchaseCost}
                      onChange={(e) =>
                        setNewItemForm({
                          ...newItemForm,
                          purchaseCost: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                      placeholder="0.00 (Registra como egreso operativo)"
                    />
                    {!!newItemForm.id && (
                      <p className="text-[10px] text-slate-500 mt-2 leading-tight">
                        Costo unitario guardado: <strong>USD/ {inventoryItems.find(i => i.id === newItemForm.id)?.unitCost?.toFixed(4) || "0.00"}</strong> por {newItemForm.unit}.<br/>
                        <span className="opacity-80">(Déjalo en blanco si solo estás editando el nombre. Solo llénalo si vas a registrar una nueva compra de este insumo)</span>
                      </p>
                    )}
                  </div>
                )}

                {(inventoryTab === "Materia Prima" ||
                  inventoryTab === "Bebidas") && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Cantidad Inicial
                    </label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      value={newItemForm.quantity}
                      onChange={(e) =>
                        setNewItemForm({
                          ...newItemForm,
                          quantity: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                      placeholder="0.00"
                    />
                  </div>
                )}

                {inventoryTab === "Comidas" && (
                  <div className="flex flex-col gap-3">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Ingredientes
                    </label>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-3">
                      <div className="flex gap-2 items-center">
                        <div className="flex-1">
                          <CustomSelect
                            value={tempIng.itemId}
                            onChange={(value) =>
                              setTempIng({ ...tempIng, itemId: value })
                            }
                            options={inventoryItems.map((item) => ({
                              label: `${item.name} (${item.unit})`,
                              value: item.id,
                              group: item.category,
                            }))}
                            placeholder="Seleccionar Insumo..."
                            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium hover:bg-slate-50"
                          />
                        </div>
                        <div className="w-24">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={tempIng.quantity}
                            onChange={(e) =>
                              setTempIng({
                                ...tempIng,
                                quantity: e.target.value,
                              })
                            }
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Cant."
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (tempIng.itemId && tempIng.quantity) {
                              setNewItemForm((prev) => ({
                                ...prev,
                                ingredients: [
                                  ...prev.ingredients,
                                  {
                                    itemId: tempIng.itemId,
                                    quantity: parseFloat(tempIng.quantity),
                                  },
                                ],
                              }));
                              setTempIng({ itemId: "", quantity: "" });
                            }
                          }}
                          className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {newItemForm.ingredients.length > 0 && (
                        <div className="mt-2 flex flex-col gap-2">
                          {newItemForm.ingredients.map((ing, idx) => {
                            const raw = inventoryItems.find(
                              (i) => i.id === ing.itemId,
                            );
                            return (
                              <div
                                key={idx}
                                className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-slate-200 text-xs"
                              >
                                <span className="font-bold text-slate-700">
                                  {raw?.name}
                                </span>
                                <div className="flex items-center gap-3">
                                  <span className="text-slate-500 font-medium">
                                    {ing.quantity} {raw?.unit}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNewItemForm((prev) => ({
                                        ...prev,
                                        ingredients: prev.ingredients.filter(
                                          (_, i) => i !== idx,
                                        ),
                                      }));
                                    }}
                                    className="text-red-400 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          <div className="mt-2 flex justify-between items-center bg-slate-900 text-white px-4 py-3 rounded-xl shadow-inner border border-slate-800">
                            <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Costo de Inversión (Materia Prima)</span>
                            <span className="font-black text-sm text-yellow-400">
                              USD/ {newItemForm.ingredients.reduce((acc, ing) => {
                                const raw = inventoryItems.find((i) => i.id === ing.itemId);
                                return acc + (ing.quantity * (raw?.unitCost || 0));
                              }, 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {inventoryTab === "Combos" && (
                  <div className="flex flex-col gap-3">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Elementos del Combo
                    </label>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-3">
                      <div className="flex gap-2 items-center">
                        <div className="flex-1">
                          <CustomSelect
                            value={tempComboItem.itemId}
                            onChange={(value) =>
                              setTempComboItem({
                                ...tempComboItem,
                                itemId: value,
                              })
                            }
                            options={[
                              ...inventoryComidas.map((c) => ({
                                label: c.name,
                                value: c.id,
                                group: "Comidas",
                              })),
                              ...inventoryBebidas.map((b) => ({
                                label: b.name,
                                value: b.id,
                                group: "Bebidas",
                              })),
                            ]}
                            placeholder="Seleccionar Plato/Bebida..."
                            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium hover:bg-slate-50"
                          />
                        </div>
                        <div className="w-24">
                          <input
                            type="number"
                            step="1"
                            min="1"
                            value={tempComboItem.quantity}
                            onChange={(e) =>
                              setTempComboItem({
                                ...tempComboItem,
                                quantity: e.target.value,
                              })
                            }
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Cant."
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              tempComboItem.itemId &&
                              tempComboItem.quantity
                            ) {
                              setNewItemForm((prev) => ({
                                ...prev,
                                comboItems: [
                                  ...prev.comboItems,
                                  {
                                    itemId: tempComboItem.itemId,
                                    quantity: parseInt(
                                      tempComboItem.quantity,
                                      10,
                                    ),
                                  },
                                ],
                              }));
                              setTempComboItem({ itemId: "", quantity: "" });
                            }
                          }}
                          className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {newItemForm.comboItems.length > 0 && (
                        <div className="mt-2 flex flex-col gap-2">
                          {newItemForm.comboItems.map((item, idx) => {
                            const c = inventoryComidas.find(
                              (i) => i.id === item.itemId,
                            );
                            const b = inventoryBebidas.find(
                              (i) => i.id === item.itemId,
                            );
                            const name = c ? c.name : b ? b.name : "Unknown";
                            return (
                              <div
                                key={idx}
                                className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-slate-200 text-xs"
                              >
                                <span className="font-bold text-slate-700">
                                  {name}
                                </span>
                                <span className="text-slate-500 font-medium">
                                  x{item.quantity}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-slate-100 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsInventoryModalOpen(false)}
                    className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all text-sm active:scale-[0.98]"
                  >
                    {newItemForm.id
                      ? "Guardar Cambios"
                      : `Guardar ${
                          inventoryTab === "Materia Prima"
                            ? "Insumo"
                            : inventoryTab === "Bebidas"
                              ? "Bebida"
                              : inventoryTab === "Comidas"
                                ? "Plato"
                                : "Combo"
                        }`}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Provider Modal */}
      <AnimatePresence>
        {isProviderModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-blue-600 p-6 flex justify-between items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-8 -translate-y-8"></div>
                <h3 className="text-xl font-bold text-white relative z-10">
                  Nuevo Proveedor
                </h3>
                <button
                  onClick={() => setIsProviderModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors relative z-10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form
                onSubmit={handleSaveProvider}
                className="p-6 flex flex-col gap-5"
              >
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Empresa / Nombre
                  </label>
                  <input
                    required
                    type="text"
                    value={newProviderForm.name}
                    onChange={(e) =>
                      setNewProviderForm({
                        ...newProviderForm,
                        name: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                    placeholder="Ej. Distribuidora San Juan"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Categoría
                    </label>
                    <CustomSelect
                      value={newProviderForm.category}
                      onChange={(value) =>
                        setNewProviderForm({
                          ...newProviderForm,
                          category: value,
                        })
                      }
                      options={[
                        {
                          label: "Pescados y Mariscos",
                          value: "Pescados y Mariscos",
                        },
                        { label: "Verduras", value: "Verduras" },
                        { label: "Abarrotes", value: "Abarrotes" },
                        { label: "Bebidas", value: "Bebidas" },
                        { label: "Otros", value: "Otros" },
                      ]}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium hover:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Contacto
                    </label>
                    <input
                      required
                      type="text"
                      value={newProviderForm.contactName}
                      onChange={(e) =>
                        setNewProviderForm({
                          ...newProviderForm,
                          contactName: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                      placeholder="Ej. Juan Pérez"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Teléfono
                    </label>
                    <input
                      required
                      type="text"
                      value={newProviderForm.phone}
                      onChange={(e) =>
                        setNewProviderForm({
                          ...newProviderForm,
                          phone: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                      placeholder="Ej. 987 654 321"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Dirección
                  </label>
                  <input
                    required
                    type="text"
                    value={newProviderForm.address}
                    onChange={(e) =>
                      setNewProviderForm({
                        ...newProviderForm,
                        address: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                    placeholder="Ej. Av. Principal 123"
                  />
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsProviderModalOpen(false)}
                    className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all text-sm active:scale-[0.98]"
                  >
                    Guardar Proveedor
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Expense Modal */}
      <AnimatePresence>
        {isExpenseModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-blue-600 p-6 flex justify-between items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-8 -translate-y-8"></div>
                <h3 className="text-xl font-bold text-white relative z-10">
                  Nuevo Gasto
                </h3>
                <button
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors relative z-10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form
                onSubmit={handleSaveExpense}
                className="p-6 flex flex-col gap-5"
              >
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Descripción del Gasto
                  </label>
                  <input
                    required
                    type="text"
                    value={newExpenseForm.description}
                    onChange={(e) =>
                      setNewExpenseForm({
                        ...newExpenseForm,
                        description: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                    placeholder="Ej. Pago de Luz"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Monto (USD)
                    </label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      value={newExpenseForm.amount}
                      onChange={(e) =>
                        setNewExpenseForm({
                          ...newExpenseForm,
                          amount: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Categoría
                    </label>
                    <CustomSelect
                      value={newExpenseForm.category}
                      onChange={(value) =>
                        setNewExpenseForm({
                          ...newExpenseForm,
                          category: value as Expense["category"],
                        })
                      }
                      options={[
                        { label: "Materia Prima", value: "Materia Prima" },
                        { label: "Servicios", value: "Servicios" },
                        { label: "Arriendo", value: "Arriendo" },
                        { label: "Nómina", value: "Nómina" },
                        { label: "Mantenimiento", value: "Mantenimiento" },
                        { label: "Otros", value: "Otros" },
                      ]}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium hover:bg-slate-100"
                    />
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsExpenseModalOpen(false)}
                    className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all text-sm active:scale-[0.98]"
                  >
                    Guardar Gasto
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewOrder && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col relative"
            >
              <div className="p-6">
                <button
                  onClick={() => setPreviewOrder(null)}
                  className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="text-center mb-6">
                  <h3 className="font-bold text-lg text-slate-800">
                    {previewOrder.documentType === "factura"
                      ? "FACTURA ELECTRÓNICA"
                      : "NOTA DE VENTA"}
                  </h3>
                  <p className="text-slate-500 text-sm">
                    Comprobante: {previewOrder.id}
                  </p>
                </div>
                <div className="space-y-4 text-sm text-slate-600 border-b border-dashed border-slate-200 pb-6 mb-6">
                  {previewOrder.customerName && (
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-500">Cliente:</span>
                      <span className="font-medium text-slate-800 text-right">
                        {previewOrder.customerName}
                      </span>
                    </div>
                  )}
                  {previewOrder.documentType === "factura" &&
                    previewOrder.ruc && (
                      <div className="flex justify-between">
                        <span className="font-bold text-slate-500">
                          RUC/CI:
                        </span>
                        <span className="font-medium text-slate-800 text-right">
                          {previewOrder.ruc}
                        </span>
                      </div>
                    )}
                  {previewOrder.documentType === "factura" &&
                    previewOrder.businessName && (
                      <div className="flex justify-between">
                        <span className="font-bold text-slate-500">
                          Razón Social:
                        </span>
                        <span className="font-medium text-slate-800 text-right">
                          {previewOrder.businessName}
                        </span>
                      </div>
                    )}
                  {previewOrder.tableNumber && (
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-500">Mesa:</span>
                      <span className="font-medium text-slate-800 text-right">
                        {previewOrder.tableNumber}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-500">Fecha:</span>
                    <span className="font-medium text-slate-800 text-right">
                      {new Date(previewOrder.date).toLocaleString("es-PE")}
                    </span>
                  </div>
                  {previewOrder.paymentMethod && (
                    <div className="flex justify-between mt-2">
                      <span className="font-bold text-slate-500">
                        Forma de Pago:
                      </span>
                      <span className="font-medium text-slate-800 text-right">
                        {previewOrder.paymentMethod}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-3 mb-6 border-b border-dashed border-slate-200 pb-6">
                  <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    <span>Cant</span>
                    <span className="text-left flex-1 mx-2">Descripción</span>
                    <span className="text-right">Total</span>
                  </div>
                  {previewOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="w-8 font-medium">{item.quantity}</span>
                      <span className="flex-1 text-slate-700">
                        {item.menuItem.name}
                      </span>
                      <span className="w-20 text-right font-medium">
                        {formatCurrency(item.menuItem.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 mb-8">
                  {previewOrder.documentType === "factura" && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500 font-medium">
                          Subtotal
                        </span>
                        <span className="font-medium text-slate-700">
                          {formatCurrency(previewOrder.subtotal)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500 font-medium">
                          IVA (15%)
                        </span>
                        <span className="font-medium text-slate-700">
                          {formatCurrency(previewOrder.tax)}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between items-end pt-2">
                    <span className="font-bold text-slate-800">TOTAL</span>
                    <span className="font-black text-xl text-blue-600">
                      {formatCurrency(previewOrder.total)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => window.print()}
                  className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Comprobante
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Anular Confirm Modal */}
      <AnimatePresence>
        {orderToAnular && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center"
            >
              <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                Anular Venta
              </h3>
              <p className="text-slate-500 text-sm mb-6">
                ¿Está seguro de anular esta venta? Esto restaurará el inventario
                de los productos y marcará la orden como anulada.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setOrderToAnular(null)}
                  className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmAnularOrder}
                  className="flex-1 bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition-colors"
                >
                  Sí, anular
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Eliminar Confirm Modal */}
      <AnimatePresence>
        {orderToDelete && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center"
            >
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                Eliminar Venta
              </h3>
              <p className="text-slate-500 text-sm mb-6">
                ¿Está seguro de eliminar esta venta permanentemente? No se podrá
                recuperar.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setOrderToDelete(null)}
                  className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteOrder}
                  className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-colors"
                >
                  Sí, eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Provider Modal */}
      <AnimatePresence>
        {providerToDelete && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center"
            >
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                Eliminar Proveedor
              </h3>
              <p className="text-slate-500 text-sm mb-6">
                ¿Está seguro de eliminar este proveedor permanentemente? No se podrá recuperar.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setProviderToDelete(null)}
                  className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteProvider}
                  className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-colors"
                >
                  Sí, eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Validation Error Modal */}
      <AnimatePresence>
        {validationError && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center relative"
            >
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                Información Incompleta
              </h3>
              <p className="text-slate-500 text-sm mb-6">{validationError}</p>
              <button
                onClick={() => setValidationError(null)}
                className="w-full bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Entendido
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}