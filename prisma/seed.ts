import { PrismaClient, SystemRole, VatRate, SifenUnitOfMeasure, MovementType, SalaryFrequency } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando proceso de siembra de datos (Seeding)...');

  // 1. Crear Usuario Administrador por defecto
  const admin = await prisma.user.upsert({
    where: { email: 'admin@deposito4demarzo.com.py' },
    update: {},
    create: {
      email: 'admin@deposito4demarzo.com.py',
      name: 'Administrador 4 de Marzo',
      passwordHash: '$2b$10$temporaryHashChangeOnProductionPassword!',
      role: SystemRole.SUPER_ADMIN,
      isActive: true,
    },
  });
  console.log(`✅ Usuario Admin creado: ${admin.email}`);

  // 2. Crear Depósito Principal
  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'DEP-4M' },
    update: {},
    create: {
      code: 'DEP-4M',
      name: 'Depósito Central 4 de Marzo',
      address: 'Casa Central - Planta Operativa',
      isMain: true,
      isActive: true,
    },
  });
  console.log(`✅ Depósito Central creado: ${warehouse.name} (${warehouse.code})`);

  // 3. Cargar Empleados desde seeds/employees.json
  const employeesPath = path.join(__dirname, 'seeds', 'employees.json');
  if (fs.existsSync(employeesPath)) {
    const employeesData = JSON.parse(fs.readFileSync(employeesPath, 'utf-8'));
    console.log(`📋 Sembrando ${employeesData.length} empleados reales...`);

    for (const emp of employeesData) {
      await prisma.employee.upsert({
        where: { documentNumber: emp.documentNumber },
        update: {
          code: emp.code,
          firstName: emp.firstName,
          lastName: emp.lastName,
          phone: emp.phone,
          jobTitle: emp.jobTitle,
          biometricId: emp.biometricId,
        },
        create: {
          code: emp.code,
          documentNumber: emp.documentNumber,
          firstName: emp.firstName,
          lastName: emp.lastName,
          birthDate: new Date(emp.birthDate || '1990-01-01'),
          phone: emp.phone,
          hireDate: new Date(emp.hireDate),
          jobTitle: emp.jobTitle,
          department: emp.department,
          biometricId: emp.biometricId,
          salaryStructure: {
            create: {
              baseSalary: emp.monthlySalary,
              weeklySalary: emp.weeklySalary,
              paymentFrequency: SalaryFrequency.WEEKLY,
              currency: 'PYG',
              ipsDeductionPercent: 9.0,
            },
          },
        },
      });
    }
    console.log(`✅ Empleados sembrados correctamente.`);
  }

  // 4. Cargar Productos desde seeds/products.json
  const productsPath = path.join(__dirname, 'seeds', 'products.json');
  if (fs.existsSync(productsPath)) {
    const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
    console.log(`📦 Sembrando ${productsData.length} productos de catálogo con Kardex inicial...`);

    for (const prod of productsData) {
      const product = await prisma.product.upsert({
        where: { sku: prod.sku },
        update: {
          name: prod.name,
          salePrice: prod.salePrice,
          costPrice: prod.costPrice,
        },
        create: {
          sku: prod.sku,
          name: prod.name,
          salePrice: prod.salePrice,
          costPrice: prod.costPrice,
          unitOfMeasure: prod.unitOfMeasure as SifenUnitOfMeasure,
          vatRate: prod.vatRate as VatRate,
          minStockAlert: prod.minStockAlert,
          isActive: true,
        },
      });

      // Crear o actualizar balance de stock en el depósito
      const stockItem = await prisma.stockItem.upsert({
        where: {
          productId_warehouseId: {
            productId: product.id,
            warehouseId: warehouse.id,
          },
        },
        update: {},
        create: {
          productId: product.id,
          warehouseId: warehouse.id,
          currentStock: prod.initialStock,
          reservedStock: 0,
        },
      });

      // Registrar movimiento inicial de Kardex si tiene stock
      if (prod.initialStock > 0 && stockItem) {
        const existingMovement = await prisma.stockMovement.findFirst({
          where: {
            productId: product.id,
            warehouseId: warehouse.id,
            movementType: MovementType.INITIAL_STOCK,
          },
        });

        if (!existingMovement) {
          await prisma.stockMovement.create({
            data: {
              movementType: MovementType.INITIAL_STOCK,
              productId: product.id,
              warehouseId: warehouse.id,
              quantity: prod.initialStock,
              unitCost: prod.costPrice,
              totalCost: prod.initialStock * prod.costPrice,
              previousStock: 0,
              newStock: prod.initialStock,
              referenceType: 'INVENTARIO_INICIAL_EXCEL',
              notes: 'Carga de inventario inicial desde archivo lista_productos_actualizada_4.xlsx',
              userId: admin.id,
            },
          });
        }
      }
    }
    console.log(`✅ Catálogo de 653 productos cargado con balances de stock y Kardex.`);
  }

  console.log('✨ Base de datos sembrada con éxito.');
}

main()
  .catch((e) => {
    console.error('❌ Error en el proceso de seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

