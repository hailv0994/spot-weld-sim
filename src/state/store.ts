import { create } from 'zustand';
import type { BufferGeometry } from 'three';
import type {
  Material,
  Geometry,
  MachineSpec,
  ProductRequirement,
  ModelCoeffs,
  WeldParameters,
} from '../physics/types';
import {
  DEFAULT_MATERIAL_1,
  DEFAULT_MATERIAL_2,
  DEFAULT_MATERIAL_ELECTRODE,
  DEFAULT_GEOMETRY,
  DEFAULT_MACHINE,
  DEFAULT_REQUIREMENT,
  DEFAULT_COEFFS,
} from '../physics/defaults';
import { optimizeWeld, type WeldRecommendation } from '../physics/weldConditions';
import { simulate, type SimInputs } from '../physics/simulate';
import type { WeldResult } from '../physics/types';
import { simulateThermal, type ThermalResult } from '../physics/thermalSolver';

// ============================================================================
// Store trung tâm: toàn bộ input + kết quả. UI đọc/ghi qua các action.
// ============================================================================

export type MeshRole = 'part1' | 'part2' | 'electrode_upper' | 'electrode_lower' | 'fixture';

/** Offset vị trí (mm) và góc xoay (rad) của từng linh kiện trong viewport 3D. */
export interface PartTransform {
  position: [number, number, number];
  rotation: [number, number, number];
}

interface LoadedGeometryMesh {
  /** Tên file gốc */
  name: string;
  /** Vai trò: linh kiện 1/2 hoặc điện cực */
  role: MeshRole;
}

/** Bản vẽ 2D (PDF/ảnh) của một linh kiện — chỉ để hiển thị tham khảo. */
export interface PartDrawing {
  /** Tên file gốc */
  name: string;
  /** Object URL để render trong trình duyệt */
  url: string;
  /** MIME type (application/pdf hoặc image/*) */
  type: string;
}

interface AppState {
  mat1: Material;
  mat2: Material;
  /** Vật liệu điện cực */
  matElectrode: Material;
  geom: Geometry;
  machine: MachineSpec;
  requirement: ProductRequirement;
  coeffs: ModelCoeffs;

  /** Tham số hàn đang đặt thủ công (chế độ "what-if") */
  manualParams: WeldParameters;

  /** Kết quả tối ưu gần nhất */
  recommendation: WeldRecommendation | null;
  /** Kết quả mô phỏng cho manualParams */
  manualResult: WeldResult | null;

  loadedMeshes: LoadedGeometryMesh[];
  /** Geometry STEP đã nạp theo vai trò (mm-scale). Không có → dùng hình tham số. */
  partGeoms: Partial<Record<MeshRole, BufferGeometry>>;
  /** Bản vẽ 2D (PDF/ảnh) đã nạp theo vai trò. */
  partDrawings: Partial<Record<MeshRole, PartDrawing>>;

  /** Kết quả solver nhiệt + khung đang xem */
  thermal: ThermalResult | null;
  thermalFrame: number;
  thermalRunning: boolean;

  /** Vị trí/xoay từng linh kiện trong viewport 3D (mm + rad). */
  partTransforms: Partial<Record<MeshRole, PartTransform>>;
  /** Linh kiện bị cố định (không kéo được). Mặc định: part2. */
  fixedParts: MeshRole[];
  /** Linh kiện đang được chọn để transform. */
  selectedPart: MeshRole | null;
  /** Chế độ transform: dịch chuyển hoặc xoay. */
  transformMode: 'translate' | 'rotate';
  /** Khoảng cách 2 linh kiện TRƯỚC hàn (mm). 0 = chưa đặt. */
  weldGapBefore: number;
  /** Khoảng cách 2 linh kiện SAU hàn (yêu cầu, mm). 0 = chưa đặt. */
  weldGapAfter: number;
  /** Vị trí snapshot khi TRƯỚC hàn (điện cực mở). */
  preWeldTransforms: Partial<Record<MeshRole, PartTransform>>;
  /** Vị trí snapshot khi SAU hàn (setdown xong). */
  postWeldTransforms: Partial<Record<MeshRole, PartTransform>>;
  /** Các nhóm linh kiện di chuyển cùng nhau (block). */
  blocks: MeshRole[][];
  /** Pha animation hiện tại. */
  weldPhase: 'idle' | 'approach' | 'welding' | 'done';

