import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import LeaderView from './pages/LeaderView.jsx'
import MemberView from './pages/MemberView.jsx'
import VendorView from './pages/VendorView.jsx'
import './index.css'

// vite-plugin-pwa 會自動處理 Service Worker 註冊
// 移除手動註冊避免衝突

// 路由配置
const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/leader/:groupId',
    element: <LeaderView />,
  },
  {
    path: '/member/:groupId',
    element: <MemberView />,
  },
  {
    path: '/vendor',
    element: <VendorView />,
  },
  {
    path: '/vendor/:groupId',
    element: <VendorView />,
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)

