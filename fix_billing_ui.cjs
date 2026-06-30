const fs = require('fs');
let content = fs.readFileSync('src/components/BillingDashboard.tsx', 'utf8');

const clientSectionStart = content.indexOf(`{/* Client Info */}`);
const clientSectionEnd = content.indexOf(`{/* Products Selection */}`);

if (clientSectionStart !== -1 && clientSectionEnd !== -1) {
  const newClientSection = `{/* Client Info */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm shrink-0 relative">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-500" />
                  Datos del Cliente
                </h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            const cf = customers.find(c => c.documentNumber === "9999999999999");
                            if (cf) {
                                setClientForm({
                                    clientId: cf.id,
                                    documentId: cf.documentNumber,
                                    businessName: cf.name,
                                    phone: cf.phone || "",
                                    email: cf.email || "",
                                    address: cf.address || ""
                                });
                            }
                        }}
                        className="text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        Consumidor Final
                    </button>
                    <button
                        onClick={() => setShowCustomerSearch(!showCustomerSearch)}
                        className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                    >
                        <SearchCode className="w-4 h-4" />
                        Buscar Cliente
                    </button>
                </div>
              </div>
              
              {showCustomerSearch && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-100 relative">
                      <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                              type="text"
                              autoFocus
                              placeholder="Buscar por cédula, RUC, nombre..."
                              value={customerSearchTerm}
                              onChange={(e) => setCustomerSearchTerm(e.target.value)}
                              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                      </div>
                      {customerSearchTerm && (
                          <div className="absolute z-20 left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-100 max-h-60 overflow-y-auto">
                              {customers
                                .filter(c => c.status === "activo" && c.documentType !== "Consumidor Final" && (c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) || c.documentNumber.includes(customerSearchTerm)))
                                .map(c => (
                                  <button
                                      key={c.id}
                                      onClick={() => {
                                          setClientForm({
                                              clientId: c.id,
                                              documentId: c.documentNumber,
                                              businessName: c.name,
                                              phone: c.phone || "",
                                              email: c.email || "",
                                              address: c.address || ""
                                          });
                                          setShowCustomerSearch(false);
                                          setCustomerSearchTerm("");
                                      }}
                                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 flex justify-between items-center"
                                  >
                                      <div>
                                          <p className="font-bold text-sm text-slate-800">{c.name}</p>
                                          <p className="text-xs text-slate-500">{c.documentNumber}</p>
                                      </div>
                                  </button>
                              ))}
                              {customers.filter(c => c.status === "activo" && c.documentType !== "Consumidor Final" && (c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) || c.documentNumber.includes(customerSearchTerm))).length === 0 && (
                                  <div className="p-4 text-center text-sm text-slate-500">
                                      No se encontraron clientes. 
                                      <button 
                                          onClick={() => {
                                              setClientForm(prev => ({...prev, businessName: customerSearchTerm, documentId: "", clientId: ""}));
                                              setShowCustomerSearch(false);
                                          }}
                                          className="block w-full mt-2 text-blue-600 font-bold hover:underline"
                                      >
                                          Llenar formulario con este nombre
                                      </button>
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cédula/RUC</label>
                  <input
                    type="text"
                    value={clientForm.documentId}
                    onChange={(e) => setClientForm({...clientForm, documentId: e.target.value, clientId: ""})}
                    placeholder="9999999999999"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Razón Social / Nombre</label>
                  <input
                    type="text"
                    value={clientForm.businessName}
                    onChange={(e) => setClientForm({...clientForm, businessName: e.target.value, clientId: ""})}
                    placeholder="Consumidor Final"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({...clientForm, phone: e.target.value, clientId: ""})}
                    placeholder="Opcional"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Correo</label>
                  <input
                    type="email"
                    value={clientForm.email}
                    onChange={(e) => setClientForm({...clientForm, email: e.target.value, clientId: ""})}
                    placeholder="Opcional"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Dirección</label>
                  <input
                    type="text"
                    value={clientForm.address}
                    onChange={(e) => setClientForm({...clientForm, address: e.target.value, clientId: ""})}
                    placeholder="Opcional"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            `;
  
  content = content.substring(0, clientSectionStart) + newClientSection + content.substring(clientSectionEnd);
  fs.writeFileSync('src/components/BillingDashboard.tsx', content);
  console.log("Client section replaced");
} else {
  console.log("Could not find client section bounds");
}
