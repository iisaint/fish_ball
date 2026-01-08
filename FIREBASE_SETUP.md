# Firebase 設定指南

本專案使用 Firebase Realtime Database 實現即時多人協作功能。以下是完整的設定步驟。

## 步驟 1: 建立 Firebase 專案

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 點擊「新增專案」
3. 輸入專案名稱，例如：`wan-dong-fishball`
4. （可選）啟用 Google Analytics
5. 點擊「建立專案」

## 步驟 2: 啟用 Realtime Database

1. 在 Firebase 專案中，點擊左側選單的「建構」→「Realtime Database」
2. 點擊「建立資料庫」
3. 選擇資料庫位置（建議選擇亞洲區域，如 `asia-southeast1`）
4. 選擇「以測試模式啟動」（稍後會設定安全規則）
5. 點擊「啟用」

## 步驟 3: 設定安全規則

在 Realtime Database 的「規則」分頁中，貼上以下規則：

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

> **注意**：這個規則允許所有人讀寫資料。適合小型團購使用，但如果需要更嚴格的安全控制，請參考 Firebase 安全規則文件。

點擊「發布」套用規則。

## 步驟 4: 取得 Firebase 配置

1. 點擊專案設定（齒輪圖示）→「專案設定」
2. 在「一般」分頁下方，點擊「</> Web」圖示
3. 輸入應用程式名稱，例如：`fish-ball-app`
4. 不需勾選「設定 Firebase Hosting」
5. 點擊「註冊應用程式」
6. 複製 `firebaseConfig` 物件中的值

配置範例：
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

## 步驟 5: 設定環境變數

### 本地開發

1. 複製 `.env.example` 為 `.env.local`：
   ```bash
   cp .env.example .env.local
   ```

2. 編輯 `.env.local`，填入 Firebase 配置：
   ```env
   VITE_FIREBASE_API_KEY=你的_apiKey
   VITE_FIREBASE_AUTH_DOMAIN=你的_authDomain
   VITE_FIREBASE_DATABASE_URL=你的_databaseURL
   VITE_FIREBASE_PROJECT_ID=你的_projectId
   VITE_FIREBASE_STORAGE_BUCKET=你的_storageBucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=你的_messagingSenderId
   VITE_FIREBASE_APP_ID=你的_appId
   
   # 廠商密碼（自訂）
   VITE_VENDOR_PASSWORD=your_vendor_password
   ```

3. 儲存檔案並重新啟動開發伺服器：
   ```bash
   npm run dev
   ```

### Vercel 部署

1. 登入 [Vercel Dashboard](https://vercel.com/)
2. 選擇您的專案
3. 前往「Settings」→「Environment Variables」
4. 新增以下環境變數（每個分開新增）：
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_DATABASE_URL`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_VENDOR_PASSWORD`

5. 確保每個環境變數都勾選 `Production`, `Preview`, `Development`
6. 點擊「Save」
7. 重新部署專案

## 步驟 6: 測試功能

1. 開啟應用程式首頁
2. 點擊「我要建立團購（團主）」
3. 如果成功建立，表示 Firebase 已正確配置
4. 複製團員填單連結，在另一個瀏覽器視窗開啟
5. 填寫訂單，確認資料會即時同步到團主頁面

## 常見問題

### Q: 顯示「Firebase 尚未配置」

A: 請確認：
1. `.env.local` 檔案是否存在且內容正確
2. 環境變數名稱是否以 `VITE_` 開頭
3. 重新啟動開發伺服器

### Q: 無法寫入資料

A: 請檢查 Firebase Realtime Database 的安全規則是否正確設定，確認 `.write: true` 已啟用。

### Q: Vercel 部署後無法連接 Firebase

A: 請確認：
1. Vercel 環境變數是否都已正確設定
2. 環境變數是否勾選了 `Production` 環境
3. 重新部署專案

### Q: 如何更改廠商密碼？

A: 修改環境變數 `VITE_VENDOR_PASSWORD` 的值，本地開發需修改 `.env.local`，Vercel 需在後台修改環境變數並重新部署。

## 成本說明

### Firebase Spark（免費）方案限制：

- **Realtime Database**
  - 儲存空間：1 GB
  - 下載量：10 GB/月
  - 同時連線：100 個

### 預估使用量：

- 每個團購約 10-50 KB
- 可支援約 **20,000+ 個團購**
- 每月可支援 **200,000+ 次訪問**

對於一般團購使用，**完全免費且足夠**！

## 進階設定（選用）

### 啟用離線支援

Firebase Realtime Database 預設支援離線快取，無需額外設定。

### 設定資料過期清理

如需自動清理舊團購資料，可使用 Firebase Cloud Functions（需升級至 Blaze 方案）。

### 備份資料

建議定期從 Firebase Console 匯出資料備份：
1. 前往 Realtime Database
2. 點擊右上角的「匯出 JSON」

---

## 技術支援

如有任何問題，請參考：
- [Firebase Realtime Database 文件](https://firebase.google.com/docs/database)
- [Vite 環境變數文件](https://vitejs.dev/guide/env-and-mode.html)

