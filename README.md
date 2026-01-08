# 🐟 丸東魚丸團購小幫手

一個專為手機設計的團購訂單管理與圖片產生器，支援 PWA 離線使用，可安裝到手機桌面。

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![React](https://img.shields.io/badge/React-18.2-61dafb)
![Vite](https://img.shields.io/badge/Vite-5.0-646cff)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)

## ✨ 功能特色

- 📱 **手機優先設計** - 完美的觸控體驗，RWD 響應式設計
- 💾 **自動儲存** - 使用 localStorage 自動保存資料，防止資料遺失
- 📸 **一鍵匯出圖片** - 產生高解析度訂購單圖片，方便傳送 LINE
- 🔄 **即時計算** - 自動計算個人與總金額
- 📊 **雙重統計** - 提供廠商出貨統計與團員分發明細
- 🚀 **PWA 支援** - 可安裝到手機桌面，離線也能使用
- ⚡ **極速載入** - Vite 打造，秒開不等待

## 🖼️ 預覽

### 手機版介面
- 卡片式訂單輸入
- 大按鈕易觸控
- 左右滑動預覽完整訂購單

### 桌面版介面
- 表格式訂單管理
- 一覽所有訂購資訊

## 🚀 快速開始

### 前置需求

- Node.js 16.0 或更新版本
- npm 或 yarn

### 安裝

```bash
# 安裝依賴
npm install

# 產生 PWA 圖示（首次安裝需要）
# 1. 在瀏覽器開啟 convert-logo-to-pwa.html（會自動載入丸東 logo）
# 2. 調整設定並點擊「一鍵下載所有圖示」
# 3. 建立 public/icons/ 資料夾
# 4. 將圖示放入該資料夾
mkdir -p public/icons
# 然後將下載的圖示檔案移至正確位置
# mv ~/Downloads/icon-*.png public/icons/
# mv ~/Downloads/favicon.ico public/
```

### 開發

```bash
# 啟動開發伺服器
npm run dev

# 開啟瀏覽器訪問 http://localhost:5173
```

### 建置

```bash
# 建置生產版本
npm run build

# 預覽生產版本
npm run preview
```

## 📦 部署到 Vercel

### 方法一：使用 Vercel CLI

```bash
# 安裝 Vercel CLI（如果還沒安裝）
npm i -g vercel

# 登入 Vercel
vercel login

# 部署（第一次會詢問專案設定）
vercel

# 部署到生產環境
vercel --prod
```

### 方法二：使用 GitHub 整合

1. 將專案推送到 GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

2. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
3. 點擊「Import Project」
4. 選擇你的 GitHub repository
5. Vercel 會自動偵測 Vite 專案，無需額外設定
6. 點擊「Deploy」

### 方法三：一鍵部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/fish-ball-group-buy)

## 📱 安裝 PWA 到手機

部署完成後，使用手機瀏覽器訪問網站：

### iOS (Safari)
1. 點擊下方「分享」按鈕
2. 選擇「加入主畫面」
3. 點擊「加入」

### Android (Chrome)
1. 點擊右上角選單（三個點）
2. 選擇「安裝應用程式」或「加到主畫面」
3. 點擊「安裝」

安裝後，應用程式就會像一般 App 一樣出現在手機桌面！

## 🛠️ 技術架構

- **前端框架**: React 18
- **建置工具**: Vite 5
- **樣式框架**: Tailwind CSS 3
- **PWA**: vite-plugin-pwa
- **圖片產生**: html2canvas
- **圖示字型**: Font Awesome 6
- **字型**: Google Fonts (Noto Sans TC)

## 📂 專案結構

```
fish_ball/
├── public/              # 靜態資源
│   ├── icons/          # PWA 圖示
│   ├── icon.svg        # SVG 圖示
│   └── manifest.json   # PWA manifest
├── src/
│   ├── App.jsx         # 主應用程式元件
│   ├── main.jsx        # React 進入點
│   ├── index.css       # 全域樣式
│   ├── hooks/
│   │   └── useLocalStorage.js  # localStorage hook
│   └── utils/
│       └── constants.js         # 產品資料與常數
├── index.html          # HTML 模板
├── package.json        # 專案依賴
├── vite.config.js      # Vite 配置
├── tailwind.config.js  # Tailwind 配置
├── postcss.config.js   # PostCSS 配置
└── vercel.json         # Vercel 部署配置
```

## 🎨 自訂產品列表

編輯 `src/utils/constants.js` 來修改產品資料：

```javascript
export const PRODUCTS = [
    { id: 1, name: '牛蒡魚餅', price: 160, unit: '斤' },
    { id: 2, name: '花枝排', price: 180, unit: '斤' },
    // ... 新增或修改產品
];
```

## 💡 使用技巧

1. **資料保存**: 所有輸入的資料會自動儲存到瀏覽器，下次開啟會自動恢復
2. **清空資料**: 清除瀏覽器快取即可重置所有資料
3. **圖片品質**: 匯出的圖片為 2x 解析度，適合高清顯示
4. **離線使用**: 安裝 PWA 後，即使沒有網路也能使用（已快取的版本）

## 🐛 疑難排解

### 圖片無法產生
- 確認瀏覽器支援 html2canvas
- 檢查是否有封鎖跨來源資源（CORS）

### PWA 無法安裝
- 確認網站使用 HTTPS（Vercel 預設啟用）
- 檢查 manifest.json 是否正確載入
- 確認圖示檔案存在於 public/icons/

### 資料無法儲存
- 檢查瀏覽器是否允許 localStorage
- 確認沒有使用無痕模式

## 📝 授權

本專案採用 MIT 授權條款

## 🤝 貢獻

歡迎提交 Issue 或 Pull Request！

## 📧 聯絡

如有任何問題或建議，歡迎聯繫。

---

Made with ❤️ for 丸東魚丸團購

