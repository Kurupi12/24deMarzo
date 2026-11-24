'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Calendar, X } from 'lucide-react';

interface DateInputPYProps {
  value: string; // Formato ISO "YYYY-MM-DD" o ""
  onChange: (isoDate: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
  title?: string;
}

function isoToDisplayPY(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso || '').trim());
  if (!m) return '';
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function displayPYToIso(display: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display.trim());
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const year = parseInt(m[3], 10);
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const check = new Date(year, month - 1, day);
  if (
    check.getFullYear() !== year ||
    check.getMonth() !== month - 1 ||
    check.getDate() !== day
  ) {
    return null;
  }
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/**
 * Selector de fecha estricto en orden paraguayo DD/MM/AAAA independiente del idioma del navegador.
 * Emite y recibe strings ISO "YYYY-MM-DD".
 */
export function DateInputPY({
  value,
  onChange,
  required = false,
  placeholder = 'dd/mm/aaaa',
  className = '',
  allowClear = false,
  title = 'Formato: Día / Mes / Año',
}: DateInputPYProps) {
  const [text, setText] = useState(() => isoToDisplayPY(value));
  const nativePickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(isoToDisplayPY(value));
  }, [value]);

  const handleTextChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    } else if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    setText(formatted);

    if (digits.length === 0) {
      onChange('');
      return;
    }

    if (digits.length === 8) {
      const iso = displayPYToIso(formatted);
      if (iso) {
        onChange(iso);
      }
    }
  };

  const handleBlur = () => {
    if (!text.trim()) {
      if (value) onChange('');
      return;
    }
    const iso = displayPYToIso(text);
    if (iso) {
      if (iso !== value) onChange(iso);
    } else {
      // Revertir al último valor válido si quedó incompleto o inválido
      setText(isoToDisplayPY(value));
    }
  };

  const handleOpenCalendar = () => {
    const el = nativePickerRef.current;
    if (!el) return;
    try {
      if (typeof (el as any).showPicker === 'function') {
        (el as any).showPicker();
      } else {
        el.focus();
        el.click();
      }
    } catch {
      el.focus();
      el.click();
    }
  };

  return (
    <div className="relative flex items-center w-full" title={title}>
      <input
        type="text"
        inputMode="numeric"
        maxLength={10}
        required={required}
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        onBlur={handleBlur}
        onFocus={(e) => e.target.select()}
        placeholder={placeholder}
        className={`w-full pr-12 font-mono ${className}`}
      />

      {allowClear && text && (
        <button
          type="button"
          onClick={() => {
            setText('');
            onChange('');
          }}
          className="absolute right-7 p-0.5 text-muted-foreground hover:text-foreground transition-colors"
          title="Limpiar fecha"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      <button
        type="button"
        onClick={handleOpenCalendar}
        className="absolute right-2 p-1 rounded text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 transition-colors"
        title="Abrir calendario (DÍA / MES / AÑO)"
      >
        <Calendar className="w-4 h-4" />
      </button>

      {/* Selector nativo oculto solo para usar el calendario emergente del navegador */}
      <input
        ref={nativePickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only pointer-events-none"
      />
    </div>
  );
}
