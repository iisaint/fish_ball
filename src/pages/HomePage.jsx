import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGroup } from '../utils/firebase';
import { isFirebaseConfigured } from '../config/firebase';
import { useGroupInfo } from '../hooks/useFirebaseGroup';

// 歷史記錄卡片元件
function HistoryCard({ groupId, type, onDelete }) {
  const { groupInfo, loading } = useGroupInfo(groupId);
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (type === 'leader') {
      navigate(`/leader/${groupId}`);
    } else {
      navigate(`/member/${groupId}`);
    }
  };
  
  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(groupId);
  };
  
  if (loading) {
    return (
      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }
  
  if (!groupInfo) {
    return null; // 團購已被刪除
  }
  
  return (
    <div
      onClick={handleClick}
      className="border-2 border-gray-200 rounded-lg p-3 bg-white hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group relative"
    >
      <button
        onClick={handleDelete}
        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
      >
        <i className="fa-solid fa-times text-xs"></i>
      </button>
      
      <div className="flex items-start gap-2 mb-1">
        <span className={`text-lg ${type === 'leader' ? 'text-orange-500' : 'text-blue-500'}`}>
          {type === 'leader' ? '👨‍💼' : '👥'}
        </span>
        <div className="flex-1">
          <h3 className="font-bold text-gray-800">
            {groupInfo.name || '未命名團購'}
          </h3>
          <div className="text-xs text-gray-500 space-y-0.5">
            <p>📅 {groupInfo.date}</p>
            <p className="font-mono">🔑 {groupId}</p>
          </div>
        </div>
      </div>
      
      <div className="mt-2 pt-2 border-t border-gray-100">
        <span className={`text-xs font-medium ${
          groupInfo.status === 'closed' 
            ? 'text-red-600' 
            : 'text-green-600'
        }`}>
          {groupInfo.status === 'closed' ? '已關閉' : '進行中'}
        </span>
      </div>
    </div>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showJoinInput, setShowJoinInput] = useState(false);
  
  // 讀取歷史記錄
  const [leaderGroups, setLeaderGroups] = useState([]);
  const [memberGroups, setMemberGroups] = useState([]);

  // 檢查 Firebase 是否已配置
  const firebaseReady = isFirebaseConfigured();
  
  // 載入歷史記錄
  useEffect(() => {
    const loadHistory = () => {
      const leader = JSON.parse(localStorage.getItem('leader_groups') || '[]');
      const member = JSON.parse(localStorage.getItem('member_groups') || '[]');
      setLeaderGroups(leader);
      setMemberGroups(member);
    };
    
    loadHistory();
    
    // 監聽 storage 變化（跨分頁同步）
    window.addEventListener('storage', loadHistory);
    return () => window.removeEventListener('storage', loadHistory);
  }, []);

  // 建立新團購
  const handleCreateGroup = async () => {
    if (!firebaseReady) {
      alert('請先設定 Firebase 配置！請查看 README.md 瞭解如何設定。');
      return;
    }

    setIsCreating(true);
    try {
      // 建立空白團購（團主在下一頁填寫資訊）
      const groupId = await createGroup({
        name: '',
        phone: '',
        location: '',
        date: new Date().toISOString().split('T')[0]
      });
      
      // 儲存到歷史記錄
      const groups = JSON.parse(localStorage.getItem('leader_groups') || '[]');
      if (!groups.includes(groupId)) {
        groups.unshift(groupId);
        localStorage.setItem('leader_groups', JSON.stringify(groups.slice(0, 10)));
      }
      
      // 導向團主頁面
      navigate(`/leader/${groupId}`);
    } catch (error) {
      console.error('建立團購失敗:', error);
      alert('建立團購失敗：' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  // 加入團購
  const handleJoinGroup = () => {
    if (!joinCode.trim()) {
      alert('請輸入團購代碼');
      return;
    }
    
    // 儲存到歷史記錄
    const groups = JSON.parse(localStorage.getItem('member_groups') || '[]');
    const code = joinCode.trim();
    if (!groups.includes(code)) {
      groups.unshift(code);
      localStorage.setItem('member_groups', JSON.stringify(groups.slice(0, 10)));
    }
    
    navigate(`/member/${code}`);
  };

  // 進入廠商頁面
  const handleVendorAccess = () => {
    const password = prompt('請輸入廠商密碼：');
    const correctPassword = import.meta.env.VITE_VENDOR_PASSWORD || 'wan_dong_vendor_2026';
    
    if (password === correctPassword) {
      navigate('/vendor');
    } else {
      alert('密碼錯誤！');
    }
  };
  
  // 刪除歷史記錄
  const deleteLeaderGroup = (groupId) => {
    if (confirm('確定要從歷史記錄中移除嗎？')) {
      const groups = leaderGroups.filter(id => id !== groupId);
      localStorage.setItem('leader_groups', JSON.stringify(groups));
      setLeaderGroups(groups);
    }
  };
  
  const deleteMemberGroup = (groupId) => {
    if (confirm('確定要從歷史記錄中移除嗎？')) {
      const groups = memberGroups.filter(id => id !== groupId);
      localStorage.setItem('member_groups', JSON.stringify(groups));
      setMemberGroups(groups);
    }
  };
  
  // 判斷是否有歷史記錄
  const hasHistory = leaderGroups.length > 0 || memberGroups.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Logo 區域 */}
        <div className="text-center mb-8">
          <img 
            src="/wan_dong_logo.jpg" 
            alt="丸東魚丸" 
            className="w-32 h-32 mx-auto rounded-full shadow-lg mb-4 object-cover"
          />
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            丸東魚丸團購
          </h1>
          <p className="text-gray-600">
            多人即時協作 · 輕鬆管理訂單
          </p>
        </div>

        {/* Firebase 狀態提示 */}
        {!firebaseReady && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Firebase 尚未配置。請參考 README.md 設定環境變數。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 歷史記錄區塊 */}
        {hasHistory && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <i className="fa-solid fa-history mr-2 text-purple-600"></i>
              我的團購記錄
            </h2>
            
            {/* 團主建立的團購 */}
            {leaderGroups.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-600 mb-2 flex items-center">
                  <span className="text-orange-500 mr-1">👨‍💼</span>
                  我建立的團購
                  <span className="ml-auto text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                    {leaderGroups.length}
                  </span>
                </h3>
                <div className="grid gap-2">
                  {leaderGroups.map(groupId => (
                    <HistoryCard 
                      key={groupId} 
                      groupId={groupId} 
                      type="leader"
                      onDelete={deleteLeaderGroup}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* 團員加入的團購 */}
            {memberGroups.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-2 flex items-center">
                  <span className="text-blue-500 mr-1">👥</span>
                  我加入的團購
                  <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    {memberGroups.length}
                  </span>
                </h3>
                <div className="grid gap-2">
                  {memberGroups.map(groupId => (
                    <HistoryCard 
                      key={groupId} 
                      groupId={groupId} 
                      type="member"
                      onDelete={deleteMemberGroup}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 主要操作區 */}
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-4">
          {/* 建立團購 */}
          <button
            onClick={handleCreateGroup}
            disabled={isCreating || !firebaseReady}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg hover:from-orange-600 hover:to-orange-700 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isCreating ? '建立中...' : '🎯 我要建立團購（團主）'}
          </button>

          {/* 分隔線 */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">或</span>
            </div>
          </div>

          {/* 加入團購 */}
          {!showJoinInput ? (
            <button
              onClick={() => setShowJoinInput(true)}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200"
            >
              👥 加入團購（團員）
            </button>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleJoinGroup()}
                placeholder="輸入團購代碼"
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:outline-none focus:border-blue-500 text-lg text-center font-mono"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleJoinGroup}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                >
                  確認加入
                </button>
                <button
                  onClick={() => {
                    setShowJoinInput(false);
                    setJoinCode('');
                  }}
                  className="px-6 bg-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {/* 廠商入口 */}
          <button
            onClick={handleVendorAccess}
            className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-200 transition-colors text-sm"
          >
            🏪 廠商管理入口
          </button>
        </div>

        {/* 功能說明 */}
        <div className="mt-8 text-center text-sm text-gray-600 space-y-2">
          <p>✨ 即時同步 · 多人協作</p>
          <p>📱 支援手機 · PWA 可安裝</p>
          <p>🔒 完全免費 · 資料安全</p>
        </div>

        {/* 版本資訊 */}
        <div className="mt-6 text-center text-xs text-gray-400">
          v2.0 · Firebase 即時協作版
        </div>
      </div>
    </div>
  );
}

export default HomePage;

