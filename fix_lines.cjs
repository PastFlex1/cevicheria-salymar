const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');
const lines = c.split('\\n');
if (lines[lines.length - 1].includes('// Migrate legacy')) {
    lines.pop(); // remove the bad line
}
// Now, let's just do standard string replace on the original good content?
// No, the original content was removed from line 284!
// So lines 284 to 324 were actually deleted!
// I need to insert it back properly.
// Let's insert the newContent correctly.
const newContent = [
  '  // Migrate legacy inventory to new products module',
  '  useEffect(() => {',
  '    if (menuProducts.length === 0 && inventoryComidas.length > 0) {',
  '      let nextCats = [...menuCategories];',
  '      let nextProds = [...menuProducts];',
  '',
  '      const addCategory = (name: string) => {',
  '        let cat = nextCats.find(c => c.name === name);',
  '        if (!cat) {',
  '          cat = { id: "CAT-" + Date.now() + Math.floor(Math.random()*1000), name, status: "activo" };',
  '          nextCats.push(cat);',
  '        }',
  '        return cat;',
  '      };',
  '',
  '      inventoryComidas.forEach(c => {',
  '        const cat = addCategory(c.category);',
  '        nextProds.push({',
  '          id: c.id,',
  '          name: c.name,',
  '          categoryId: cat.id,',
  '          category: cat.name,',
  '          description: c.ingredients',
  '            ?.map(i => inventoryItems.find(inv => inv.id === i.itemId)?.name)',
  '            .filter(Boolean).join(", ") || "Plato especial",',
  '          price: c.price || 0,',
  '          aplicaIva: true,',
  '          image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",',
  '          available: 0,',
  '          sold: 0,',
  '          status: "activo",',
  '          createdAt: new Date().toISOString(),',
  '          updatedAt: new Date().toISOString(),',
  '        });',
  '      });',
  '      inventoryBebidas.forEach(b => {',
  '        const cat = addCategory(b.category);',
  '        nextProds.push({',
  '          id: b.id,',
  '          name: b.name,',
  '          categoryId: cat.id,',
  '          category: cat.name,',
  '          description: `Bebida (${b.quantity} ${b.unit} stock)`,',
  '          price: parseFloat(b.price) || 0,',
  '          aplicaIva: true,',
  '          image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",',
  '          available: b.quantity,',
  '          sold: 0,',
  '          status: "activo",',
  '          createdAt: new Date().toISOString(),',
  '          updatedAt: new Date().toISOString(),',
  '        });',
  '      });',
  '      inventoryCombos.forEach(c => {',
  '        const cat = addCategory(c.category || "Combos");',
  '        nextProds.push({',
  '          id: c.id,',
  '          name: c.name,',
  '          categoryId: cat.id,',
  '          category: cat.name,',
  '          description: "Combo especial",',
  '          price: c.price || 0,',
  '          aplicaIva: true,',
  '          image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",',
  '          available: 0,',
  '          sold: 0,',
  '          status: "activo",',
  '          createdAt: new Date().toISOString(),',
  '          updatedAt: new Date().toISOString(),',
  '        });',
  '      });',
  '',
  '      setMenuCategories(nextCats);',
  '      setMenuProducts(nextProds);',
  '    }',
  '  }, [inventoryComidas, inventoryBebidas, inventoryCombos, menuProducts.length, menuCategories]);',
  '',
  '  // Generate menu items from inventory',
  '  const activeProducts = menuProducts.filter(p => p.status !== "inactivo");',
  '  const menuItems: MenuItem[] = activeProducts.map((p) => {',
  '    let dynamicAvailable = p.stock || 999;',
  '    const isComida = inventoryComidas.find((c) => c.id === p.id);',
  '    if (isComida) dynamicAvailable = calculateMaxComidas(isComida);',
  '    const isBebida = inventoryBebidas.find((b) => b.id === p.id);',
  '    if (isBebida) dynamicAvailable = isBebida.quantity;',
  '    const isCombo = inventoryCombos.find((c) => c.id === p.id);',
  '    if (isCombo) dynamicAvailable = calculateMaxCombos(isCombo);',
  '',
  '    return {',
  '      ...p,',
  '      available: dynamicAvailable,',
  '    };',
  '  });'
];

// where should it go? 
// find 'const tax = total - subtotal;'
const index = lines.findIndex(l => l.includes('const tax = total - subtotal;'));
if (index !== -1) {
    // wait, in the current file, after 'const tax = total - subtotal;' we just have the filteredItems block because I removed lines 284 to 324.
    // Let's insert newContent after index + 1
    lines.splice(index + 2, 0, ...newContent);
}

fs.writeFileSync('src/App.tsx', lines.join('\\n'));
