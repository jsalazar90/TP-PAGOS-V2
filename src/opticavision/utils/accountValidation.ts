export type AccountValidationField = 'codigo' | 'nombre' | 'tipo' | 'grupo' | 'general';

export interface AccountValidationIssue {
  field: AccountValidationField;
  title: string;
  detail: string;
}

export interface AccountFormInput {
  codigo: string;
  nombre: string;
  tipo: string;
  naturaleza?: string;
  grupo: string;
  areaFlujoCaja?: string;
}

export interface AccountValidationResult {
  isValid: boolean;
  errors: AccountValidationIssue[];
  summaryMessage: string;
  level: number;
  parentAccount: any | null;
  rootAccount: any | null;
  expectedMovementLevels: number;
  expectedLengths: number[];
  maskExample: string;
}

const DEFAULT_SEGMENT_LENGTHS = [1, 1, 2, 3];
const DEFAULT_MOVEMENT_LEVELS = 4;

const GROUP_ROOT_MAP: Record<string, string[]> = {
  Activo: ['1'],
  Pasivo: ['2'],
  Patrimonio: ['3'],
  Ingresos: ['4', '7'],
  Egresos: ['5', '6', '8', '9']
};

const ROOT_GROUP_MAP: Record<string, string> = {
  '1': 'Activo',
  '2': 'Pasivo',
  '3': 'Patrimonio',
  '4': 'Ingresos',
  '5': 'Egresos',
  '6': 'Egresos',
  '7': 'Ingresos',
  '8': 'Egresos',
  '9': 'Egresos'
};

export function getAllowedRootsForGroup(grupo: string): string[] {
  return GROUP_ROOT_MAP[grupo] || ['1'];
}

export function inferGroupFromRoot(root: string): string | null {
  return ROOT_GROUP_MAP[String(root || '').trim()] || null;
}

function getNumericMode(counts: Map<number, number>, fallback: number): number {
  let bestVal = fallback;
  let bestCount = -1;
  for (const [val, count] of counts.entries()) {
    if (count > bestCount || (count === bestCount && val > bestVal)) {
      bestVal = val;
      bestCount = count;
    }
  }
  return bestVal;
}

export function detectCatalogMask(cuentasContables: any[]): {
  expectedLengths: number[];
  expectedMovementLevels: number;
  maskExample: string;
} {
  const segmentLengthFreq = new Map<number, Map<number, number>>();
  const movementLevelFreq = new Map<number, number>();

  for (const acc of cuentasContables || []) {
    const code = String(acc?.codigo || '').trim();
    if (!/^\d+(\.\d+)*$/.test(code)) continue;

    const parts = code.split('.');
    parts.forEach((part, idx) => {
      if (!segmentLengthFreq.has(idx)) {
        segmentLengthFreq.set(idx, new Map());
      }
      const freqMap = segmentLengthFreq.get(idx)!;
      freqMap.set(part.length, (freqMap.get(part.length) || 0) + 1);
    });

    if (acc?.tipo === 'Movimiento' && parts.length >= 2) {
      movementLevelFreq.set(parts.length, (movementLevelFreq.get(parts.length) || 0) + 1);
    }
  }

  const expectedMovementLevels = Math.max(
    2,
    movementLevelFreq.size > 0
      ? getNumericMode(movementLevelFreq, DEFAULT_MOVEMENT_LEVELS)
      : DEFAULT_MOVEMENT_LEVELS
  );

  const lengthCount = Math.max(DEFAULT_SEGMENT_LENGTHS.length, expectedMovementLevels);
  const expectedLengths: number[] = [];
  for (let i = 0; i < lengthCount; i++) {
    const fallback = DEFAULT_SEGMENT_LENGTHS[i] ?? 2;
    const freqMap = segmentLengthFreq.get(i);
    expectedLengths.push(
      freqMap && freqMap.size > 0 ? getNumericMode(freqMap, fallback) : fallback
    );
  }

  const maskExample = expectedLengths
    .slice(0, expectedMovementLevels)
    .map((len) => '1'.padStart(len, '0'))
    .join('.');

  return { expectedLengths, expectedMovementLevels, maskExample };
}

function normalizeNumericCode(code: string): string {
  return code
    .split('.')
    .map((seg) => String(parseInt(seg, 10)))
    .join('.');
}

