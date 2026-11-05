'use client';

import React from 'react';

interface DepositoLogoProps {
  className?: string;
  variant?: 'corporate-contrast' | 'pure-white';
}

export function DepositoLogo({
  className = 'h-11 w-auto',
  variant = 'corporate-contrast',
}: DepositoLogoProps) {
  const isCorporate = variant === 'corporate-contrast';
  const warehouseFill = isCorporate ? '#e30613' : '#ffffff';
  const number4Fill = isCorporate ? '#ffffff' : '#0a0d14';
  const textFill = '#ffffff';

  return (
    <svg
      viewBox="0 0 342.8 134.5"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Logo Depósito 4 de Marzo"
    >
      {/* Silueta del depósito / techo industrial */}
      <g>
        <rect fill={warehouseFill} x="9.3" y="38.6" width="18.5" height="18" />
        <rect fill={warehouseFill} x="27.8" y="26.6" width="18.5" height="12" />
        <polygon
          fill={warehouseFill}
          points="46.3 13.3 46.3 18.6 27.8 18.6 27.8 26.6 9.3 26.6 9.3 13.3 46.3 13.3"
        />
        <polygon
          fill={warehouseFill}
          points="120.3 13.3 120.3 124.3 9.3 124.3 9.3 83.7 27.8 83.7 27.8 56.7 46.3 56.7 46.3 38.6 64.8 38.6 64.8 26.6 46.3 26.6 46.3 18.6 64.8 18.6 64.8 13.3 120.3 13.3"
        />
      </g>

      {/* Número 4 oficial sobre el depósito (sin artefactos de máscara) */}
      <path
        fill={number4Fill}
        d="M121.2,109h-7.4v16h-37.5v-16H25.3v-29.6L76.4,12.9h37.5v66.5h7.4v29.6ZM76.4,79.4v-20.7h-.8l-15.4,20v.6h16.2Z"
      />

      {/* Tipografía DEPÓSITO en Blanco de Alto Contraste */}
      <text
        fill={textFill}
        style={{
          fontFamily: "'Oswald', 'Montserrat', -apple-system, sans-serif",
          fontSize: '28.8px',
          fontWeight: 400,
          letterSpacing: '0.06em',
        }}
        transform="translate(125.1 71)"
      >
        <tspan x="0" y="0">DEPÓSITO</tspan>
      </text>

      {/* Tipografía de marzo en Blanco de Alto Contraste */}
      <text
        fill={textFill}
        style={{
          fontFamily: "'Oswald', 'Montserrat', -apple-system, sans-serif",
          fontSize: '43.5px',
          fontWeight: 700,
          letterSpacing: '-0.02em',
        }}
        transform="translate(122.9 105.7)"
      >
        <tspan x="0" y="0">de marzo</tspan>
      </text>
    </svg>
  );
}
