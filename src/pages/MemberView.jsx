import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PRODUCTS } from '../utils/constants';
import { useGroupInfo, useOrders, useVendorNotes } from '../hooks/useFirebaseGroup';
import { saveOrder } from '../utils/firebase';
import { getActualPrice } from '../utils/firebase';
import UpdatePrompt from '../components/UpdatePrompt';

function MemberView() {
    const { groupId } = useParams();
    const navigate = useNavigate();
    
    // Firebase hooks
    const { groupInfo, loading: infoLoading, error: infoError } = useGroupInfo(groupId);
    const { orders: fbOrders, loading: ordersLoading } = useOrders(groupId);
    const { vendorNotes } = useVendorNotes(groupId);
    
    // Local state
    const [memberName, setMemberName] = useState('');
    const [items, setItems] = useState({});
    const [myOrderId, setMyOrderId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    
    // 將 Firebase 訂單物件轉換為陣列
    const orders = Object.entries(fbOrders || {}).map(([id, data]) => ({
        id,
        ...data
    }));
    
    // 從 localStorage 載入我的訂單 ID
    useEffect(() => {
        const savedOrderId = localStorage.getItem(`member_order_${groupId}`);
        if (savedOrderId && fbOrders && fbOrders[savedOrderId]) {
            setMyOrderId(savedOrderId);
            const myOrder = fbOrders[savedOrderId];
            setMemberName(myOrder.memberName || '');
            setItems(myOrder.items || {});
        }
    }, [groupId, fbOrders]);
    
    // 計算總金額
    const calculateTotal = () => {
        let total = 0;
        Object.entries(items).forEach(([productId, qty]) => {
            const price = getActualPrice(parseInt(productId), vendorNotes?.priceAdjustments);
            total += price * qty;
        });
        return total;
    };
    
    const total = calculateTotal();
    
    // 處理載入和錯誤狀態
    if (infoLoading || ordersLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">載入中...</p>
                </div>
            </div>
        );
    }
    
    if (infoError) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
                    <div className="text-6xl mb-4">😕</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">找不到團購</h2>
                    <p className="text-gray-600 mb-6">{infoError}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors"
                    >
                        返回首頁
                    </button>
                </div>
            </div>
        );
    }
    
    const isClosed = groupInfo?.status === 'closed' || groupInfo?.status === 'completed';
    
    // 更新數量
    const updateQuantity = (productId, delta) => {
        const currentQty = items[productId] || 0;
        let newQty = currentQty + delta;
        if (newQty < 0) newQty = 0;
        
        setItems(prev => ({
            ...prev,
            [productId]: newQty
        }));
    };
    
    // 儲存訂單
    const handleSaveOrder = async () => {
        if (!memberName.trim()) {
            alert('請輸入您的姓名');
            return;
        }
        
        if (isClosed) {
            alert('此團購已關閉，無法修改訂單');
            return;
        }
        
        setIsSaving(true);
        
        try {
            const orderData = {
                memberName: memberName.trim(),
                items,
                total
            };
            
            const orderId = await saveOrder(groupId, myOrderId, orderData);
            
            // 儲存訂單 ID 到 localStorage
            if (!myOrderId) {
                setMyOrderId(orderId);
                localStorage.setItem(`member_order_${groupId}`, orderId);
            }
            
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (error) {
            console.error('儲存訂單失敗:', error);
            alert('儲存失敗：' + error.message);
        } finally {
            setIsSaving(false);
        }
    };
    
    // 計算其他團員的總訂購量
    const getProductStats = () => {
        const stats = {};
        PRODUCTS.forEach(p => {
            stats[p.id] = 0;
        });
        
        orders.forEach(order => {
            if (order.id !== myOrderId) {
                Object.entries(order.items || {}).forEach(([pId, qty]) => {
                    if (stats[parseInt(pId)] !== undefined) {
                        stats[parseInt(pId)] += qty;
                    }
                });
            }
        });
        
        return stats;
    };
    
    const productStats = getProductStats();
    const otherMembersCount = orders.filter(o => o.id !== myOrderId).length;
    
    return (
        <>
            <UpdatePrompt />
            <div className="min-h-screen pb-20 bg-gradient-to-br from-blue-50 to-white">
                <div className="max-w-2xl mx-auto p-4 md:p-6">
                    {/* Header */}
                    <header className="mb-6 text-center relative">
                        <button
                            onClick={() => navigate('/')}
                            className="absolute left-0 top-4 text-gray-600 hover:text-blue-600 transition-colors"
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
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">團員填單</h1>
                        <p className="text-gray-600 text-sm">
                            團主：{groupInfo?.name || '(未設定)'} · 
                            日期：{groupInfo?.date}
                        </p>
                        {isClosed && (
                            <div className="mt-2 inline-block bg-red-100 text-red-700 px-4 py-2 rounded-lg font-bold text-sm">
                                ⚠️ 此團購已關閉
                            </div>
                        )}
                    </header>
                    
                    {/* 成功提示 */}
                    {showSuccess && (
                        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
                            <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
                                <i className="fa-solid fa-check-circle"></i>
                                <span className="font-bold">訂單已儲存！</span>
                            </div>
                        </div>
                    )}
                    
                    {/* 姓名輸入 */}
                    <div className="bg-white rounded-xl shadow-md p-5 mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            您的姓名 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={memberName}
                            onChange={(e) => setMemberName(e.target.value)}
                            placeholder="請輸入您的姓名"
                            disabled={isClosed}
                            className="w-full bg-gray-50 border-2 border-gray-200 rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all disabled:opacity-50"
                        />
                    </div>
                    
                    {/* 產品選擇 */}
                    <div className="bg-white rounded-xl shadow-md p-5 mb-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                            <i className="fa-solid fa-shopping-cart mr-2 text-blue-600"></i>
                            選擇產品
                        </h2>
                        
                        <div className="space-y-4">
                            {PRODUCTS.map(p => {
                                const qty = items[p.id] || 0;
                                const actualPrice = getActualPrice(p.id, vendorNotes?.priceAdjustments);
                                const isAdjusted = actualPrice !== p.price;
                                const isActive = qty > 0;
                                const othersQty = productStats[p.id] || 0;
                                
                                return (
                                    <div 
                                        key={p.id} 
                                        className={`border-2 rounded-xl p-4 transition-all ${
                                            isActive 
                                                ? 'border-blue-400 bg-blue-50 shadow-md' 
                                                : 'border-gray-200 bg-white'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className={`text-lg font-bold ${isActive ? 'text-blue-800' : 'text-gray-800'}`}>
                                                        {p.name}
                                                    </h3>
                                                    {othersQty > 0 && (
                                                        <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-medium">
                                                            其他人已訂 {othersQty}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-gray-600 mt-1">
                                                    {isAdjusted ? (
                                                        <span>
                                                            <span className="line-through text-gray-400">${p.price}</span>
                                                            <span className="text-red-600 font-bold ml-1">${actualPrice}</span> / {p.unit}
                                                        </span>
                                                    ) : (
                                                        `$${p.price} / ${p.unit}`
                                                    )}
                                                </div>
                                            </div>
                                            {isActive && (
                                                <div className="text-right">
                                                    <div className="text-blue-600 font-bold text-lg">
                                                        ${actualPrice * qty}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="flex items-center justify-center gap-4">
                                            <button 
                                                onClick={() => updateQuantity(p.id, -1)} 
                                                disabled={isClosed}
                                                className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all disabled:opacity-50 ${
                                                    qty > 0 
                                                        ? 'bg-white border-2 border-blue-400 text-blue-600 shadow-md hover:bg-blue-50 active:scale-95' 
                                                        : 'bg-gray-100 text-gray-400'
                                                }`}
                                            >
                                                <i className="fa-solid fa-minus"></i>
                                            </button>
                                            
                                            <div className={`text-3xl font-bold w-16 text-center ${isActive ? 'text-blue-600' : 'text-gray-300'}`}>
                                                {qty}
                                            </div>
                                            
                                            <button 
                                                onClick={() => updateQuantity(p.id, 1)}
                                                disabled={isClosed} 
                                                className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center text-lg shadow-lg hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-50"
                                            >
                                                <i className="fa-solid fa-plus"></i>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    
                    {/* 總計與儲存 */}
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 mb-6 text-white sticky bottom-20 md:bottom-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <div className="text-sm opacity-90">您的訂購金額</div>
                                <div className="text-4xl font-bold">${total.toLocaleString()}</div>
                            </div>
                            <button
                                onClick={handleSaveOrder}
                                disabled={isSaving || isClosed}
                                className="bg-white text-orange-600 px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-orange-50 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? '儲存中...' : myOrderId ? '💾 更新訂單' : '✓ 送出訂單'}
                            </button>
                        </div>
                        
                        {myOrderId && !isSaving && (
                            <div className="text-xs opacity-90 text-center">
                                <i className="fa-solid fa-info-circle mr-1"></i>
                                您的訂單已儲存，可隨時修改
                            </div>
                        )}
                    </div>
                    
                    {/* 其他團員訂購狀況 */}
                    {otherMembersCount > 0 && (
                        <div className="bg-white rounded-xl shadow-md p-5">
                            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                                <i className="fa-solid fa-users mr-2 text-green-600"></i>
                                其他團員訂購狀況
                                <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                    {otherMembersCount} 人
                                </span>
                            </h2>
                            
                            <div className="space-y-3">
                                {orders.filter(o => o.id !== myOrderId).map((order, index) => (
                                    <div key={order.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="font-bold text-gray-800">
                                                {order.memberName || `團員 ${index + 1}`}
                                            </div>
                                            <div className="text-red-600 font-bold">
                                                ${order.total || 0}
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-600 space-x-2">
                                            {Object.entries(order.items || {})
                                                .filter(([_, qty]) => qty > 0)
                                                .map(([productId, qty]) => {
                                                    const product = PRODUCTS.find(p => p.id === parseInt(productId));
                                                    return product ? (
                                                        <span key={productId} className="inline-block bg-white px-2 py-1 rounded">
                                                            {product.name} x{qty}
                                                        </span>
                                                    ) : null;
                                                })}
                                            {Object.values(order.items || {}).every(qty => qty === 0) && (
                                                <span className="text-gray-400">尚未訂購</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Footer */}
                    <div className="mt-8 text-center text-xs text-gray-500">
                        <p>💡 訂單會即時同步給團主</p>
                        <p className="mt-1">可隨時回到此頁面修改訂單</p>
                    </div>
                </div>
            </div>
        </>
    );
}

export default MemberView;

