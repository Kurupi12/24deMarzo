# Manual Operativo de Módulos & Roadmap de Evolución — Depósito 4 de Marzo

Este documento consolida el estado funcional de cada uno de los 8 módulos del sistema ERP, detallando **lo que se puede hacer actualmente** y las **propuestas de mejora planificadas** para mantener una referencia técnica y operativa viva del proyecto.

---

## 1. Dashboard Central (`/`)

### Funcionalidades Actuales
* **Telemetría Financiera y Operativa en Tiempo Real:** Métricas actualizadas automáticamente cada 15 segundos:
  * Facturación neta del día.
  * Débito fiscal IVA 10% acumulado en DNIT.
  * Nómina salarial semanal activa.
  * Conteo de artículos en stock crítico según Kardex.
* **Gráfico de Rendimiento Comercial de Ancho Completo:** Curva de densidad de ventas a pantalla completa (`preserveAspectRatio="none"`) con selector de vista (Día, Mes, Año) y comparación visual contra el mes anterior.
* **Medidor Radial de Metas:** Gauge de gran formato con textura rayada, porcentaje destacado (75.8%) y desglose de canales comerciales (Ventas Mostrador Contado, Crédito SIFEN y Transferencias SIPAP/POS).
* **Desglose de Gastos & Margen:** Visualización de costos operativos versus utilidad neta mensual.
* **Monitor de Visión Artificial:** Telemetría en vivo conectada al webhook de cámaras con IA para control de accesos biométricos.

### Roadmap de Mejoras
* [ ] **Top 5 Artículos Más Vendidos:** Tarjeta con los productos de mayor rotación del mes (ej: Cemento Yguazú, Varillas 10mm, Ladrillo hueco).
* [ ] **Barra de Accesos Rápidos:** Botones de un clic para *"Nueva Venta POS"*, *"Ingresar Factura de Compra"* o *"Abrir Caja"*.
* [ ] **Filtro de Rango Calendario Libre:** Selector de fechas personalizada para el gráfico analítico.

---

## 2. Catálogo & Inventario (`/inventory`)

### Funcionalidades Actuales
* **Catálogo Maestro de 653 SKUs Reales:** Visualización de código SKU, código de barras, descripción, unidad DNIT, tasa de IVA, precio costo y venta.
* **Semáforo Visual de Stock Físico:** Estados (Normal en verde, Crítico en ámbar si es $\le$ stock mínimo, y Agotado en rojo).
* **Buscador Reactivo & Filtros:** Búsqueda instantánea por SKU, descripción o código de barras (compatible con lectores USB/Bluetooth) y filtros por tasa impositiva.
* **Gestión de Kardex Inmutable:** Modal para asentar movimientos manuales (ajustes positivos, mermas/roturas, entradas) con auditoría de usuario y fecha.
* **Edición Inline de SKU:** Modificación rápida de códigos directamente en la tabla con validación de unicidad.
* **Edición Integral de Producto:** Modal (`EditProductModal`) para editar descripción, precios, costos, IVA, unidades de medida y umbrales de stock.
* **Baja Lógica de Producto:** Modal (`DeleteProductModal`) que protege el histórico de ventas y facturas SIFEN pasadas.

### Roadmap de Mejoras
* [ ] **Categorización por Familias:** Clasificación en *Materiales Pesados*, *Ferretería*, *Pinturas*, *Plomería*, *Electricidad*.
* [ ] **Importador / Actualizador Masivo Excel (`.xlsx`):** Carga masiva de listas de precios actualizadas por proveedor.
* [ ] **Generador de Etiquetas de Góndola:** Impresión de etiquetas adhesivas con código de barras y precio para estanterías.

---

## 3. Compras a Proveedores (`/purchases`)