  // actions
  setMat1: (m: Partial<Material>) => void;
  setMat2: (m: Partial<Material>) => void;
  setMatElectrode: (m: Partial<Material>) => void;
  replaceMat1: (m: Material) => void;
  replaceMat2: (m: Material) => void;
  replaceMatElectrode: (m: Material) => void;
  setGeom: (g: Partial<Geometry>) => void;
  setMachine: (s: Partial<MachineSpec>) => void;
  setRequirement: (r: Partial<ProductRequirement>) => void;
  setCoeffs: (c: Partial<ModelCoeffs>) => void;
  setManualParams: (p: Partial<WeldParameters>) => void;
  registerMesh: (m: LoadedGeometryMesh) => void;
  setPartGeom: (role: MeshRole, geom: BufferGeometry | undefined, name?: string) => void;
  setPartDrawing: (role: MeshRole, doc: PartDrawing | undefined) => void;
  setPartTransform: (role: MeshRole, t: PartTransform) => void;
  toggleFixed: (role: MeshRole) => void;
  setSelectedPart: (role: MeshRole | null) => void;
  setTransformMode: (m: 'translate' | 'rotate') => void;
  setWeldGap: (before: number, after: number) => void;
  savePreWeld: () => void;
  savePostWeld: () => void;
  addBlock: (a: MeshRole, b: MeshRole) => void;
  removeBlock: (role: MeshRole) => void;
  clearBlocks: () => void;
  setWeldPhase: (phase: 'idle' | 'approach' | 'welding' | 'done') => void;
  startWeldAnim: () => void;
  resetWeldAnim: () => void;

  runOptimize: () => void;
  runManual: () => void;
  runThermal: () => void;
  setThermalFrame: (f: number) => void;
}

function inputsOf(s: AppState): SimInputs {
  // Setdown từ khoảng cách trước/sau hàn → penetration mục tiêu
  let requirement = s.requirement;
  if (s.weldGapBefore > 0 && s.weldGapAfter > 0 && s.weldGapBefore > s.weldGapAfter) {
    const setdownM = (s.weldGapBefore - s.weldGapAfter) / 1000;
    const thinner = Math.min(s.geom.thickness1, s.geom.thickness2);
    const minPen = thinner > 0 ? Math.min(0.95, setdownM / thinner) : 0.3;
    requirement = { ...s.requirement, minPenetration: minPen, targetNuggetDiameter: 0, requiredTensileForce: 0 };
  }
  return {
    mat1: s.mat1,
    mat2: s.mat2,
    electrodeMat: s.matElectrode,
    geom: s.geom,
    requirement,
    coeffs: s.coeffs,
  };
}

