import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { PRODUCTS, STORAGE_KEYS } from './utils/constants';
import { useLocalStorage } from './hooks/useLocalStorage';

function App() {
    // 團主資訊 State with localStorage
    const [leaderInfo, setLeaderInfo] = useLocalStorage(
        STORAGE_KEYS.LEADER_INFO,
        {
            name: '',
            phone: '',
            location: '',
            date: new Date().toISOString().split('T')[0]
        }
    );

    // 訂單 State with localStorage
    const [orders, setOrders] = useLocalStorage(
        STORAGE_KEYS.ORDERS,
        [{ id: Date.now(), name: '團員 1', items: {}, total: 0 }]
    );

    const [isGenerating, setIsGenerating] = useState(false);
    const printRef = useRef(null);

    // 更新團主資訊
    const handleLeaderChange = (e) => {
        const { name, value } = e.target;
        setLeaderInfo(prev => ({ ...prev, [name]: value }));
    };

    // 新增團員
    const addMember = () => {
        const newId = Date.now();
        setOrders([...orders, { 
            id: newId, 
            name: `團員 ${orders.length + 1}`, 
            items: {}, 
            total: 0 
        }]);
        // Scroll to bottom lightly
        setTimeout(() => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }, 100);
    };

    // 刪除團員
    const removeMember = (id) => {
        if (confirm('確定要刪除這位團員嗎？')) {
            if (orders.length === 1) {
                // Reset last member instead of deleting
                setOrders([{ id: Date.now(), name: '團員 1', items: {}, total: 0 }]);
                return;
            }
            setOrders(orders.filter(o => o.id !== id));
        }
    };

    // 更新團員名稱
    const updateMemberName = (id, newName) => {
        setOrders(orders.map(o => o.id === id ? { ...o, name: newName } : o));
    };

    // 更新數量
    const updateQuantity = (orderId, productId, delta) => {
        setOrders(orders.map(order => {
            if (order.id !== orderId) return order;

            const currentQty = order.items[productId] || 0;
            let newQty = currentQty + delta;
            if (newQty < 0) newQty = 0;

            const newItems = { ...order.items, [productId]: newQty };
            
            // 重新計算該人總額
            let newTotal = 0;
            Object.entries(newItems).forEach(([pId, qty]) => {
                const product = PRODUCTS.find(p => p.id === parseInt(pId));
                if (product) {
                    newTotal += product.price * qty;
                }
            });

            return { ...order, items: newItems, total: newTotal };
        }));
    };

    // 計算全團總統計
    const calculateGrandTotals = () => {
        const stats = {};
        let grandTotalMoney = 0;

        PRODUCTS.forEach(p => {
            stats[p.id] = 0;
        });

        orders.forEach(order => {
            grandTotalMoney += order.total;
            Object.entries(order.items).forEach(([pId, qty]) => {
                if (stats[pId] !== undefined) {
                    stats[pId] += qty;
                }
            });
        });

        return { stats, grandTotalMoney };
    };

    const { stats, grandTotalMoney } = calculateGrandTotals();

    // 下載圖片
    const downloadImage = async () => {
        if (!printRef.current) return;
        setIsGenerating(true);

        // 稍微延遲以確保 UI 渲染
        setTimeout(async () => {
            try {
                // 滾動到預覽區域確保截圖完整
                document.getElementById('preview-container')?.scrollIntoView({block: "start"});
                
                const canvas = await html2canvas(printRef.current, {
                    scale: 2, // 提高解析度
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    logging: false,
                    windowWidth: 1024, // Fix width context for mobile screenshot
                });
                
                const image = canvas.toDataURL("image/png");
                const link = document.createElement('a');
                link.href = image;
                link.download = `丸東魚丸團購單_${leaderInfo.name || '未命名'}_${leaderInfo.date}.png`;
                link.click();
            } catch (err) {
                console.error("生成圖片失敗:", err);
                alert("生成圖片失敗，請重試");
            } finally {
                setIsGenerating(false);
            }
        }, 200);
    };

    return (
        <div className="min-h-screen pb-20">
            {/* 控制面板 / 輸入區 */}
            <div className="max-w-6xl mx-auto p-4 md:p-6">
                <header className="mb-6 text-center">
                    <div className="flex justify-center items-center mb-4">
                        <img 
                            src="/wan_dong_logo.jpg" 
                            alt="丸東魚丸" 
                            className="h-20 md:h-28 w-auto object-contain"
                        />
                    </div>
                    <p className="text-blue-600 font-medium text-sm md:text-base">團購小幫手 - 手機版</p>
                </header>

                {/* 1. 團主資料 Card */}
                <div className="bg-white rounded-xl shadow-md p-5 mb-6 border border-blue-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center">
                        <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">1</span>
                        團主資料
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">團主姓名</label>
                            <input 
                                type="text" 
                                name="name"
                                value={leaderInfo.name} 
                                onChange={handleLeaderChange}
                                placeholder="例如：陳小美"
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">聯絡電話</label>
                            <input 
                                type="tel" 
                                name="phone"
                                value={leaderInfo.phone} 
                                onChange={handleLeaderChange}
                                placeholder="09xx-xxx-xxx"
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">取貨地點/備註</label>
                            <input 
                                type="text" 
                                name="location"
                                value={leaderInfo.location} 
                                onChange={handleLeaderChange}
                                placeholder="例如：社區大廳"
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">結單日期</label>
                            <input 
                                type="date" 
                                name="date"
                                value={leaderInfo.date} 
                                onChange={handleLeaderChange}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* 2. 團員訂購區 */}
                <div className="bg-white rounded-xl shadow-md p-4 md:p-6 mb-6 border border-blue-100">
                    <div className="flex justify-between items-center mb-4 border-b pb-2 sticky top-0 bg-white z-10 pt-2">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center">
                            <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">2</span>
                            訂購明細
                            <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{orders.length} 人</span>
                        </h2>
                        <button 
                            onClick={addMember}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm flex items-center"
                        >
                            <i className="fa-solid fa-plus mr-1"></i> 新增
                        </button>
                    </div>

                    {/* Mobile View: Card List (RWD Optimized) */}
                    <div className="block lg:hidden space-y-6">
                        {orders.map((order, index) => (
                            <div key={order.id} className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm relative hover:shadow-md transition-shadow">
                                {/* Card Header */}
                                <div className="flex justify-between items-center mb-4 bg-gray-50 -m-4 p-4 rounded-t-xl border-b border-gray-100">
                                    <div className="flex items-center flex-1 mr-2">
                                        <span className="text-gray-400 font-bold mr-2 text-lg">#{index + 1}</span>
                                        <input 
                                            type="text"
                                            value={order.name}
                                            onChange={(e) => updateMemberName(order.id, e.target.value)}
                                            className="font-bold text-lg bg-transparent border-b border-gray-300 focus:border-blue-500 w-full focus:outline-none pb-0.5"
                                            placeholder="輸入姓名"
                                        />
                                    </div>
                                    <div className="text-right">
                                        <div className="text-red-600 font-bold text-lg">${order.total}</div>
                                    </div>
                                    <button 
                                        onClick={() => removeMember(order.id)} 
                                        className="ml-3 w-8 h-8 rounded-full bg-white text-gray-400 border border-gray-200 flex items-center justify-center hover:text-red-500 hover:border-red-500 transition-all shadow-sm"
                                    >
                                        <i className="fa-solid fa-trash text-sm"></i>
                                    </button>
                                </div>

                                {/* Product List (Single Column for better touch targets) */}
                                <div className="space-y-3 mt-2">
                                    {PRODUCTS.map(p => {
                                        const qty = order.items[p.id] || 0;
                                        const isActive = qty > 0;
                                        return (
                                            <div key={p.id} className={`flex justify-between items-center p-3 rounded-lg transition-colors border ${isActive ? 'bg-blue-50 border-blue-200' : 'bg-white border-transparent'}`}>
                                                <div className="flex-1">
                                                    <div className={`font-medium ${isActive ? 'text-blue-800' : 'text-gray-700'}`}>{p.name}</div>
                                                    <div className="text-xs text-gray-400">${p.price} / {p.unit}</div>
                                                </div>
                                                
                                                <div className="flex items-center gap-3">
                                                    <button 
                                                        onClick={() => updateQuantity(order.id, p.id, -1)} 
                                                        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg active:scale-95 transition-transform ${qty > 0 ? 'bg-white border border-gray-300 text-blue-600 shadow-sm' : 'bg-gray-100 text-gray-400'}`}
                                                    >
                                                        <i className="fa-solid fa-minus text-xs"></i>
                                                    </button>
                                                    
                                                    <span className={`w-8 text-center font-bold text-lg ${isActive ? 'text-blue-600' : 'text-gray-300'}`}>
                                                        {qty}
                                                    </span>
                                                    
                                                    <button 
                                                        onClick={() => updateQuantity(order.id, p.id, 1)} 
                                                        className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center text-lg shadow-md active:scale-95 transition-transform hover:bg-blue-600"
                                                    >
                                                        <i className="fa-solid fa-plus text-xs"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View (Hidden on mobile) */}
                    <div className="hidden lg:block overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-700 uppercase bg-blue-50">
                                <tr>
                                    <th className="px-4 py-3 min-w-[120px]">團員姓名</th>
                                    {PRODUCTS.map(p => (
                                        <th key={p.id} className="px-2 py-3 text-center min-w-[80px]">
                                            <div className="font-bold text-blue-900">{p.name}</div>
                                            <div className="text-gray-500 text-xs">${p.price}/{p.unit}</div>
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 text-right font-bold text-blue-900">金額</th>
                                    <th className="px-4 py-3 text-center">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((order) => (
                                    <tr key={order.id} className="border-b hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <input 
                                                type="text" 
                                                value={order.name}
                                                onChange={(e) => updateMemberName(order.id, e.target.value)}
                                                className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none transition-colors py-1"
                                            />
                                        </td>
                                        {PRODUCTS.map(p => {
                                            const qty = order.items[p.id] || 0;
                                            return (
                                                <td key={p.id} className="px-2 py-3 text-center">
                                                    <div className="flex items-center justify-center space-x-1">
                                                        <button 
                                                            onClick={() => updateQuantity(order.id, p.id, -1)}
                                                            className="w-7 h-7 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
                                                        >-</button>
                                                        <span className={`w-8 text-center font-medium ${qty > 0 ? 'text-blue-600' : 'text-gray-300'}`}>{qty}</span>
                                                        <button 
                                                            onClick={() => updateQuantity(order.id, p.id, 1)}
                                                            className="w-7 h-7 rounded bg-blue-100 hover:bg-blue-200 text-blue-600 flex items-center justify-center transition-colors"
                                                        >+</button>
                                                    </div>
                                                </td>
                                            )
                                        })}
                                        <td className="px-4 py-3 text-right font-bold text-red-600">
                                            ${order.total.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button 
                                                onClick={() => removeMember(order.id)}
                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <i className="fa-solid fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* 總結算 Bar */}
                    <div className="mt-6 p-4 bg-gray-800 text-white rounded-lg flex justify-between items-center shadow-lg">
                        <div className="text-sm md:text-base">
                            <span className="text-gray-400 block md:inline md:mr-4">總訂購數量: <span className="text-white font-bold">{Object.values(stats).reduce((a,b)=>a+b, 0)}</span></span>
                        </div>
                        <div className="text-xl md:text-2xl font-bold text-yellow-400">
                            <span className="text-xs text-gray-400 mr-2 font-normal">總金額</span>
                            ${grandTotalMoney.toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* 下載區 */}
                <div className="flex flex-col items-center gap-4 mt-8 mb-12">
                    <button 
                        onClick={downloadImage}
                        disabled={isGenerating}
                        className={`
                            w-full md:w-auto px-10 py-4 rounded-full font-bold text-lg shadow-xl transform transition-all active:scale-95 flex items-center justify-center
                            ${isGenerating ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white'}
                        `}
                    >
                        {isGenerating ? (
                            <><i className="fa-solid fa-circle-notch fa-spin mr-2"></i> 處理中...</>
                        ) : (
                            <><i className="fa-solid fa-image mr-2"></i> 產生訂購單圖片</>
                        )}
                    </button>
                    <p className="text-xs text-gray-500 text-center max-w-xs">
                        點擊後會將下方的預覽內容轉存為 PNG 圖片，方便您傳送至 LINE。
                    </p>
                </div>
            </div>

            {/* PREVIEW AREA WRAPPER FOR MOBILE */}
            <div id="preview-container" className="bg-gray-100 py-8 border-t border-gray-200">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-4 text-gray-500 text-sm flex items-center justify-center">
                        <i className="fa-solid fa-arrow-left mr-2 animate-pulse"></i>
                        預覽區域 (左右滑動查看完整圖片)
                        <i className="fa-solid fa-arrow-right ml-2 animate-pulse"></i>
                    </div>
                    
                    {/* Overflow container for mobile scrolling */}
                    <div className="overflow-x-auto pb-4 scrollbar-hide flex justify-center md:justify-center justify-start px-4 md:px-0">
                        <div 
                            ref={printRef} 
                            className="bg-white p-8 w-[800px] shadow-2xl print-area text-gray-800 relative flex-shrink-0"
                            style={{ minWidth: '800px' }} // Keep fixed width for high-res output
                        >
                            {/* Header */}
                            <div className="border-b-4 border-blue-600 pb-4 mb-6 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <img 
                                        src="/wan_dong_logo.jpg" 
                                        alt="丸東魚丸" 
                                        className="h-20 w-auto object-contain"
                                    />
                                    <div>
                                        <p className="text-blue-600 font-bold text-sm">手工魚丸・新鮮製作・冷凍宅配</p>
                                        <div className="flex gap-2 text-xs text-white mt-2">
                                            <span className="bg-blue-400 px-2 py-0.5 rounded">不含硼砂</span>
                                            <span className="bg-blue-400 px-2 py-0.5 rounded">口感紮實</span>
                                            <span className="bg-blue-400 px-2 py-0.5 rounded">安心美味</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-gray-500">團購統計單</div>
                                    <div className="text-2xl font-bold text-gray-800">{leaderInfo.date}</div>
                                </div>
                            </div>

                            {/* Leader Info Grid */}
                            <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-100">
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-500 block text-xs">團主</span>
                                        <span className="font-bold text-lg">{leaderInfo.name || '未填寫'}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block text-xs">電話</span>
                                        <span className="font-bold text-lg">{leaderInfo.phone || '未填寫'}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block text-xs">地點/備註</span>
                                        <span className="font-bold text-lg">{leaderInfo.location || '無'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Summary Statistics (For Supplier) */}
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-white bg-gray-800 px-4 py-1 inline-block rounded-t-lg">廠商出貨統計</h3>
                                <div className="border-2 border-gray-800 p-4 rounded-b-lg rounded-tr-lg">
                                    <div className="grid grid-cols-4 gap-y-4 gap-x-8">
                                        {PRODUCTS.map(p => {
                                            const totalQty = stats[p.id] || 0;
                                            return (
                                                <div key={p.id} className="flex justify-between items-end border-b border-gray-200 pb-1">
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-700">{p.name}</div>
                                                        <div className="text-xs text-gray-400">${p.price}/{p.unit}</div>
                                                    </div>
                                                    <div className={`text-xl font-bold ${totalQty > 0 ? 'text-blue-600' : 'text-gray-300'}`}>
                                                        {totalQty} <span className="text-xs font-normal text-gray-400">份</span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-gray-800 flex justify-end items-center">
                                        <span className="text-gray-600 mr-4 font-bold">總訂購數量: {Object.values(stats).reduce((a,b)=>a+b, 0)}</span>
                                        <span className="text-2xl font-bold text-red-600">總金額: ${grandTotalMoney.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Detailed List (For Leader Distribution) */}
                            <div>
                                <h3 className="text-lg font-bold text-white bg-blue-600 px-4 py-1 inline-block rounded-t-lg">團員分發明細</h3>
                                <div className="border border-blue-600 rounded-b-lg rounded-tr-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-blue-100 text-blue-900 border-b border-blue-200">
                                            <tr>
                                                <th className="px-3 py-2 text-left w-24">姓名</th>
                                                {PRODUCTS.map(p => (
                                                    <th key={p.id} className="px-1 py-2 text-center text-xs w-12 tracking-tighter">{p.name.substring(0,2)}..</th>
                                                ))}
                                                <th className="px-3 py-2 text-right">小計</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {orders.map((order, idx) => (
                                                <tr key={order.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                    <td className="px-3 py-2 font-bold text-gray-700 truncate">{order.name}</td>
                                                    {PRODUCTS.map(p => {
                                                        const qty = order.items[p.id];
                                                        return (
                                                            <td key={p.id} className="px-1 py-2 text-center">
                                                                {qty > 0 ? (
                                                                    <span className="font-bold text-blue-600">{qty}</span>
                                                                ) : (
                                                                    <span className="text-gray-200">-</span>
                                                                )}
                                                            </td>
                                                        )
                                                    })}
                                                    <td className="px-3 py-2 text-right font-bold text-gray-800">
                                                        ${order.total.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="mt-8 text-center text-xs text-gray-400 border-t pt-2">
                                Generated by 丸東魚丸團購小幫手
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;

