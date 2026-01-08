import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, onValue, off } from 'firebase/database';
import { db } from '../config/firebase';
import { PRODUCTS } from '../utils/constants';
import { adjustPrice, updateShippingStatus, updateVendorNotes, completeGroup } from '../utils/firebase';
import { getActualPrice } from '../utils/firebase';
import UpdatePrompt from '../components/UpdatePrompt';

function VendorView() {
    const { groupId: urlGroupId } = useParams();
    const navigate = useNavigate();
    
    // State
    const [selectedGroupId, setSelectedGroupId] = useState(urlGroupId || null);
    const [allGroups, setAllGroups] = useState([]);
    const [groupData, setGroupData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [priceAdjustments, setPriceAdjustments] = useState({});
    const [shippingStatus, setShippingStatus] = useState('pending');
    const [notes, setNotes] = useState('');
    
    // 載入所有團購
    useEffect(() => {
        const groupsRef = ref(db, 'groups');
        const unsubscribe = onValue(groupsRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const groupsList = Object.entries(data).map(([id, group]) => ({
                    id,
                    ...group
                }));
                // 只顯示進行中的團購
                const activeGroups = groupsList.filter(g => g.info?.status !== 'completed');
                setAllGroups(activeGroups.sort((a, b) => (b.info?.createdAt || 0) - (a.info?.createdAt || 0)));
            } else {
                setAllGroups([]);
            }
            setLoading(false);
        });
        
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
                    const price = getActualPrice(id, priceAdjustments);
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
                    </header>
                    
                    {/* 團購列表 */}
                    {!selectedGroupId && (
                        <div className="bg-white rounded-xl shadow-md p-6">
                            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                                <i className="fa-solid fa-list mr-2 text-purple-600"></i>
                                進行中的團購
                                <span className="ml-2 text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                    {allGroups.length} 筆
                                </span>
                            </h2>
                            
                            {allGroups.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <i className="fa-solid fa-inbox text-6xl mb-4"></i>
                                    <p className="text-lg">目前沒有進行中的團購</p>
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {allGroups.map(group => {
                                        const ordersCount = group.orders ? Object.keys(group.orders).length : 0;
                                        const totalAmount = group.orders 
                                            ? Object.values(group.orders).reduce((sum, order) => sum + (order.total || 0), 0)
                                            : 0;
                                        
                                        return (
                                            <div 
                                                key={group.id}
                                                onClick={() => setSelectedGroupId(group.id)}
                                                className="border-2 border-gray-200 rounded-xl p-4 hover:border-purple-400 hover:shadow-lg transition-all cursor-pointer bg-white"
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
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                        group.info?.status === 'closed' 
                                                            ? 'bg-red-100 text-red-700'
                                                            : 'bg-green-100 text-green-700'
                                                    }`}>
                                                        {group.info?.status === 'closed' ? '已關閉' : '進行中'}
                                                    </span>
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
                                        );
                                    })}
                                </div>
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
                            
                            {/* 團購資訊 */}
                            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-800 mb-2">
                                            {groupData.info?.name || '未命名團購'}
                                        </h2>
                                        <div className="space-y-1 text-sm text-gray-600">
                                            <p>📅 結單日期：{groupData.info?.date}</p>
                                            <p>📍 取貨地點：{groupData.info?.location || '未設定'}</p>
                                            <p>📞 聯絡電話：{groupData.info?.phone || '未設定'}</p>
                                            <p>🔑 團購代碼：<span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{selectedGroupId}</span></p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handlePrint}
                                        className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 transition-colors print:hidden"
                                    >
                                        <i className="fa-solid fa-print mr-2"></i>
                                        列印
                                    </button>
                                </div>
                            </div>
                            
                            {/* 出貨狀態 */}
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
                            
                            {/* 產品統計與價格調整 */}
                            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                                <h3 className="font-bold text-lg mb-4 text-gray-800">產品統計與價格</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-purple-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left">產品名稱</th>
                                                <th className="px-4 py-3 text-center">原價</th>
                                                <th className="px-4 py-3 text-center">調整價</th>
                                                <th className="px-4 py-3 text-center">數量</th>
                                                <th className="px-4 py-3 text-right">小計</th>
                                                <th className="px-4 py-3 text-center print:hidden">操作</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {PRODUCTS.map(p => {
                                                const actualPrice = getActualPrice(p.id, priceAdjustments);
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
                                                        <td className="px-4 py-3 text-center print:hidden">
                                                            <button
                                                                onClick={() => handlePriceAdjust(p.id)}
                                                                className="text-purple-600 hover:text-purple-700 font-medium text-xs"
                                                            >
                                                                調整價格
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            <tr className="bg-purple-100 font-bold text-lg">
                                                <td colSpan="4" className="px-4 py-3 text-right">總計</td>
                                                <td className="px-4 py-3 text-right text-purple-700">
                                                    ${grandTotal.toLocaleString()}
                                                </td>
                                                <td className="print:hidden"></td>
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
                                                        const price = getActualPrice(parseInt(productId), priceAdjustments);
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
                            
                            {/* 備註 */}
                            <div className="bg-white rounded-xl shadow-md p-6 mb-6 print:hidden">
                                <h3 className="font-bold text-lg mb-3 text-gray-800">廠商備註</h3>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="輸入備註，例如：需要冷藏包裝、特殊處理事項等..."
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none"
                                    rows="4"
                                />
                                <button
                                    onClick={handleNotesUpdate}
                                    className="mt-3 bg-purple-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-purple-700 transition-colors"
                                >
                                    儲存備註
                                </button>
                            </div>
                            
                            {/* 完成按鈕 */}
                            <div className="text-center print:hidden">
                                <button
                                    onClick={handleComplete}
                                    className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700 transition-colors"
                                >
                                    <i className="fa-solid fa-check mr-2"></i>
                                    標記為已完成
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

export default VendorView;

