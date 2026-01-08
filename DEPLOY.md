# 🚀 部署指南

這份文件將引導您完成專案的部署流程，從本地測試到 Vercel 上線。

## 📋 部署前檢查清單

- [ ] Node.js 已安裝（建議 v16 或更新）
- [ ] 已執行 `npm install` 安裝所有依賴
- [ ] 已產生 PWA 圖示（見下方說明）
- [ ] 本地測試成功（`npm run dev`）
- [ ] 建置測試成功（`npm run build && npm run preview`）

## 🎨 步驟 1: 產生 PWA 圖示

PWA 需要不同尺寸的圖示才能正確運作。

### 方法一：使用專屬 Logo 轉換器（推薦）

我們已為您準備好丸東魚丸的實際 logo，只需一鍵轉換！

1. 在瀏覽器中開啟 Logo 轉換工具：
   ```bash
   # macOS
   open convert-logo-to-pwa.html
   
   # Windows
   start convert-logo-to-pwa.html
   
   # Linux
   xdg-open convert-logo-to-pwa.html
   ```

2. **工具會自動載入 `wan_dong_logo.jpg`**，您可以：
   - 調整背景顏色（白色、藍色、淺藍）
   - 調整 Logo 大小（邊距）
   - 選擇是否使用圓角
   - 即時預覽所有尺寸

3. 點擊「📦 一鍵下載所有圖示」下載三個圖示：
   - `icon-192x192.png`
   - `icon-512x512.png`
   - `favicon.ico`

4. 建立 icons 資料夾並移動圖示：
   ```bash
   mkdir -p public/icons
   mv ~/Downloads/icon-*.png public/icons/
   mv ~/Downloads/favicon.ico public/
   ```

### 方法二：使用自己的圖示

如果您想使用自己設計的圖示：

1. 準備三個 PNG 圖示：
   - 192x192 像素
   - 512x512 像素
   - 32x32 像素（favicon）

2. 放到對應位置：
   ```bash
   mkdir -p public/icons
   # 複製您的圖示到這些位置
   public/icons/icon-192x192.png
   public/icons/icon-512x512.png
   public/favicon.ico
   ```

## 🧪 步驟 2: 本地測試

確保一切運作正常：

```bash
# 開發模式測試
npm run dev
# 訪問 http://localhost:5173

# 測試建置
npm run build
npm run preview
# 訪問 http://localhost:4173
```

### 測試項目
- [ ] 所有功能正常運作
- [ ] 圖示正確顯示（檢查瀏覽器標籤頁）
- [ ] 訂購單圖片可以正常下載
- [ ] localStorage 資料持久化功能正常
- [ ] RWD 在手機尺寸下正常顯示

## 🌐 步驟 3: 部署到 Vercel

### 選項 A: 使用 Vercel CLI（最快速）

1. **安裝 Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **登入 Vercel**
   ```bash
   vercel login
   ```
   選擇您的登入方式（GitHub、GitLab、Email 等）

3. **首次部署**
   ```bash
   vercel
   ```
   
   系統會詢問幾個問題：
   - `Set up and deploy "~/path/to/fish_ball"?` → 輸入 `Y`
   - `Which scope do you want to deploy to?` → 選擇您的帳號
   - `Link to existing project?` → 輸入 `N`（首次部署）
   - `What's your project's name?` → 輸入專案名稱，例如 `fish-ball-group-buy`
   - `In which directory is your code located?` → 直接按 Enter（預設 `./`）
   
   Vercel 會自動偵測 Vite 專案並使用正確的設定。

4. **部署到生產環境**
   ```bash
   vercel --prod
   ```

5. **完成！**
   部署完成後，Vercel 會提供一個網址，例如：
   ```
   https://fish-ball-group-buy.vercel.app
   ```

### 選項 B: 使用 GitHub + Vercel（推薦長期使用）

1. **建立 Git Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: 丸東魚丸團購系統"
   ```

2. **推送到 GitHub**
   
   先在 GitHub 建立一個新的 repository，然後：
   ```bash
   git remote add origin https://github.com/您的使用者名稱/fish-ball-group-buy.git
   git branch -M main
   git push -u origin main
   ```

3. **連結 Vercel**
   
   a. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
   
   b. 點擊 "Add New..." → "Project"
   
   c. 選擇 "Import Git Repository"
   
   d. 找到並選擇您剛才建立的 repository
   
   e. 設定專案（通常無需修改）：
      - **Framework Preset**: Vite
      - **Root Directory**: `./`
      - **Build Command**: `npm run build`
      - **Output Directory**: `dist`
   
   f. 點擊 "Deploy"

4. **設定自訂網域（選用）**
   
   部署完成後，您可以在專案設定中綁定自己的網域：
   - 進入專案設定 → Domains
   - 新增您的網域
   - 按照指示更新 DNS 設定

5. **自動部署**
   
   之後每次推送到 GitHub，Vercel 都會自動重新部署：
   ```bash
   git add .
   git commit -m "更新功能"
   git push
   ```

## 📱 步驟 4: 測試 PWA 功能

部署完成後，用手機測試 PWA 功能：

### iOS (Safari)
1. 用 Safari 開啟您的網站
2. 點擊下方分享按鈕 📤
3. 選擇「加入主畫面」
4. 點擊「加入」

### Android (Chrome)
1. 用 Chrome 開啟您的網站
2. 會看到「安裝應用程式」的提示
3. 點擊「安裝」
4. 或手動：選單 → 安裝應用程式

### 測試項目
- [ ] 圖示正確顯示在手機桌面
- [ ] 點擊圖示後以全螢幕模式開啟
- [ ] 關閉網路後仍可開啟（快取生效）
- [ ] 資料在重新開啟後保留

## 🔧 常見問題排解

### Q1: 建置失敗
```
Error: Cannot find module 'xxx'
```
**解決方法**：
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Q2: PWA 圖示不顯示
**可能原因**：
- 圖示檔案不存在或路徑錯誤
- 圖示尺寸不正確

**檢查方法**：
```bash
ls -la public/icons/
# 應該看到 icon-192x192.png 和 icon-512x512.png
```

### Q3: Service Worker 註冊失敗
**解決方法**：
1. 確保網站使用 HTTPS（Vercel 自動提供）
2. 清除瀏覽器快取後重試
3. 檢查 Console 是否有錯誤訊息

### Q4: 圖片匯出功能不work
**可能原因**：
- 瀏覽器不支援 html2canvas
- CORS 問題

**解決方法**：
- 使用較新版本的瀏覽器
- 確保所有資源都從同一個網域載入

## 📊 監控與分析

### Vercel Analytics（選用）

1. 進入 Vercel 專案設定
2. 開啟 Analytics 功能
3. 可以看到：
   - 頁面訪問量
   - 效能指標
   - 使用者地理分布

### 新增 Google Analytics（選用）

如果需要更詳細的分析，可以在 `index.html` 加入 GA 追蹤碼。

## 🎉 完成！

恭喜您成功部署專案！現在您可以：

1. 分享網址給使用者
2. 建議使用者將 PWA 安裝到手機桌面
3. 隨時更新程式碼並自動部署

## 📞 需要協助？

- Vercel 文件: https://vercel.com/docs
- Vite 文件: https://vitejs.dev/
- PWA 文件: https://web.dev/progressive-web-apps/

---

祝您部署順利！🚀

