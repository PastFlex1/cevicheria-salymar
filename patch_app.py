import re
import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

# 1. Imports
if 'import ProductsDashboard' not in content:
    content = content.replace('import BillingDashboard from "./components/BillingDashboard";', 
        'import BillingDashboard from "./components/BillingDashboard";\\nimport ProductsDashboard from "./components/ProductsDashboard";')

# 2. States
if 'const [menuProducts' not in content:
    content = content.replace('const [inventoryCombos, setInventoryCombos] = useLocalStorage<ComboItem[]>(',
        'const [menuCategories, setMenuCategories] = useLocalStorage<Category[]>("pos-menu-categories", []);\\n  const [menuProducts, setMenuProducts] = useLocalStorage<MenuItem[]>("pos-menu-products", []);\\n\\n  const [inventoryCombos, setInventoryCombos] = useLocalStorage<ComboItem[]>(')

# 3. UseEffect
migrate_effect = """
  // Migrate legacy inventory to new products module
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
          description: c.ingredients?.map(i => inventoryItems.find(inv => inv.id === i.itemId)?.name).filter(Boolean).join(", ") || "",
          price: c.price || 0,
          aplicaIva: true,
          image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
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
          description: "",
          price: parseFloat(b.price) || 0,
          aplicaIva: true,
          image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd",
          available: b.quantity,
          sold: 0,
          status: "activo",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
      inventoryCombos.forEach(c => {
        const cat = addCategory("Combos");
        nextProds.push({
          id: c.id,
          name: c.name,
          categoryId: cat.id,
          category: cat.name,
          description: "",
          price: c.price || 0,
          aplicaIva: true,
          image: "https://images.unsplash.com/photo-1594212691516-b6f241a879a1",
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
  }, [inventoryComidas, inventoryBebidas, inventoryCombos, menuProducts, menuCategories]);
"""
if 'Migrate legacy inventory to new products module' not in content:
    content = content.replace('// Generate menu items from inventory', migrate_effect + '\\n  // Generate menu items from inventory')


# 4. menuItems Logic
old_logic_pattern = r'const menuItems: MenuItem\[\] = \[[^\]]*\];'
new_logic = """const activeProducts = menuProducts.filter(p => p.status !== "inactivo");
  const menuItems: MenuItem[] = activeProducts.map((p) => {
    let dynamicAvailable = p.stock || 999;
    const isComida = inventoryComidas.find((c) => c.id === p.id);
    if (isComida) dynamicAvailable = calculateMaxPortions(isComida);
    const isBebida = inventoryBebidas.find((b) => b.id === p.id);
    if (isBebida) dynamicAvailable = isBebida.quantity;
    const isCombo = inventoryCombos.find((c) => c.id === p.id);
    if (isCombo) dynamicAvailable = calculateMaxCombos(isCombo);

    return {
      ...p,
      available: dynamicAvailable,
    };
  });"""
content = re.sub(old_logic_pattern, new_logic, content, flags=re.DOTALL)

# 5. Sidebar Button
button_pattern = r'(<button[^>]*onClick=\{\(\) => setActiveTab\("Inventario"\)\}[^>]*>[\s\S]*?<\/button>)'
new_button = r'''\1
            <button
              onClick={() => setActiveTab("Productos")}
              className={`flex items-center gap-2 text-sm font-bold py-7 px-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === "Productos" ? "text-blue-600 border-blue-600" : "text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-50"}`}
            >
              <Package className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">Productos</span>
            </button>'''

if 'onClick={() => setActiveTab("Productos")}' not in content:
    content = re.sub(button_pattern, new_button, content)


# 6. View rendering
view_pattern = r'\) : activeTab === "Facturación" \? \('
new_view = r''') : activeTab === "Productos" ? (
              <ProductsDashboard
                products={menuProducts}
                setProducts={setMenuProducts}
                categories={menuCategories}
                setCategories={setMenuCategories}
              />
            ) : activeTab === "Facturación" ? ('''
if '<ProductsDashboard' not in content:
    content = re.sub(view_pattern, new_view, content)

with open('src/App.tsx', 'w') as f:
    f.write(content)

print("Patched App.tsx successfully")
