import React, { forwardRef } from 'react';
import Barcode from 'react-barcode';
import { SRIInvoiceData, generateAccessKey } from '../lib/sri';
import { Order } from '../types';

interface RideTemplateProps {
  order: Order;
  sriData: SRIInvoiceData;
}

export const RideTemplate = forwardRef<HTMLDivElement, RideTemplateProps>(
  ({ order, sriData }, ref) => {
    // Formatting date
    let formattedDate = sriData.fechaEmision;
    try {
      const parsedDate = new Date(order.date);
      const day = String(parsedDate.getDate()).padStart(2, '0');
      const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const year = parsedDate.getFullYear();
      formattedDate = `${day}/${month}/${year}`;
    } catch (e) {}

    const authDate = order.sriAuth?.authDate ? new Date(order.sriAuth.authDate) : new Date(order.date);
    const authDateStr = isNaN(authDate.getTime()) 
      ? (order.sriAuth?.authDate || sriData.fechaEmision)
      : `${authDate.toLocaleDateString('es-EC')} ${authDate.toLocaleTimeString('es-EC')}`;
    
    // Recalculate Subtotal
    const subtotalCalc = sriData.items.reduce((acc, item) => acc + (item.cantidad * item.precioUnitario), 0);
    const ivaCalc = subtotalCalc * 0.15;
    const totalCalc = subtotalCalc + ivaCalc;

    const esConsumidorFinal = sriData.cliente.identificacion === "9999999999999";
    const clienteNombre = esConsumidorFinal ? "CONSUMIDOR FINAL" : sriData.cliente.razonSocial.toUpperCase();
    const clienteDireccion = esConsumidorFinal ? "CONSUMIDOR FINAL" : (sriData.cliente.direccion?.toUpperCase() || "N/A");

    // Clave de acceso is the autorizacion
    const accessKey = generateAccessKey({ ...sriData, fechaEmision: formattedDate, codigoNumerico: sriData.codigoNumerico }, "01");

    return (
      <div ref={ref} className="bg-white text-black p-8 text-sm max-w-[800px] w-[800px] mx-auto relative font-sans leading-tight">
        {/* TOP SECTION */}
        <div className="flex justify-between gap-4">
          
          {/* Left Column */}
          <div className="w-1/2 flex flex-col gap-4">
            {/* Logo Area */}
            <div className="h-32 flex items-center justify-center">
               <img src="/Salymar.png" alt="Salymar Logo" className="max-h-24 object-contain" />
            </div>

            {/* Business Info Box */}
            <div className="border border-black rounded-xl p-4 flex flex-col gap-1">
              <h2 className="font-bold text-lg">{sriData.razonSocialEmisor}</h2>
              <h3 className="font-bold text-md">{sriData.nombreComercialEmisor}</h3>
              <p className="text-xs mt-2"><span className="font-bold">Dirección Matriz:</span><br/>{sriData.dirMatriz}</p>
              <p className="text-xs mt-2"><span className="font-bold">Dirección Sucursal:</span><br/>{sriData.dirMatriz}</p>
              <p className="text-xs font-bold mt-4">OBLIGADO A LLEVAR CONTABILIDAD: NO</p>
            </div>
          </div>

          {/* Right Column */}
          <div className="w-1/2 border border-black rounded-xl p-4 flex flex-col gap-2">
            <h2 className="font-bold text-lg">R.U.C.: {sriData.rucEmisor}</h2>
            <h1 className="text-2xl font-black mt-2 mb-2">FACTURA</h1>
            <p className="font-bold text-md">No. {sriData.estab}-{sriData.ptoEmi}-{sriData.secuencial.padStart(9, '0')}</p>
            
            <p className="text-xs mt-2 font-bold">NÚMERO DE AUTORIZACIÓN:</p>
            <p className="text-xs break-all">{accessKey}</p>
            
            <div className="grid grid-cols-2 text-xs mt-2 gap-y-1">
              <p className="font-bold">FECHA Y HORA DE<br/>AUTORIZACIÓN:</p>
              <p className="self-end">{authDateStr}</p>
              
              <p className="font-bold">AMBIENTE:</p>
              <p>PRODUCCIÓN</p>
              
              <p className="font-bold">EMISIÓN:</p>
              <p>NORMAL</p>
            </div>

            {/* Barcode */}
            <div className="mt-4 flex justify-center w-full overflow-hidden">
              <Barcode 
                value={accessKey} 
                width={0.9} 
                height={40} 
                fontSize={9} 
                margin={0} 
                textMargin={2}
                displayValue={true} 
              />
            </div>
          </div>
        </div>

        {/* CUSTOMER SECTION */}
        <div className="border border-black rounded-xl p-3 mt-4 flex flex-col gap-2">
          <div className="grid grid-cols-12 gap-2 text-xs">
            <div className="col-span-3 font-bold">Razón Social / Nombres y Apellidos:</div>
            <div className="col-span-5 font-bold">{clienteNombre}</div>
            <div className="col-span-4"></div>
            
            <div className="col-span-3 font-bold">Identificación:</div>
            <div className="col-span-5 font-bold">{sriData.cliente.identificacion}</div>
            <div className="col-span-4 flex gap-1">
                <span className="font-bold">Placa / Matrícula:</span> 
            </div>
            
            <div className="col-span-3 font-bold">Fecha:</div>
            <div className="col-span-5 font-bold">{formattedDate}</div>
            <div className="col-span-4 flex gap-1">
                <span className="font-bold">Guía:</span> 
            </div>

            <div className="col-span-3 font-bold">Dirección:</div>
            <div className="col-span-9 font-bold">{clienteDireccion}</div>
          </div>
        </div>

        {/* ITEMS TABLE */}
        <table className="w-full border-collapse border border-black mt-4 text-xs">
          <thead>
            <tr className="border-b border-black">
              <th className="border-r border-black p-1 text-left font-normal">Cod. Principal</th>
              <th className="border-r border-black p-1 text-left font-normal">Cant</th>
              <th className="border-r border-black p-1 text-left font-normal">Descripción</th>
              <th className="border-r border-black p-1 text-right font-normal">Precio Unitario</th>
              <th className="border-r border-black p-1 text-right font-normal">Descuento</th>
              <th className="p-1 text-right font-normal">Precio Total</th>
            </tr>
          </thead>
          <tbody>
            {sriData.items.map((item, idx) => (
              <tr key={idx} className="border-b border-black">
                <td className="border-r border-black p-1">{item.codigo || "0101"}</td>
                <td className="border-r border-black p-1">{item.cantidad.toFixed(2)}</td>
                <td className="border-r border-black p-1">{item.descripcion}</td>
                <td className="border-r border-black p-1 text-right">{item.precioUnitario.toFixed(2)}</td>
                <td className="border-r border-black p-1 text-right">{(item.descuento || 0).toFixed(2)}</td>
                <td className="p-1 text-right">{(item.cantidad * item.precioUnitario - (item.descuento || 0)).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* BOTTOM SECTION */}
        <div className="flex gap-4 mt-4 text-xs">
          {/* Bottom Left */}
          <div className="w-[60%] flex flex-col gap-4">
            {/* Informacion Adicional */}
            <div className="border border-black flex flex-col">
              <div className="border-b border-black text-center py-1">Información Adicional</div>
              {sriData.cliente.email && !esConsumidorFinal ? (
                  <div className="p-2 grid grid-cols-12">
                      <div className="col-span-3">email:</div>
                      <div className="col-span-9">{sriData.cliente.email}</div>
                  </div>
              ) : (
                  <div className="p-2 text-transparent">_</div>
              )}
            </div>

            {/* Forma de pago */}
            <div className="border border-black flex flex-col mt-auto">
              <div className="grid grid-cols-12 border-b border-black font-bold text-center bg-gray-50">
                <div className="col-span-9 border-r border-black p-1">Forma de pago</div>
                <div className="col-span-3 p-1">Valor</div>
              </div>
              <div className="grid grid-cols-12 items-center">
                <div className="col-span-9 border-r border-black p-2">{sriData.formaPago === "01" ? "01 - SIN UTILIZACION DEL SISTEMA FINANCIERO" : "20 - OTROS CON UTILIZACION DEL SISTEMA FINANCIERO"}</div>
                <div className="col-span-3 p-2 text-right">{totalCalc.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Bottom Right - Totals */}
          <div className="w-[40%] flex flex-col gap-0">
            <div className="border border-black">
              <div className="grid grid-cols-2 border-b border-black">
                <div className="p-1 border-r border-black">SUBTOTAL 15%</div>
                <div className="p-1 text-right">{subtotalCalc.toFixed(2)}</div>
              </div>
              <div className="grid grid-cols-2 border-b border-black">
                <div className="p-1 border-r border-black">SUBTOTAL 0%</div>
                <div className="p-1 text-right">0.00</div>
              </div>
              <div className="grid grid-cols-2 border-b border-black">
                <div className="p-1 border-r border-black">SUBTOTAL NO OBJETO DE IVA</div>
                <div className="p-1 text-right">0.00</div>
              </div>
              <div className="grid grid-cols-2 border-b border-black">
                <div className="p-1 border-r border-black">SUBTOTAL EXENTO DE IVA</div>
                <div className="p-1 text-right">0.00</div>
              </div>
              <div className="grid grid-cols-2 border-b border-black">
                <div className="p-1 border-r border-black font-bold">SUBTOTAL SIN IMPUESTOS</div>
                <div className="p-1 text-right font-bold">{subtotalCalc.toFixed(2)}</div>
              </div>
              <div className="grid grid-cols-2 border-b border-black">
                <div className="p-1 border-r border-black">TOTAL DESCUENTO</div>
                <div className="p-1 text-right">0.00</div>
              </div>
              <div className="grid grid-cols-2 border-b border-black">
                <div className="p-1 border-r border-black">ICE</div>
                <div className="p-1 text-right">0.00</div>
              </div>
              <div className="grid grid-cols-2 border-b border-black">
                <div className="p-1 border-r border-black">IRBPNR</div>
                <div className="p-1 text-right">0.00</div>
              </div>
              <div className="grid grid-cols-2 border-b border-black">
                <div className="p-1 border-r border-black font-bold">IVA 15%</div>
                <div className="p-1 text-right font-bold">{ivaCalc.toFixed(2)}</div>
              </div>
              <div className="grid grid-cols-2 border-b border-black">
                <div className="p-1 border-r border-black">PROPINA</div>
                <div className="p-1 text-right">0.00</div>
              </div>
              <div className="grid grid-cols-2">
                <div className="p-1 border-r border-black font-bold">VALOR TOTAL</div>
                <div className="p-1 text-right font-bold">{totalCalc.toFixed(2)}</div>
              </div>
            </div>

            <div className="border border-black mt-2">
              <div className="grid grid-cols-2 border-b border-black">
                <div className="p-1 border-r border-black font-bold">VALOR TOTAL SIN SUBSIDIO</div>
                <div className="p-1 text-right font-bold">0.00</div>
              </div>
              <div className="grid grid-cols-2">
                <div className="p-1 border-r border-black font-bold">AHORRO POR SUBSIDIO:</div>
                <div className="p-1 text-right font-bold">0.00</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  }
);
