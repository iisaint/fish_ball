# ⚡ 快速開始指南

只需 5 分鐘，讓您的專案上線！

## 🎯 三步驟部署

### 1️⃣ 安裝依賴 (1 分鐘)

```bash
npm install
```

### 2️⃣ 產生圖示 (2 分鐘)

```bash
# 在瀏覽器開啟 Logo 轉換工具（會自動載入丸東 logo）
open convert-logo-to-pwa.html  # macOS
# start convert-logo-to-pwa.html  # Windows

# 調整設定後，點擊「一鍵下載所有圖示」
# 然後移動圖示到正確位置
mkdir -p public/icons
mv ~/Downloads/icon-192x192.png public/icons/
mv ~/Downloads/icon-512x512.png public/icons/
mv ~/Downloads/favicon.ico public/
```

### 3️⃣ 部署到 Vercel (2 分鐘)

```bash
# 安裝 Vercel CLI
npm i -g vercel

# 登入並部署
vercel login
vercel --prod
```

✅ **完成！** 您的網站已上線

---

## 🧪 本地測試（選用）

想先在本地測試？

```bash
# 開發模式
npm run dev

# 開啟瀏覽器訪問 http://localhost:5173
```

---

## 📱 手機安裝 PWA

部署完成後，用手機瀏覽器訪問您的網站：

**iOS**: 點擊分享 → 加入主畫面
**Android**: 點擊選單 → 安裝應用程式

---

## 💡 專案功能

✨ **已實作的功能**

- ✅ 團主資料管理
- ✅ 團員訂單管理
- ✅ 自動計算總額
- ✅ 訂購單圖片匯出
- ✅ localStorage 自動儲存
- ✅ PWA 離線支援
- ✅ RWD 響應式設計

🎨 **可自訂的部分**

編輯 `src/utils/constants.js` 修改產品列表：

```javascript
export const PRODUCTS = [
    { id: 1, name: '您的產品', price: 100, unit: '單位' },
    // ... 新增更多產品
];
```

---

## 📚 詳細文件

需要更多資訊？查看：

- 📖 [README.md](README.md) - 完整專案說明
- 🚀 [DEPLOY.md](DEPLOY.md) - 詳細部署指南
- 🐛 疑難排解 - 見 DEPLOY.md

---

## 🎉 接下來？

1. **分享連結** - 把網址傳給團員
2. **安裝 PWA** - 加到手機桌面更方便
3. **開始使用** - 填入資料，產生訂購單！

需要協助？查看 [DEPLOY.md](DEPLOY.md) 的疑難排解章節。

---

**Happy Coding! 🐟**

