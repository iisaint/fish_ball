# 丸東魚丸團購系統 v2.0

> 多人即時協作 · Firebase Realtime Database · Progressive Web App

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)

## 🎯 專案簡介

這是一個專為「丸東魚丸」設計的團購訂單管理系統，支援**團主、團員、廠商**三種角色，透過 Firebase Realtime Database 實現即時多人協作，讓團購管理更簡單、更即時！

### ✨ 主要特色

- 🔥 **即時同步** - 使用 Firebase Realtime Database，所有訂單即時更新
- 👥 **多角色支援** - 團主、團員、廠商各有專屬介面
- 📲 **一鍵分享** - 團主可直接分享連結給團員填單
- 👁️ **透明化** - 團員可查看其他人訂購內容，鼓勵跟單
- 🏪 **廠商後台** - 廠商可查看所有團購、調整價格、管理出貨
- 📱 **PWA 支援** - 可安裝到手機，離線也能查看
- 🖼️ **圖片產生** - 自動生成精美訂單圖片，可分享至 LINE
- 💰 **完全免費** - 使用 Firebase 免費方案，零成本運行

## 🚀 快速開始

### 前置需求

- Node.js 18+ 或 pnpm
- Firebase 帳號（免費）
- Vercel 帳號（可選，用於部署）

### 本地開發

1. **Clone 專案**
   ```bash
   git clone https://github.com/your-username/fish_ball.git
   cd fish_ball
   ```

2. **安裝依賴**
   ```bash
   pnpm install
   ```

3. **設定 Firebase**
   
   請參考 [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) 完整設定指南。
   
   簡要步驟：
   - 建立 Firebase 專案
   - 啟用 Realtime Database
   - 複製 Firebase 配置
   - 建立 `.env.local` 並填入配置

4. **啟動開發伺服器**
   ```bash
   pnpm dev
   ```

5. **開啟瀏覽器**
   
   訪問 `http://localhost:5173`

### 部署到 Vercel

1. **連結 GitHub**
   
   將專案推送到 GitHub

2. **匯入到 Vercel**
   
   在 Vercel Dashboard 點擊「New Project」並匯入

3. **設定環境變數**
   
   在 Vercel 專案設定中新增以下環境變數：
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_DATABASE_URL`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_VENDOR_PASSWORD`

4. **部署**
   
   Vercel 會自動建置並部署

## 📖 使用說明

### 角色 1: 團主

1. 開啟首頁，點擊「我要建立團購」
2. 填寫團主資料（姓名、電話、地點、日期）
3. 點擊「複製連結」分享給團員
4. 即時查看團員訂單
5. 可手動新增/編輯訂單
6. 產生訂單圖片並分享至 LINE
7. 關閉團購

**團主專屬功能：**
- ✅ 查看所有訂單並即時更新
- ✅ 手動新增/編輯/刪除團員訂單
- ✅ 生成並分享精美訂單圖片
- ✅ 複製團員填單連結
- ✅ **送單給廠商**（送單後團員無法修改訂單）
- ✅ 關閉團購（停止接受新訂單）

### 角色 2: 團員

1. 透過團主分享的連結開啟填單頁面
2. 輸入姓名
3. 選擇要訂購的產品與數量
4. 點擊「送出訂單」
5. 可隨時修改訂單
6. 查看其他團員訂購狀況

**團員專屬功能：**
- ✅ 簡潔的填單介面
- ✅ 即時查看其他人訂購內容
- ✅ 可隨時修改自己的訂單（草稿狀態）
- ✅ 自動計算個人總金額
- ✅ **訂單鎖定機制**（送單後自動鎖定，防止誤改）

### 角色 3: 廠商

1. 開啟首頁，點擊「廠商管理入口」
2. 輸入廠商密碼（預設：`wan_dong_vendor_2026`）
3. 查看所有進行中的團購列表
4. 點擊任一團購查看詳情
5. 調整產品價格（批發價）
6. 標記出貨狀態
7. 新增備註
8. 列印訂單
9. 標記為已完成

**廠商專屬功能：**
- ✅ 查看所有進行中的團購
- ✅ **確認收單**（確認後訂單正式成立）
- ✅ 調整產品價格（如批發折扣）
- ✅ 管理出貨狀態（待處理/準備中/已出貨/已送達）
- ✅ 新增備註（如包裝需求）
- ✅ 列印訂單清單
- ✅ 標記團購為已完成

