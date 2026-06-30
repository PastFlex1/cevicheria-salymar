const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add ProductsDashboard import
if (!content.includes('import ProductsDashboard')) {
  content = content.replace(
    'import BillingDashboard from "./components/BillingDashboard";',
    'import BillingDashboard from "./components/BillingDashboard";\\nimport ProductsDashboard from "./components/ProductsDashboard";'
  );
}

// 2. Add states for menuProducts and menuCategories
if (!content.includes('const [menuProducts, setMenuProducts]')) {
  content = content.replace(
    'const [inventoryCombos, setInventoryCombos] = useLocalStorage<ComboItem[]>(',
    'const [menuCategories, setMenuCategories] = useLocalStorage<Category[]>("pos-menu-categories", []);\\n  const [menuProducts, setMenuProducts] = useLocalStorage<MenuItem[]>("pos-menu-products", []);\\n\\n  const [inventoryCombos, setInventoryCombos] = useLocalStorage<ComboItem[]>('
  );
}

// 3. Add useEffect to migrate initial data if empty
const migrateEffect = `
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
`;

if (!content.includes('Migrate legacy inventory to new products module')) {
  content = content.replace(
    '// Generate menu items from inventory',
    migrateEffect + '\\n  // Generate menu items from inventory'
  );
}

// 4. Update menuItems logic to use menuProducts
const newMenuItemsLogic = `
  const activeProducts = menuProducts.filter(p => p.status !== "inactivo");
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
  });
`;

// I need to replace the old menuItems logic with the new one
const oldMenuItemsRegex = /const menuItems: MenuItem\\[\\] = \\[[\\s\\S]*?\\n  \\];/;
content = content.replace(oldMenuItemsRegex, newMenuItemsLogic.trim());

// 5. Add "Productos" button in sidebar (next to Inventario)
const inventarioButtonRegex = /(<button[\\s\\S]*?onClick=\\{[\\s\\S]*?setActiveTab\\("Inventario"\\)[\\s\\S]*?<\\/button>)/;
const productosButton = "$1\\n" +
"            <button\\n" +
"              onClick={() => setActiveTab(\\"Productos\\")}\\n" +
"              className={`flex items-center gap-2 text-sm font-bold py-7 px-3 border-b-2 transition-colors whitespace-nowrap \\${activeTab === \\"Productos\\" ? \\"text-blue-600 border-blue-600\\" : \\"text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-50\\"}`}\\n" +
"            >\\n" +
"              <Package className=\\"w-4 h-4 md:w-5 md:h-5\\" />\\n" +
"              <span className=\\"hidden sm:inline\\">Productos</span>\\n" +
"            </button>";

if (!content.includes('onClick={() => setActiveTab("Productos")}')) {
  content = content.replace(inventarioButtonRegex, productosButton);
}

// 6. Add ProductsDashboard rendering in activeTab checks
const inventarioBlockEnd = ') : activeTab === "Facturación" ? (';
const productsBlock = ") : activeTab === \\"Productos\\" ? (\\n" +
"              <ProductsDashboard\\n" +
"                products={menuProducts}\\n" +
"                setProducts={setMenuProducts}\\n" +
"                categories={menuCategories}\\n" +
"                setCategories={setMenuCategories}\\n" +
"              />\\n" +
"            ) : activeTab === \\"Facturación\\" ? (";

if (!content.includes('<ProductsDashboard')) {
  content = content.replace(inventarioBlockEnd, productsBlock);
}

fs.writeFileSync('src/App.tsx', content);
console.log("Patched App.tsx successfully");
