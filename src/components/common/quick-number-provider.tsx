'use client';

import { useEffect } from 'react';

export function QuickNumberProvider() {
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        target.tagName === 'INPUT' &&
        (target as HTMLInputElement).type === 'number'
      ) {
        // Auto-seleccionar todo el texto para permitir sobreescritura inmediata sin borrar
        (target as HTMLInputElement).select();
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        target.tagName === 'INPUT' &&
        (target as HTMLInputElement).type === 'number'
      ) {
        (target as HTMLInputElement).select();
      }
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  return null;
}

