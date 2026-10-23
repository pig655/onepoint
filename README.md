# 單點透視互動學習教室

給國小五年級使用的單點透視互動教材。學生可以移動透視點、調整物件深度與實際尺寸，觀察深度線如何匯聚、近大遠小如何發生，並完成一個可著色、可儲存的透視房間。

本專案是純前端 React + TypeScript + Vite + SVG 應用，不需要後端、帳號或網路素材。所有幾何、投影、任務判定與檔案匯出都在瀏覽器內完成。

## 線上使用

- 網址：<https://pig655.github.io/onepoint/>
- 學生可用平板掃描 QR Code：

  ![QR Code](./qr-onepoint.png)

## 快速開始（Windows PowerShell）

```powershell
cd "D:\open code\onepoint"
npm install
npm run dev
```

開啟：

```text
http://127.0.0.1:5173
```

正式建置與預覽：

```powershell
npm run build
npm run preview
```

預覽網址：

```text
http://127.0.0.1:4173
```

## 功能

### 首頁

- 兩種學習模式入口。
- 直接說明本教材使用的「固定視窗針孔投影」模型。
- 適用桌機、平板與基本觸控操作。

### 基礎透視練習

- 預設三個立體幾何物件：正方體、長方體、柱體。
- 可再加入汽車、房子與道路，組合成馬路場景。
- 拖曳透視點左右或上下移動，觀察所有深度線同步改變。
- 上下移動透視點時，視平線與眼睛高度會一起改變。
- 拖曳物件改變地板位置。
- 分別調整實際寬度、高度、深度與 X／Z 位置。
- 左右可放置範圍為 9 m 寬，並依物件寬度保留畫面邊界。
- 同時顯示實際尺寸與畫布投影尺寸。
- 顯示視平線、透視點、地面網格與物件透視線。
- 新增、複製、刪除物件，切換物件顏色。
- 物件較多時自動隱藏重疊標籤；選取物件仍可在畫布左上與右側面板查看資訊。
- 匯出 PNG。

### 室內空間透視

- 固定房間外框，移動透視點時外框不變。
- 左牆、後牆、右牆、地板、天花板共用同一組房間頂點。
- 20 種素材：掛畫、窗戶、門、時鐘、家具、人物、植物與幾何物件。
- 牆面物件以牆面局部座標 `u, v` 儲存，不是畫布像素。
- 地板物件底部固定在 `Y = 0`，移動透視點或改變深度都不會漂浮。
- 物件可拖曳、複製、刪除，並用滑桿調整實際尺寸。
- 四種顯示方式：黑白線稿、輔助線、完成線稿、彩色作品。
- 五個房間面可獨立著色。
- 八項循序任務，依實際場景狀態判定完成。
- 匯出 PNG、匯出／匯入 JSON。
- 自動儲存在瀏覽器 LocalStorage。
- 復原／重做。

## 操作方式

- 拖曳視平線上的紅色圓點：左右或上下移動透視點。
- 拖曳房間裡的物件：沿牆面或地板移動。
- 點選牆面：替該面著色。
- 點選物件：開啟右側屬性面板。
- 右側「任務」分頁：查看八項任務、進度與重新挑戰按鈕。
- 上方「儲存」：立即寫入瀏覽器本機儲存。
- 「匯出 JSON」：下載完整場景，可日後匯入。
- 「匯出 PNG」：把目前 SVG 畫布輸出成 2 倍解析度 PNG。

## 數學模型

### 世界座標

- `X` 向右。
- `Y` 向上。
- `Z` 往畫面深處。
- 相機位在 `(cameraX, eyeHeight, 0)`，看向 `+Z`，沒有傾斜或滾轉。

### 投影式

```text
u = vpX + focalX * (X - cameraX) / Z
v = horizonY - focalY * (Y - eyeHeight) / Z
```

其中：

```text
focalX = frameWidth * nearZ / worldWidth
focalY = frameHeight * nearZ / worldHeight
horizonY = frame.bottom - (eyeHeight / worldHeight) * frameHeight
cameraX = (vpX - frameCenterX) * nearZ / focalX
```

`focalX`、`focalY`、`horizonY` 與 `cameraX` 都由「前開口平面 `Z = nearZ` 必須對應固定外框」反推而來。

### 透視點移動的意義

移動 `vpX` 時，`cameraX` 會同步改變；移動 `vpY` 時，等於改變眼睛高度：

```text
eyeHeight = (frame.bottom - vpY) / frameHeight * worldHeight
```

因此前開口四角仍然固定在外框上，但所有深度線仍精確匯聚到 `(vpX, vpY)`。

這是一個合法的針孔相機投影加上**水平與垂直移軸（off-axis）**的受約束版本；它不宣稱等同於在原地旋轉相機。這樣做是為了讓小五學生能清楚看到「外框不動、深度線改變」的效果。

### 房間幾何

- 房間寬 `5 m`、高 `3 m`。
- 前開口深度 `nearZ = 2.4 m`。
- 後牆深度 `farZ = 5.4 m`。
- 預設眼睛高度 `1.4 m`。
- 外框：`X 90–910`、`Y 70–590`。
- 預設透視點：`X = 500`、`Y ≈ 347`。
- 視平線 `Y` 與眼睛高度互相換算；上下拖曳時眼睛高度隨之改變。

