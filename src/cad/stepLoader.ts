import occtimportjs from 'occt-import-js';
import wasmUrl from 'occt-import-js/dist/occt-import-js.wasm?url';
import type { BufferGeometry } from 'three';
import { mergeIntoGeometry } from './geometryUtils';

// ============================================================================
// Nạp file STEP → THREE.BufferGeometry. occt-import-js là wasm (OpenCASCADE).
// Hình học STEP thường tính bằng mm → giữ nguyên mm-scale để hợp với scene.
// ============================================================================

let occtPromise: ReturnType<typeof occtimportjs> | null = null;

function getOcct() {
  if (!occtPromise) {
    occtPromise = occtimportjs({ locateFile: () => wasmUrl });
  }
  return occtPromise;
}

export interface StepLoadResult {
  /** Hình học gộp tất cả solid trong file (đơn vị giữ nguyên từ STEP, thường mm) */
  geometry: BufferGeometry;
  /** Số mesh con */
  meshCount: number;
}

/** Đọc ArrayBuffer của file STEP → BufferGeometry gộp. */
export async function loadStep(buffer: ArrayBuffer): Promise<StepLoadResult> {
  const occt = await getOcct();
  const result = occt.ReadStepFile(new Uint8Array(buffer), null);
  if (!result.success || result.meshes.length === 0) {
    throw new Error('Không đọc được file STEP (không có solid hợp lệ).');
  }

  const geometry = mergeIntoGeometry(
    result.meshes.map((m) => ({
      position: m.attributes.position.array,
      normal: m.attributes.normal?.array,
      index: m.index.array,
    })),
  );

  return { geometry, meshCount: result.meshes.length };
}
