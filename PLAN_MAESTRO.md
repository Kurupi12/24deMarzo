# Plan Maestro de Desarrollo — Core ERP Empresarial
**Empresa / Proyecto:** Depósito 4 de Marzo  
**Arquitectura:** Next.js (App Router) + TypeScript + Tailwind CSS + Neon PostgreSQL Serverless + Prisma ORM + Neon Auth  
**Hosting / Infraestructura:** Vercel Serverless (Producción en https://24de-marzo.vercel.app)  
**Estado General:** Producción Activa — 100% Desplegado y Operativo  

---

## 📌 Convención de Gobierno y Gestión de Alcance
Cualquier requerimiento no contemplado originalmente debe ser clasificado e incorporado en su respectiva rama/etapa dentro de este documento antes o durante su desarrollo.

---

## 🗺️ Mapa de Etapas

### [x] Etapa 0: Fundaciones, Arquitectura e Infraestructura Base
- [x] Configuración inicial de entorno Next.js 14 App Router y TypeScript.
- [x] Estructura modular estricta por dominios (`/inventory`, `/billing`, `/hr`, `/dashboard`, `/shared`).
- [x] Definición del esquema unificado en Prisma (`prisma/schema.prisma`).
- [x] Conexión dual Neon PostgreSQL Serverless (Pooler para lambdas y Direct para migraciones).
- [x] Integración de Neon Managed Better Auth (`@neon/auth`).
- [x] Procesamiento de datos maestros iniciales (`Funcionarios_4_de_Marzo.xlsx` y `lista_productos_actualizada_4.xlsx`).
- [x] Script de migración y seeding ejecutado con éxito:
  - 1 Usuario Administrador Central.
  - 1 Depósito Principal: *Depósito Central 4 de Marzo* (`DEP-4M`).
  - 7 Funcionarios con salarios semanales y legajos.
  - 653 Productos cargados con stocks iniciales y asientos de Kardex.
- [x] Compilación de producción (`next build`) verificada y pruebas end-to-end aprobadas.

---

### [x] Etapa 1: Catálogo Maestro & Control de Inventario Multi-Depósito (COMPLETADA)
- [x] Endpoints base de productos y movimientos de stock (`/api/v1/inventory/products`).
- [x] Endpoint de movimientos de Kardex con historial y auditoría (`/api/v1/inventory/movements`).
- [x] **Data Table Operativa de Alta Densidad**:
  - Vista compacta de los 653 productos de catálogo.
  - Visualización de SKU, descripción, unidad de medida SIFEN, tasa de IVA, precio venta, costo y stock actual.
  - Semáforo visual de stock (Normal, Bajo, Sin Stock).
  - Paginación compacta integrada.
- [x] **Búsqueda & Filtros Instantáneos**:
  - Búsqueda en tiempo real por SKU, descripción o código de barras (lector USB/Bluetooth).
  - Filtro por tasa de IVA (10%, 5%, Exento).
  - Filtro de alerta de reposición urgente (Stock <= Mínimo).
- [x] **Gestión de Kardex y Movimientos Inmutables**:
  - Modal interactivo para registro de ajustes (positivo/negativo), entradas por compra y salidas.
  - Historial de los últimos asientos por producto con trazabilidad de usuario y depósito.
- [x] **Alta de Nuevos Productos**:
  - Formulario modal con validación Zod (`CreateProductSchema`).
  - Asignación de unidad de medida oficial DNIT (UNIDAD, KG, LITRO, METRO, etc.) y tasa tributaria.

---

### [x] Etapa 2: Recursos Humanos, Nómina & Biometría con IA (COMPLETADA)
- [x] Endpoints operativos de personal, adelantos y asistencias (`/api/v1/hr/employees`, `/api/v1/hr/advances`, `/api/v1/hr/attendances`).
- [x] **Fichas Técnicas & Legajos Digitales**:
  - Visualización completa de los 7 colaboradores de "Depósito 4 de Marzo".
  - Desglose de Salario Semanal Bruto, Retención Legal IPS (9%) y Salario Neto a cobrar.
- [x] **Gestión Automatizada de Adelantos & Financiación de Sobregiros**:
  - Modal interactivo con control de tope estándar (100% del salario semanal) y soporte para sobregiros financiables.
  - Conversión de saldos deudores en Préstamos en Cuotas (`disbursedFromCash: false`) con inicio de deducción a partir de la próxima semana (+7 días).
  - Reconocimiento automático de sobregiros ya financiados en la Liquidación Semanal: balance a 0 Gs., ocultación del botón redundante de financiación y emisión de Recibo A4 equilibrado.
- [x] **Monitor de Marcaciones Biométricas & IA**:
  - Panel en tiempo real que consume los eventos del webhook de cámaras con IA (`/api/v1/hr/biometrics/webhook`).
  - Muestra porcentaje de confianza del modelo de reconocimiento facial, cámara de captura y marca temporal.
- [x] **Alta de Nuevos Funcionarios**:
  - Formulario modal con cálculo y asignación automática de legajo y código biométrico.

---

### [x] Etapa 3: Facturación, Ventas & Cumplimiento Tributario SIFEN (COMPLETADA)
- [x] Endpoints fiscales operativos (`/api/v1/billing/sales`, `/api/v1/billing/shifts`).
- [x] **Punto de Venta Rápido (POS Mostrador)**:
  - Buscador de productos con selector rápido entre los 653 ítems de catálogo.
  - Carrito reactivo con cálculo de subtotales y deducción automática en Kardex (`OUT_SALE`).
  - Validación de RUC paraguayo en tiempo real mediante algoritmo oficial Módulo 11.
- [x] **Cumplimiento Fiscal SIFEN**:
  - Desglose oficial de IVA 10% (Base/11), IVA 5% (Base/21) y Exento.
  - Generador de Código Digital de Control (CDC) de 44 dígitos con validación de dígito verificador.
  - Enlace oficial QR del SIFEN integrado en el comprobante.
- [x] **Control de Cajas & Arqueo de Turnos**:
  - Apertura con fondo inicial, acumulación de cobros en efectivo y cierre de caja con control de diferencias (`expectedBalance` vs `closingBalance`).
- [x] **Historial & Modal de Detalle de DTE**:
  - Listado de comprobantes emitidos con vista previa para impresión de ticket fiscal.

---

### [x] Etapa 4: Executive Dashboard & Capa de Extensibilidad (COMPLETADA)
- [x] **Executive Dashboard en Tiempo Real ([`src/app/page.tsx`](file:///c:/Users/Santiago/Desktop/Deposito%204%20de%20marzo/src/app/page.tsx))**:
  - Telemetría en vivo con actualización automática cada 15 segundos.
  - Indicadores KPI: Ingresos del día, Débito Fiscal IVA 10% acumulado, Nómina semanal activa y Conteo de artículos en Stock Crítico.
  - Alertas prioritarias de reposición de almacén vinculadas al Kardex.
  - Monitor en vivo de eventos de visión artificial y biometría por cámaras.
- [x] **Capa de Extensibilidad e-Commerce (`/api/v1/ecommerce/sync`)**:
  - Endpoint seguro con autenticación por `x-api-key` para consulta de stock en tiempo real.
  - Ingesta y procesamiento automático de órdenes de compra web con generación de DTE fiscal y deducción de stock en Neon Postgres.
- [x] **Integración Integral de la Suite ERP**:
  - Módulos 100% interconectados de forma atómica y desacoplada.

---

### [x] Etapa 5: Multi-Obra por Cliente, Logística de Despacho, Compras y Reportes (COMPLETADA)
- [x] **Multi-Obra por Cliente (`CustomerProjects`)**:
  - Modelo `CustomerProject` en Neon PostgreSQL (`customer_projects`).
  - Creación dinámica de obras desde el POS con nombre, dirección exacta de descarga, capataz y teléfono.
  - Asignación de obra a las facturas y ventas con trazabilidad completa.
- [x] **Logística y Trazabilidad de Despachos (`DeliveryDispatch`)**:
  - Trazabilidad en ventas: Chofer asignado (`driverId` -> `Employee`), Cuadrilla de Ayudantes (`helperIds`), Chapa del Vehículo (`vehiclePlate`), Estado de Entrega (`deliveryStatus`) y Notas de descarga.
  - Visualización del chofer y obra en la tabla de facturación y en el comprobante fiscal DTE.
- [x] **Módulo de Compras a Proveedores (`/purchases`)**:
  - Registro de facturas físicas de proveedores (N° Comprobante, RUC, Razón Social, Ítems y Costos).
  - Asiento automático en Kardex (`IN_PURCHASE`), actualización de stock físico y de costo unitario de producto.
- [x] **Centro Avanzado de Reportes & Exportación (`/reports`)**:
  - Reporte 1: Ventas agrupadas por Cliente y por Obra con subtotales y detalle de facturas.
  - Reporte 2: Trazabilidad de despachos por chofer y cuadrilla de ayudantes.
  - Reporte 3: Kardex y Valorización de Inventario (Costo vs Venta y Margen de Utilidad Proyectado).
  - Reporte 4: Lista Oficial de Precios y Disponibilidad.
  - Exportación instantánea a Excel (`.csv` con BOM UTF-8) y formato imprimible optimizado.
- [x] **Despliegue Continuo en Vercel**:
  - Repositorio GitHub sincronizado (`https://github.com/Kurupi12/24deMarzo`).
  - Build verificado y desplegado en producción en `https://24de-marzo.vercel.app`.

---

## 📋 Registro de Nuevas Funcionalidades Incorporadas (Change Log)
| Fecha | Rama / Módulo | Funcionalidad Añadida | Justificación |
|---|---|---|---|
| 04/11/2026 | Infraestructura | Neon PostgreSQL Serverless + Neon Auth | Reemplazo de Supabase para mayor escalabilidad serverless y branching. |
| 04/11/2026 | RRHH / Nómina | Soporte de Salario Semanal (`SalaryFrequency.WEEKLY`) | Requerido por la estructura real de pagos del Depósito 4 de Marzo. |
| 05/11/2026 | Inventario | Edición Inline de SKU | Modificación ágil de códigos de barra / SKU con validación de duplicados vía PATCH. |
| 05/11/2026 | Inventario | Alineación a la derecha de badges de stock | Mejora ergonómica y visual en la columna de estado. |
| 05/11/2026 | Inventario | Localización 100% español en Kardex | Visualización clara de 'Inventario Inicial', 'Entrada por Compra', etc., eliminando enums en inglés. |
| 05/11/2026 | Inventario | Edición Integral de Producto (`EditProductModal`) | Modificación completa de descripción, precios, costos, IVA, unidades DNIT y stock mínimo. |
| 05/11/2026 | Inventario | Eliminación de Producto (`DeleteProductModal`) | Baja física en cascada o baja lógica archivada protegiendo comprobantes SIFEN históricos. |
| 05/11/2026 | UI / Branding | Integración de Logo SVG en Cabecera (`DepositoLogo`) | Extracción del logo SVG oficial con conversión a blanco puro (#ffffff) y calado transparente del número 4. |
| 05/11/2026 | UI / Branding | Rediseño de Alto Contraste y Escala de Logo | Aumento de tamaño al doble en barra lateral (h-12); combinación de Almacén Rojo + 4 Blanco + Textos en Blanco Puro para legibilidad máxima y cero pixelación. |
| 05/11/2026 | UI / Layout | Unificación de Logo Único Superior Izquierdo | Retiro del logo duplicado en la barra superior (Header) en todos los módulos, dejando exclusivamente el logo corporativo principal en el vértice superior izquierdo (Sidebar). |
| 05/11/2026 | Dashboard / Analítica | Gráficos Financieros & Comparativas (`SalesPerformanceChart`, `PortfolioBreakdownCard`, `ExpensesBalanceCard`) | Suite analítica en modo oscuro con gráfico de onda/densidad de ventas (Día, Mes, Año), comparativa mes anterior con zona destacada, medidor radial de meta (75.8%) y desglose de gastos mensuales vs margen neto. |
| 05/11/2026 | Dashboard / UI | Expansión de Gráficos al 100% Ancho & Rediseño de Medidor Radial | Gráfico de ventas ahora se extiende de borde a borde sin márgenes vacíos (preserveAspectRatio: none); medidor radial ampliado a gran escala con textura rayada, cifras destacadas y panel de telemetría de metas. |
| 05/11/2026 | Despliegue / DevOps | Publicación Oficial en GitHub (`Kurupi12/24deMarzo`) | Inicialización y vinculación del repositorio Git remoto en la rama principal `main` con protección de variables en `.gitignore`. |
| 05/11/2026 | Despliegue / Vercel | Resolución de Conflicto de Dependencias (`.npmrc`) | Inclusión de `legacy-peer-deps=true` para resolver compatibilidad entre `@neon/auth` y Next.js 14 en los runners de Vercel. |
| 05/11/2026 | Producción / En Vivo | Lanzamiento Oficial en Vercel (`https://24de-marzo.vercel.app`) | Despliegue exitoso conectado a GitHub y Neon Serverless. Dashboard, Inventario, Facturación POS y RRHH operativos en la nube. |
| 05/11/2026 | Logística & Flota | CRUD Completo de Flota de Vehículos (`/settings` y `/api/v1/logistics/vehicles`) | Módulo de administración de camiones y furgones con código interno, chapa, marca, modelo y capacidad en toneladas. |
| 05/11/2026 | Facturación / POS | Doble Chofer y Doble Camión en Venta Única | Posibilidad de asignar dos choferes y dos camiones con sus respectivas cuadrillas de ayudantes bajo una misma factura SIFEN para pedidos de gran volumen o despachos divididos. |
| 05/11/2026 | Facturación / POS | Modificación de Precio de Venta al Vuelo en Carrito | Flexibilidad comercial para ventas con precios negociados o por volumen con recálculo automático de IVA y alertas si el precio es menor al costo. |
| 05/11/2026 | Compras / Kardex | Valuación por Costo Promedio Ponderado (PPP) | Implementación de la fórmula contable oficial de costo promedio ponderado al asentar compras a proveedores, manteniendo la exactitud de márgenes y Kardex. |
| 05/11/2026 | Tesorería / Caja | Blindaje de Caja, Cierre Inmutable, Sencillo, Gastos, Extracciones a Sobre y Arqueo a Ciegas | Apertura con comprobación contra cierre anterior, bloqueo de doble turno, asientos de sencillo, adelantos/gastos menores, retiros a caja fuerte y cierres congelados inmutables. |
| 06/11/2026 | Facturación / UX | Carga Numérica Ultra-Rápida en POS (Auto-Select, Chips de Volumen, Tecla Enter) | Eliminación de flechas nativas del navegador, auto-selección total del número al clic/foco para tecleo directo sin borrar, botones táctiles (+/-), chips de volumen (+10, +50, +100) y salto automático al buscador con Enter. |
