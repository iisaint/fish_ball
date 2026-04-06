import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, onValue, off } from 'firebase/database';
import { db } from '../config/firebase';
import { isFirebaseConfigured } from '../config/firebase';
import { adjustPrice, updateShippingStatus, updateVendorNotes, completeGroup, confirmOrder, cancelConfirmation } from '../utils/firebase';
import { useProducts } from '../hooks/useProducts';
import { getActualPrice } from '../utils/firebase';
import UpdatePrompt from '../components/UpdatePrompt';

function VendorView() {
    const { groupId: urlGroupId } = useParams();
    const navigate = useNavigate();
    
    const { products: PRODUCTS } = useProducts();

    // State
    const [selectedGroupId, setSelectedGroupId] = useState(urlGroupId || null);
    const [draftGroups, setDraftGroups] = useState([]); // 草稿狀態的團購
    const [allGroups, setAllGroups] = useState([]); // 已送單/已確認的團購
    const [completedGroups, setCompletedGroups] = useState([]); // 已完成的團購
    const [activeTab, setActiveTab] = useState('draft'); // 'draft' or 'active' or 'history'
    const [groupData, setGroupData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [priceAdjustments, setPriceAdjustments] = useState({});
    const [shippingStatus, setShippingStatus] = useState('pending');
    const [notes, setNotes] = useState('');
    const [hideEmptyOrders, setHideEmptyOrders] = useState(true); // 過濾空訂單開關
    const [selectedGroupIds, setSelectedGroupIds] = useState([]); // 選中的團購ID列表
    const [showStatsModal, setShowStatsModal] = useState(false); // 統計視窗開關
    
    // 切換團購選中狀態
    const toggleGroupSelection = (groupId) => {
        setSelectedGroupIds(prev => 
            prev.includes(groupId) 
                ? prev.filter(id => id !== groupId)
                : [...prev, groupId]
        );
    };
    
    // 全選/取消全選
    const toggleSelectAll = (groups) => {
        if (selectedGroupIds.length === groups.length) {
            setSelectedGroupIds([]);
        } else {
            setSelectedGroupIds(groups.map(g => g.id));
        }
    };
    
    // 計算批量統計數據（用於統計視窗）
    const calculateBatchStats = () => {
        const selectedGroups = [...draftGroups, ...allGroups, ...completedGroups]
            .filter(g => selectedGroupIds.includes(g.id));
        
        const stats = {
            totalAmount: 0,
            productStats: {},
            leaderStats: []
        };
        
        // 初始化產品統計
        PRODUCTS.forEach(p => {
            stats.productStats[p.id] = { ...p, quantity: 0, amount: 0 };
        });
        
        // 統計每個團購
        selectedGroups.forEach(group => {
            const orders = group.orders || {};
            let groupTotal = 0;
            let groupProductStats = {};
            
            PRODUCTS.forEach(p => {
                groupProductStats[p.id] = 0;
            });
            
            Object.values(orders).forEach(order => {
                groupTotal += order.total || 0;
                Object.entries(order.items || {}).forEach(([pId, qty]) => {
                    const productId = parseInt(pId);
                    if (stats.productStats[productId]) {
                        stats.productStats[productId].quantity += qty;
                        const price = getActualPrice(productId, group.vendorNotes?.priceAdjustments || {}, PRODUCTS);
                        stats.productStats[productId].amount += price * qty;
                        groupProductStats[productId] += qty;
                    }
                });
            });
            
            stats.totalAmount += groupTotal;
            stats.leaderStats.push({
                groupId: group.id,
                name: group.info?.name || '未命名團購',
                date: group.info?.date,
                ordersCount: Object.keys(orders).length,
                total: groupTotal,
                productStats: groupProductStats
            });
        });
        
        return stats;
    };
    
    // 載入所有團購
    useEffect(() => {
        // 檢查 Firebase 是否已配置
        if (!isFirebaseConfigured()) {
            setLoading(false);
            return;
        }
        
        const groupsRef = ref(db, 'groups');
        
        const unsubscribe = onValue(
            groupsRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const groupsList = Object.entries(data).map(([id, group]) => ({
                        id,
                        ...group
                    }));
                    
                    console.log('🔍 所有團購資料:', groupsList);
                    
                    // 分類：草稿狀態（尚未送單）
                    const drafts = groupsList.filter(g => {
                        const status = g.info?.status;
                        const orderStatus = g.info?.orderStatus;
                        return status !== 'completed' && orderStatus === 'draft';
                    });
                    
                    // 分類：進行中的訂單（已送單和已確認，且未完成）
                    const activeGroups = groupsList.filter(g => {
                        const status = g.info?.status;
                        const orderStatus = g.info?.orderStatus;
                        
                        console.log(`團購 ${g.id}:`, {
                            status,
                            orderStatus,
                            shouldShow: status !== 'completed' && (orderStatus === 'submitted' || orderStatus === 'confirmed')
                        });
                        
                        return status !== 'completed' && 
                               (orderStatus === 'submitted' || orderStatus === 'confirmed');
                    });
                    
                    // 分類：已完成的訂單
                    const finishedGroups = groupsList.filter(g => {
                        return g.info?.status === 'completed';
                    });
                    
                    console.log('📝 草稿團購:', drafts);
                    console.log('✅ 進行中的團購:', activeGroups);
                    console.log('📦 已完成的團購:', finishedGroups);
                    
                    setDraftGroups(drafts.sort((a, b) => (b.info?.updatedAt || b.info?.createdAt || 0) - (a.info?.updatedAt || a.info?.createdAt || 0)));
                    setAllGroups(activeGroups.sort((a, b) => (b.info?.createdAt || 0) - (a.info?.createdAt || 0)));
                    setCompletedGroups(finishedGroups.sort((a, b) => (b.info?.completedAt || b.info?.createdAt || 0) - (a.info?.completedAt || a.info?.createdAt || 0)));
                } else {
                    console.log('❌ Firebase 沒有資料');
                    setAllGroups([]);
                }
                setLoading(false);
            },
            (error) => {
                console.error('❌ 載入團購列表失敗:', error);
                setAllGroups([]);
                setLoading(false);
            }
        );
        
        return () => off(groupsRef, 'value', unsubscribe);
    }, []);
    
    // 載入選中團購的詳細資料
    useEffect(() => {
        if (!selectedGroupId) {
            setGroupData(null);
            return;
        }
        
        const groupRef = ref(db, `groups/${selectedGroupId}`);
        const unsubscribe = onValue(groupRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                setGroupData(data);
                setPriceAdjustments(data.vendorNotes?.priceAdjustments || {});
                setShippingStatus(data.vendorNotes?.shippingStatus || 'pending');
                setNotes(data.vendorNotes?.notes || '');
            } else {
                setGroupData(null);
            }
        });
        
        return () => off(groupRef, 'value', unsubscribe);
    }, [selectedGroupId]);
    
    // 將訂單物件轉換為陣列
    const orders = groupData?.orders ? Object.entries(groupData.orders).map(([id, data]) => ({
        id,
        ...data
    })) : [];
    
    // 計算產品統計
    const calculateStats = () => {
        const stats = {};
        let grandTotal = 0;
        
        PRODUCTS.forEach(p => {
            stats[p.id] = { quantity: 0, amount: 0 };
        });
        
        orders.forEach(order => {
            grandTotal += order.total || 0;
            Object.entries(order.items || {}).forEach(([pId, qty]) => {
                const id = parseInt(pId);
                if (stats[id]) {
                    stats[id].quantity += qty;
                    const price = getActualPrice(id, priceAdjustments, PRODUCTS);
                    stats[id].amount += price * qty;
                }
            });
        });
        
        return { stats, grandTotal };
    };
    
    const { stats, grandTotal } = groupData ? calculateStats() : { stats: {}, grandTotal: 0 };
    
    // 調整價格
    const handlePriceAdjust = async (productId) => {
        const product = PRODUCTS.find(p => p.id === productId);
        const currentPrice = priceAdjustments[productId] || product.price;
        const newPrice = prompt(`調整「${product.name}」價格：`, currentPrice);
        
        if (newPrice === null) return;
        
        const price = parseInt(newPrice);
        if (isNaN(price) || price < 0) {
            alert('請輸入有效的價格');
            return;
        }
        
        try {
            await adjustPrice(selectedGroupId, productId, price);
            alert('價格已更新');
        } catch (error) {
            alert('更新失敗：' + error.message);
        }
    };
    
    // 更新出貨狀態
    const handleStatusChange = async (newStatus) => {
        try {
            await updateShippingStatus(selectedGroupId, newStatus);
        } catch (error) {
            alert('更新失敗：' + error.message);
        }
    };
    
    // 更新備註
    const handleNotesUpdate = async () => {
        try {
            await updateVendorNotes(selectedGroupId, notes);
            alert('備註已儲存');
        } catch (error) {
            alert('儲存失敗：' + error.message);
        }
    };
    
    // 確認收單
    const handleConfirmOrder = async () => {
        if (!confirm('確定要確認收單嗎？確認後訂單將正式成立。')) return;
        
        try {
            await confirmOrder(selectedGroupId);
            alert('收單確認成功！訂單已成立');
        } catch (error) {
            alert('確認失敗：' + error.message);
        }
    };
    
    // 取消確認（開放修改）
    const handleCancelConfirmation = async () => {
        if (!confirm('確定要取消確認嗎？\n\n取消後：\n• 團員可以修改訂單\n• 訂單狀態將改回「已送單」\n• 團主需要重新送單')) return;
        
        try {
            await cancelConfirmation(selectedGroupId);
            alert('已取消確認！\n\n訂單狀態已改回「已送單」\n團員現在可以修改訂單了');
        } catch (error) {
            alert('操作失敗：' + error.message);
        }
    };
    
    // 完成團購
    const handleComplete = async () => {
        if (!confirm('確定要標記此團購為「已完成」嗎？完成後將不再顯示在列表中。')) return;
        
        try {
            await completeGroup(selectedGroupId);
            alert('團購已完成');
            setSelectedGroupId(null);
        } catch (error) {
            alert('操作失敗：' + error.message);
        }
    };
    
    // 列印訂單
    const handlePrint = () => {
        window.print();
    };
    
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">載入中...</p>
                </div>
            </div>
        );
    }
    
    // 檢查 Firebase 是否已配置
    if (!isFirebaseConfigured()) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-white p-4">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Firebase 未配置</h2>
                    <p className="text-gray-600 mb-6">
                        請先設定 Firebase Realtime Database 才能使用廠商功能。
                    </p>
                    <p className="text-sm text-gray-500 mb-6">
                        請參考 FIREBASE_SETUP.md 或 README.md 瞭解如何設定。
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="bg-purple-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-purple-700 transition-colors"
                    >
                        返回首頁
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <>
            <UpdatePrompt />
            <div className="min-h-screen pb-20 bg-gradient-to-br from-purple-50 to-white print:bg-white">
                <div className="max-w-7xl mx-auto p-4 md:p-6">
                    {/* Header */}
                    <header className="mb-6 text-center relative print:hidden">
                        <button
                            onClick={() => navigate('/')}
                            className="absolute left-0 top-4 text-gray-600 hover:text-purple-600 transition-colors"
                        >
                            <i className="fa-solid fa-arrow-left text-xl"></i>
                        </button>
                        
                        <div className="flex justify-center items-center mb-4">
                            <img 
                                src="/wan_dong_logo.jpg" 
                                alt="丸東魚丸" 
                                className="h-20 md:h-24 w-auto object-contain"
                            />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">廠商管理後台</h1>
                        <p className="text-purple-600 font-medium">丸東魚丸</p>
                        <button
                            onClick={() => navigate('/products')}
                            className="mt-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-purple-600 transition-colors"
                        >
                            <i className="fa-solid fa-box-open"></i>
                            產品管理
                        </button>
                    </header>
                    
                    {/* 團購列表 */}
                    {!selectedGroupId && (
                        <div className="bg-white rounded-xl shadow-md p-6">
                            {/* 標籤切換 */}
                            <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
                                <button
                                    onClick={() => setActiveTab('draft')}
                                    className={`px-6 py-3 font-bold transition-all whitespace-nowrap ${
                                        activeTab === 'draft'
                                            ? 'text-yellow-600 border-b-2 border-yellow-600'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    <i className="fa-solid fa-pencil mr-2"></i>
                                    草稿預覽
                                    <span className={`ml-2 text-sm font-normal px-2 py-0.5 rounded-full ${
                                        activeTab === 'draft'
                                            ? 'bg-yellow-100 text-yellow-700'
                                            : 'bg-gray-100 text-gray-600'
                                    }`}>
                                        {draftGroups.length}
                                    </span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('active')}
                                    className={`px-6 py-3 font-bold transition-all whitespace-nowrap ${
                                        activeTab === 'active'
                                            ? 'text-purple-600 border-b-2 border-purple-600'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    <i className="fa-solid fa-clock mr-2"></i>
                                    待處理訂單
                                    <span className={`ml-2 text-sm font-normal px-2 py-0.5 rounded-full ${
                                        activeTab === 'active'
                                            ? 'bg-purple-100 text-purple-700'
                                            : 'bg-gray-100 text-gray-600'
                                    }`}>
                                        {allGroups.length}
                                    </span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('history')}
                                    className={`px-6 py-3 font-bold transition-all whitespace-nowrap ${
                                        activeTab === 'history'
                                            ? 'text-green-600 border-b-2 border-green-600'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    <i className="fa-solid fa-check-circle mr-2"></i>
                                    歷史記錄
                                    <span className={`ml-2 text-sm font-normal px-2 py-0.5 rounded-full ${
                                        activeTab === 'history'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-100 text-gray-600'
                                    }`}>
                                        {completedGroups.length}
                                    </span>
                                </button>
                            </div>
                            
                            {/* 批量操作工具欄 */}
                            {selectedGroupIds.length > 0 && (
                                <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 mb-6 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <span className="text-blue-800 font-bold">
                                            <i className="fa-solid fa-check-square mr-2"></i>
                                            已選擇 {selectedGroupIds.length} 個團購
                                        </span>
                                        <button
                                            onClick={() => setSelectedGroupIds([])}
                                            className="text-sm text-blue-600 hover:text-blue-800 underline"
                                        >
                                            取消全選
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => setShowStatsModal(true)}
                                        className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105"
                                    >
                                        <i className="fa-solid fa-chart-bar mr-2"></i>
                                        統計匯總
                                    </button>
                                </div>
                            )}
                            
                            {/* 草稿預覽列表 */}
                            {activeTab === 'draft' && (
                                <>
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-xl font-bold text-gray-800 flex items-center">
                                            <i className="fa-solid fa-pencil mr-2 text-yellow-600"></i>
                                            編輯中的團購（草稿預覽）
                                            <span className="ml-2 text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                                {draftGroups.filter(g => {
                                                    if (!hideEmptyOrders) return true;
                                                    const ordersCount = g.orders ? Object.keys(g.orders).length : 0;
                                                    const totalAmount = g.orders 
                                                        ? Object.values(g.orders).reduce((sum, order) => sum + (order.total || 0), 0)
                                                        : 0;
                                                    return ordersCount > 0 && totalAmount > 0;
                                                }).length} 筆
                                            </span>
                                        </h2>
                                        
                                        {/* 過濾開關 */}
                                        <label className="flex items-center cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={hideEmptyOrders}
                                                onChange={(e) => setHideEmptyOrders(e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                                            <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-gray-900">
                                                <i className="fa-solid fa-filter mr-1"></i>
                                                隱藏空訂單
                                            </span>
                                        </label>
                                    </div>
                                    
                                    {/* 提示說明 */}
                                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                                        <div className="flex">
                                            <i className="fa-solid fa-info-circle text-yellow-600 mt-1 mr-3"></i>
                                            <div>
                                                <p className="text-sm font-bold text-yellow-800 mb-1">💡 草稿預覽說明</p>
                                                <ul className="text-xs text-yellow-700 space-y-1">
                                                    <li>• 這些訂單為草稿狀態，團主尚未正式送單</li>
                                                    <li>• 僅供提前了解訂單內容，無法進行價格調整或確認操作</li>
                                                    <li>• 團主可能隨時修改或刪除草稿訂單</li>
                                                    <li>• 團主送單後，訂單會自動移至「待處理訂單」標籤</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                            
                                    {(() => {
                                        const filteredGroups = draftGroups.filter(g => {
                                            if (!hideEmptyOrders) return true;
                                            const ordersCount = g.orders ? Object.keys(g.orders).length : 0;
                                            const totalAmount = g.orders 
                                                ? Object.values(g.orders).reduce((sum, order) => sum + (order.total || 0), 0)
                                                : 0;
                                            return ordersCount > 0 && totalAmount > 0;
                                        });
                                        
                                        return filteredGroups.length === 0 ? (
                                            <div className="text-center py-12 text-gray-400">
                                                <i className="fa-solid fa-file-pen text-6xl mb-4"></i>
                                                <p className="text-lg">
                                                    {hideEmptyOrders 
                                                        ? '目前沒有有效的訂單'
                                                        : '目前沒有編輯中的訂單'}
                                                </p>
                                                <p className="text-sm mt-2">
                                                    {hideEmptyOrders 
                                                        ? '團主建立團購並新增團員後，訂單會顯示在這裡'
                                                        : '團主建立團購後，訂單會顯示在這裡'}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                                {filteredGroups.map(group => {
                                                    const ordersCount = group.orders ? Object.keys(group.orders).length : 0;
                                                    const totalAmount = group.orders 
                                                        ? Object.values(group.orders).reduce((sum, order) => sum + (order.total || 0), 0)
                                                        : 0;
                                                    
                                                    const isSelected = selectedGroupIds.includes(group.id);
                                                    
                                                    return (
                                                    <div 
                                                        key={group.id}
                                                        className={`border-2 rounded-xl p-4 hover:shadow-lg transition-all relative ${
                                                            isSelected 
                                                                ? 'border-blue-400 bg-blue-50' 
                                                                : 'border-yellow-200 bg-gradient-to-br from-yellow-50 to-white hover:border-yellow-400'
                                                        }`}
                                                    >
                                                        {/* 勾選框 */}
                                                        <div 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleGroupSelection(group.id);
                                                            }}
                                                            className="absolute top-3 left-3 z-10"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => {}}
                                                                className="w-5 h-5 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                            />
                                                        </div>
                                                        
                                                        <div 
                                                            onClick={() => setSelectedGroupId(group.id)}
                                                            className="cursor-pointer pl-8"
                                                        >
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div>
                                                                <h3 className="font-bold text-lg text-gray-800">
                                                                    {group.info?.name || '未命名團購'}
                                                                </h3>
                                                                <p className="text-xs text-gray-500">
                                                                    代碼：{group.id}
                                                                </p>
                                                            </div>
                                                            <div className="flex flex-col gap-1">
                                                                <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">
                                                                    📝 編輯中
                                                                </span>
                                                                {group.info?.status === 'closed' && (
                                                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                                        已關閉
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="space-y-2 text-sm">
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">📅 結單日期：</span>
                                                                <span className="font-medium">{group.info?.date}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">👥 訂購人數：</span>
                                                                <span className="font-bold text-blue-600">{ordersCount} 人</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">💰 目前金額：</span>
                                                                <span className="font-bold text-red-600">${totalAmount.toLocaleString()}</span>
                                                            </div>
                                                            {group.info?.leaderNotes && (
                                                                <div className="pt-2 border-t border-yellow-200">
                                                                    <p className="text-xs text-gray-600">
                                                                        <i className="fa-solid fa-comment-dots mr-1"></i>
                                                                        {group.info.leaderNotes.substring(0, 30)}{group.info.leaderNotes.length > 30 ? '...' : ''}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                        
                                                        <div className="mt-3 pt-3 border-t border-yellow-200 text-xs text-yellow-600 flex items-center">
                                                            <i className="fa-solid fa-clock mr-1"></i>
                                                            點擊查看詳情（唯讀模式）
                                                        </div>
                                                        </div>
                                                    </div>
                                                );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </>
                            )}
                            
                            {/* 待處理訂單列表 */}
                            {activeTab === 'active' && (
                                <>
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-xl font-bold text-gray-800 flex items-center">
                                            <i className="fa-solid fa-list mr-2 text-purple-600"></i>
                                            待處理的團購訂單
                                            <span className="ml-2 text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                                {allGroups.filter(g => {
                                                    if (!hideEmptyOrders) return true;
                                                    const ordersCount = g.orders ? Object.keys(g.orders).length : 0;
                                                    const totalAmount = g.orders 
                                                        ? Object.values(g.orders).reduce((sum, order) => sum + (order.total || 0), 0)
                                                        : 0;
                                                    return ordersCount > 0 && totalAmount > 0;
                                                }).length} 筆
                                            </span>
                                        </h2>
                                        
                                        {/* 過濾開關 */}
                                        <label className="flex items-center cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={hideEmptyOrders}
                                                onChange={(e) => setHideEmptyOrders(e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                                            <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-gray-900">
                                                <i className="fa-solid fa-filter mr-1"></i>
                                                隱藏空訂單
                                            </span>
                                        </label>
                                    </div>
                            
                                    {(() => {
                                        const filteredGroups = allGroups.filter(g => {
                                            if (!hideEmptyOrders) return true;
                                            const ordersCount = g.orders ? Object.keys(g.orders).length : 0;
                                            const totalAmount = g.orders 
                                                ? Object.values(g.orders).reduce((sum, order) => sum + (order.total || 0), 0)
                                                : 0;
                                            return ordersCount > 0 && totalAmount > 0;
                                        });
                                        
                                        return filteredGroups.length === 0 ? (
                                            <div className="text-center py-12 text-gray-400">
                                                <i className="fa-solid fa-inbox text-6xl mb-4"></i>
                                                <p className="text-lg">
                                                    {hideEmptyOrders 
                                                        ? '目前沒有有效的訂單'
                                                        : '目前沒有待處理的訂單'}
                                                </p>
                                                <p className="text-sm mt-2">團主送單後，訂單會顯示在這裡</p>
                                            </div>
                                        ) : (
                                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                                {filteredGroups.map(group => {
                                                const ordersCount = group.orders ? Object.keys(group.orders).length : 0;
                                                const totalAmount = group.orders 
                                                    ? Object.values(group.orders).reduce((sum, order) => sum + (order.total || 0), 0)
                                                    : 0;
                                                const isSelected = selectedGroupIds.includes(group.id);
                                                
                                                return (
                                                    <div 
                                                        key={group.id}
                                                        className={`border-2 rounded-xl p-4 hover:shadow-lg transition-all relative ${
                                                            isSelected 
                                                                ? 'border-blue-400 bg-blue-50' 
                                                                : 'border-gray-200 bg-white hover:border-purple-400'
                                                        }`}
                                                    >
                                                        {/* 勾選框 */}
                                                        <div 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleGroupSelection(group.id);
                                                            }}
                                                            className="absolute top-3 left-3 z-10"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => {}}
                                                                className="w-5 h-5 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                            />
                                                        </div>
                                                        
                                                        <div 
                                                            onClick={() => setSelectedGroupId(group.id)}
                                                            className="cursor-pointer pl-8"
                                                        >
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div>
                                                                <h3 className="font-bold text-lg text-gray-800">
                                                                    {group.info?.name || '未命名團購'}
                                                                </h3>
                                                                <p className="text-xs text-gray-500">
                                                                    代碼：{group.id}
                                                                </p>
                                                            </div>
                                                            <div className="flex flex-col gap-1">
                                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                                    group.info?.orderStatus === 'submitted' 
                                                                        ? 'bg-yellow-100 text-yellow-700'
                                                                        : 'bg-green-100 text-green-700'
                                                                }`}>
                                                                    {group.info?.orderStatus === 'submitted' ? '⏳ 待確認' : '✅ 已確認'}
                                                                </span>
                                                                {group.info?.status === 'closed' && (
                                                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                                        已關閉
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="space-y-1 text-sm text-gray-600 mb-3">
                                                            <p>📅 日期：{group.info?.date || '-'}</p>
                                                            <p>📍 地點：{group.info?.location || '-'}</p>
                                                            <p>📞 電話：{group.info?.phone || '-'}</p>
                                                        </div>
                                                        
                                                        <div className="flex justify-between items-center pt-3 border-t">
                                                            <div className="text-sm text-gray-600">
                                                                {ordersCount} 筆訂單
                                                            </div>
                                                            <div className="text-lg font-bold text-purple-600">
                                                                ${totalAmount.toLocaleString()}
                                                            </div>
                                                        </div>
                                                        </div>
                                                    </div>
                                                );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </>
                            )}
                            
                            {/* 歷史訂單列表 */}
                            {activeTab === 'history' && (
                                <>
                                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                                        <i className="fa-solid fa-history mr-2 text-green-600"></i>
                                        已完成的訂單
                                        <span className="ml-2 text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                            {completedGroups.length} 筆
                                        </span>
                                    </h2>
                                    
                                    {completedGroups.length === 0 ? (
                                        <div className="text-center py-12 text-gray-400">
                                            <i className="fa-solid fa-archive text-6xl mb-4"></i>
                                            <p className="text-lg">目前沒有已完成的訂單</p>
                                            <p className="text-sm mt-2">完成的訂單會保存在這裡</p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                            {completedGroups.map(group => {
                                                const ordersCount = group.orders ? Object.keys(group.orders).length : 0;
                                                const totalAmount = group.orders 
                                                    ? Object.values(group.orders).reduce((sum, order) => sum + (order.total || 0), 0)
                                                    : 0;
                                                const completedDate = group.info?.completedAt 
                                                    ? new Date(group.info.completedAt).toLocaleDateString('zh-TW')
                                                    : '-';
                                                
                                                return (
                                                    <div 
                                                        key={group.id}
                                                        onClick={() => setSelectedGroupId(group.id)}
                                                        className="border-2 border-green-200 bg-green-50 rounded-xl p-4 hover:border-green-400 hover:shadow-lg transition-all cursor-pointer"
                                                    >
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div>
                                                                <h3 className="font-bold text-lg text-gray-800">
                                                                    {group.info?.name || '未命名團購'}
                                                                </h3>
                                                                <p className="text-xs text-gray-500">
                                                                    代碼：{group.id}
                                                                </p>
                                                            </div>
                                                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                                                ✅ 已完成
                                                            </span>
                                                        </div>
                                                        
                                                        <div className="space-y-1 text-sm text-gray-600 mb-3">
                                                            <p>📅 結單日期：{group.info?.date || '-'}</p>
                                                            <p>✅ 完成日期：{completedDate}</p>
                                                            <p>📍 地點：{group.info?.location || '-'}</p>
                                                            <p>📞 電話：{group.info?.phone || '-'}</p>
                                                        </div>
                                                        
                                                        <div className="flex justify-between items-center pt-3 border-t border-green-200">
                                                            <div className="text-sm text-gray-600">
                                                                {ordersCount} 筆訂單
                                                            </div>
                                                            <div className="text-lg font-bold text-green-600">
                                                                ${totalAmount.toLocaleString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                    
                    {/* 團購詳情 */}
                    {selectedGroupId && groupData && (
                        <>
                            {/* 返回按鈕 */}
                            <button
                                onClick={() => setSelectedGroupId(null)}
                                className="mb-4 text-purple-600 hover:text-purple-700 font-medium print:hidden"
                            >
                                <i className="fa-solid fa-arrow-left mr-2"></i>
                                返回團購列表
                            </button>
                            
                            {/* 已完成標籤 */}
                            {groupData.info?.status === 'completed' && (
                                <div className="bg-green-100 border-2 border-green-300 rounded-xl p-4 mb-6 print:hidden">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-bold text-lg text-green-800 mb-1">
                                                ✅ 此訂單已完成
                                            </h3>
                                            <p className="text-sm text-green-700">
                                                完成時間：{groupData.info?.completedAt 
                                                    ? new Date(groupData.info.completedAt).toLocaleString('zh-TW')
                                                    : '-'}
                                            </p>
                                        </div>
                                        <span className="text-4xl">🎉</span>
                                    </div>
                                </div>
                            )}
                            
                            {/* 草稿狀態提示 */}
                            {groupData.info?.orderStatus === 'draft' && (
                                <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 mb-6 text-white print:hidden">
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0">
                                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                                                <i className="fa-solid fa-pencil text-3xl"></i>
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-2xl mb-2">📝 此訂單為草稿狀態（編輯中）</h3>
                                            <div className="space-y-2 text-yellow-100 text-sm">
                                                <p>• <strong>團主尚未正式送單</strong>，訂單內容可能隨時變更</p>
                                                <p>• 此頁面為<strong>唯讀預覽模式</strong>，無法進行任何操作</p>
                                                <p>• 團主送單後，訂單會自動移至「待處理訂單」標籤</p>
                                                <p>• 建議：可提前了解訂單內容，但請勿依此備貨</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-yellow-400/30 flex items-center justify-between">
                                        <div className="text-sm text-yellow-100">
                                            <i className="fa-solid fa-clock mr-2"></i>
                                            最後更新：{groupData.info?.updatedAt 
                                                ? new Date(groupData.info.updatedAt).toLocaleString('zh-TW')
                                                : new Date(groupData.info?.createdAt).toLocaleString('zh-TW')}
                                        </div>
                                        <div className="text-yellow-100 text-sm font-medium">
                                            僅供預覽參考
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {/* 團購資訊 */}
                            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <h2 className="text-2xl font-bold text-gray-800 mb-2">
                                            {groupData.info?.name || '未命名團購'}
                                        </h2>
                                        <div className="space-y-1 text-sm text-gray-600">
                                            <p>📅 結單日期：{groupData.info?.date}</p>
                                            <p>📍 取貨地點：{groupData.info?.location || '未設定'}</p>
                                            <p>📞 聯絡電話：{groupData.info?.phone || '未設定'}</p>
                                            <p>🔑 團購代碼：<span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{selectedGroupId}</span></p>
                                        </div>
                                        
                                        {/* 團主備註 */}
                                        {groupData.info?.leaderNotes && (
                                            <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                                                <div className="flex items-start">
                                                    <i className="fa-solid fa-comment-dots text-blue-600 mt-0.5 mr-2"></i>
                                                    <div className="flex-1">
                                                        <p className="text-xs font-bold text-blue-800 mb-1">團主備註</p>
                                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{groupData.info.leaderNotes}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={handlePrint}
                                        className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 transition-colors print:hidden ml-4 flex-shrink-0"
                                    >
                                        <i className="fa-solid fa-print mr-2"></i>
                                        列印
                                    </button>
                                </div>
                            </div>
                            
                            {/* 出貨狀態 */}
                            {groupData.info?.status !== 'completed' && groupData.info?.orderStatus !== 'draft' && (
                                <div className="bg-white rounded-xl shadow-md p-6 mb-6 print:hidden">
                                    <h3 className="font-bold text-lg mb-3 text-gray-800">出貨狀態</h3>
                                    <div className="flex gap-2 flex-wrap">
                                        {['pending', 'preparing', 'shipped', 'delivered'].map(status => {
                                        const labels = {
                                            pending: '待處理',
                                            preparing: '準備中',
                                            shipped: '已出貨',
                                            delivered: '已送達'
                                        };
                                        const colors = {
                                            pending: 'bg-gray-200 text-gray-700',
                                            preparing: 'bg-yellow-100 text-yellow-700',
                                            shipped: 'bg-blue-100 text-blue-700',
                                            delivered: 'bg-green-100 text-green-700'
                                        };
                                        
                                        return (
                                            <button
                                                key={status}
                                                onClick={() => handleStatusChange(status)}
                                                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                                    shippingStatus === status 
                                                        ? colors[status] + ' ring-2 ring-offset-2'
                                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                }`}
                                            >
                                                {labels[status]}
                                            </button>
                                        );
                                    })}
                                    </div>
                                </div>
                            )}
                            
                            {/* 產品統計與價格調整 */}
                            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                                <h3 className="font-bold text-lg mb-4 text-gray-800">
                                    產品統計與價格
                                    {(groupData.info?.status === 'completed' || groupData.info?.orderStatus === 'draft') && (
                                        <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                            唯讀
                                        </span>
                                    )}
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-purple-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left">產品名稱</th>
                                                <th className="px-4 py-3 text-center">原價</th>
                                                <th className="px-4 py-3 text-center">調整價</th>
                                                <th className="px-4 py-3 text-center">數量</th>
                                                <th className="px-4 py-3 text-right">小計</th>
                                                {groupData.info?.status !== 'completed' && groupData.info?.orderStatus !== 'draft' && (
                                                    <th className="px-4 py-3 text-center print:hidden">操作</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {PRODUCTS.map(p => {
                                                const actualPrice = getActualPrice(p.id, priceAdjustments, PRODUCTS);
                                                const isAdjusted = actualPrice !== p.price;
                                                const stat = stats[p.id] || { quantity: 0, amount: 0 };
                                                
                                                return (
                                                    <tr key={p.id} className="border-b hover:bg-gray-50">
                                                        <td className="px-4 py-3 font-medium">{p.name}</td>
                                                        <td className="px-4 py-3 text-center text-gray-500">
                                                            ${p.price} / {p.unit}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={`font-bold ${isAdjusted ? 'text-red-600' : 'text-gray-400'}`}>
                                                                ${actualPrice}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-bold text-blue-600">
                                                            {stat.quantity}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold">
                                                            ${stat.amount.toLocaleString()}
                                                        </td>
                                                        {groupData.info?.status !== 'completed' && groupData.info?.orderStatus !== 'draft' && (
                                                            <td className="px-4 py-3 text-center print:hidden">
                                                                <button
                                                                    onClick={() => handlePriceAdjust(p.id)}
                                                                    className="text-purple-600 hover:text-purple-700 font-medium text-xs"
                                                                >
                                                                    調整價格
                                                                </button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                            <tr className="bg-purple-100 font-bold text-lg">
                                                <td colSpan="4" className="px-4 py-3 text-right">總計</td>
                                                <td className="px-4 py-3 text-right text-purple-700">
                                                    ${grandTotal.toLocaleString()}
                                                </td>
                                                {groupData.info?.status !== 'completed' && (
                                                    <td className="print:hidden"></td>
                                                )}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            {/* 訂單明細 */}
                            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                                <h3 className="font-bold text-lg mb-4 text-gray-800">
                                    訂單明細
                                    <span className="ml-2 text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                        {orders.length} 筆
                                    </span>
                                </h3>
                                
                                <div className="space-y-3">
                                    {orders.map((order, index) => (
                                        <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="font-bold text-gray-800">
                                                    #{index + 1} {order.memberName || '未命名'}
                                                </div>
                                                <div className="text-red-600 font-bold">
                                                    ${order.total || 0}
                                                </div>
                                            </div>
                                            <div className="text-sm text-gray-600 space-x-2">
                                                {Object.entries(order.items || {})
                                                    .filter(([_, qty]) => qty > 0)
                                                    .map(([productId, qty]) => {
                                                        const product = PRODUCTS.find(p => p.id === parseInt(productId));
                                                        const price = getActualPrice(parseInt(productId), priceAdjustments, PRODUCTS);
                                                        return product ? (
                                                            <span key={productId} className="inline-block bg-gray-100 px-2 py-1 rounded">
                                                                {product.name} x{qty} (${price * qty})
                                                            </span>
                                                        ) : null;
                                                    })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* 訂單狀態管理 */}
                            {groupData.info?.status !== 'completed' && groupData.info?.orderStatus === 'submitted' && (
                                <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 mb-6 text-white print:hidden">
                                    <h3 className="font-bold text-xl mb-2">⏳ 待確認收單</h3>
                                    <p className="text-yellow-100 mb-4">團主已送出訂單，請確認後點擊下方按鈕</p>
                                    <button
                                        onClick={handleConfirmOrder}
                                        className="bg-white text-yellow-600 px-8 py-3 rounded-lg font-bold shadow-md hover:bg-yellow-50 transition-all transform hover:scale-105 text-lg"
                                    >
                                        ✅ 確認收單（訂單成立）
                                    </button>
                                </div>
                            )}
                            
                            {groupData.info?.status !== 'completed' && groupData.info?.orderStatus === 'confirmed' && (
                                <div className="bg-green-50 border-2 border-green-300 rounded-xl p-5 mb-6 print:hidden">
                                    <div className="flex items-center justify-between">
                                        <div className="text-left">
                                            <h3 className="font-bold text-lg text-green-800 mb-2">✅ 訂單已確認成立</h3>
                                            <p className="text-sm text-green-700">此訂單已確認收單，請準備出貨</p>
                                        </div>
                                        <button
                                            onClick={handleCancelConfirmation}
                                            className="bg-white border-2 border-orange-400 text-orange-600 px-6 py-3 rounded-lg font-bold hover:bg-orange-50 transition-colors whitespace-nowrap"
                                        >
                                            🔓 取消確認
                                        </button>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-green-200">
                                        <p className="text-xs text-green-600 text-left">
                                            <i className="fa-solid fa-info-circle mr-1"></i>
                                            取消確認後，團員可以修改訂單，訂單狀態將改回「已送單」
                                        </p>
                                    </div>
                                </div>
                            )}
                            
                            {/* 備註 */}
                            {groupData.info?.orderStatus !== 'draft' && (
                                <div className="bg-white rounded-xl shadow-md p-6 mb-6 print:hidden">
                                    <h3 className="font-bold text-lg mb-3 text-gray-800">
                                        廠商備註
                                        {groupData.info?.status === 'completed' && (
                                            <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                                唯讀
                                            </span>
                                        )}
                                    </h3>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder={groupData.info?.status === 'completed' ? '無備註' : '輸入備註，例如：需要冷藏包裝、特殊處理事項等...'}
                                        disabled={groupData.info?.status === 'completed'}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                                        rows="4"
                                    />
                                    {groupData.info?.status !== 'completed' && (
                                        <button
                                            onClick={handleNotesUpdate}
                                            className="mt-3 bg-purple-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-purple-700 transition-colors"
                                        >
                                        儲存備註
                                    </button>
                                    )}
                                </div>
                            )}
                            
                            {/* 完成按鈕（只有已確認的訂單才能完成） */}
                            {groupData.info?.orderStatus === 'confirmed' && (
                                <div className="text-center print:hidden">
                                    <button
                                        onClick={handleComplete}
                                        className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700 transition-colors"
                                    >
                                        <i className="fa-solid fa-check mr-2"></i>
                                        標記為已完成
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
            
            {/* 統計視窗 */}
            {showStatsModal && (() => {
                const stats = calculateBatchStats();
                
                return (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowStatsModal(false)}>
                        <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            {/* 標題列 */}
                            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold mb-1">
                                        <i className="fa-solid fa-chart-bar mr-2"></i>
                                        團購統計匯總
                                    </h2>
                                    <p className="text-blue-100 text-sm">已選擇 {selectedGroupIds.length} 個團購</p>
                                </div>
                                <button
                                    onClick={() => setShowStatsModal(false)}
                                    className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center"
                                >
                                    <i className="fa-solid fa-times text-xl"></i>
                                </button>
                            </div>
                            
                            {/* 內容區 */}
                            <div className="p-6 overflow-y-auto" style={{maxHeight: 'calc(90vh - 180px)'}}>
                                {/* 總覽卡片 */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-xl p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-green-600 text-sm font-medium mb-1">總金額</p>
                                                <p className="text-4xl font-bold text-green-700">${stats.totalAmount.toLocaleString()}</p>
                                            </div>
                                            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                                                <i className="fa-solid fa-dollar-sign text-white text-2xl"></i>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 rounded-xl p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-purple-600 text-sm font-medium mb-1">團購數量</p>
                                                <p className="text-4xl font-bold text-purple-700">{stats.leaderStats.length} 個</p>
                                            </div>
                                            <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center">
                                                <i className="fa-solid fa-users text-white text-2xl"></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* 產品統計 */}
                                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
                                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                                        <i className="fa-solid fa-box mr-2 text-blue-600"></i>
                                        產品統計
                                    </h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-blue-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left font-bold text-gray-700">產品名稱</th>
                                                    <th className="px-4 py-3 text-center font-bold text-gray-700">數量</th>
                                                    <th className="px-4 py-3 text-right font-bold text-gray-700">小計金額</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Object.values(stats.productStats)
                                                    .filter(p => p.quantity > 0)
                                                    .map(product => (
                                                        <tr key={product.id} className="border-b hover:bg-gray-50">
                                                            <td className="px-4 py-3 font-medium">{product.name}</td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold">
                                                                    {product.quantity} {product.unit}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-bold text-gray-700">
                                                                ${product.amount.toLocaleString()}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                <tr className="bg-green-50 font-bold">
                                                    <td className="px-4 py-3">總計</td>
                                                    <td className="px-4 py-3 text-center text-blue-700">
                                                        {Object.values(stats.productStats).reduce((sum, p) => sum + p.quantity, 0)} 項
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-green-700 text-lg">
                                                        ${stats.totalAmount.toLocaleString()}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                
                                {/* 各團主明細 */}
                                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                                        <i className="fa-solid fa-user-tie mr-2 text-purple-600"></i>
                                        各團主明細
                                    </h3>
                                    <div className="space-y-4">
                                        {stats.leaderStats.map((leader, index) => (
                                            <div key={leader.groupId} className="border-2 border-gray-200 rounded-xl p-4 hover:border-purple-300 transition-all">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-bold">
                                                                #{index + 1}
                                                            </span>
                                                            <h4 className="font-bold text-lg text-gray-800">{leader.name}</h4>
                                                        </div>
                                                        <p className="text-xs text-gray-500">
                                                            代碼：{leader.groupId} | 日期：{leader.date}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-gray-500 mb-1">總金額</p>
                                                        <p className="text-2xl font-bold text-purple-600">${leader.total.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-3 border-t border-gray-200">
                                                    {Object.entries(leader.productStats)
                                                        .filter(([_, qty]) => qty > 0)
                                                        .map(([productId, qty]) => {
                                                            const product = PRODUCTS.find(p => p.id === parseInt(productId));
                                                            return (
                                                                <div key={productId} className="bg-gray-50 rounded-lg p-2">
                                                                    <p className="text-xs text-gray-600">{product?.name}</p>
                                                                    <p className="font-bold text-blue-600">{qty} {product?.unit}</p>
                                                                </div>
                                                            );
                                                        })}
                                                </div>
                                                
                                                <div className="mt-2 text-xs text-gray-500">
                                                    訂購人數：{leader.ordersCount} 人
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            {/* 底部按鈕 */}
                            <div className="bg-gray-50 border-t border-gray-200 p-4 flex justify-end gap-3">
                                <button
                                    onClick={() => window.print()}
                                    className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                                >
                                    <i className="fa-solid fa-print mr-2"></i>
                                    列印
                                </button>
                                <button
                                    onClick={() => setShowStatsModal(false)}
                                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors"
                                >
                                    關閉
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </>
    );
}

export default VendorView;