### Funcionalidades Actuales
* **Ingreso Oficial de Facturas de Proveedor:** Registro de comprobante físico (ej: *001-002-0045612*), RUC con DV, Razón Social y condición de pago.
* **Afectación Automática a Kardex & Almacén:** Asiento inmediato como `IN_PURCHASE` e incremento del stock físico en el depósito principal.
* **Valuación Contable por Costo Promedio Ponderado (PPP):**
  $$\text{Nuevo Costo} = \frac{(\text{Stock Previo} \times \text{Costo Previo}) + (\text{Cantidad Comprada} \times \text{Costo de Compra})}{\text{Stock Previo} + \text{Cantidad Comprada}}$$
  Si se tenían 500 unidades a ₲ 800 y se compran 500 a ₲ 850, el costo de catálogo pasa automáticamente a **₲ 825 c/u**.
* **Historial y Detalle de Compras:** Visualizador con desglose de ítems, cantidades, costos unitarios y subtotales.

### Roadmap de Mejoras
* [ ] **Control de Cuentas por Pagar (Compras a Crédito):** Panel de vencimientos a 30/60 días con alertas de facturas por vencer.
* [ ] **Órdenes de Compra Previas:** Generación de orden de pedido que se liquida al descargar el camión en el depósito.
* [ ] **Historial por Proveedor:** Filtro consolidado de compras a una empresa específica (*INC, Yguazú, Vemarcorp*).

---

## 4. Ventas & Facturación Electrónica SIFEN (`/billing`)

### Funcionalidades Actuales
* **Punto de Venta Rápido (POS):** Buscador de materiales con autocompletado y carrito de compras en tiempo real.
* **Precios Negociados por Cliente:** Modificación del precio unitario directamente en el carrito, con recálculo automático de IVA y advertencia visual si se vende por debajo del costo.
* **Validación de RUC Paraguayo:** Validación oficial de dígito verificador mediante algoritmo Módulo 11.
* **Facturación Electrónica SIFEN:** Generación de DTE oficial con Código Digital de Control (CDC) de 44 dígitos y código QR de la DNIT.
* **Multi-Obra por Cliente:** Selector de destinos/obras por cliente con botón de alta rápida (`+ Nueva Obra`) para registrar dirección exacta, capataz y teléfono en obra.
* **Logística con Soporte de Dos Camiones y Choferes:**
  * Envío 1: Chofer 1 + Camión 1 + Ayudantes de cuadrilla.
  * Envío 2: Soporte para 2do camión y 2do chofer bajo la misma factura fiscal única para pedidos divididos de gran volumen.
* **Historial de Ventas:** Visualización de comprobantes, obras asociadas, choferes y modal de ticket/factura para impresión.

### Roadmap de Mejoras
* [ ] **Ergonomía de Teclado & NumPad:** Auto-selección de cantidad al hacer clic o foco (`select()`), teclas de salto rápido (Enter/Tab) y botones de cantidad rápida (`+10`, `+50`, `+100`, `+1000`).
* [ ] **Presupuestos / Cotizaciones:** Guardar pedidos cotizados para convertirlos en facturas con un clic cuando el cliente dé el visto bueno.
* [ ] **Notas de Crédito Electrónicas SIFEN:** Emisión de notas de crédito oficiales para devoluciones de materiales.
* [ ] **Impresión Térmica de 80mm:** Formato compacto optimizado para ticketeras de mostrador.

---

## 5. Caja & Tesorería Blindada (`/billing?tab=shifts`)

### Funcionalidades Actuales
* **Apertura Única por Día & Cierre Inmutable:** Bloqueo de turnos duplicados; una vez cerrada la caja, los montos quedan congelados e inalterables.
* **Comprobación Inicial a Ciegas ("Blind Count"):** El cajero ingresa el conteo físico de lo que encuentra en el cajón y el sistema lo compara contra el saldo de cierre del día anterior; si hay discrepancia, exige justificación obligatoria.
* **Caja Menor y Asientos Operativos:**
  * `+ Ingreso de Sencillo`: Carga de cambio para dar vuelto.
  * `- Salida / Gasto`: Retiros autorizados con beneficiario obligatorio (*Adelanto a Carlos Cabañas, bidones de agua, flete menor*).