房間五個面共用同一組八個頂點，避免各面獨立變形造成接縫裂開。

### 牆面物件

牆面物件不儲存畫布像素，而是儲存：

- `wall`：`left`、`back`、`right`
- `u`：牆面水平比例 `0–1`
- `v`：牆面高度比例 `0–1`
- `width`、`height`：實際公尺
- `color`、`accentColor`

投影時才把牆面局部座標轉成三維點，再套用同一個針孔投影。因此移動透視點時，掛畫、門窗會跟著牆面正確變形。

### 地板物件

地板物件儲存：

- `x`、`z`：地板位置（公尺）
- `width`、`height`、`depth`：實際尺寸（公尺）
- `color`、`accentColor`

物件底部固定在 `Y = 0`，投影時會產生前後左右的地板角點，再畫出立體盒或圓柱。

## 八項任務

1. 找出透視點。
2. 移動透視點至少 25 像素（左右或上下皆可）。
3. 觀察地板透視線。
4. 在後牆掛一幅貼合牆面的畫。
5. 在左牆加一扇貼齊牆面的門。
6. 在右牆掛一幅直向畫。
7. 放一件底部站在地板上的家具或植物。
8. 替至少三個房間面換色，並切換到彩色作品。

任務判定直接讀取場景狀態，不使用「按過按鈕」的假完成旗標。已完成過的觀察任務不會因為之後隱藏輔助線而取消。

## 資料與隱私

- 場景自動儲存在瀏覽器 `localStorage`。
- JSON 匯入會驗證版本、模式、數值範圍、物件類型與必要欄位。
- 沒有後端、沒有帳號、沒有追蹤。
- PNG 與 JSON 都在瀏覽器內產生。

## 測試與驗收

單元測試：

```powershell
npm test
```

目前結果：

```text
7 個測試檔
45 項測試通過
```

瀏覽器測試：

```powershell
npx playwright install chromium
npm run test:e2e
```

目前結果：

```text
4 項 Chromium E2E 測試通過
```

E2E 涵蓋：

- 首頁與雙模式入口。
- 房間固定外框。
- 透視點水平與垂直拖曳。
- 三面牆素材與地板物件。
- 八項任務完成。
- 復原／重做。
- LocalStorage 重新載入。
- JSON 與 PNG 下載。
- 基礎模式深度改變投影大小。
- 基礎模式新增汽車、房子與道路。
- 手機寬度不水平溢出，切換頁面後自動回到頂端。

型別檢查與正式建置：

```powershell
npm run typecheck
npm run build
```

E2E 執行後會在 `test-results/` 產生畫面截圖，例如：

- `home.png`
- `room-initial.png`
- `room.png`
- `basic-initial.png`
- `basic-road-scene.png`
- `mobile-room.png`

## 專案結構

```text
src/
  core/
    perspectiveCore.ts       針孔投影、反投影、外框約束
    roomGeometry.ts          房間頂點、五面、牆面局部座標
    roomProjection.ts        房間投影、共用邊、深度輔助線
    wallAnchors.ts           牆面物件投影與拖曳反投影
    objectProjection.ts      立體盒、圓柱、地板錨定與基礎物件投影
  model/
    sceneModel.ts            場景型別、預設值、物件工廠
    assetLibrary.ts          20 種素材定義
    lessonEngine.ts          八項任務與重新挑戰
    persistence.ts           LocalStorage、JSON 驗證、下載
    viewConfig.ts            外框、世界尺寸、預設視平線
  render/
    RoomCanvas.tsx           房間 SVG 與拖曳
    BasicCanvas.tsx          基礎模式 SVG 與拖曳
    WallObjectShape.tsx      牆面物件繪製
    FloorObjectShape.tsx     地板物件繪製
    StreetObjectShape.tsx    汽車、房子、道路繪製
  ui/
    HomeScreen.tsx           首頁
    BasicMode.tsx            基礎模式 UI
    RoomMode.tsx             室內模式 UI、屬性、任務
    TopBar.tsx               模式切換、復原、儲存、匯出
  hooks/
    useSceneHistory.ts       復原／重做與拖曳交易
  utils/
    exportPng.ts             SVG → PNG
    pointer.ts               SVG 指標座標
    color.ts                 顏色工具
  App.tsx                    應用外殼與自動儲存
  main.tsx                   React 入口
  styles.css                 全站樣式與響應式版面
e2e/
  classroom.spec.ts          Chromium 端到端測試
```

## 已知限制

- 這不是完整 3D 引擎；房間只呈現左牆、後牆、右牆、地板與天花板。
- 透視點只能在前開口內左右、上下移動；不能自由旋轉、傾斜或滾轉相機。
- 汽車、房子與道路目前只出現在基礎透視模式，室內素材庫沒有這些項目。
- 牆面物件只支援左、後、右三面牆。
- 作品儲存在單一瀏覽器；換瀏覽器或清除網站資料後不會自動同步，請先用 JSON 匯出備份。
- PNG 由瀏覽器 Canvas 產生，不同瀏覽器的字型外觀可能略有差異。
- E2E 目前以 Chromium 驗收；實際課堂建議再於目標平板瀏覽器手動確認觸控手感。
