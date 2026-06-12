# Spot Weld Sim — Mô phỏng hàn điểm (Resistance Spot Welding)

Web app thuần trình duyệt mô phỏng quá trình hàn điểm 2 linh kiện: tính **điều kiện hàn tối ưu**
(dòng điện, lực ép, thời gian), dự đoán **nugget & độ ngấu**, và (sắp tới) **animation biến dạng
nhiệt 3D**. Mô hình **hybrid**: tính số kỹ thuật minh bạch + trực quan hóa gần đúng.

## Chạy
```bash
npm install
npm run dev      # mở http://localhost:5180
npm run build    # build static
```

## Stack
Vite · React · TypeScript · Three.js (react-three-fiber) · occt-import-js (đọc STEP) · Zustand · Tailwind.
Tất cả chạy trong trình duyệt, build ra static — không cần backend.

## Mô hình vật lý (lõi `src/physics/`)
Đơn vị nội bộ là SI; UI hiển thị mm/kA/kN/°C.

| Bước | File | Công thức |
|---|---|---|
| Điện trở động | `resistance.ts` | R = R_khối(2 tấm) + R_tiếp xúc(faying, giảm theo lực) + R_điện cực |
| Nhiệt Joule | `heat.ts` | Q = I²·R·t ; Q_eff = η·Q |
| Nugget & ngấu | `nugget.ts` | V = Q_eff / e_melt ; nugget ellipsoid dẹt (AR=d/H) → d, H, độ ngấu |
| Cơ học | `mechanical.ts` | F_kéo = (π/4)d²·(weldShearFactor·UTS) |
| Tối ưu | `weldConditions.ts` | quét (F,t), bisect dòng tạo nugget & dòng bắn tóe → weld lobe, chọn điểm giữa |

**Hệ số hiệu chỉnh** (`ModelCoeffs`, sửa trong UI mục ⑤): hiệu suất nhiệt η, hệ số/mũ điện trở tiếp
xúc, tỉ lệ nugget d/H, hệ số bền cắt, ngưỡng bắn tóe. Đây là phần "hybrid" — calibrate theo dữ liệu
thực nghiệm của xưởng để khớp số đo.

> ⚠️ Đây là mô hình kỹ thuật rút gọn, KHÔNG phải FEM coupled đầy đủ như Simufact thật. Dùng để ước
> lượng nhanh điều kiện hàn & xu hướng; số tuyệt đối cần hiệu chỉnh bằng mẫu thử thực tế.

## Lộ trình
- [x] **Phase 1** — physics engine + UI nhập liệu + tính điều kiện hàn / nugget / weld lobe.
- [x] **Phase 2** — viewer 3D: tải STEP 2 linh kiện + điện cực (`src/cad/`, `src/viz/`).
- [x] **Phase 3** — solver nhiệt FDM trục đối xứng → heatmap mặt cắt + timeline (`src/physics/thermalSolver.ts`, `src/viz/ThermalSection.tsx`).
- [x] **Phase 4** — upload ảnh/PDF bản vẽ → Claude trích xuất thông số vào form (`src/ai/extractSpec.ts`, `src/ui/SpecImport.tsx`). Cần Anthropic API key nhập ở mục ⑥.

## Cấu trúc
```
src/
├── physics/   types, materials, resistance, heat, nugget, mechanical, simulate, weldConditions, thermalSolver, defaults
├── state/     store.ts (zustand)
├── ui/        fields, MaterialEditor, InputPanel, ResultsPanel, LobeChart, GeometryImport, SpecImport
├── cad/       stepLoader (occt-import-js), geometryUtils
├── viz/       WeldScene, WeldStack, ThermalSection
└── ai/        extractSpec (Claude vision → form)
```

## Hướng dẫn nhanh
1. `npm install && npm run dev` → mở `http://localhost:5180`.
2. (Tùy chọn) Mục ⑥: nhập Anthropic API key + upload ảnh/PDF bản vẽ để AI điền thông số.
3. Hoặc nhập tay vật liệu / hình học / spec máy / yêu cầu ở mục ①–④.
4. Bấm **⚡ Tính tối ưu** → ra dòng/lực/thời gian hàn + nugget + weld lobe.
5. Bấm **🌡️ Chạy mô phỏng nhiệt** → xem animation vũng nóng chảy & độ ngấu theo thời gian.
6. (Tùy chọn) Thả file STEP vào Viewer 3D để render hình học thật.