export const useStore = create<AppState>((set, get) => ({
  mat1: { ...DEFAULT_MATERIAL_1 },
  mat2: { ...DEFAULT_MATERIAL_2 },
  matElectrode: { ...DEFAULT_MATERIAL_ELECTRODE },
  geom: { ...DEFAULT_GEOMETRY },
  machine: { ...DEFAULT_MACHINE },
  requirement: { ...DEFAULT_REQUIREMENT },
  coeffs: { ...DEFAULT_COEFFS },
  manualParams: { current: 9000, force: 3000, weldTime: 0.2 },
  recommendation: null,
  manualResult: null,
  loadedMeshes: [],
  partGeoms: {},
  partDrawings: {},
  thermal: null,
  thermalFrame: 0,
  thermalRunning: false,
  partTransforms: {},
  fixedParts: ['part2'],
  selectedPart: null,
  transformMode: 'translate',
  weldGapBefore: 0,
  weldGapAfter: 0,
  preWeldTransforms: {},
  postWeldTransforms: {},
  blocks: [],
  weldPhase: 'idle',

  setMat1: (m) => set((s) => ({ mat1: { ...s.mat1, ...m } })),
  setMat2: (m) => set((s) => ({ mat2: { ...s.mat2, ...m } })),
  setMatElectrode: (m) => set((s) => ({ matElectrode: { ...s.matElectrode, ...m } })),
  replaceMat1: (m) => set({ mat1: { ...m } }),
  replaceMat2: (m) => set({ mat2: { ...m } }),
  replaceMatElectrode: (m) => set({ matElectrode: { ...m } }),
  setGeom: (g) => set((s) => ({ geom: { ...s.geom, ...g } })),
  setMachine: (sp) => set((s) => ({ machine: { ...s.machine, ...sp } })),
  setRequirement: (r) => set((s) => ({ requirement: { ...s.requirement, ...r } })),
  setCoeffs: (c) => set((s) => ({ coeffs: { ...s.coeffs, ...c } })),
  setManualParams: (p) => set((s) => ({ manualParams: { ...s.manualParams, ...p } })),
  registerMesh: (m) =>
    set((s) => ({
      loadedMeshes: [...s.loadedMeshes.filter((x) => x.role !== m.role), m],
    })),
  setPartGeom: (role, geom, name) =>
    set((s) => {
      const partGeoms = { ...s.partGeoms };
      if (geom) partGeoms[role] = geom;
      else delete partGeoms[role];
      const loadedMeshes = name
        ? [...s.loadedMeshes.filter((x) => x.role !== role), { role, name }]
        : s.loadedMeshes.filter((x) => x.role !== role);
      return { partGeoms, loadedMeshes };
    }),
  setPartDrawing: (role, doc) =>
    set((s) => {
      const partDrawings = { ...s.partDrawings };
      const prev = partDrawings[role];
      if (prev) URL.revokeObjectURL(prev.url);
      if (doc) partDrawings[role] = doc;
      else delete partDrawings[role];
      return { partDrawings };
    }),
  setPartTransform: (role, t) =>
    set((s) => ({ partTransforms: { ...s.partTransforms, [role]: t } })),
  toggleFixed: (role) =>
    set((s) => ({
      fixedParts: s.fixedParts.includes(role)
        ? s.fixedParts.filter((r) => r !== role)
        : [...s.fixedParts, role],
    })),
  setSelectedPart: (role) => set({ selectedPart: role }),
  setTransformMode: (m) => set({ transformMode: m }),
  setWeldGap: (before, after) => set({ weldGapBefore: before, weldGapAfter: after }),

  savePreWeld: () => set((s) => ({ preWeldTransforms: { ...s.partTransforms } })),
  savePostWeld: () => set((s) => ({ postWeldTransforms: { ...s.partTransforms } })),

  addBlock: (a, b) =>
    set((s) => {
      // Tìm block chứa a hoặc b, nếu có thì merge, không thì tạo mới
      const existing = s.blocks.filter((bl) => bl.includes(a) || bl.includes(b));
      const others = s.blocks.filter((bl) => !bl.includes(a) && !bl.includes(b));
      const merged = Array.from(new Set([...existing.flat(), a, b]));
      return { blocks: [...others, merged] };
    }),
  removeBlock: (role) =>
    set((s) => ({
      blocks: s.blocks
        .map((bl) => bl.filter((r) => r !== role))
        .filter((bl) => bl.length > 1),
    })),
  clearBlocks: () => set({ blocks: [] }),

  setWeldPhase: (phase) => set({ weldPhase: phase }),
  startWeldAnim: () => set({ weldPhase: 'approach', thermal: null, thermalFrame: 0 }),
  resetWeldAnim: () => set((s) => ({
    weldPhase: 'idle',
    thermalFrame: 0,
    // Khôi phục partTransforms về preWeldTransforms nếu có
    partTransforms: Object.keys(s.preWeldTransforms).length > 0
      ? { ...s.preWeldTransforms }
      : s.partTransforms,
  })),

  runOptimize: () => {
    const s = get();
    const rec = optimizeWeld(inputsOf(s), s.machine);
    set({ recommendation: rec, manualParams: rec.params, manualResult: rec.result });
  },

  runManual: () => {
    const s = get();
    const res = simulate(inputsOf(s), s.manualParams);
    set({ manualResult: res });
  },

  runThermal: () => {
    const s = get();
    // Dùng tham số tối ưu nếu có, nếu không dùng tham số thủ công
    const params = s.recommendation?.params ?? s.manualParams;
    const thermal = simulateThermal(s.mat1, s.mat2, s.geom, params, s.coeffs, {}, s.matElectrode);
    set({ thermal, thermalFrame: 0 });
  },

  setThermalFrame: (f) =>
    set((s) => {
      const n = s.thermal?.frames.length ?? 0;
      if (n === 0) return {};
      const frame = ((f % n) + n) % n; // bọc vòng
      return { thermalFrame: frame };
    }),
}));
