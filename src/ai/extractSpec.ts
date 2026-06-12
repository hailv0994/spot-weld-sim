import type { Material, Geometry, MachineSpec, ProductRequirement } from '../physics/types';

// ============================================================================
// Phase 4 — Trích xuất thông số từ ảnh/PDF bản vẽ bằng Claude (gọi trực tiếp từ
// trình duyệt với API key do user nhập). Trả về các trường đã ánh xạ về SI để
// điền vào form; user vẫn sửa tay trước khi chạy mô phỏng.
// ============================================================================

export interface ExtractedSpec {
  material1?: Partial<Material>;
  material2?: Partial<Material>;
  geometry?: Partial<Geometry>;
  machine?: Partial<MachineSpec>;
  requirement?: Partial<ProductRequirement>;
  notes?: string;
}

const PROMPT = `Bạn là kỹ sư hàn điểm. Đọc bản vẽ/spec trong ảnh hoặc PDF và trích xuất các thông số kỹ thuật về hàn điểm (resistance spot welding) nếu có. CHỈ trả về MỘT đối tượng JSON hợp lệ, KHÔNG kèm giải thích, theo schema sau (bỏ qua trường không tìm thấy, KHÔNG bịa số):
{
  "material1": {"name": string, "resistivity_uohm_cm": number, "resistivityTempCoeff_perK": number, "density_kgm3": number, "specificHeat_jkgK": number, "thermalConductivity_wmk": number, "meltingPoint_C": number, "latentHeat_kjkg": number, "thermalExpansion_um_mK": number, "uts_mpa": number, "yield_mpa": number},
  "material2": { ... như material1 ... },
  "geometry": {"thickness1_mm": number, "thickness2_mm": number, "electrodeDia_mm": number},
  "machine": {"minCurrent_kA": number, "maxCurrent_kA": number, "minForce_kN": number, "maxForce_kN": number, "maxWeldTime_ms": number, "frequency_Hz": number, "type": "AC"|"MFDC"|"DC"},
  "requirement": {"targetNugget_mm": number, "minPenetration_pct": number, "requiredTensile_kN": number},
  "notes": string
}`;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = reader.result as string;
      resolve(s.slice(s.indexOf(',') + 1)); // bỏ tiền tố data:...;base64,
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Lấy đối tượng JSON đầu tiên trong chuỗi văn bản trả về. */
function parseFirstJson(text: string): Record<string, unknown> {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('Không tìm thấy JSON trong phản hồi.');
  return JSON.parse(text.slice(start, end + 1));
}

const n = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;

function mapMaterial(o: Record<string, unknown> | undefined): Partial<Material> | undefined {
  if (!o) return undefined;
  const m: Partial<Material> = {};
  if (typeof o.name === 'string') m.name = o.name;
  if (n(o.resistivity_uohm_cm) !== undefined) m.resistivity20 = n(o.resistivity_uohm_cm)! / 1e8;
  if (n(o.resistivityTempCoeff_perK) !== undefined) m.resistivityTempCoeff = n(o.resistivityTempCoeff_perK)!;
  if (n(o.density_kgm3) !== undefined) m.density = n(o.density_kgm3)!;
  if (n(o.specificHeat_jkgK) !== undefined) m.specificHeat = n(o.specificHeat_jkgK)!;
  if (n(o.thermalConductivity_wmk) !== undefined) m.thermalConductivity = n(o.thermalConductivity_wmk)!;
  if (n(o.meltingPoint_C) !== undefined) m.meltingPoint = n(o.meltingPoint_C)! + 273.15;
  if (n(o.latentHeat_kjkg) !== undefined) m.latentHeatFusion = n(o.latentHeat_kjkg)! * 1000;
  if (n(o.thermalExpansion_um_mK) !== undefined) m.thermalExpansion = n(o.thermalExpansion_um_mK)! / 1e6;
  if (n(o.uts_mpa) !== undefined) m.ultimateTensileStrength = n(o.uts_mpa)! * 1e6;
  if (n(o.yield_mpa) !== undefined) m.yieldStrength = n(o.yield_mpa)! * 1e6;
  return Object.keys(m).length ? m : undefined;
}

