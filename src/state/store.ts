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

export type MeshRole = 'part1' | 'part2' | 'electrode' | 'fixture';

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

  runOptimize: () => void;
  runManual: () => void;
  runThermal: () => void;
  setThermalFrame: (f: number) => void;
}

function inputsOf(s: AppState): SimInputs {
  return {
    mat1: s.mat1,
    mat2: s.mat2,
    electrodeMat: s.matElectrode,
    geom: s.geom,
    requirement: s.requirement,
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
      if (prev) URL.revokeObjectURL(prev.url); // tránh rò rỉ object URL cũ
      if (doc) partDrawings[role] = doc;
      else delete partDrawings[role];
      return { partDrawings };
    }),

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