## 📋 訂單狀態流程

系統採用三階段訂單狀態管理，確保訂單處理流程清晰且防止誤改：

### 狀態說明

| 狀態 | 英文代碼 | 說明 | 團員權限 |
|------|---------|------|---------|
| 📝 草稿 | `draft` | 團主收單中 | ✅ 可修改 |
| 📤 已送單 | `submitted` | 已送給廠商確認 | ❌ 鎖定 |
| ✅ 已確認 | `confirmed` | 廠商已確認收單 | ❌ 鎖定 |

### 流程圖

```
團主建立團購
    ↓
團員填單（可隨時修改）
    ↓
團主點擊「送單給廠商」
    ↓
【團員訂單自動鎖定 🔒】
    ↓
廠商收到通知，查看訂單
    ↓
廠商點擊「確認收單」
    ↓
訂單正式成立
    ↓
廠商處理出貨
    ↓
標記為「已完成」
```

### 重要提示

- ⚠️ **送單後鎖定**：團主一旦送單給廠商，所有團員的訂單會立即鎖定，防止在確認過程中被修改
- 🔄 **可取消送單**：團主在廠商確認前，可以取消送單，讓團員繼續修改
- 🔒 **確認後鎖定**：廠商確認收單後，訂單正式成立，無法再取消
- 💡 **如需修改**：訂單鎖定後如需修改，請聯絡團主或廠商

## 🏗️ 系統架構

### 技術棧

- **前端框架**: React 18
- **建置工具**: Vite 5
- **路由管理**: React Router v6
- **樣式框架**: Tailwind CSS 3
- **即時資料庫**: Firebase Realtime Database
- **圖片生成**: html2canvas
- **PWA**: vite-plugin-pwa
- **部署平台**: Vercel

### 資料結構

```javascript
{
  "groups": {
    "groupId123": {
      "info": {
        "name": "王小明",
        "phone": "0912-345-678",
        "location": "台北市信義區",
        "date": "2026-01-15",
        "createdAt": 1704729600000,
        "status": "active", // active | closed | completed
        "orderStatus": "draft", // draft | submitted | confirmed
        "submittedAt": 1704729600000, // 送單時間（submitted 時設定）
        "confirmedAt": 1704729600000  // 確認時間（confirmed 時設定）
      },
      "orders": {
        "orderId456": {
          "memberName": "張三",
          "items": {
            "1": 2,  // 產品ID: 數量
            "3": 1
          },
          "total": 540,
          "updatedAt": 1704729600000
        }
      },
      "vendorNotes": {
        "priceAdjustments": {
          "1": 150  // 產品ID: 調整後價格
        },
        "shippingStatus": "preparing",
        "notes": "請準備冷藏包裝"
      }
    }
  }
}
```

### 路由結構

- `/` - 首頁（選擇角色）
- `/leader/:groupId` - 團主管理介面
- `/member/:groupId` - 團員填單介面
- `/vendor` - 廠商管理後台
- `/vendor/:groupId` - 特定團購詳情

## 🛠️ 開發

### 專案結構

```
fish_ball/
├── public/
│   ├── wan_dong_logo.jpg      # 丸東 Logo
│   └── manifest.json           # PWA Manifest
├── src/
│   ├── components/
│   │   └── UpdatePrompt.jsx   # PWA 更新提示
│   ├── config/
│   │   └── firebase.js        # Firebase 配置
│   ├── hooks/
│   │   ├── useLocalStorage.js # localStorage Hook (保留)
│   │   └── useFirebaseGroup.js # Firebase Hooks
│   ├── pages/
│   │   ├── HomePage.jsx       # 首頁
│   │   ├── LeaderView.jsx     # 團主視圖
│   │   ├── MemberView.jsx     # 團員視圖
│   │   └── VendorView.jsx     # 廠商視圖
│   ├── utils/
│   │   ├── constants.js       # 產品資料
│   │   └── firebase.js        # Firebase 操作函式
│   ├── App.jsx                # (已棄用，保留供參考)
│   ├── main.jsx               # 應用程式入口
│   └── index.css              # 全域樣式
├── .env.example               # 環境變數範本
├── .env.local                 # 本地環境變數（不提交）
├── vite.config.js             # Vite 配置
├── vercel.json                # Vercel 部署配置
├── FIREBASE_SETUP.md          # Firebase 設定指南
└── README.md                  # 本檔案
```

