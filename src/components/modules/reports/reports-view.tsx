'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  FileDown,
  Loader2,
  X,
  Layers,
} from 'lucide-react';
import { formatCurrencyPYG } from '@/shared/utils/currency';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { downloadElementAsPdf } from '@/shared/utils/pdf-export';
import { DateInputPY } from '@/components/common/date-input-py';

function normalizeSearch(value: string | number | null | undefined): string {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

type ReportTab = 'sales_by_project' | 'deliveries_by_driver' | 'kardex_valuation' | 'price_list';
type SalesSegment = 'all' | 'materials' | 'containers';

export function ReportsView() {
  const [activeTab, setActiveTab] = useState<ReportTab>('sales_by_project');
  const [segment, setSegment] = useState<SalesSegment>('all');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);

  const handleExportPdf = async () => {
    if (!data) return;
    setExportingPdf(true);
    try {
      await downloadElementAsPdf('printable-report-view', {
        fileName: `Reporte_${activeTab}_${format(new Date(), 'yyyyMMdd_HHmm')}`,
        paperSize: 'A4',
        lightMode: true,
      });
    } finally {
      setExportingPdf(false);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: activeTab });
      if (activeTab === 'sales_by_project') params.append('segment', segment);
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
  }, [activeTab, startDate, endDate, segment]);

  // Filtrado en vivo sobre la tabla actual (sin tildes ni mayúsculas, por cliente, RUC, obra, chofer, factura o producto/SKU)
  const filteredData = useMemo(() => {
    if (!data) return null;
    const term = normalizeSearch(searchTerm).trim();
    if (!term) return data;

    if (activeTab === 'sales_by_project') {
      const matchedClients: any[] = [];
      let totalSales = 0;
      let grandTotalAmount = 0;
      let matchedProductUnits = 0;
      let matchedProductSubtotal = 0;
      let matchedAnyItem = false;

      for (const client of data.clients || []) {
        const clientMatches =
          normalizeSearch(client.customerName).includes(term) ||
          normalizeSearch(client.customerRuc).includes(term);

        const matchedProjects: any[] = [];

        for (const proj of client.projects || []) {
          const projMatches =
            clientMatches ||
            normalizeSearch(proj.projectName).includes(term) ||
            normalizeSearch(proj.projectAddress).includes(term);

          const matchedSales: any[] = [];

          for (const sale of proj.sales || []) {
            const matchingItems = (sale.items || []).filter(
              (it: any) =>
                normalizeSearch(it.name).includes(term) ||
                normalizeSearch(it.sku).includes(term)
            );

            const saleMetaMatches =
              projMatches ||
              normalizeSearch(sale.invoiceNumber).includes(term) ||
              normalizeSearch(sale.saleNumber).includes(term) ||
              normalizeSearch(sale.driverName).includes(term) ||
              normalizeSearch(sale.vehiclePlate).includes(term);

            if (saleMetaMatches || matchingItems.length > 0) {
              if (matchingItems.length > 0) {
                matchedAnyItem = true;
                for (const mi of matchingItems) {
                  matchedProductUnits += Number(mi.quantity || 0);
                  matchedProductSubtotal += Number(mi.subtotal || 0);
                }
              }
              matchedSales.push({
                ...sale,
                matchingItemNames: matchingItems.map((mi: any) => mi.name),
              });
            }
          }

          if (matchedSales.length > 0) {
            const projTotal = matchedSales.reduce((acc, s) => acc + Number(s.grandTotal || 0), 0);
            matchedProjects.push({
              ...proj,
              salesCount: matchedSales.length,
              totalAmount: projTotal,
              sales: matchedSales,
            });
          }
        }

        if (matchedProjects.length > 0) {
          const clientTotal = matchedProjects.reduce((acc, p) => acc + Number(p.totalAmount || 0), 0);
          const clientSalesCount = matchedProjects.reduce((acc, p) => acc + Number(p.salesCount || 0), 0);
          totalSales += clientSalesCount;
          grandTotalAmount += clientTotal;
          matchedClients.push({
            ...client,
            salesCount: clientSalesCount,
            totalAmount: clientTotal,
            projects: matchedProjects,
          });
        }
      }

      return {
        ...data,
        clients: matchedClients,
        totalSales,
        grandTotalAmount,
        matchedAnyItem,
        matchedProductUnits,
        matchedProductSubtotal,
      };
    }

    if (activeTab === 'deliveries_by_driver') {
      const deliveries = (data.deliveries || []).filter((d: any) => {
        const metaMatch =
          normalizeSearch(d.customerName).includes(term) ||
          normalizeSearch(d.customerRuc).includes(term) ||
          normalizeSearch(d.projectName).includes(term) ||
          normalizeSearch(d.destinationAddress).includes(term) ||
          normalizeSearch(d.invoiceNumber).includes(term) ||
          normalizeSearch(d.saleNumber).includes(term) ||
          normalizeSearch(d.driverName).includes(term) ||
          normalizeSearch(d.secondaryDriverName).includes(term) ||
          normalizeSearch((d.helpers || []).join(' ')).includes(term) ||
          normalizeSearch(d.vehiclePlate).includes(term) ||
          normalizeSearch(d.secondaryVehiclePlate).includes(term);

        const itemMatch = (d.items || []).some(
          (it: any) =>
            normalizeSearch(it.name).includes(term) ||
            normalizeSearch(it.sku).includes(term)
        );
        return metaMatch || itemMatch;
      });

      return {
        ...data,
        totalDeliveries: deliveries.length,
        deliveries,
      };
    }

    if (activeTab === 'kardex_valuation') {
      const items = (data.items || []).filter(
        (i: any) =>
          normalizeSearch(i.name).includes(term) ||
          normalizeSearch(i.sku).includes(term) ||
          normalizeSearch(i.barcode).includes(term) ||
          normalizeSearch(i.unitOfMeasure).includes(term)
      );
      const totalCostValuation = items.reduce((acc: number, i: any) => acc + Number(i.totalCostValuation || 0), 0);
      const totalSaleValuation = items.reduce((acc: number, i: any) => acc + Number(i.totalSaleValuation || 0), 0);
      return {
        ...data,
        totalSkus: items.length,
        totalCostValuation,
        totalSaleValuation,
        projectedProfit: totalSaleValuation - totalCostValuation,
        items,
      };
    }

    if (activeTab === 'price_list') {
      const products = (data.products || []).filter(
        (p: any) =>
          normalizeSearch(p.name).includes(term) ||
          normalizeSearch(p.sku).includes(term) ||
          normalizeSearch(p.barcode).includes(term) ||
          normalizeSearch(p.unitOfMeasure).includes(term)
      );
      return {
        ...data,
        totalProducts: products.length,
        products,
      };
    }

    return data;
  }, [data, activeTab, searchTerm]);

  // Exportar datos filtrados a Excel / CSV con BOM UTF-8
  const handleExportCSV = () => {
    const source = filteredData;
    if (!source) return;

    let csvContent = '\uFEFF'; // UTF-8 BOM para que Excel abra sin fallas de tildes o eñes
    let filename = `reporte_${activeTab}_${format(new Date(), 'ddMMyyyy_HHmm')}.csv`;

    if (activeTab === 'sales_by_project') {
      csvContent += 'Cliente;RUC;Obra;Total Obra (Gs);Nro Factura;Fecha;Materiales;Total Venta (Gs);Chofer;Vehiculo\n';
      source.clients?.forEach((client: any) => {
        client.projects?.forEach((proj: any) => {
          proj.sales?.forEach((sale: any) => {
            const itemsSummary = (sale.items || [])
              .map((it: any) => `${it.quantity} ${it.unitOfMeasure || ''} ${it.name}`.trim())
              .join(' | ');
            csvContent += `"${client.customerName}";"${client.customerRuc}";"${proj.projectName}";${proj.totalAmount};"${sale.invoiceNumber}";"${format(new Date(sale.createdAt), 'dd/MM/yyyy HH:mm')}";"${itemsSummary}";${sale.grandTotal};"${sale.driverName}";"${sale.vehiclePlate}"\n`;
          });
        });
      });
    } else if (activeTab === 'deliveries_by_driver') {
      csvContent += 'Nro Venta;Factura;Fecha;Cliente;RUC;Obra / Destino;Direccion;Materiales;Chofer 1;Ayudantes 1;Vehiculo 1;Chofer 2;Vehiculo 2;Estado Entrega;Monto (Gs)\n';
      source.deliveries?.forEach((d: any) => {
        const helpers = d.helpers?.join(', ') || '-';
        const secDriver = d.secondaryDriverName || '-';
        const secVeh = d.secondaryVehiclePlate || '-';
        const itemsSummary = (d.items || [])
          .map((it: any) => `${it.quantity} ${it.unitOfMeasure || ''} ${it.name}`.trim())
          .join(' | ');
        csvContent += `"${d.saleNumber}";"${d.invoiceNumber}";"${format(new Date(d.date), 'dd/MM/yyyy HH:mm')}";"${d.customerName}";"${d.customerRuc}";"${d.projectName}";"${d.destinationAddress}";"${itemsSummary}";"${d.driverName}";"${helpers}";"${d.vehiclePlate}";"${secDriver}";"${secVeh}";"${d.deliveryStatus}";${d.grandTotal}\n`;
      });
    } else if (activeTab === 'kardex_valuation') {
      csvContent += 'SKU;Codigo Barras;Nombre Producto;Unidad;Stock Actual;Costo Unitario (Gs);Precio Venta (Gs);Valuacion Costo (Gs);Valuacion Venta (Gs);Margen %\n';
      source.items?.forEach((i: any) => {
        csvContent += `"${i.sku}";"${i.barcode}";"${i.name}";"${i.unitOfMeasure}";${i.currentStock};${i.costPrice};${i.salePrice};${i.totalCostValuation};${i.totalSaleValuation};${i.marginPercent}%\n`;
      });
    } else if (activeTab === 'price_list') {
      csvContent += 'SKU;Codigo Barras;Nombre Producto;Unidad;Tasa IVA;Precio Venta (Gs);Costo (Gs);Stock Disponible\n';
      source.products?.forEach((p: any) => {
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
            onClick={handleExportPdf}
            disabled={!data || loading || exportingPdf}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-sky-700/30 border border-sky-500/40 hover:bg-sky-700/45 text-sky-200 text-xs font-semibold shadow-md transition-colors disabled:opacity-50"
          >
            {exportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            <span>Descargar PDF</span>
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
          <span className="font-mono text-sky-300 font-semibold whitespace-nowrap">Desde:</span>
          <div className="w-40">
            <DateInputPY
              value={startDate}
              onChange={setStartDate}
              allowClear
              className="bg-[#0d121c] border border-card-border hover:border-sky-500/50 rounded px-2.5 py-1.5 text-foreground text-xs focus:outline-none focus:border-sky-400 transition-colors"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sky-300 font-semibold whitespace-nowrap">Hasta:</span>
          <div className="w-40">
            <DateInputPY
              value={endDate}
              onChange={setEndDate}
              allowClear
              className="bg-[#0d121c] border border-card-border hover:border-sky-500/50 rounded px-2.5 py-1.5 text-foreground text-xs focus:outline-none focus:border-sky-400 transition-colors"
            />
          </div>
        </div>
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar por producto/material, cliente, obra, RUC, chofer o factura..."
            className="w-full bg-[#0d121c] border border-card-border rounded pl-8 pr-8 py-1.5 text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              title="Limpiar filtro"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {activeTab === 'sales_by_project' && (
          <div className="flex flex-wrap items-center gap-1.5 bg-[#0d121c] p-1 rounded-lg border border-card-border">
            <span className="text-[10px] font-mono uppercase text-muted-foreground px-2 flex items-center gap-1">
              <Layers className="w-3 h-3 text-primary" />
              Rubro:
            </span>
            <button
              type="button"
              onClick={() => setSegment('all')}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                segment === 'all'
                  ? 'bg-primary text-white font-bold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Todo Junto
            </button>
            <button
              type="button"
              onClick={() => setSegment('materials')}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                segment === 'materials'
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Solo Materiales
            </button>
            <button
              type="button"
              onClick={() => setSegment('containers')}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                segment === 'containers'
                  ? 'bg-purple-600 text-white font-bold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Solo Contenedores (S2001–S2003)
            </button>
          </div>
        )}
      </div>

      {/* Contenido Dinámico de Reporte */}
      <div id="printable-report-view" className="bg-card border border-card-border rounded-xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-16 text-center text-xs text-muted-foreground font-mono">
            Procesando métricas y consolidando datos en Neon Postgres...
          </div>
        ) : !filteredData ? (
          <div className="p-16 text-center text-xs text-muted-foreground">
            No se encontraron registros para los filtros seleccionados.
          </div>
        ) : (
          <div>
            {/* REPORTE 1: VENTAS POR CLIENTE Y POR OBRA */}
            {activeTab === 'sales_by_project' && (
              <div className="space-y-4 p-5">
                {/* Comparativo Automático: Todo vs 100% Materiales vs Contenedores */}
                {data?.summaryBySegment && !searchTerm.trim() && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pb-1">
                    <button
                      type="button"
                      onClick={() => setSegment('all')}
                      className={`text-left p-3.5 rounded-xl border transition-all ${
                        segment === 'all'
                          ? 'bg-primary/15 border-primary ring-1 ring-primary/40'
                          : 'bg-[#0d121c] border-card-border hover:border-primary/40'
                      }`}
                    >
                      <span className="text-[10px] font-mono uppercase text-muted-foreground block">
                        Total General (Todo Junto)
                      </span>
                      <p className="text-lg font-bold font-mono text-foreground mt-0.5">
                        {formatCurrencyPYG(data.summaryBySegment.totalAll || 0)}
                      </p>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        Materiales + Contenedores en el período
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSegment('materials')}
                      className={`text-left p-3.5 rounded-xl border transition-all ${
                        segment === 'materials'
                          ? 'bg-emerald-500/15 border-emerald-500 ring-1 ring-emerald-500/40'
                          : 'bg-[#0d121c] border-card-border hover:border-emerald-500/40'
                      }`}
                    >
                      <span className="text-[10px] font-mono uppercase text-emerald-400 block">
                        100% Materiales (Sin Contenedores)
                      </span>
                      <p className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                        {formatCurrencyPYG(data.summaryBySegment.totalMaterials || 0)}
                      </p>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        Excluye S2001, S2002 y S2003
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSegment('containers')}
                      className={`text-left p-3.5 rounded-xl border transition-all ${
                        segment === 'containers'
                          ? 'bg-purple-500/15 border-purple-500 ring-1 ring-purple-500/40'
                          : 'bg-[#0d121c] border-card-border hover:border-purple-500/40'
                      }`}
                    >
                      <span className="text-[10px] font-mono uppercase text-purple-300 block">
                        Solo Contenedores (S2001 / S2002 / S2003)
                      </span>
                      <p className="text-lg font-bold font-mono text-purple-300 mt-0.5">
                        {formatCurrencyPYG(data.summaryBySegment.totalContainers || 0)}
                      </p>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        Área servicio de alquiler de contenedores
                      </span>
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-2">
                  <div className="p-4 rounded-xl bg-[#0d121c] border border-card-border">
                    <span className="text-[11px] font-mono uppercase text-muted-foreground">Clientes con Operaciones</span>
                    <p className="text-xl font-bold text-foreground mt-1">{filteredData.clients?.length || 0}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0d121c] border border-card-border">
                    <span className="text-[11px] font-mono uppercase text-muted-foreground">Comprobantes Incluidos</span>
                    <p className="text-xl font-bold text-foreground mt-1">{filteredData.totalSales || 0}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0d121c] border border-card-border">
                    <span className="text-[11px] font-mono uppercase text-muted-foreground">
                      {segment === 'materials'
                        ? 'Total Filtrado (Solo Materiales)'
                        : segment === 'containers'
                        ? 'Total Filtrado (Solo Contenedores)'
                        : 'Monto Total Facturado'}
                    </span>
                    <p className="text-xl font-bold text-emerald-400 font-mono mt-1">
                      {formatCurrencyPYG(filteredData.grandTotalAmount || 0)}
                    </p>
                  </div>
                </div>

                {searchTerm.trim() && filteredData.matchedAnyItem && (
                  <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/30 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-sky-300">
                    <span>
                      Material coincidente con &ldquo;{searchTerm.trim()}&rdquo;:{' '}
                      <strong className="text-white">
                        {Number(filteredData.matchedProductUnits || 0).toLocaleString('es-PY')} unidades
                      </strong>
                    </span>
                    <span>
                      Subtotal solo de ese material:{' '}
                      <strong className="text-emerald-400">
                        {formatCurrencyPYG(filteredData.matchedProductSubtotal || 0)}
                      </strong>
                    </span>
                  </div>
                )}

                {(!filteredData.clients || filteredData.clients.length === 0) ? (
                  <div className="p-10 text-center text-xs text-muted-foreground font-mono border border-dashed border-card-border rounded-xl">
                    No se encontraron ventas ni materiales que coincidan con &ldquo;{searchTerm}&rdquo;.
                  </div>
                ) : (
                <div className="space-y-4">
                  {filteredData.clients?.map((client: any) => (
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
                                    <th className="py-1 px-2">Materiales / Detalle</th>
                                    <th className="py-1 px-2">Chofer / Entrega</th>
                                    <th className="py-1 px-2">Vehículo</th>
                                    <th className="py-1 px-2 text-right">Monto</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-card-border text-[11px] text-muted-foreground">
                                  {proj.sales?.map((s: any) => (
                                    <tr key={s.id} className="hover:bg-muted/10">
                                      <td className="py-1.5 px-2 font-bold text-foreground align-top">{s.invoiceNumber !== '-' ? s.invoiceNumber : s.saleNumber}</td>
                                      <td className="py-1.5 px-2 align-top">{format(new Date(s.createdAt), 'dd/MM/yyyy HH:mm')}</td>
                                      <td className="py-1.5 px-2 font-sans align-top">
                                        <div className="flex flex-wrap gap-1">
                                          {(s.items || []).map((it: any, iIdx: number) => {
                                            const isMatch =
                                              searchTerm.trim() &&
                                              (normalizeSearch(it.name).includes(normalizeSearch(searchTerm).trim()) ||
                                                normalizeSearch(it.sku).includes(normalizeSearch(searchTerm).trim()));
                                            return (
                                              <span
                                                key={iIdx}
                                                className={`px-1.5 py-0.5 rounded text-[10px] border ${
                                                  isMatch
                                                    ? 'bg-sky-500/20 border-sky-400/60 text-sky-200 font-bold'
                                                    : it.isContainerService
                                                    ? 'bg-purple-500/15 border-purple-500/35 text-purple-200'
                                                    : 'bg-[#0d121c] border-card-border text-muted-foreground'
                                                }`}
                                              >
                                                {it.isContainerService ? `[${it.sku}] ` : ''}
                                                {it.quantity} {it.unitOfMeasure || ''} {it.name}
                                              </span>
                                            );
                                          })}
                                        </div>
                                      </td>
                                      <td className="py-1.5 px-2 text-foreground font-sans align-top">{s.driverName}</td>
                                      <td className="py-1.5 px-2 align-top">{s.vehiclePlate}</td>
                                      <td className="py-1.5 px-2 text-right font-bold text-emerald-400 align-top">
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
                )}
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
                      {(!filteredData.deliveries || filteredData.deliveries.length === 0) ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-xs text-muted-foreground">
                            No se encontraron despachos con ese filtro.
                          </td>
                        </tr>
                      ) : filteredData.deliveries?.map((d: any) => (
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
                    <p className="text-xl font-bold text-foreground mt-1">{filteredData.totalSkus || 0} Artículos</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0d121c] border border-card-border">
                    <span className="text-[11px] font-mono uppercase text-muted-foreground">Valuación al Costo</span>
                    <p className="text-xl font-bold text-foreground font-mono mt-1">
                      {formatCurrencyPYG(filteredData.totalCostValuation || 0)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0d121c] border border-card-border">
                    <span className="text-[11px] font-mono uppercase text-muted-foreground">Valuación a Precio Venta</span>
                    <p className="text-xl font-bold text-accent font-mono mt-1">
                      {formatCurrencyPYG(filteredData.totalSaleValuation || 0)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0d121c] border border-card-border">
                    <span className="text-[11px] font-mono uppercase text-muted-foreground">Margen de Utilidad Proyectado</span>
                    <p className="text-xl font-bold text-emerald-400 font-mono mt-1">
                      {formatCurrencyPYG(filteredData.projectedProfit || 0)}
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
                      {filteredData.items?.map((item: any) => (
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
                      {filteredData.products?.map((p: any) => (
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

