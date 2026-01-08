import { useRegisterSW } from 'virtual:pwa-register/react';

function UpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // 每小時檢查一次更新
      r && setInterval(() => {
        console.log('檢查更新中...');
        r.update();
      }, 60 * 60 * 1000);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-2xl p-4 border-2 border-blue-400">
        {offlineReady ? (
          <div>
            <div className="flex items-start gap-3">
              <div className="text-2xl">✅</div>
              <div className="flex-1">
                <p className="font-bold mb-1">已可離線使用</p>
                <p className="text-sm text-blue-100 mb-3">App 已準備好離線工作</p>
                <button
                  onClick={close}
                  className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-50 transition-colors w-full"
                >
                  知道了
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-start gap-3 mb-3">
              <div className="text-2xl">🎉</div>
              <div className="flex-1">
                <p className="font-bold mb-1">新版本可用！</p>
                <p className="text-sm text-blue-100">發現新版本，點擊更新以獲得最新功能</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => updateServiceWorker(true)}
                className="bg-white text-blue-600 px-4 py-2 rounded-lg font-bold text-sm flex-1 hover:bg-blue-50 transition-colors"
              >
                立即更新 ⚡
              </button>
              <button
                onClick={close}
                className="bg-blue-800 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-900 transition-colors"
              >
                稍後
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UpdatePrompt;