function mapExtracted(j: Record<string, unknown>): ExtractedSpec {
  const out: ExtractedSpec = {};
  out.material1 = mapMaterial(j.material1 as Record<string, unknown> | undefined);
  out.material2 = mapMaterial(j.material2 as Record<string, unknown> | undefined);

  const g = j.geometry as Record<string, unknown> | undefined;
  if (g) {
    const geom: Partial<Geometry> = {};
    if (n(g.thickness1_mm) !== undefined) geom.thickness1 = n(g.thickness1_mm)! / 1000;
    if (n(g.thickness2_mm) !== undefined) geom.thickness2 = n(g.thickness2_mm)! / 1000;
    if (n(g.electrodeDia_mm) !== undefined) geom.electrodeFaceDiameter = n(g.electrodeDia_mm)! / 1000;
    if (Object.keys(geom).length) out.geometry = geom;
  }

  const ma = j.machine as Record<string, unknown> | undefined;
  if (ma) {
    const machine: Partial<MachineSpec> = {};
    if (n(ma.minCurrent_kA) !== undefined) machine.minCurrent = n(ma.minCurrent_kA)! * 1000;
    if (n(ma.maxCurrent_kA) !== undefined) machine.maxCurrent = n(ma.maxCurrent_kA)! * 1000;
    if (n(ma.minForce_kN) !== undefined) machine.minForce = n(ma.minForce_kN)! * 1000;
    if (n(ma.maxForce_kN) !== undefined) machine.maxForce = n(ma.maxForce_kN)! * 1000;
    if (n(ma.maxWeldTime_ms) !== undefined) machine.maxWeldTime = n(ma.maxWeldTime_ms)! / 1000;
    if (n(ma.frequency_Hz) !== undefined) machine.frequency = n(ma.frequency_Hz)!;
    if (ma.type === 'AC' || ma.type === 'MFDC' || ma.type === 'DC') machine.type = ma.type;
    if (Object.keys(machine).length) out.machine = machine;
  }

  const r = j.requirement as Record<string, unknown> | undefined;
  if (r) {
    const req: Partial<ProductRequirement> = {};
    if (n(r.targetNugget_mm) !== undefined) req.targetNuggetDiameter = n(r.targetNugget_mm)! / 1000;
    if (n(r.minPenetration_pct) !== undefined) req.minPenetration = n(r.minPenetration_pct)! / 100;
    if (n(r.requiredTensile_kN) !== undefined) req.requiredTensileForce = n(r.requiredTensile_kN)! * 1000;
    if (Object.keys(req).length) out.requirement = req;
  }

  if (typeof j.notes === 'string') out.notes = j.notes;
  return out;
}

export interface ExtractOptions {
  apiKey: string;
  model?: string;
}

/** Gọi Claude với ảnh/PDF, trả về ExtractedSpec đã ánh xạ SI + JSON thô. */
export async function extractSpecFromFile(
  file: File,
  opts: ExtractOptions,
): Promise<{ data: ExtractedSpec; raw: string }> {
  const model = opts.model ?? 'claude-opus-4-8';
  const base64 = await fileToBase64(file);
  const isPdf = file.type === 'application/pdf';

  const source = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
    : {
        type: 'image',
        source: { type: 'base64', media_type: file.type || 'image/png', data: base64 },
      };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': opts.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      messages: [{ role: 'user', content: [source, { type: 'text', text: PROMPT }] }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${res.status}: ${err.slice(0, 200)}`);
  }

  const json = await res.json();
  const text: string = (json.content ?? [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('\n');

  const parsed = parseFirstJson(text);
  return { data: mapExtracted(parsed), raw: text };
}
