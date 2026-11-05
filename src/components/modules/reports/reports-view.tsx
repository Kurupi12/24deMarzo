'use client';

import React, { useState, useEffect } from 'react';
import {
  FileBarChart,
  Building2,
  Truck,
  Boxes,
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Search,
  Filter,
  Users,
  TrendingUp,
  DollarSign,
  ChevronRight,
  Package,
} from 'lucide-react';
import { formatCurrencyPYG } from '@/shared/utils/currency';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type ReportTab = 'sales_by_project' | 'deliveries_by_driver' | 'kardex_valuation' | 'price_list';

export function ReportsView() {
  const [activeTab, setActiveTab] = useState<ReportTab>('sales_by_project');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: activeTab });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/v1/reports?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeTab, startDate, endDate]);

  // Exportar datos a Excel / CSV con BOM UTF-8
  const handleExportCSV = () => {
    if (!data) return;

    let csvContent = '\uFEFF'; // UTF-8 BOM para que Excel abra sin fallas de tildes o eñes
    let filename = `reporte_${activeTab}_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;

    if (activeTab === 'sales_by_project') {
      csvContent += 'Cliente;RUC;Obra;Total Obra (Gs);Nro Factura;Fecha;Total Venta (Gs);Chofer;Vehiculo\n';
      data.clients?.forEach((client: any) => {
        client.projects?.forEach((proj: any) => {
          proj.sales?.forEach((sale: any) => {
            csvContent += `"${client.customerName}";"${client.customerRuc}";"${proj.projectName}";${proj.totalAmount};"${sale.invoiceNumber}";"${format(new Date(sale.createdAt), 'dd/MM/yyyy HH:mm')}";${sale.grandTotal};"${sale.driverName}";"${sale.vehiclePlate}"\n`;
          });
        });
      });
    } else if (activeTab === 'deliveries_by_driver') {
      csvContent += 'Nro Venta;Factura;Fecha;Cliente;RUC;Obra / Destino;Direccion;Chofer 1;Ayudantes 1;Vehiculo 1;Chofer 2;Vehiculo 2;Estado Entrega;Monto (Gs)\n';
      data.deliveries?.forEach((d: any) => {
        const helpers = d.helpers?.join(', ') || '-';
        const secDriver = d.secondaryDriverName || '-';
        const secVeh = d.secondaryVehiclePlate || '-';
        csvContent += `"${d.saleNumber}";"${d.invoiceNumber}";"${format(new Date(d.date), 'dd/MM/yyyy HH:mm')}";"${d.customerName}";"${d.customerRuc}";"${d.projectName}";"${d.destinationAddress}";"${d.driverName}";"${helpers}";"${d.vehiclePlate}";"${secDriver}";"${secVeh}";"${d.deliveryStatus}";${d.grandTotal}\n`;
      });
    } else if (activeTab === 'kardex_valuation') {
      csvContent += 'SKU;Codigo Barras;Nombre Producto;Unidad;Stock Actual;Costo Unitario (Gs);Precio Venta (Gs);Valuacion Costo (Gs);Valuacion Venta (Gs);Margen %\n';
      data.items?.forEach((i: any) => {
        csvContent += `"${i.sku}";"${i.barcode}";"${i.name}";"${i.unitOfMeasure}";${i.currentStock};${i.costPrice};${i.salePrice};${i.totalCostValuation};${i.totalSaleValuation};${i.marginPercent}%\n`;
      });
    } else if (activeTab === 'price_list') {
      csvContent += 'SKU;Codigo Barras;Nombre Producto;Unidad;Tasa IVA;Precio Venta (Gs);Costo (Gs);Stock Disponible\n';
      data.products?.forEach((p: any) => {
        csvContent += `"${p.sku}";"${p.barcode}";"${p.name}";"${p.unitOfMeasure}";"${p.vatRate}";${p.salePrice};${p.costPrice};${p.currentStock}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-card-border p-5 rounded-xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <FileBarChart className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-foreground font-sans">
              Centro Avanzado de Reportes, Obras & Auditoría
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Consolidación de ventas por obras, trazabilidad logística de cuadrillas, valorización de inventario y listas oficiales.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={!data || loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Exportar a Excel (.csv)</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#0d121c] border border-card-border hover:border-primary text-foreground text-xs font-semibold shadow-md transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* Selector de Pestañas de Reportes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-card p-1.5 rounded-xl border border-card-border">
        <button
          type="button"
          onClick={() => setActiveTab('sales_by_project')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'sales_by_project'
              ? 'bg-primary text-white shadow-md'
              : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Ventas por Obra & Cliente</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('deliveries_by_driver')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'deliveries_by_driver'
              ? 'bg-primary text-white shadow-md'
              : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Despachos por Chofer / Cuadrilla</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('kardex_valuation')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'kardex_valuation'
              ? 'bg-primary text-white shadow-md'
              : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Kardex & Valorización</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('price_list')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'price_list'
              ? 'bg-primary text-white shadow-md'
              : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Lista Oficial de Precios</span>
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-card border border-card-border rounded-xl p-4 flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="font-mono text-muted-foreground">Desde:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-[#0d121c] border border-card-border rounded px-2.5 py-1 text-foreground font-mono text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-muted-foreground">Hasta:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-[#0d121c] border border-card-border rounded px-2.5 py-1 text-foreground font-mono text-xs"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar en tabla actual (cliente, chofer, material)..."
            className="w-full bg-[#0d121c] border border-card-border rounded px-3 py-1 text-foreground text-xs placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Contenido Dinámico de Reporte */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-16 text-center text-xs text-muted-foreground font-mono">
            Procesando métricas y consolidando datos en Neon Postgres...
          </div>
        ) : !data ? (
          <div className="p-16 text-center text-xs text-muted-foreground">
            No se encontraron registros para los filtros seleccionados.
          </div>
        ) : (
          <div>
            {/* REPORTE 1: VENTAS POR CLIENTE Y POR OBRA */}
            {activeTab === 'sales_by_project' && (
              <div className="space-y-4 p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-2">
                  <div className="p-4 rounded-xl bg-[#0d121c] border border-card-border">
                    <span className="text-[11px] font-mono uppercase text-muted-foreground">Clientes con Operaciones</span>
                    <p className="text-xl font-bold text-foreground mt-1">{data.clients?.length || 0}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0d121c] border border-card-border">
                    <span className="text-[11px] font-mono uppercase text-muted-foreground">Comprobantes Emitidos</span>
                    <p className="text-xl font-bold text-foreground mt-1">{data.totalSales || 0}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0d121c] border border-card-border">
                    <span className="text-[11px] font-mono uppercase text-muted-foreground">Monto Total Facturado</span>
                    <p className="text-xl font-bold text-emerald-400 font-mono mt-1">
                      {formatCurrencyPYG(data.grandTotalAmount || 0)}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {data.clients?.map((client: any) => (
                    <div key={client.customerRuc} className="border border-card-border rounded-xl bg-[#0b0f19] overflow-hidden">
                      <div className="p-3.5 bg-[#0d121c] border-b border-card-border flex items-center justify-between">
                        <div>
                          <span className="text-sm font-bold text-foreground">{client.customerName}</span>
                          <span className="text-xs font-mono text-muted-foreground ml-2">RUC: {client.customerRuc}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono text-muted-foreground block">{client.salesCount} facturas</span>
                          <span className="text-sm font-bold font-mono text-emerald-400">
                            {formatCurrencyPYG(client.totalAmount)}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 space-y-3">
                        {client.projects?.map((proj: any, idx: number) => (
                          <div key={idx} className="bg-card border border-card-border rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between border-b border-card-border pb-2">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-primary" />
                                <span className="font-semibold text-xs text-foreground">{proj.projectName}</span>
                                <span className="text-[10px] font-mono text-muted-foreground">({proj.projectAddress})</span>
                              </div>
                              <span className="text-xs font-mono font-bold text-foreground">
                                Subtotal Obra: {formatCurrencyPYG(proj.totalAmount)}
                              </span>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs font-mono">
                                <thead className="text-[10px] uppercase text-muted-foreground">
                                  <tr>
                                    <th className="py-1 px-2">Factura</th>
                                    <th className="py-1 px-2">Fecha</th>
                                    <th className="py-1 px-2">Chofer / Entrega</th>
                                    <th className="py-1 px-2">Vehículo</th>
                                    <th className="py-1 px-2 text-right">Monto</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-card-border text-[11px] text-muted-foreground">
                                  {proj.sales?.map((s: any) => (
                                    <tr key={s.id} className="hover:bg-muted/10">
                                      <td className="py-1.5 px-2 font-bold text-foreground">{s.invoiceNumber}</td>
                                      <td className="py-1.5 px-2">{format(new Date(s.createdAt), 'dd/MM/yyyy HH:mm')}</td>
                                      <td className="py-1.5 px-2 text-foreground font-sans">{s.driverName}</td>
                                      <td className="py-1.5 px-2">{s.vehiclePlate}</td>
                                      <td className="py-1.5 px-2 text-right font-bold text-emerald-400">
                                        {formatCurrencyPYG(s.grandTotal)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* REPORTE 2: TRAZABILIDAD DE DESPACHOS POR CHOFER / CUADRILLA */}
            {activeTab === 'deliveries_by_driver' && (
              <div className="p-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0d121c] border-b border-card-border text-[11px] font-mono uppercase text-muted-foreground">
                      <tr>
                        <th className="py-3 px-3">Fecha</th>
                        <th className="py-3 px-3">Factura</th>
                        <th className="py-3 px-3">Cliente / RUC</th>
                        <th className="py-3 px-3">Obra / Destino</th>
                        <th className="py-3 px-3">Chofer Responsable</th>
                        <th className="py-3 px-3">Cuadrilla / Ayudantes</th>
                        <th className="py-3 px-3">Vehículo</th>
                        <th className="py-3 px-3 text-center">Estado</th>
                        <th className="py-3 px-3 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border font-mono text-muted-foreground">
                      {data.deliveries?.map((d: any) => (
                        <tr key={d.id} className="hover:bg-muted/20">
                          <td className="py-2.5 px-3 text-[11px]">{format(new Date(d.date), 'dd/MM/yyyy HH:mm')}</td>
                          <td className="py-2.5 px-3 font-bold text-foreground">{d.invoiceNumber}</td>
                          <td className="py-2.5 px-3 font-sans">
                            <p className="font-semibold text-foreground truncate max-w-xs">{d.customerName}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{d.customerRuc}</p>
                          </td>
                          <td className="py-2.5 px-3 font-sans">
                            <span className="font-medium text-foreground block">{d.projectName}</span>
                            <span className="text-[10px] text-muted-foreground truncate block max-w-xs">{d.destinationAddress}</span>
                          </td>
                          <td className="py-2.5 px-3 font-sans">
                            <span className="font-bold text-foreground block">{d.driverName}</span>
                            {d.secondaryDriverName && (
                              <span className="text-[10px] text-accent font-semibold block mt-0.5">
                                Chofer 2: {d.secondaryDriverName}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-sans">
                            {d.helpers && d.helpers.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {d.helpers.map((h: string, i: number) => (
                                  <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-card border border-card-border text-foreground">
                                    {h}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">Sin ayudantes</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-[11px]">
                            <span className="block text-foreground">{d.vehiclePlate}</span>
                            {d.secondaryVehiclePlate && (
                              <span className="text-[10px] text-accent block font-mono">
                                Camión 2: {d.secondaryVehiclePlate}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                              {d.deliveryStatus}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                            {formatCurrencyPYG(d.grandTotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* REPORTE 3: KARDEX Y VALORIZACIÓN DE INVENTARIO */}
            {activeTab === 'kardex_valuation' && (
              <div className="space-y-4 p-5">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-[#0d121c] border border-card-border">
                    <span className="text-[11px] font-mono uppercase text-muted-foreground">Catálogo Activo</span>
                    <p className="text-xl font-bold text-foreground mt-1">{data.totalSkus || 0} Artículos</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0d121c] border border-card-border">
                    <span className="text-[11px] font-mono uppercase text-muted-foreground">Valuación al Costo</span>
                    <p className="text-xl font-bold text-foreground font-mono mt-1">
                      {formatCurrencyPYG(data.totalCostValuation || 0)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0d121c] border border-card-border">
                    <span className="text-[11px] font-mono uppercase text-muted-foreground">Valuación a Precio Venta</span>
                    <p className="text-xl font-bold text-accent font-mono mt-1">
                      {formatCurrencyPYG(data.totalSaleValuation || 0)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0d121c] border border-card-border">
                    <span className="text-[11px] font-mono uppercase text-muted-foreground">Margen de Utilidad Proyectado</span>
                    <p className="text-xl font-bold text-emerald-400 font-mono mt-1">
                      {formatCurrencyPYG(data.projectedProfit || 0)}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0d121c] border-b border-card-border text-[11px] font-mono uppercase text-muted-foreground">
                      <tr>
                        <th className="py-2.5 px-3">SKU</th>
                        <th className="py-2.5 px-3">Material / Descripción</th>
                        <th className="py-2.5 px-3 text-center">Unidad</th>
                        <th className="py-2.5 px-3 text-right">Stock Físico</th>
                        <th className="py-2.5 px-3 text-right">Costo Unit.</th>
                        <th className="py-2.5 px-3 text-right">Precio Venta</th>
                        <th className="py-2.5 px-3 text-right">Valuación Costo</th>
                        <th className="py-2.5 px-3 text-right">Utilidad Proyectada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border font-mono text-muted-foreground">
                      {data.items?.map((item: any) => (
                        <tr key={item.id} className="hover:bg-muted/20">
                          <td className="py-2 px-3 font-bold text-foreground">{item.sku}</td>
                          <td className="py-2 px-3 font-sans">
                            <span className="font-semibold text-foreground block">{item.name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{item.barcode}</span>
                          </td>
                          <td className="py-2 px-3 text-center font-mono text-[10px]">{item.unitOfMeasure}</td>
                          <td className="py-2 px-3 text-right font-bold text-foreground">
                            {item.currentStock.toLocaleString('es-PY')}
                          </td>
                          <td className="py-2 px-3 text-right">{formatCurrencyPYG(item.costPrice)}</td>
                          <td className="py-2 px-3 text-right text-primary font-bold">{formatCurrencyPYG(item.salePrice)}</td>
                          <td className="py-2 px-3 text-right">{formatCurrencyPYG(item.totalCostValuation)}</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-400">
                            {formatCurrencyPYG(item.estimatedProfit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* REPORTE 4: LISTA OFICIAL DE PRECIOS */}
            {activeTab === 'price_list' && (
              <div className="p-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0d121c] border-b border-card-border text-[11px] font-mono uppercase text-muted-foreground">
                      <tr>
                        <th className="py-2.5 px-3">SKU</th>
                        <th className="py-2.5 px-3">Código Barras</th>
                        <th className="py-2.5 px-3">Nombre del Material</th>
                        <th className="py-2.5 px-3 text-center">Unidad</th>
                        <th className="py-2.5 px-3 text-center">IVA</th>
                        <th className="py-2.5 px-3 text-right">Precio de Venta</th>
                        <th className="py-2.5 px-3 text-right">Costo</th>
                        <th className="py-2.5 px-3 text-center">Disponibilidad</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border font-mono text-muted-foreground">
                      {data.products?.map((p: any) => (
                        <tr key={p.id} className="hover:bg-muted/20">
                          <td className="py-2 px-3 font-bold text-foreground">{p.sku}</td>
                          <td className="py-2 px-3 text-[11px]">{p.barcode}</td>
                          <td className="py-2 px-3 font-sans font-semibold text-foreground">{p.name}</td>
                          <td className="py-2 px-3 text-center text-[10px]">{p.unitOfMeasure}</td>
                          <td className="py-2 px-3 text-center text-[10px]">{p.vatRate}</td>
                          <td className="py-2 px-3 text-right font-bold text-primary text-sm">
                            {formatCurrencyPYG(p.salePrice)}
                          </td>
                          <td className="py-2 px-3 text-right text-muted-foreground">{formatCurrencyPYG(p.costPrice)}</td>
                          <td className="py-2 px-3 text-center">
                            {p.isAvailable ? (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                                En Stock ({p.currentStock})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-danger/10 text-danger border border-danger/20 font-bold">
                                Agotado
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

