// Khai báo type tối thiểu cho occt-import-js (gói không kèm .d.ts).
declare module 'occt-import-js' {
  export interface OcctAttribute {
    array: number[];
  }
  export interface OcctMesh {
    name?: string;
    color?: [number, number, number];
    attributes: {
      position: OcctAttribute;
      normal?: OcctAttribute;
    };
    index: { array: number[] };
  }
  export interface OcctResult {
    success: boolean;
    meshes: OcctMesh[];
  }
  export interface Occt {
    ReadStepFile(buffer: Uint8Array, params: unknown): OcctResult;
    ReadBrepFile?(buffer: Uint8Array, params: unknown): OcctResult;
    ReadIgesFile?(buffer: Uint8Array, params: unknown): OcctResult;
  }
  export interface OcctInitOptions {
    locateFile?: (path: string) => string;
  }
  export default function occtimportjs(opts?: OcctInitOptions): Promise<Occt>;
}