### 可用指令

```bash
# 開發
pnpm dev          # 啟動開發伺服器（支援熱更新）

# 建置
pnpm build        # 建置生產版本

# 預覽
pnpm preview      # 預覽生產版本
```

### 新增產品

編輯 `src/utils/constants.js`:

```javascript
export const PRODUCTS = [
  { id: 1, name: '牛蒡魚餅', price: 160, unit: '斤' },
  { id: 2, name: '花枝排', price: 180, unit: '斤' },
  // 新增更多產品...
];
```

## 📱 PWA 功能

### 安裝到手機

1. **iOS (Safari)**
   - 點擊分享按鈕
   - 選擇「加入主畫面」

2. **Android (Chrome)**
   - 點擊選單（三個點）
   - 選擇「安裝應用程式」

### 更新機制

- 應用程式會自動檢查更新
- 有新版本時會顯示更新提示
- 點擊「立即更新」即可升級

## 🔒 安全性

### Firebase 安全規則

目前設定為允許所有人讀寫（適合小型團購）：

```json
{
  "rules": {
    "groups": {
      "$groupId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

### 廠商密碼

廠商密碼存放在環境變數中，可隨時更改：

```env
VITE_VENDOR_PASSWORD=your_secure_password
```

### 建議

對於更嚴格的安全需求，建議：
1. 啟用 Firebase Authentication
2. 設定更細緻的安全規則
3. 限制資料庫讀寫權限

## 💰 成本分析

### Firebase Spark（免費）方案

- **儲存空間**: 1 GB
- **下載量**: 10 GB/月
- **同時連線**: 100 個

### 預估使用量

- 每個團購約 10-50 KB
- 可支援 **20,000+ 個團購**
- 每月可支援 **200,000+ 次訪問**

**結論：對於一般團購使用完全免費！**

## 🐛 常見問題

### Q: 顯示「Firebase 尚未配置」

A: 請確認 `.env.local` 是否存在且內容正確，並重新啟動開發伺服器。

### Q: 團員填單後團主沒看到

A: 檢查 Firebase Realtime Database 安全規則是否允許寫入，並確認網路連線正常。

### Q: 如何更改廠商密碼？

A: 修改環境變數 `VITE_VENDOR_PASSWORD`，本地需修改 `.env.local`，Vercel 需在後台修改並重新部署。

### Q: 如何清除舊的團購資料？

A: 可以在 Firebase Console 的 Realtime Database 介面中手動刪除，或設定 Cloud Functions 自動清理（需升級方案）。

### Q: 可以自訂產品嗎？

A: 可以！編輯 `src/utils/constants.js` 中的 `PRODUCTS` 陣列即可。

## 📝 更新日誌

### v2.0.0 (2026-01-08)

- ✨ 新增 Firebase Realtime Database 即時同步
- ✨ 新增團員填單介面
- ✨ 新增廠商管理後台
- ✨ 支援多角色（團主/團員/廠商）
- ✨ 支援價格動態調整
- ✨ 支援出貨狀態管理
- ✨ 新增團員可見其他人訂單功能
- ✨ 新增一鍵分享填單連結
- 🎨 全新 UI 設計
- 📱 優化手機瀏覽體驗

### v1.0.0 (2026-01-07)

- ✨ 基礎團購訂單管理
- ✨ 訂單圖片生成與分享
- ✨ PWA 支援
- ✨ localStorage 本地儲存

## 🤝 貢獻

歡迎提交 Issue 或 Pull Request！

## 📄 授權

MIT License

---

## 🙏 致謝

- [Firebase](https://firebase.google.com/) - 提供免費即時資料庫
- [Vercel](https://vercel.com/) - 提供免費託管服務
- [Tailwind CSS](https://tailwindcss.com/) - 優秀的 CSS 框架
- [html2canvas](https://html2canvas.hertzen.com/) - 圖片生成工具

---

Made with ❤️ for 丸東魚丸團購