function buildSuggestedExampleForLevel(
  segments: string[],
  expectedLengths: number[],
  targetLevels: number
): string {
  const filled: string[] = [];
  for (let i = 0; i < targetLevels; i++) {
    const len = expectedLengths[i] ?? 2;
    const raw = segments[i] && /^\d+$/.test(segments[i]) ? segments[i] : '1';
    filled.push(raw.padStart(len, '0').slice(-Math.max(len, raw.length)));
  }
  return filled.join('.');
}

function validateStructuralFormat(
  codigo: string,
  tipo: string,
  expectedLengths: number[],
  expectedMovementLevels: number,
  maskExample: string
): {
  errors: AccountValidationIssue[];
  segments: string[];
  hasValidDotDigits: boolean;
} {
  const errors: AccountValidationIssue[] = [];

  if (!/^[0-9.]+$/.test(codigo)) {
    errors.push({
      field: 'codigo',
      title: 'Caracteres inválidos en el código',
      detail: `El código "${codigo}" solo debe contener números y puntos separadores (ej. ${maskExample}).`
    });
    return { errors, segments: [], hasValidDotDigits: false };
  }

  if (codigo.startsWith('.') || codigo.endsWith('.') || codigo.includes('..')) {
    errors.push({
      field: 'codigo',
      title: 'Código contable incompleto',
      detail: `El código "${codigo}" tiene puntos sin número o está incompleto. Completa todos los niveles numéricos (ej. ${maskExample}).`
    });
    return {
      errors,
      segments: codigo.split('.').filter(Boolean),
      hasValidDotDigits: false
    };
  }

  const segments = codigo.split('.');

  if (segments.some((seg) => /^0+$/.test(seg))) {
    errors.push({
      field: 'codigo',
      title: 'Código con segmento en cero',
      detail: `Ningún nivel del código "${codigo}" puede ser cero. Usa dígitos mayores a 0 (ej. ${maskExample}).`
    });
  }

  for (let i = 0; i < Math.min(segments.length, expectedLengths.length); i++) {
    const seg = segments[i];
    const expectedLen = expectedLengths[i];
    if (seg.length < expectedLen) {
      const paddedSegments = segments.map((s, idx) =>
        idx === i ? s.padStart(expectedLen, '0') : s
      );
      errors.push({
        field: 'codigo',
        title: 'Faltan números en el código',
        detail: `El nivel ${i + 1} ("${seg}") requiere ${expectedLen} dígitos según la estructura del plan (ej. "${paddedSegments.join('.')}" en lugar de "${codigo}").`
      });
      break;
    }
    if (seg.length > expectedLen) {
      errors.push({
        field: 'codigo',
        title: 'Sobran dígitos en el código',
        detail: `El nivel ${i + 1} ("${seg}") tiene ${seg.length} dígitos, pero la estructura del plan utiliza ${expectedLen} dígito(s) en ese nivel (ej. ${maskExample}).`
      });
      break;
    }
  }

  const level = segments.length;
  if (tipo === 'Título General') {
    if (level !== 1) {
      errors.push({
        field: 'tipo',
        title: 'Nivel incorrecto para Título General',
        detail: `Un "Título General" debe tener exactamente 1 nivel numérico (ej. 1, 2, 3, 4, 5 o 6), pero "${codigo}" tiene ${level} niveles.`
      });
    }
  } else if (tipo === 'Título de Cuenta Movimiento') {
    if (level < 2) {
      errors.push({
        field: 'codigo',
        title: 'Faltan niveles para Título de Cuenta Movimiento',
        detail: `Un "Título de Cuenta Movimiento" requiere al menos 2 niveles (ej. ${buildSuggestedExampleForLevel(segments, expectedLengths, 2)} o ${buildSuggestedExampleForLevel(segments, expectedLengths, Math.max(2, expectedMovementLevels - 1))}).`
      });
    } else if (level >= expectedMovementLevels) {
      errors.push({
        field: 'tipo',
        title: 'Nivel reservado para Cuentas de Movimiento',
        detail: `El código "${codigo}" tiene ${level} niveles, nivel reservado para "Cuenta de Movimiento". Para un título usa ${expectedMovementLevels - 1} niveles (ej. ${segments.slice(0, expectedMovementLevels - 1).join('.')}) o cambia el tipo a "Cuenta de Movimiento".`
      });
    }
  } else if (tipo === 'Movimiento') {
    if (level < expectedMovementLevels) {
      const missingCount = expectedMovementLevels - level;
      const example = buildSuggestedExampleForLevel(
        segments,
        expectedLengths,
        expectedMovementLevels
      );
      errors.push({
        field: 'codigo',
        title: 'Faltan códigos o niveles en la cuenta',
        detail: `Una "Cuenta de Movimiento" requiere ${expectedMovementLevels} niveles jerárquicos (ej. ${maskExample}). Al código "${codigo}" le ${missingCount === 1 ? 'falta 1 nivel' : `faltan ${missingCount} niveles`} (ej. ${example}).`
      });
    } else if (level > expectedMovementLevels) {
      errors.push({
        field: 'codigo',
        title: 'Excede los niveles del Plan de Cuentas',
        detail: `El código "${codigo}" tiene ${level} niveles, pero el plan contable actual utiliza ${expectedMovementLevels} niveles (ej. ${maskExample}).`
      });
    }
  }

  return { errors, segments, hasValidDotDigits: true };
}

