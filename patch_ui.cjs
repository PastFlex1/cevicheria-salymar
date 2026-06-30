const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const itemTarget = `                          <div className="flex items-center gap-4 mt-2">
                            <button
                              onClick={() => updateQuantity(item.menuItem, -1)}`;

const itemReplacement = `                          <div className="flex flex-col gap-2 mt-2">
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
                      </motion.div>`;

// We'll replace the block from `                          <div className="flex items-center gap-4 mt-2">`
// to `                      </motion.div>`
const itemBlockRegex = /<div className="flex items-center gap-4 mt-2">[\s\S]*?<\/motion\.div>/;

if (content.match(itemBlockRegex)) {
  content = content.replace(itemBlockRegex, itemReplacement);
  console.log("Patched item cart successfully");
} else {
  console.log("Could not patch item cart");
}

const tableTarget = `<h3 className="font-bold text-lg mb-4 text-slate-800">
                    Ubicación del Pedido
                  </h3>
                  <CustomSelect
                    value={tableNumber}
                    onChange={(value) => setTableNumber(value)}`;

const tableReplacement = `<h3 className="font-bold text-lg mb-4 text-slate-800">
                    Detalles Generales
                  </h3>
                  <div className="flex gap-2 mb-3">
                    {["mesa", "llevar", "delivery", "rapido"].map((type) => (
                      <button
                        key={type}
                        onClick={() => setOrderType(type as any)}
                        className={\`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold capitalize transition-colors \${orderType === type ? "bg-blue-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}\`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  {orderType === "mesa" && (
                    <CustomSelect
                      value={tableNumber}
                      onChange={(value) => setTableNumber(value)}
                      options={["Barra", "Mesa 1", "Mesa 2", "Mesa 3", "Mesa 4", "Mesa 5"]}
                      placeholder="Seleccionar Mesa"
                    />
                  )}`;

// Also we need to replace the `options={...}` if it exists, let's just do a string replace
const fullTableRegex = /<h3 className="font-bold text-lg mb-4 text-slate-800">\s*Ubicación del Pedido\s*<\/h3>\s*<CustomSelect\s*value=\{tableNumber\}\s*onChange=\{\(value\) => setTableNumber\(value\)\}\s*options=\{\["Barra", "Mesa 1", "Mesa 2", "Mesa 3", "Mesa 4", "Mesa 5"\]\}\s*placeholder="Seleccionar Mesa"\s*\/>/;

if (content.match(fullTableRegex)) {
  content = content.replace(fullTableRegex, tableReplacement);
  console.log("Patched table select");
} else {
  console.log("Could not patch table select");
}

const checkoutTarget = `<button
                    onClick={handleCheckout}
                    disabled={cartItems.length === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-lg flex items-center justify-center gap-2 transition-colors shadow-sm shadow-blue-200"
                  >
                    <span>Cobrar Pedido</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>`;

const checkoutReplacement = `<div className="flex gap-2 mb-2">
                    <button
                      onClick={() => saveOrder("pendiente")}
                      disabled={cartItems.length === 0}
                      className="flex-1 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-sm"
                    >
                      Guardar Pedido
                    </button>
                    <button
                      onClick={() => saveOrder("en_preparacion")}
                      disabled={cartItems.length === 0}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-sm flex items-center justify-center gap-1"
                    >
                      <ChefHat className="w-4 h-4" /> A Cocina
                    </button>
                  </div>
                  <button
                    onClick={handleCheckout}
                    disabled={cartItems.length === 0}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-lg flex items-center justify-center gap-2 transition-colors shadow-sm shadow-emerald-200"
                  >
                    <span>{editingOrderId ? "Finalizar Cobro" : "Cobrar Pedido"}</span>
                  </button>
                  {editingOrderId && (
                    <button
                      onClick={() => {
                        setEditingOrderId(null);
                        setCartItems([]);
                        setActiveTab("Lista de Pedidos");
                      }}
                      className="w-full mt-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold py-2 rounded-xl text-sm transition-colors"
                    >
                      Cancelar Edición
                    </button>
                  )}`;

content = content.replace(checkoutTarget, checkoutReplacement);

fs.writeFileSync('src/App.tsx', content);

