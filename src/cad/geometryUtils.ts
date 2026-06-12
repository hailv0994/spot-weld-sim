import { BufferGeometry, Float32BufferAttribute } from 'three';

// Tiện ích gộp nhiều mesh con (từ STEP) thành một BufferGeometry duy nhất.

export interface SubMesh {
  position: number[];
  normal?: number[];
  index: number[];
}

export function mergeIntoGeometry(parts: SubMesh[]): BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  let vertexOffset = 0;
  let hasNormals = true;

  for (const p of parts) {
    positions.push(...p.position);
    if (p.normal && p.normal.length === p.position.length) {
      normals.push(...p.normal);
    } else {
      hasNormals = false;
    }
    const vCount = p.position.length / 3;
    for (const idx of p.index) indices.push(idx + vertexOffset);
    vertexOffset += vCount;
  }

  const geom = new BufferGeometry();
  geom.setAttribute('position', new Float32BufferAttribute(positions, 3));
  if (hasNormals && normals.length === positions.length) {
    geom.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  }
  geom.setIndex(indices);
  if (!hasNormals) geom.computeVertexNormals();
  geom.computeBoundingBox();
  geom.computeBoundingSphere();
  return geom;
}
