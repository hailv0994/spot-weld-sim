import { useStore } from '../state/store';
import { MaterialEditor } from './MaterialEditor';
import { NumberField, SelectField } from './fields';
import { SpecImport } from './SpecImport';

// Bảng nhập liệu bên trái: vật liệu, hình học, spec máy, yêu cầu sản phẩm, hệ số mô hình.

export function InputPanel() {
  const s = useStore();

  return (
    <div className="space-y-5">
      {/* Vật liệu */}
      <section>
        <div className="section-title">① Vật liệu 2 linh kiện</div>
        <div className="space-y-3">
          <MaterialEditor
            title="Linh kiện 1 (tấm trên)"
            mat={s.mat1}
            onPatch={s.setMat1}
            onReplace={s.replaceMat1}
          />
          <MaterialEditor
            title="Linh kiện 2 (tấm dưới)"
            mat={s.mat2}
            onPatch={s.setMat2}
            onReplace={s.replaceMat2}
          />
          <MaterialEditor
            title="Điện cực (Cu hợp kim)"
            mat={s.matElectrode}
            onPatch={s.setMatElectrode}
            onReplace={s.replaceMatElectrode}
          />
        </div>
      </section>

      {/* Hình học */}
      <section>
        <div className="section-title">② Hình học & điện cực</div>
        <div className="card grid grid-cols-2 gap-2">
          <NumberField
            label="Chiều dày tấm 1"
            unit="mm"
            decimals={2}
            step={0.1}
            value={s.geom.thickness1 * 1000}
            onChange={(v) => s.setGeom({ thickness1: v / 1000 })}
          />
          <NumberField
            label="Chiều dày tấm 2"
            unit="mm"
            decimals={2}
            step={0.1}
            value={s.geom.thickness2 * 1000}
            onChange={(v) => s.setGeom({ thickness2: v / 1000 })}
          />
          <NumberField
            label="Đ.kính mặt điện cực"
            unit="mm"
            decimals={2}
            step={0.5}
            value={s.geom.electrodeFaceDiameter * 1000}
            onChange={(v) => s.setGeom({ electrodeFaceDiameter: v / 1000 })}
          />
        </div>
      </section>

      {/* Spec máy */}
      <section>
        <div className="section-title">③ Spec máy hàn điểm</div>
        <div className="card grid grid-cols-2 gap-2">
          <NumberField
            label="Dòng hàn min"
            unit="kA"
            decimals={1}
            step={0.5}
            value={s.machine.minCurrent / 1000}
            onChange={(v) => s.setMachine({ minCurrent: v * 1000 })}
          />
          <NumberField
            label="Dòng hàn max"
            unit="kA"
            decimals={1}
            step={0.5}
            value={s.machine.maxCurrent / 1000}
            onChange={(v) => s.setMachine({ maxCurrent: v * 1000 })}
          />
          <NumberField
            label="Lực ép min"
            unit="kN"
            decimals={2}
            step={0.1}
            value={s.machine.minForce / 1000}
            onChange={(v) => s.setMachine({ minForce: v * 1000 })}
          />
          <NumberField
            label="Lực ép max"
            unit="kN"
            decimals={2}
            step={0.1}
            value={s.machine.maxForce / 1000}
            onChange={(v) => s.setMachine({ maxForce: v * 1000 })}
          />
          <NumberField
            label="Thời gian hàn max"
            unit="ms"
            step={10}
            value={s.machine.maxWeldTime * 1000}
            onChange={(v) => s.setMachine({ maxWeldTime: v / 1000 })}
          />
          <NumberField
            label="Tần số nguồn"
            unit="Hz"
            step={10}
            value={s.machine.frequency}
            onChange={(v) => s.setMachine({ frequency: v })}
          />
          <SelectField
            label="Loại nguồn"
            value={s.machine.type}
            options={[
              { value: 'AC', label: 'AC' },
              { value: 'MFDC', label: 'MFDC' },
              { value: 'DC', label: 'DC' },
            ]}
            onChange={(v) => s.setMachine({ type: v })}
          />
        </div>
      </section>

      {/* Yêu cầu sản phẩm */}
      <section>
        <div className="section-title">④ Yêu cầu sản phẩm (bản vẽ 2D)</div>
        <div className="card grid grid-cols-2 gap-2">
          <NumberField
            label="Đ.kính nugget mục tiêu (0=tự tính 4√t)"
            unit="mm"
            decimals={2}
            step={0.1}
            value={s.requirement.targetNuggetDiameter * 1000}
            onChange={(v) => s.setRequirement({ targetNuggetDiameter: v / 1000 })}
          />
          <NumberField
            label="Độ ngấu tối thiểu"
            unit="%"
            step={5}
            value={s.requirement.minPenetration * 100}
            onChange={(v) => s.setRequirement({ minPenetration: v / 100 })}
          />
          <NumberField
            label="Lực kéo phá hủy yêu cầu"
            unit="kN"
            decimals={2}
            step={0.1}
            value={s.requirement.requiredTensileForce / 1000}
            onChange={(v) => s.setRequirement({ requiredTensileForce: v * 1000 })}
          />
        </div>
      </section>

      {/* Hệ số mô hình */}
      <section>
        <div className="section-title">⑤ Hệ số mô hình (hiệu chỉnh)</div>
        <div className="card grid grid-cols-2 gap-2">
          <NumberField
            label="Hiệu suất nhiệt η"
            decimals={2}
            step={0.05}
            min={0.05}
            value={s.coeffs.heatEfficiency}
            onChange={(v) => s.setCoeffs({ heatEfficiency: v })}
          />
          <NumberField
            label="Tỉ lệ nugget d/H"
            decimals={2}
            step={0.1}
            value={s.coeffs.nuggetAspectRatio}
            onChange={(v) => s.setCoeffs({ nuggetAspectRatio: v })}
          />
          <NumberField
            label="Hệ số ĐT tiếp xúc"
            step={1000}
            value={s.coeffs.contactResistanceFactor}
            onChange={(v) => s.setCoeffs({ contactResistanceFactor: v })}
          />
          <NumberField
            label="Mũ phụ thuộc lực"
            decimals={2}
            step={0.05}
            value={s.coeffs.contactForceExp}
            onChange={(v) => s.setCoeffs({ contactForceExp: v })}
          />
          <NumberField
            label="Hệ số bền cắt mối hàn"
            decimals={2}
            step={0.05}
            value={s.coeffs.weldShearFactor}
            onChange={(v) => s.setCoeffs({ weldShearFactor: v })}
          />
          <NumberField
            label="Ngưỡng bắn tóe"
            unit="J/mm³"
            decimals={1}
            step={1}
            value={s.coeffs.expulsionEnergyDensity}
            onChange={(v) => s.setCoeffs({ expulsionEnergyDensity: v })}
          />
        </div>
      </section>

      {/* AI trích xuất từ bản vẽ */}
      <SpecImport />
    </div>
  );
}
