'use client';

import React, { useState } from 'react';
import { formatCurrencyPYG } from '@/shared/utils/currency';
import { ArrowUpRight, ArrowDownRight, Calendar } from 'lucide-react';
import { DailySalesPoint, MonthlySalesPoint } from '@/modules/dashboard/types/dashboard.types';

interface SalesPerformanceChartProps {
  dailySales: DailySalesPoint[];
  monthlySales: MonthlySalesPoint[];
  periodSummary: {
    totalSalesCurrentMonth: number;
    totalSalesPreviousMonth: number;
    growthPercent: number;
    potentialSalesEstimate: number;
    targetAchievementPercent: number;
  };
}

export function SalesPerformanceChart({
  dailySales = [],
  monthlySales = [],
  periodSummary,
}: SalesPerformanceChartProps) {
  const [period, setPeriod] = useState<'day' | 'month' | 'year'>('month');
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number }>({ start: 0, end: 4 });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  // Determinar puntos de datos activos según el período
  const isDaily = period === 'day';
  const dataPoints = isDaily
    ? dailySales.map((d, i) => ({
        label: d.label,
        current: d.currentSales,
        previous: d.previousSales,
        tickets: d.currentTickets,
        index: i,
      }))
    : monthlySales.map((m, i) => ({
        label: m.label,
        current: m.currentSales,
        previous: m.previousSales,
        tickets: 0,
        index: i,
      }));

  // Dimensiones del canvas SVG - Diseñado para ocupar el 100% del ancho del módulo
  const width = 1200;
  const height = 260;
  const paddingX = 12; // Mínimo margen para evitar cortes de borde
  const paddingTop = 25;
  const paddingBottom = 32;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingTop - paddingBottom;

  // Valor máximo para escalar
  const maxVal = Math.max(
    ...dataPoints.map((p) => Math.max(p.current, p.previous)),
    1000000
  );

  const numPoints = Math.max(dataPoints.length, 1);
  const stepX = chartWidth / (numPoints - 1 || 1);

  // Generar coordenadas estiradas de extremo a extremo
  const currentCoords = dataPoints.map((p, i) => {
    const x = paddingX + i * stepX;
    const y = paddingTop + chartHeight - (p.current / maxVal) * chartHeight;
    return { x, y, data: p };
  });

  const previousCoords = dataPoints.map((p, i) => {
    const x = paddingX + i * stepX;
    const y = paddingTop + chartHeight - (p.previous / maxVal) * chartHeight;
    return { x, y, data: p };
  });

  // Path SVG para la línea y área actual
  let currentAreaPath = '';
  let currentLinePath = '';
  if (currentCoords.length > 0) {
    currentLinePath = `M ${currentCoords[0].x} ${currentCoords[0].y}`;
    for (let i = 1; i < currentCoords.length; i++) {
      const prev = currentCoords[i - 1];
      const curr = currentCoords[i];
      const midX = (prev.x + curr.x) / 2;
      currentLinePath += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    const lastX = currentCoords[currentCoords.length - 1].x;
    const bottomY = paddingTop + chartHeight;
    currentAreaPath = `${currentLinePath} L ${lastX} ${bottomY} L ${currentCoords[0].x} ${bottomY} Z`;
  }

  // Path para la curva anterior
  let prevLinePath = '';
  if (previousCoords.length > 0) {
    prevLinePath = `M ${previousCoords[0].x} ${previousCoords[0].y}`;
    for (let i = 1; i < previousCoords.length; i++) {
      const prev = previousCoords[i - 1];
      const curr = previousCoords[i];
      const midX = (prev.x + curr.x) / 2;
      prevLinePath += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`;
    }
  }

  const isPositiveGrowth = periodSummary.growthPercent >= 0;
  const hoveredPoint = hoveredIndex !== null ? dataPoints[hoveredIndex] : null;

  return (
    <div className="bg-card border border-card-border rounded-xl shadow-xl overflow-hidden">
      {/* Cabecera Superior: Métricas Principales + Badges */}
      <div className="p-6 pb-2 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-extrabold font-mono tracking-tight text-foreground">
              {formatCurrencyPYG(periodSummary.totalSalesCurrentMonth)}
            </h2>
            <div
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isPositiveGrowth
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-danger/10 text-danger border border-danger/20'
              }`}
            >
              {isPositiveGrowth ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              <span>{Math.abs(periodSummary.growthPercent)}%</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-sans">
            Rendimiento Comercial & Facturación SIFEN en Tiempo Real
          </p>
        </div>

        {/* Badges Flotantes de Comparativa */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-[#090d16] border border-card-border rounded-lg px-3 py-1.5 shadow-md flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00d2ff]" />
            <span className="text-[11px] text-muted-foreground">Actual:</span>
            <strong className="text-xs font-mono text-foreground">
              {formatCurrencyPYG(
                hoveredPoint ? hoveredPoint.current : periodSummary.totalSalesCurrentMonth
              )}
            </strong>
          </div>

          <div className="bg-[#090d16] border border-amber-500/30 rounded-lg px-3 py-1.5 shadow-md flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
            <span className="text-[11px] text-amber-400/80">Mes Anterior:</span>
            <strong className="text-xs font-mono text-amber-300">
              {formatCurrencyPYG(
                hoveredPoint ? hoveredPoint.previous : periodSummary.totalSalesPreviousMonth
              )}
            </strong>
          </div>

          {/* Selector de Período (Día / Mes / Año) */}
          <div className="inline-flex rounded-lg bg-[#090d16] border border-card-border p-1 text-xs font-mono">
            <button
              type="button"
              onClick={() => setPeriod('day')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                period === 'day'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Día
            </button>
            <button
              type="button"
              onClick={() => setPeriod('month')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                period === 'month'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Mes
            </button>
            <button
              type="button"
              onClick={() => setPeriod('year')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                period === 'year'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Año
            </button>
          </div>
        </div>
      </div>

      {/* Canvas SVG del Gráfico de ONDA COMPLETA: Ocupa el 100% del ancho de margen a margen */}
      <div className="w-full px-3 sm:px-5 py-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="w-full h-64 sm:h-72 select-none"
        >
          <defs>
            <linearGradient id="cyanAreaGradientFull" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00d2ff" stopOpacity="0.45" />
              <stop offset="70%" stopColor="#0066cc" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#0a0d14" stopOpacity="0.0" />
            </linearGradient>

            <filter id="glowEffectFull" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#00d2ff" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Líneas Guía Horizontales */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = paddingTop + chartHeight * (1 - pct);
            return (
              <line
                key={idx}
                x1={0}
                y1={y}
                x2={width}
                y2={y}
                stroke="#1e2638"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            );
          })}

          {/* Barras Verticales de Densidad Estiradas a lo largo de todo el ancho */}
          {currentCoords.map((coord, idx) => {
            const isHighlighted =
              !isDaily && idx >= selectedRange.start && idx <= selectedRange.end;
            const barHeight = paddingTop + chartHeight - coord.y;
            const barWidth = isDaily ? 3 : 10;

            return (
              <g key={idx}>
                <rect
                  x={coord.x - barWidth / 2}
                  y={coord.y}
                  width={barWidth}
                  height={barHeight}
                  fill={isHighlighted ? '#f59e0b' : '#38bdf8'}
                  opacity={isHighlighted ? 0.9 : 0.35}
                  rx={2}
                />

                {isHighlighted && (
                  <line
                    x1={coord.x}
                    y1={paddingTop}
                    x2={coord.x}
                    y2={coord.y}
                    stroke="#f59e0b"
                    strokeWidth="1.2"
                    strokeDasharray="2 3"
                    opacity="0.8"
                  />
                )}
              </g>
            );
          })}

          {/* Área sombreada bajo la curva actual */}
          {currentAreaPath && (
            <path d={currentAreaPath} fill="url(#cyanAreaGradientFull)" />
          )}

          {/* Curva punteada de Ventas del Período Anterior (Naranja/Ámbar) */}
          {prevLinePath && (
            <path
              d={prevLinePath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="5 5"
              opacity="0.8"
            />
          )}

          {/* Curva continua y brillante de Ventas Actuales (Cian) */}
          {currentLinePath && (
            <path
              d={currentLinePath}
              fill="none"
              stroke="#00d2ff"
              strokeWidth="2.8"
              filter="url(#glowEffectFull)"
            />
          )}

          {/* Puntos y Marcadores Interactivos */}
          {currentCoords.map((coord, idx) => {
            const isHovered = hoveredIndex === idx;
            const isStartHighlight = !isDaily && idx === selectedRange.start;
            const isEndHighlight = !isDaily && idx === selectedRange.end;

            return (
              <g
                key={idx}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <rect
                  x={coord.x - stepX / 2}
                  y={paddingTop}
                  width={stepX}
                  height={chartHeight + paddingBottom}
                  fill="transparent"
                />

                {/* Marcadores de inicio y fin del rango */}
                {(isStartHighlight || isEndHighlight) && (
                  <polygon
                    points={`${coord.x - 5},${paddingTop - 7} ${coord.x + 5},${paddingTop - 7} ${coord.x},${paddingTop}`}
                    fill="#f59e0b"
                  />
                )}

                {/* Punto activo en hover */}
                {isHovered && (
                  <g>
                    <line
                      x1={coord.x}
                      y1={paddingTop}
                      x2={coord.x}
                      y2={paddingTop + chartHeight}
                      stroke="#ffffff"
                      strokeDasharray="2 2"
                      strokeWidth="1.2"
                      opacity="0.7"
                    />
                    <circle
                      cx={coord.x}
                      cy={coord.y}
                      r="6"
                      fill="#00d2ff"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  </g>
                )}

                {/* Etiquetas de Eje X alineadas a cada columna */}
                {(isDaily ? idx % 2 === 0 : true) && (
                  <text
                    x={coord.x}
                    y={height - 6}
                    textAnchor="middle"
                    fill={isHovered ? '#ffffff' : '#64748b'}
                    fontSize="11"
                    fontFamily="monospace"
                  >
                    {coord.data.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Timeline Scrubber de Ancho Completo */}
      <div className="p-6 pt-2 border-t border-card-border">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <div className="flex items-center gap-1.5 font-mono">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span>Selector de Rango Temporal</span>
          </div>
          <span className="font-mono text-[11px] text-foreground">
            {isDaily
              ? 'Ventana: Últimos 30 días'
              : `Foco Seleccionado: ${months[selectedRange.start]} – ${months[selectedRange.end]}`}
          </span>
        </div>

        {/* Barra interactiva de meses de extremo a extremo */}
        <div className="flex items-center justify-between bg-[#090d16] border border-card-border rounded-lg p-1.5 text-xs font-mono">
          {months.map((m, idx) => {
            const inRange = !isDaily && idx >= selectedRange.start && idx <= selectedRange.end;
            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  if (idx < selectedRange.start) {
                    setSelectedRange({ start: idx, end: selectedRange.end });
                  } else {
                    setSelectedRange({ start: selectedRange.start, end: idx });
                  }
                }}
                className={`flex-1 py-1.5 text-center rounded transition-all ${
                  inRange
                    ? 'bg-primary text-white font-bold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