* **Extracción de Billetes Grandes a Sobre:** Retiro seguro de fajos de billetes de 100k y 50k a la caja fuerte interna para evitar acumulación de efectivo en el mostrador.
* **Ergonomía de Escritura Rápida en Modales:** Auto-selección instantánea de números en un clic/tab, supresión total de spinners/flechas del navegador y botones táctiles directos (`500k`, `1M`, `2M`, `3M`, `5M`, `10M`) para arqueos, sobres y retiros sin teclear ceros.
* **Fórmula de Efectivo en Vivo:**
  $$\text{Efectivo en Cajón} = \text{Fondo Inicial} + \text{Ventas en Efectivo} + \text{Sencillo} - \text{Gastos} - \text{Sobres}$$
* **Historial Permanente de Cierres:** Registro de auditoría de los últimos turnos archivados.

### Roadmap de Mejoras
* [ ] **Calculadora de Billetaje:** Desglose de billetes por denominación (100k, 50k, 20k, 10k, 5k, 2k, monedas) para arqueo automático.
* [ ] **Acta de Cierre en PDF:** Comprobante para imprimir y firmar físicamente por cajero y supervisor.

---

## 6. Reportes & Obras (`/reports`)

### Funcionalidades Actuales
* **Reporte 1 (Ventas por Obra & Cliente):** Agrupación por cliente y desglose de montos por cada obra o destino de entrega.
* **Reporte 2 (Despachos por Chofer / Cuadrilla):** Trazabilidad de qué chofer, camión (1 y 2) y ayudantes entregaron cada pedido.
* **Reporte 3 (Kardex & Valorización de Inventario):** Valuación al costo versus precio de venta y utilidad proyectada en Guaraníes.
* **Reporte 4 (Lista Oficial de Precios):** Catálogo de precios y disponibilidad física de stock.
* **Exportación Directa:** Descarga inmediata a Excel (`.csv` con compatibilidad UTF-8 BOM) e impresión limpia en papel/PDF.

### Roadmap de Mejoras
* [ ] **Reporte de Rentabilidad Neta por Producto:** Ranking de artículos que más margen neto dejan en Guaraníes versus los de menor utilidad.
* [ ] **Cuentas por Cobrar & Antigüedad de Deuda:** Listado de clientes con saldos pendientes por ventas a crédito.

---

## 7. Recursos Humanos & Nómina (`/hr`)

### Funcionalidades Actuales
* **Legajos Digitales de Colaboradores:** Fichas de los 7 funcionarios con legajo, cédula, cargo, fecha de ingreso y departamento.
* **Nómina de Salario Semanal:** Cálculo automático de retención legal IPS Obrero (9%) y salario neto semanal a cobrar.
* **Gestión de Adelantos Salariales:** Solicitud y aprobación con tope máximo de seguridad (hasta 70% del salario semanal).
* **Monitor Biométrico con IA:** Eventos en tiempo real del webhook de visión artificial con porcentaje de confianza de reconocimiento facial.

### Roadmap de Mejoras
* [ ] **Recibos de Salario Semanal Oficiales:** Generación de recibos PDF con duplicado para firma del colaborador.
* [ ] **Conexión Directa Caja-Nómina:** Descuento automático de adelantos entregados en la caja registradora en la liquidación semanal del empleado.
* [ ] **Control de Permisos y Vacaciones:** Registro de reposos médicos del IPS y días de descanso.

---

## 8. Configuración & Flota (`/settings`)

### Funcionalidades Actuales
* **Gestión Integral de Flota de Vehículos:** Registro de camiones y furgones con código interno, chapa oficial, marca, modelo, capacidad en toneladas y notas de uso.
* **Edición y Actualización de Flota:** Modificación ágil de datos de vehículos.
* **Baja Lógica de Vehículos:** Archivo de unidades vendidas o inactivas sin romper el histórico de ventas pasadas.

### Roadmap de Mejoras
* [ ] **Gestión de Usuarios y Roles:** Control de perfiles de acceso (Cajero/a Fátima, Administrador, Almacenero, Contador).
* [ ] **Alertas de Mantenimiento:** Avisos de vencimiento de habilitación municipal, seguro del camión y services mecánicos.
* [ ] **Configuración de Datos Fiscales:** Parámetros de timbrado y numeración de sucursales SIFEN.

