import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';
import { calculateParaguayDv } from '@/shared/utils/ruc-validator';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const docParam = (searchParams.get('doc') || '').trim();

    if (!docParam || docParam.length < 4) {
      return NextResponse.json(
        createErrorResponse('Ingrese al menos 4 dígitos de C.I. o RUC para consultar.', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    // Limpiar puntos o espacios (ej: 4.776.458 -> 4776458, 80134022-5 -> base 80134022)
    const normalizedInput = docParam.replace(/\./g, '').replace(/\s+/g, '');
    const baseDigits = normalizedInput.includes('-')
      ? normalizedInput.split('-')[0].replace(/\D/g, '')
      : normalizedInput.replace(/\D/g, '');

    if (!baseDigits || baseDigits.length < 4) {
      return NextResponse.json(
        createErrorResponse('Formato de C.I. o RUC inválido.', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    const expectedDv = calculateParaguayDv(baseDigits);
    const rucWithCalculatedDv = expectedDv !== null ? `${baseDigits}-${expectedDv}` : normalizedInput;

    // 1. Buscar primero en nuestra base local de clientes (trae dirección, teléfono y Maps si ya compró)
    const localCustomer = await prisma.customer.findFirst({
      where: {
        isActive: true,
        OR: [
          { ruc: normalizedInput },
          { ruc: baseDigits },
          { ruc: rucWithCalculatedDv },
          { ruc: { startsWith: `${baseDigits}-` } },
        ],
      },
    });

    // 2. Consultar padrón DNIT en línea (vía TuRuc - base oficial DNIT sin CAPTCHA)
    let dnitData: {
      ruc: string;
      razonSocial: string;
      estado: string;
      dv: number;
      esPersonaJuridica?: boolean;
    } | null = null;

    try {
      const dnitRes = await fetch(`https://turuc.com.py/api/contribuyente/${encodeURIComponent(baseDigits)}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(4500),
      });

      if (dnitRes.ok) {
        const json = await dnitRes.json();
        if (json?.data && json.data.razonSocial) {
          dnitData = json.data;
        }
      }
    } catch {
      // Si la API externa tiene latencia o falla, continuamos con los datos locales/DV sin trancar el POS
    }

    if (dnitData && localCustomer) {
      return NextResponse.json(
        createSuccessResponse({
          found: true,
          source: 'LOCAL_AND_DNIT',
          isTaxpayer: true,
          ruc: dnitData.ruc,
          name: dnitData.razonSocial,
          dnitStatus: dnitData.estado || 'ACTIVO',
          address: localCustomer.address || '',
          googleMapsUrl: localCustomer.googleMapsUrl || '',
          phone: localCustomer.phone || '',
          email: localCustomer.email || '',
          calculatedDv: dnitData.dv,
          message: `Contribuyente encontrado en DNIT (${dnitData.estado}) y en su agenda de clientes.`,
        })
      );
    }

    if (dnitData) {
      return NextResponse.json(
        createSuccessResponse({
          found: true,
          source: 'DNIT',
          isTaxpayer: true,
          ruc: dnitData.ruc,
          name: dnitData.razonSocial,
          dnitStatus: dnitData.estado || 'ACTIVO',
          address: '',
          googleMapsUrl: '',
          phone: '',
          email: '',
          calculatedDv: dnitData.dv,
          message: `Contribuyente verificado en DNIT (${dnitData.estado}). La DNIT no provee dirección particular; podés cargarla si es entrega.`,
        })
      );
    }

    if (localCustomer) {
      return NextResponse.json(
        createSuccessResponse({
          found: true,
          source: 'LOCAL',
          isTaxpayer: localCustomer.ruc.includes('-'),
          ruc: localCustomer.ruc,
          name: localCustomer.name,
          dnitStatus: null,
          address: localCustomer.address || '',
          googleMapsUrl: localCustomer.googleMapsUrl || '',
          phone: localCustomer.phone || '',
          email: localCustomer.email || '',
          calculatedDv: expectedDv,
          message: 'Cliente recuperado de su agenda local (sin registro activo encontrado en DNIT).',
        })
      );
    }

    return NextResponse.json(
      createSuccessResponse({
        found: false,
        source: 'NONE',
        isTaxpayer: false,
        ruc: normalizedInput.includes('-') ? normalizedInput : baseDigits,
        name: '',
        dnitStatus: null,
        address: '',
        googleMapsUrl: '',
        phone: '',
        email: '',
        calculatedDv: expectedDv,
        message:
          expectedDv !== null
            ? `No figura como contribuyente inscripto en DNIT (solo C.I. sin RUC; DV calculado: -${expectedDv}). Ingresá el nombre para guardarlo.`
            : 'Documento no encontrado en DNIT ni en su agenda. Ingresá el nombre para guardarlo.',
      })
    );
  } catch (error: any) {
    return NextResponse.json(
      createErrorResponse(error.message || 'Error al consultar documento', 'CUSTOMER_LOOKUP_ERROR'),
      { status: 500 }
    );
  }
}