function validateHierarchyAndGroup(
  codigo: string,
  segments: string[],
  tipo: string,
  grupo: string,
  accountsByCode: Map<string, any>
): {
  errors: AccountValidationIssue[];
  parentAccount: any | null;
  rootAccount: any | null;
} {
  const errors: AccountValidationIssue[] = [];
  const rootCode = segments[0];
  const rootAccount = accountsByCode.get(rootCode) || null;
  const level = segments.length;

  const allowedRoots = getAllowedRootsForGroup(grupo);
  if (!allowedRoots.includes(rootCode)) {
    const detectedGroup = inferGroupFromRoot(rootCode);
    errors.push({
      field: 'grupo',
      title: 'Código fuera del grupo seleccionado',
      detail: `El código "${codigo}" inicia con "${rootCode}"${detectedGroup ? ` (que corresponde al grupo "${detectedGroup}")` : ''}, por lo que está fuera del grupo "${grupo}" (los códigos de ${grupo} deben iniciar con ${allowedRoots.join(' o ')}).`
    });
  }

  if (level < 2) {
    return { errors, parentAccount: null, rootAccount };
  }

  if (!rootAccount) {
    errors.push({
      field: 'codigo',
      title: 'No existe el Título General del grupo',
      detail: `No se puede registrar "${codigo}" porque no existe el Título General "${rootCode}" en el Plan de Cuentas. Debes crear primero el Título General "${rootCode}".`
    });
  } else {
    if (rootAccount.tipo !== 'Título General') {
      errors.push({
        field: 'codigo',
        title: 'La cuenta raíz no es un Título General',
        detail: `La cuenta raíz "${rootAccount.codigo} - ${rootAccount.nombre}" tiene tipo "${rootAccount.tipo}" y debe ser "Título General".`
      });
    }
    if (rootAccount.grupo && rootAccount.grupo !== grupo) {
      errors.push({
        field: 'grupo',
        title: 'Grupo incompatible con el Título General',
        detail: `El Título General "${rootAccount.codigo} - ${rootAccount.nombre}" pertenece al grupo "${rootAccount.grupo}", pero seleccionaste "${grupo}".`
      });
    }
  }

  const ancestorCodes: string[] = [];
  for (let i = 1; i < level; i++) {
    ancestorCodes.push(segments.slice(0, i).join('.'));
  }

  const parentCode = ancestorCodes[ancestorCodes.length - 1];
  const parentAccount = accountsByCode.get(parentCode) || null;
  const missingIntermediate = ancestorCodes
    .slice(1)
    .filter((prefix) => !accountsByCode.has(prefix));

  if (tipo === 'Movimiento') {
    if (!parentAccount) {
      const chainText =
        missingIntermediate.length > 1
          ? ` Además faltan los títulos previos: ${missingIntermediate.join(' → ')}.`
          : '';
      errors.push({
        field: 'codigo',
        title: 'Falta el Título de Cuenta Movimiento padre',
        detail: `La cuenta de movimiento "${codigo}" está fuera de grupo o sin jerarquía: no existe su cuenta padre "Título de Cuenta Movimiento" (${parentCode}).${chainText} Crea primero el título "${parentCode}" antes de crear esta cuenta.`
      });
    } else {
      if (parentAccount.tipo !== 'Título de Cuenta Movimiento') {
        errors.push({
          field: 'codigo',
          title: 'La cuenta padre no es un Título de Cuenta Movimiento',
          detail: `La cuenta padre "${parentAccount.codigo} - ${parentAccount.nombre}" es de tipo "${parentAccount.tipo}". Toda Cuenta de Movimiento debe pertenecer a una cuenta de tipo "Título de Cuenta Movimiento".`
        });
      }
      if (missingIntermediate.length > 0) {
        errors.push({
          field: 'codigo',
          title: 'Jerarquía incompleta en el Plan de Cuentas',
          detail: `Falta(n) título(s) intermedio(s) en la jerarquía para llegar a "${codigo}": ${missingIntermediate.join(' → ')}.`
        });
      }
      if (parentAccount.grupo && parentAccount.grupo !== grupo) {
        errors.push({
          field: 'grupo',
          title: 'Cuenta fuera del grupo del título padre',
          detail: `El título padre "${parentAccount.codigo} - ${parentAccount.nombre}" pertenece al grupo "${parentAccount.grupo}", pero seleccionaste "${grupo}".`
        });
      }
    }
  } else if (tipo === 'Título de Cuenta Movimiento') {
    if (!parentAccount) {
      const chainText =
        missingIntermediate.length > 1
          ? ` (faltan en cadena: ${missingIntermediate.join(' → ')})`
          : '';
      errors.push({
        field: 'codigo',
        title: 'Falta la cuenta padre en la jerarquía',
        detail: `No se puede crear el título "${codigo}" porque su cuenta padre "${parentCode}" aún no existe${chainText}.`
      });
    } else {
      if (parentAccount.tipo === 'Movimiento') {
        errors.push({
          field: 'codigo',
          title: 'Cuenta padre inválida',
          detail: `No puedes crear un "Título de Cuenta Movimiento" debajo de la cuenta de Movimiento "${parentAccount.codigo} - ${parentAccount.nombre}".`
        });
      } else if (level === 2 && parentAccount.tipo !== 'Título General') {
        errors.push({
          field: 'codigo',
          title: 'Cuenta raíz inválida',
          detail: `El título de nivel 2 "${codigo}" requiere que "${parentCode}" sea un "Título General" (actualmente es "${parentAccount.tipo}").`
        });
      } else if (level >= 3 && parentAccount.tipo !== 'Título de Cuenta Movimiento') {
        errors.push({
          field: 'codigo',
          title: 'Cuenta padre inválida',
          detail: `El título "${codigo}" requiere que su cuenta padre "${parentCode}" sea de tipo "Título de Cuenta Movimiento" (actualmente es "${parentAccount.tipo}").`
        });
      }
      if (missingIntermediate.length > 0) {
        errors.push({
          field: 'codigo',
          title: 'Jerarquía incompleta en el Plan de Cuentas',
          detail: `Falta(n) título(s) intermedio(s) para "${codigo}": ${missingIntermediate.join(' → ')}.`
        });
      }
      if (parentAccount.grupo && parentAccount.grupo !== grupo) {
        errors.push({
          field: 'grupo',
          title: 'Grupo incompatible con la cuenta padre',
          detail: `La cuenta padre "${parentAccount.codigo} - ${parentAccount.nombre}" pertenece al grupo "${parentAccount.grupo}", no a "${grupo}".`
        });
      }
    }
  }

  return { errors, parentAccount, rootAccount };
}

