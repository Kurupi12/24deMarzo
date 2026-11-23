'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, MapPin, Search, ExternalLink, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCustomDialog } from '@/components/common/custom-dialog-provider';

interface EditSaleCustomerModalProps {
  sale: any | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updatedSale: any) => void;
}

export function EditSaleCustomerModal({
  sale,
  isOpen,
  onClose,
  onUpdated,
}: EditSaleCustomerModalProps) {
  const { alert: customAlert } = useCustomDialog();
  const [customerRuc, setCustomerRuc] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupFeedback, setLookupFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (sale) {
      setCustomerRuc(sale.customerRuc || '');
      setCustomerName(sale.customerName || '');
      setCustomerAddress(sale.customerAddress || sale.project?.address || '');
      setGoogleMapsUrl(sale.googleMapsUrl || sale.project?.googleMapsUrl || '');
      setDeliveryNotes(sale.deliveryNotes || '');
      setPaymentReference(sale.paymentReference || '');
      setLookupFeedback(null);
    }
  }, [sale]);

  if (!isOpen || !sale) return null;

  const handleDnitLookup = async () => {
    if (!customerRuc.trim() || customerRuc.trim().length < 4) return;
    setLookingUp(true);
    setLookupFeedback(null);
    try {
      const res = await fetch(`/api/v1/billing/customers/lookup?doc=${encodeURIComponent(customerRuc.trim())}`);
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        if (d.found) {
          setCustomerRuc(d.ruc);
          setCustomerName(d.name);
          if (d.address && !customerAddress) setCustomerAddress(d.address);
          if (d.googleMapsUrl && !googleMapsUrl) setGoogleMapsUrl(d.googleMapsUrl);
          setLookupFeedback({ ok: true, msg: d.message });
        } else {
          setLookupFeedback({ ok: false, msg: d.message });
        }
      }
    } catch {
      setLookupFeedback({ ok: false, msg: 'No se pudo consultar en línea en este momento.' });
    } finally {
      setLookingUp(false);
    }
  };

  const handleOpenMapsSearch = () => {
    const target = googleMapsUrl.trim();
    if (target && (target.startsWith('http://') || target.startsWith('https://'))) {
      window.open(target, '_blank', 'noopener,noreferrer');
      return;
    }
    const query = customerAddress.trim() || target;
    if (!query) return;
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      customAlert({
        title: 'Nombre Requerido',
        message: 'Ingrese al menos el Nombre del Cliente (el RUC/CI es opcional).',
        variant: 'warning',
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/v1/billing/sales/${sale.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerRuc: customerRuc.trim(),
          customerName: customerName.trim(),
          customerAddress: customerAddress.trim() || null,
          googleMapsUrl: googleMapsUrl.trim() || null,
          deliveryNotes: deliveryNotes.trim() || null,
          paymentReference: paymentReference.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        onUpdated(json.data);
        onClose();
      } else {
        customAlert({
          title: 'Error al Guardar',
          message: json.error?.message || 'No se pudieron actualizar los datos.',
          variant: 'danger',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-card border border-card-border rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="px-5 py-4 border-b border-card-border flex items-center justify-between bg-[#0b0e14]">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              Completar Datos / Dirección &bull; {sale.saleNumber}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-3.5 text-xs">
          <div>
            <label className="block font-mono text-muted-foreground mb-1">
              RUC o C.I. del Cliente (Opcional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customerRuc}
                onChange={(e) => setCustomerRuc(e.target.value)}
                placeholder="Ej: 80134022-5, 4776458 o dejar vacío"
                className="flex-1 bg-[#0d121c] border border-card-border rounded-md px-3 py-2 font-mono font-bold text-foreground focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={handleDnitLookup}
                disabled={lookingUp}
                className="px-3 py-2 rounded-md bg-primary/15 border border-primary/40 text-primary hover:bg-primary/25 font-semibold flex items-center gap-1.5 shrink-0"
              >
                {lookingUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>Consultar DNIT</span>
              </button>
            </div>
            {lookupFeedback && (
              <p className={`mt-1 text-[11px] flex items-center gap-1 ${lookupFeedback.ok ? 'text-emerald-400' : 'text-amber-400'}`}>
                {lookupFeedback.ok ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : <AlertCircle className="w-3 h-3 shrink-0" />}
                <span>{lookupFeedback.msg}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block font-mono text-muted-foreground mb-1">Nombre o Razón Social *</label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-2 text-foreground font-semibold focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block font-mono text-muted-foreground mb-1">Dirección de Facturación / Entrega</label>
            <input
              type="text"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder="Ej: Avda. Defensores del Chaco c/ 1ro de Mayo"
              className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-mono text-muted-foreground">Enlace de Ubicación Google Maps</label>
              {(googleMapsUrl.trim() || customerAddress.trim()) && (
                <button
                  type="button"
                  onClick={handleOpenMapsSearch}
                  className="text-[11px] text-primary hover:underline flex items-center gap-1 font-mono"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>{googleMapsUrl.trim().startsWith('http') ? 'Abrir en Google Maps' : 'Buscar en Google Maps'}</span>
                </button>
              )}
            </div>
            <input
              type="text"
              value={googleMapsUrl}
              onChange={(e) => setGoogleMapsUrl(e.target.value)}
              placeholder="Pegar link de WhatsApp/Maps (ej: https://maps.app.goo.gl/...)"
              className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-2 font-mono text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-mono text-muted-foreground">
                N° Comprobante Transferencia / Cheque
              </label>
              {sale.paymentMethod === 'TRANSFERENCIA_BANCARIA' &&
                sale.paymentCondition !== 'A_CUENTA' &&
                !paymentReference.trim() && (
                  <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 font-semibold">
                    Falta comprobante SIPAP
                  </span>
                )}
            </div>
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="Ej: 10485920 / Ueno / Continental"
              className={`w-full bg-[#0d121c] border rounded-md px-3 py-2 font-mono text-foreground focus:outline-none focus:border-primary ${
                sale.paymentMethod === 'TRANSFERENCIA_BANCARIA' &&
                sale.paymentCondition !== 'A_CUENTA' &&
                !paymentReference.trim()
                  ? 'border-amber-500/60'
                  : 'border-card-border'
              }`}
            />
          </div>

          <div>
            <label className="block font-mono text-muted-foreground mb-1">Notas de Entrega</label>
            <input
              type="text"
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="Indicaciones adicionales para el chofer o facturación..."
              className="w-full bg-[#0d121c] border border-card-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-card-border">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-md border border-card-border text-muted-foreground hover:bg-muted/20"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-white font-semibold flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
