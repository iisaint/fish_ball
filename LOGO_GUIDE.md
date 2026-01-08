# 🎨 丸東魚丸 Logo 使用指南

## 您的 Logo 已準備好！

我們已經為您準備好實際的丸東魚丸 logo（`public/wan_dong_logo.jpg`），現在只需要將它轉換為 PWA 需要的各種尺寸。

## 🚀 快速轉換（1 分鐘）

### 步驟 1：開啟轉換工具

```bash
# macOS
open convert-logo-to-pwa.html

# Windows
start convert-logo-to-pwa.html

# Linux
xdg-open convert-logo-to-pwa.html
```

**工具會自動載入您的 logo！** 無需手動選擇檔案。

### 步驟 2：調整設定（選用）

在轉換工具中，您可以自訂：

#### 背景顏色選項
- **白色** (`#ffffff`) - 簡潔清爽 ⭐ 推薦
- **藍色** (`#1e40af`) - 品牌色系
- **淺藍** (`#f0f9ff`) - 柔和舒適

#### Logo 大小
- 使用滑桿調整邊距（0-40%）
- **建議值：20%** - 最佳視覺平衡
- 數值越大，logo 越小，邊距越寬

#### 圓角選項
- ✅ **啟用圓角**（預設）- PWA 標準建議
- ⬜ 關閉圓角 - 方形圖示

### 步驟 3：預覽圖示

工具會即時顯示三種尺寸的預覽：

1. **192x192** - 手機桌面小圖示
2. **512x512** - 手機桌面大圖示、啟動畫面
3. **32x32** - 瀏覽器分頁 favicon

### 步驟 4：下載圖示

點擊 **「📦 一鍵下載所有圖示」** 按鈕，會自動下載三個檔案到您的下載資料夾。

### 步驟 5：移動圖示到正確位置

```bash
# 建立 icons 資料夾
mkdir -p public/icons

# 移動圖示（macOS/Linux）
mv ~/Downloads/icon-192x192.png public/icons/
mv ~/Downloads/icon-512x512.png public/icons/
mv ~/Downloads/favicon.ico public/

# Windows PowerShell
Move-Item $env:USERPROFILE\Downloads\icon-192x192.png public\icons\
Move-Item $env:USERPROFILE\Downloads\icon-512x512.png public\icons\
Move-Item $env:USERPROFILE\Downloads\favicon.ico public\
```

### 步驟 6：驗證

```bash
# 檢查檔案是否在正確位置
ls -la public/icons/
# 應該看到：
# icon-192x192.png
# icon-512x512.png

ls -la public/favicon.ico
# 應該看到 favicon.ico
```

## ✅ 完成！

現在您可以：

```bash
# 測試建置
npm run build

# 本地預覽
npm run preview

# 部署到 Vercel
vercel --prod
```

## 🎨 建議配置

根據您的 logo 特色（紅色「海工」文字 + 黑色「丸東魚丸」書法字），我們建議：

### 推薦設定組合

**方案一：專業簡潔（推薦）**
- 背景：白色 `#ffffff`
- 邊距：20%
- 圓角：啟用 ✅

**方案二：品牌強化**
- 背景：淺藍 `#f0f9ff`
- 邊距：15%
- 圓角：啟用 ✅

**方案三：現代時尚**
- 背景：藍色 `#1e40af`
- 邊距：25%
- 圓角：啟用 ✅
- （注意：深色背景需確保 logo 可見度）

## 📱 測試 PWA 圖示

部署後，在手機上測試：

### iOS
1. 用 Safari 開啟網站
2. 點擊「分享」→「加入主畫面」
3. 檢查圖示是否正確顯示

### Android
1. 用 Chrome 開啟網站
2. 點擊「安裝應用程式」
3. 檢查圖示是否正確顯示

## 🔧 常見問題

### Q: 為什麼需要三種尺寸？
- **192x192**: Android 桌面圖示、通知圖示
- **512x512**: 啟動畫面、高解析度設備
- **32x32**: 瀏覽器分頁、書籤圖示

### Q: 可以使用其他 logo 嗎？
可以！在轉換工具中點擊「選擇圖片檔案」上傳您的 logo。

### Q: 背景應該選什麼顏色？
- Logo 主體是白色/淺色 → 選深色背景
- Logo 主體是深色 → 選淺色背景
- **您的 logo 是深色系 → 建議白色或淺藍背景**

### Q: 圖示看起來模糊？
確保：
1. 原始 logo 解析度夠高
2. 邊距不要設太大（建議 15-25%）
3. 使用 PNG 格式下載

### Q: 需要重新產生圖示嗎？
只在以下情況需要：
- Logo 更換
- 想調整背景色
- 想調整大小/邊距

## 📊 檔案大小參考

生成的圖示檔案大小約：
- icon-192x192.png: ~15-30 KB
- icon-512x512.png: ~50-100 KB
- favicon.ico: ~2-5 KB

總共不超過 150 KB，對網站效能影響極小。

## 🎉 提示

- 轉換工具會記住您的設定（顏色、邊距等）
- 可以多次調整直到滿意
- 下載不限次數，隨時可重新產生
- 建議在不同設備上測試效果

---

需要幫助？查看 [DEPLOY.md](DEPLOY.md) 的疑難排解章節。

**祝您的 PWA 圖示完美呈現！** 🐟✨