export function validateChartAccount(
  form: AccountFormInput,
  cuentasContables: any[] = [],
  editingId: string | null = null
): AccountValidationResult {
  const codigo = String(form?.codigo || '').trim();
  const nombre = String(form?.nombre || '').trim();
  const tipo = String(form?.tipo || 'Movimiento').trim();
  const grupo = String(form?.grupo || 'Activo').trim();

  const { expectedLengths, expectedMovementLevels, maskExample } =
    detectCatalogMask(cuentasContables);

  const errors: AccountValidationIssue[] = [];

  if (!codigo) {
    errors.push({
      field: 'codigo',
      title: 'Falta el código contable',
      detail: `Debe ingresar el número o código contable de la cuenta (ej. ${maskExample}).`
    });
  }

  if (!nombre) {
    errors.push({
      field: 'nombre',
      title: 'Falta el nombre de la cuenta',
      detail: 'Debe ingresar el nombre o descripción de la cuenta contable.'
    });
  }

  let level = 0;
  let parentAccount: any | null = null;
  let rootAccount: any | null = null;

  if (codigo) {
    const formatCheck = validateStructuralFormat(
      codigo,
      tipo,
      expectedLengths,
      expectedMovementLevels,
      maskExample
    );
    errors.push(...formatCheck.errors);
    level = formatCheck.segments.length;

    const otherAccounts = (cuentasContables || []).filter((c) =>
      editingId ? String(c?.id) !== String(editingId) : true
    );

    const exactDup = otherAccounts.find(
      (c) => String(c?.codigo || '').trim() === codigo
    );

    if (exactDup) {
      errors.push({
        field: 'codigo',
        title: 'Código contable repetido',
        detail: `El código "${codigo}" ya existe en el Plan de Cuentas ("${exactDup.codigo} - ${exactDup.nombre}", ${exactDup.tipo || 'Movimiento'}).`
      });
    } else if (formatCheck.hasValidDotDigits && formatCheck.segments.length > 0) {
      const normalizedTarget = normalizeNumericCode(codigo);
      const normDup = otherAccounts.find((c) => {
        const cCode = String(c?.codigo || '').trim();
        return /^\d+(\.\d+)*$/.test(cCode) && normalizeNumericCode(cCode) === normalizedTarget;
      });
      if (normDup) {
        errors.push({
          field: 'codigo',
          title: 'Código contable repetido',
          detail: `El código "${codigo}" equivale numéricamente a una cuenta ya registrada ("${normDup.codigo} - ${normDup.nombre}").`
        });
      }
    }

    if (formatCheck.hasValidDotDigits && formatCheck.segments.length > 0) {
      const accountsByCode = new Map<string, any>();
      for (const acc of otherAccounts) {
        const cCode = String(acc?.codigo || '').trim();
        if (cCode) accountsByCode.set(cCode, acc);
      }

      const hierarchyCheck = validateHierarchyAndGroup(
        codigo,
        formatCheck.segments,
        tipo,
        grupo,
        accountsByCode
      );
      errors.push(...hierarchyCheck.errors);
      parentAccount = hierarchyCheck.parentAccount;
      rootAccount = hierarchyCheck.rootAccount;
    }

    if (editingId) {
      const original = (cuentasContables || []).find(
        (c) => String(c?.id) === String(editingId)
      );
      const origCode = String(original?.codigo || '').trim();
      if (origCode) {
        const children = otherAccounts.filter((c) =>
          String(c?.codigo || '').trim().startsWith(`${origCode}.`)
        );
        if (children.length > 0) {
          if (origCode !== codigo) {
            errors.push({
              field: 'codigo',
              title: 'No se puede cambiar el código de una cuenta con subcuentas',
              detail: `La cuenta "${origCode}" tiene ${children.length} subcuenta(s) dependiente(s) (ej. "${children[0].codigo} - ${children[0].nombre}").`
            });
          }
          if (tipo === 'Movimiento') {
            errors.push({
              field: 'tipo',
              title: 'No se puede convertir en Cuenta de Movimiento',
              detail: `La cuenta "${origCode}" tiene ${children.length} subcuenta(s) dependiente(s), por lo que debe permanecer como cuenta de título.`
            });
          }
        }
      }
    }
  }

  const actionVerb = editingId ? 'actualizar' : 'crear';
  const summaryMessage =
    errors.length > 0
      ? `No se pudo ${actionVerb} la cuenta: ${errors[0].detail}`
      : '';

  return {
    isValid: errors.length === 0,
    errors,
    summaryMessage,
    level,
    parentAccount,
    rootAccount,
    expectedMovementLevels,
    expectedLengths,
    maskExample
  };
}

export function canDeleteChartAccount(
  cuenta: any,
  cuentasContables: any[] = []
): { allowed: boolean; reason?: string } {
  const code = String(cuenta?.codigo || '').trim();
  if (!code) return { allowed: true };

  const prefix = `${code}.`;
  const children = (cuentasContables || []).filter(
    (c) =>
      String(c?.id) !== String(cuenta?.id) &&
      String(c?.codigo || '').trim().startsWith(prefix)
  );

  if (children.length > 0) {
    return {
      allowed: false,
      reason: `No se puede eliminar "${code} - ${cuenta?.nombre || ''}" porque tiene ${children.length} subcuenta(s) dependiente(s) (ej. "${children[0].codigo} - ${children[0].nombre}").`
    };
  }

  return { allowed: true };
}
