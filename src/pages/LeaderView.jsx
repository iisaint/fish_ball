import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { useGroupInfo, useOrders, useVendorNotes } from '../hooks/useFirebaseGroup';
import { useProducts } from '../hooks/useProducts';
import { updateGroupInfo, saveOrder, deleteOrder, closeGroup, submitToVendor, cancelSubmission, verifyLeaderToken, updateLeaderNotes } from '../utils/firebase';
import { getActualPrice } from '../utils/firebase';
import UpdatePrompt from '../components/UpdatePrompt';

function LeaderView() {
    const { groupId } = useParams();
    const navigate = useNavigate();
    const printRef = useRef(null);
    
    // 驗證狀態
    const [isVerifying, setIsVerifying] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    
    // Firebase hooks
    const { groupInfo, loading: infoLoading, error: infoError } = useGroupInfo(groupId);
    const { orders: fbOrders, loading: ordersLoading } = useOrders(groupId);
    const { vendorNotes } = useVendorNotes(groupId);
    const { products: PRODUCTS } = useProducts();

    // Local state
    const [leaderInfo, setLeaderInfo] = useState({
        name: '',
        phone: '',
        location: '',
        date: new Date().toISOString().split('T')[0]
    });
    const [leaderNotes, setLeaderNotes] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [showShareLink, setShowShareLink] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    
    // 折疊狀態管理（使用 localStorage 持久化）
    const [collapsedOrders, setCollapsedOrders] = useState(() => {
        try {
            const saved = localStorage.getItem(`collapsed_orders_${groupId}`);
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });
    
    // 自動驗證團主 Token
    useEffect(() => {
        const autoVerify = async () => {
            if (!groupId) {
                setIsVerifying(false);
                return;
            }
            
            // 從 localStorage 讀取 Token
            const storedToken = localStorage.getItem(`leader_token_${groupId}`);
            
            if (!storedToken) {
                // 沒有 Token，拒絕訪問
                setIsAuthenticated(false);
                setIsVerifying(false);
                return;
            }
            
            try {
                // 驗證 Token
                const isValid = await verifyLeaderToken(groupId, storedToken);
                
                if (isValid) {
                    setIsAuthenticated(true);
                } else {
                    // Token 無效，可能被篡改
                    setIsAuthenticated(false);
                    // 清除無效 Token
                    localStorage.removeItem(`leader_token_${groupId}`);
                }
            } catch (error) {
                console.error('驗證失敗:', error);
                setIsAuthenticated(false);
            } finally {
                setIsVerifying(false);
            }
        };
        
        autoVerify();
    }, [groupId]);
    
    // 同步 Firebase 資料到本地 state
    useEffect(() => {
        if (groupInfo) {
            setLeaderInfo({
                name: groupInfo.name || '',
                phone: groupInfo.phone || '',
                location: groupInfo.location || '',
                date: groupInfo.date || new Date().toISOString().split('T')[0]
            });
            setLeaderNotes(groupInfo.leaderNotes || '');
        }
    }, [groupInfo]);
    
    // 記錄到歷史（團主）
    useEffect(() => {
        if (groupId && !infoError) {
            const groups = JSON.parse(localStorage.getItem('leader_groups') || '[]');
            if (!groups.includes(groupId)) {
                groups.unshift(groupId);
                localStorage.setItem('leader_groups', JSON.stringify(groups.slice(0, 10)));
            }
        }
    }, [groupId, infoError]);
    
    // 當廠商調整價格時，自動重新計算所有訂單的總價
    useEffect(() => {
        if (!vendorNotes?.priceAdjustments || orders.length === 0) return;
        
        const recalculateAllOrders = async () => {
            for (const order of orders) {
                let newTotal = 0;
                Object.entries(order.items || {}).forEach(([pId, qty]) => {
                    const price = getActualPrice(parseInt(pId), vendorNotes.priceAdjustments, PRODUCTS);
                    newTotal += price * qty;
                });
                
                // 只有當總價有變化時才更新
                if (newTotal !== order.total) {
                    await saveOrder(groupId, order.id, {
                        memberName: order.memberName,
                        items: order.items || {},
                        total: newTotal
                    });
                }
            }
        };
        
        recalculateAllOrders();
    }, [vendorNotes?.priceAdjustments]);
    
    // 將 Firebase 訂單物件轉換為陣列
    const orders = Object.entries(fbOrders || {}).map(([id, data]) => ({
        id,
        ...data
    }));
    
    // 驗證中
    if (isVerifying) {
        return (
            <>
                <UpdatePrompt />
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-white">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">驗證中...</p>
                    </div>
                </div>
            </>
        );
    }
    
    // 驗證失敗
    if (!isAuthenticated) {
        return (
            <>
                <UpdatePrompt />
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-white p-4">
                    <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
                        <div className="text-6xl mb-4">🔒</div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">無權訪問</h2>
                        <p className="text-gray-600 mb-6">
                            您沒有權限訪問此團購的團主介面。
                        </p>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                            <p className="text-sm text-blue-800 mb-2">
                                <i className="fa-solid fa-info-circle mr-2"></i>
                                <strong>如何訪問？</strong>
                            </p>
                            <ul className="text-xs text-blue-700 space-y-1 ml-6 list-disc">
                                <li>從首頁「我建立的團購」歷史記錄進入</li>
                                <li>使用創建團購時的瀏覽器和裝置</li>
                                <li>確認未清除瀏覽器數據</li>
                            </ul>
                        </div>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full bg-orange-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-orange-700 transition-colors mb-3"
                        >
                            返回首頁
                        </button>
                        <button
                            onClick={() => navigate(`/member/${groupId}`)}
                            className="w-full bg-gray-100 text-gray-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                        >
                            改為團員身份加入
                        </button>
                    </div>
                </div>
            </>
        );
    }
    
    // 處理載入和錯誤狀態
    if (infoLoading || ordersLoading) {
        return (
            <>
                <UpdatePrompt />
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">載入中...</p>
                    </div>
                </div>
            </>
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
    
    // 更新團主資訊
    const handleLeaderChange = async (e) => {
        const { name, value } = e.target;
        const newInfo = { ...leaderInfo, [name]: value };
        setLeaderInfo(newInfo);
        
        // Debounce 寫入 Firebase
        clearTimeout(window.leaderUpdateTimeout);
        window.leaderUpdateTimeout = setTimeout(() => {
            updateGroupInfo(groupId, { [name]: value });
        }, 500);
    };
    
    // 更新團主備註
    const handleLeaderNotesChange = (e) => {
        const value = e.target.value;
        setLeaderNotes(value);
        
        // Debounce 寫入 Firebase
        clearTimeout(window.leaderNotesTimeout);
        window.leaderNotesTimeout = setTimeout(() => {
            updateLeaderNotes(groupId, value);
        }, 500);
    };
    
    // 切換折疊狀態
    const toggleCollapse = (orderId) => {
        const newCollapsedState = {
            ...collapsedOrders,
            [orderId]: !collapsedOrders[orderId]
        };
        setCollapsedOrders(newCollapsedState);
        localStorage.setItem(`collapsed_orders_${groupId}`, JSON.stringify(newCollapsedState));
    };
    
    // 新增團員
    const addMember = async () => {
        const newOrder = await saveOrder(groupId, null, {
            memberName: `團員 ${orders.length + 1}`,
            items: {},
            total: 0
        });
        
        // 等待 DOM 更新後滾動到新團員卡片
        setTimeout(() => {
            const memberCards = document.querySelectorAll('[data-member-card]');
            if (memberCards.length > 0) {
                const lastCard = memberCards[memberCards.length - 1];
                lastCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 300);
    };
    
    // 刪除團員
    const removeMember = async (orderId) => {
        if (!confirm('確定要刪除這位團員嗎？')) return;
        
        if (orders.length === 1) {
            alert('至少要保留一位團員！');
            return;
        }
        
        await deleteOrder(groupId, orderId);
    };
    
    // 更新團員名稱
    const updateMemberName = async (orderId, newName) => {
        const order = orders.find(o => o.id === orderId);
        if (order) {
            await saveOrder(groupId, orderId, {
                ...order,
                memberName: newName
            });
        }
    };
    
    // 更新數量
    const updateQuantity = async (orderId, productId, delta) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;
        
        // 確保 items 存在，如果不存在則初始化為空物件
        const items = order.items || {};
        const currentQty = items[productId] || 0;
        let newQty = currentQty + delta;
        if (newQty < 0) newQty = 0;
        
        const newItems = { ...items, [productId]: newQty };
        
        // 重新計算總額
        let newTotal = 0;
        Object.entries(newItems).forEach(([pId, qty]) => {
            const price = getActualPrice(parseInt(pId), vendorNotes?.priceAdjustments, PRODUCTS);
            newTotal += price * qty;
        });
        
        await saveOrder(groupId, orderId, {
            memberName: order.memberName,
            items: newItems,
            total: newTotal
        });
    };
    
    // 計算全團總統計
    const calculateGrandTotals = () => {
        const stats = {};
        let grandTotalMoney = 0;
        let originalTotalMoney = 0; // 原始總價
        
        PRODUCTS.forEach(p => {
            stats[p.id] = 0;
        });
        
        orders.forEach(order => {
            grandTotalMoney += order.total || 0;
            Object.entries(order.items || {}).forEach(([pId, qty]) => {
                const productId = parseInt(pId);
                if (stats[productId] !== undefined) {
                    stats[productId] += qty;
                }
                // 計算原始價格
                const product = PRODUCTS.find(p => p.id === productId);
                if (product) {
                    originalTotalMoney += product.price * qty;
                }
            });
        });
        
        const discount = originalTotalMoney - grandTotalMoney; // 折扣金額（正數表示折扣）
        const hasDiscount = discount !== 0;
        
        return { 
            stats, 
            grandTotalMoney, 
            originalTotalMoney,
            discount,
            hasDiscount
        };
    };
    
    const { stats, grandTotalMoney, originalTotalMoney, discount, hasDiscount } = calculateGrandTotals();
    
    // 生成圖片 Canvas
    const generateCanvas = async () => {
        if (!printRef.current) return null;
        
        document.getElementById('preview-container')?.scrollIntoView({block: "start"});
        
        const canvas = await html2canvas(printRef.current, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            windowWidth: 1024,
        });
        
        return canvas;
    };
    
    // 下載圖片
    const downloadImage = async () => {
        setIsGenerating(true);
        
        setTimeout(async () => {
            try {
                const canvas = await generateCanvas();
                if (!canvas) return;
                
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
    
    // 分享圖片
    const shareImage = async () => {
        if (!navigator.share && !navigator.canShare) {
            alert("您的瀏覽器不支援分享功能，請使用「下載圖片」後手動分享");
            return;
        }
        
        setIsGenerating(true);
        
        setTimeout(async () => {
            try {
                const canvas = await generateCanvas();
                if (!canvas) return;
                
                canvas.toBlob(async (blob) => {
                    if (!blob) {
                        alert("圖片生成失敗，請重試");
                        setIsGenerating(false);
                        return;
                    }
                    
                    const fileName = `丸東魚丸團購單_${leaderInfo.name || '未命名'}_${leaderInfo.date}.png`;
                    const file = new File([blob], fileName, { type: 'image/png' });
                    
                    const shareData = {
                        title: '丸東魚丸團購單',
                        text: `${leaderInfo.name || '團購'}的訂購單 - 總金額 $${grandTotalMoney.toLocaleString()}`,
                        files: [file]
                    };
                    
                    if (navigator.canShare && !navigator.canShare(shareData)) {
                        alert("無法分享圖片檔案，請使用「下載圖片」功能");
                        setIsGenerating(false);
                        return;
                    }
                    
                    try {
                        await navigator.share(shareData);
                    } catch (err) {
                        if (err.name !== 'AbortError') {
                            console.error('分享失敗:', err);
                            alert("分享失敗，請使用「下載圖片」功能");
                        }
                    } finally {
                        setIsGenerating(false);
                    }
                }, 'image/png', 0.95);
            } catch (err) {
                console.error("生成圖片失敗:", err);
                alert("生成圖片失敗，請重試");
                setIsGenerating(false);
            }
        }, 200);
    };
    
    // 複製團員填單連結
    const copyMemberLink = () => {
        const link = `${window.location.origin}/member/${groupId}`;
        navigator.clipboard.writeText(link).then(() => {
            setShowShareLink(true);
            setTimeout(() => setShowShareLink(false), 3000);
        }).catch(() => {
            alert(`請複製此連結：\n${link}`);
        });
    };
    
    // 送單給廠商
    const handleSubmitToVendor = async () => {
        if (orders.length === 0) {
            alert('尚無訂單，無法送單');
            return;
        }
        
        if (!confirm('確定要將訂單送給廠商嗎？送出後需等待廠商確認。')) return;
        
        try {
            await submitToVendor(groupId);
            alert('訂單已送出給廠商！');
        } catch (error) {
            alert('送單失敗：' + error.message);
        }
    };
    
    // 取消送單
    const handleCancelSubmission = async () => {
        if (!confirm('確定要取消送單嗎？訂單將退回草稿狀態。')) return;
        
        try {
            await cancelSubmission(groupId);
            alert('已取消送單');
        } catch (error) {
            alert('取消失敗：' + error.message);
        }
    };
    
    // 關閉團購
    const handleCloseGroup = async () => {
        if (!confirm('確定要關閉團購嗎？關閉後團員將無法再修改訂單。')) return;
        
        try {
            await closeGroup(groupId);
            alert('團購已關閉');
        } catch (error) {
            alert('關閉失敗：' + error.message);
        }
    };
    
    const isClosed = groupInfo?.status === 'closed' || groupInfo?.status === 'completed';
    const orderStatus = groupInfo?.orderStatus || 'draft'; // draft, submitted, confirmed
    const isLocked = orderStatus !== 'draft' || isClosed; // 送單後或已關閉則鎖定
    
    return (
        <>
            <UpdatePrompt />
            <div className="min-h-screen pb-20 bg-gradient-to-br from-blue-50 to-white">
                {/* 控制面板 */}
                <div className="max-w-6xl mx-auto p-4 md:p-6">
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
                                className="h-20 md:h-28 w-auto object-contain"
                            />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">團主管理介面</h1>
                        <p className="text-blue-600 font-medium text-sm md:text-base">
                            團購代碼：<span className="font-mono bg-blue-100 px-3 py-1 rounded">{groupId}</span>
                        </p>
                        
                        {/* 訂單狀態提示 */}
                        <div className="mt-3 flex flex-col items-center gap-2">
                            {isClosed && (
                                <div className="inline-block bg-red-100 text-red-700 px-4 py-2 rounded-lg font-bold">
                                    ⚠️ 此團購已關閉
                                </div>
                            )}
                            {orderStatus === 'draft' && !isClosed && (
                                <div className="inline-block bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium">
                                    📝 草稿狀態 - 尚未送單給廠商
                                </div>
                            )}
                            {orderStatus === 'submitted' && (
                                <div className="inline-block bg-yellow-100 text-yellow-700 px-4 py-2 rounded-lg font-bold">
                                    ⏳ 已送單 - 等待廠商確認中
                                </div>
                            )}
                            {orderStatus === 'confirmed' && (
                                <div className="inline-block bg-green-100 text-green-700 px-4 py-2 rounded-lg font-bold">
                                    ✅ 廠商已確認 - 訂單成立
                                </div>
                            )}
                        </div>
                    </header>

                    {/* 操作說明 */}
                    <div className="mb-6">
                        <button
                            onClick={() => setShowHelp(!showHelp)}
                            className="text-sm text-blue-500 hover:text-blue-700 flex items-center gap-1 mx-auto"
                        >
                            <i className={`fa-solid fa-circle-question`}></i>
                            {showHelp ? '收起說明' : '操作說明'}
                        </button>
                        {showHelp && (
                            <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-gray-700 space-y-1.5">
                                <p>1. 填寫團購資訊（姓名、電話、地點、日期）</p>
                                <p>2. 點擊「複製連結」分享給團員填單</p>
                                <p>3. 等團員都填完後，點擊「送單給廠商」</p>
                                <p>4. 送單後訂單會鎖定，需修改請先「取消送單」</p>
                                <p>5. 可產生訂單圖片分享至 LINE</p>
                            </div>
                        )}
                    </div>

                    {/* 分享團員連結 */}
                    <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg p-5 mb-6 text-white">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <h3 className="font-bold text-lg mb-1">📲 邀請團員填單</h3>
                                <p className="text-sm text-green-100">點擊複製連結，傳給團員讓他們自己填寫訂單</p>
                            </div>
                            <button
                                onClick={copyMemberLink}
                                className="bg-white text-green-600 px-6 py-3 rounded-lg font-bold shadow-md hover:bg-green-50 transition-all transform hover:scale-105"
                            >
                                {showShareLink ? '✓ 已複製！' : '複製連結'}
                            </button>
                        </div>
                    </div>
                    
                    {/* 1. 團主資料 Card */}
                    <div className="bg-white rounded-xl shadow-md p-5 mb-6 border border-blue-100">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center">
                            <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">1</span>
                            團主資料
                            {isLocked && (
                                <span className="ml-auto text-xs bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-medium">
                                    🔒 已鎖定
                                </span>
                            )}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">團主姓名</label>
                                <input 
                                    type="text" 
                                    name="name"
                                    value={leaderInfo.name} 
                                    onChange={handleLeaderChange}
                                    disabled={isLocked}
                                    placeholder="例如：陳小美"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">聯絡電話</label>
                                <input 
                                    type="tel" 
                                    name="phone"
                                    value={leaderInfo.phone} 
                                    onChange={handleLeaderChange}
                                    disabled={isLocked}
                                    placeholder="09xx-xxx-xxx"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">取貨地點/備註</label>
                                <input 
                                    type="text" 
                                    name="location"
                                    value={leaderInfo.location} 
                                    onChange={handleLeaderChange}
                                    disabled={isLocked}
                                    placeholder="例如：社區大廳"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">結單日期</label>
                                <input 
                                    type="date" 
                                    name="date"
                                    value={leaderInfo.date} 
                                    onChange={handleLeaderChange}
                                    disabled={isLocked}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                            </div>
                        </div>
                    </div>
                    
                    {/* 團主備註 */}
                    <div className="bg-white rounded-xl shadow-md p-5 mb-6 border border-blue-100">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center">
                            <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">
                                <i className="fa-solid fa-note-sticky text-xs"></i>
                            </span>
                            給廠商的備註
                        </h2>
                        <textarea
                            value={leaderNotes}
                            onChange={handleLeaderNotesChange}
                            placeholder="例如：請提早出貨、有特殊需求等..."
                            rows={3}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all resize-none"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            <i className="fa-solid fa-info-circle mr-1"></i>
                            此備註會同步顯示在廠商管理介面
                        </p>
                    </div>
                    
                    {/* 2. 團員訂購區 */}
                    <div className="bg-white rounded-xl shadow-md p-4 md:p-6 mb-6 border border-blue-100">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <div className="flex-1">
                                <h2 className="text-lg font-bold text-gray-800 flex items-center flex-wrap gap-2">
                                    <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                                    訂購明細
                                    <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{orders.length} 人</span>
                                    {isLocked && (
                                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">
                                            🔒 已鎖定
                                        </span>
                                    )}
                                    {hasDiscount && (
                                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                                            💰 廠商已調價
                                        </span>
                                    )}
                                </h2>
                            </div>
                            <button 
                                onClick={addMember}
                                disabled={isLocked}
                                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <i className="fa-solid fa-plus mr-1"></i> 新增
                            </button>
                        </div>
                        
                        {orders.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <p className="text-lg mb-2">尚無訂單</p>
                                <p className="text-sm">點擊「新增」按鈕或分享連結給團員填單</p>
                            </div>
                        ) : (
                            /* Mobile Card View */
                            <div className="space-y-6">
                                {orders.map((order, index) => {
                                    const isCollapsed = collapsedOrders[order.id];
                                    const isLeaderAdded = order.memberName?.startsWith('團員');
                                    
                                    // 計算此訂單的原始價格與折扣
                                    let orderOriginalPrice = 0;
                                    Object.entries(order.items || {}).forEach(([pId, qty]) => {
                                        const product = PRODUCTS.find(p => p.id === parseInt(pId));
                                        if (product) {
                                            orderOriginalPrice += product.price * qty;
                                        }
                                    });
                                    const orderDiscount = orderOriginalPrice - (order.total || 0);
                                    const orderHasDiscount = orderDiscount !== 0;
                                    
                                    return (
                                        <div 
                                            key={order.id} 
                                            data-member-card
                                            className={`border-2 rounded-xl p-4 shadow-sm transition-all ${
                                                isLeaderAdded 
                                                    ? 'bg-gradient-to-br from-green-50 to-white border-green-300' 
                                                    : 'bg-white border-gray-200'
                                            }`}
                                        >
                                            <div className={`flex justify-between items-center mb-4 -m-4 p-4 rounded-t-xl border-b ${
                                                isLeaderAdded ? 'bg-green-50' : 'bg-gray-50'
                                            }`}>
                                                {/* 折疊按鈕 */}
                                                <button
                                                    onClick={() => toggleCollapse(order.id)}
                                                    className="w-8 h-8 rounded-full bg-white border hover:bg-gray-100 transition-all flex items-center justify-center mr-2"
                                                >
                                                    <i className={`fa-solid ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-down'} text-xs text-gray-600`}></i>
                                                </button>
                                                
                                                <div className="flex items-center flex-1">
                                                    <div className="flex items-center mr-2">
                                                        <span className={`font-bold mr-2 ${isLeaderAdded ? 'text-green-600' : 'text-gray-400'}`}>
                                                            #{index + 1}
                                                        </span>
                                                        {isLeaderAdded && (
                                                            <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold mr-2">
                                                                團長新增
                                                            </span>
                                                        )}
                                                    </div>
                                                    <input 
                                                        type="text"
                                                        value={order.memberName || ''}
                                                        onChange={(e) => updateMemberName(order.id, e.target.value)}
                                                        disabled={isLocked}
                                                        className={`font-bold text-lg bg-transparent border-b focus:border-blue-500 w-full focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed ${
                                                            isLeaderAdded ? 'border-green-300' : 'border-gray-300'
                                                        }`}
                                                        placeholder="輸入姓名"
                                                    />
                                                </div>
                                                <div className="text-right mr-3">
                                                    {orderHasDiscount ? (
                                                        <div>
                                                            <div className="text-xs text-gray-400 line-through">
                                                                ${orderOriginalPrice}
                                                            </div>
                                                            <div className="text-red-600 font-bold text-lg">
                                                                ${order.total || 0}
                                                            </div>
                                                            <div className={`text-xs font-bold ${orderDiscount > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                                                {orderDiscount > 0 ? '↓' : '↑'} ${Math.abs(orderDiscount)}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-red-600 font-bold text-lg">${order.total || 0}</div>
                                                    )}
                                                </div>
                                                <button 
                                                    onClick={() => removeMember(order.id)}
                                                    disabled={isLocked} 
                                                    className="w-8 h-8 rounded-full bg-white text-gray-400 border hover:text-red-500 hover:border-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <i className="fa-solid fa-trash text-sm"></i>
                                                </button>
                                            </div>
                                            
                                            {!isCollapsed && (
                                                <div className="space-y-3 mt-2">
                                            {PRODUCTS.map(p => {
                                                const qty = order.items?.[p.id] || 0;
                                                const actualPrice = getActualPrice(p.id, vendorNotes?.priceAdjustments, PRODUCTS);
                                                const isAdjusted = actualPrice !== p.price;
                                                const isActive = qty > 0;
                                                
                                                return (
                                                    <div key={p.id} className={`flex justify-between items-center p-3 rounded-lg border ${isActive ? 'bg-blue-50 border-blue-200' : 'bg-white border-transparent'}`}>
                                                        <div className="flex-1">
                                                            <div className={`font-medium ${isActive ? 'text-blue-800' : 'text-gray-700'}`}>{p.name}</div>
                                                            <div className="text-xs text-gray-400">
                                                                {isAdjusted ? (
                                                                    <span>
                                                                        <span className="line-through text-gray-300">${p.price}</span>
                                                                        <span className="text-red-600 font-bold ml-1">${actualPrice}</span> / {p.unit}
                                                                    </span>
                                                                ) : (
                                                                    `$${p.price} / ${p.unit}`
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-3">
                                                            <button 
                                                                onClick={() => updateQuantity(order.id, p.id, -1)}
                                                                disabled={isLocked} 
                                                                className={`w-10 h-10 rounded-full flex items-center justify-center ${isLocked ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : qty > 0 ? 'bg-white border text-blue-600 shadow-sm' : 'bg-gray-100 text-gray-400'}`}
                                                            >
                                                                <i className="fa-solid fa-minus text-xs"></i>
                                                            </button>
                                                            
                                                            <span className={`w-8 text-center font-bold text-lg ${isLocked ? 'text-gray-400' : isActive ? 'text-blue-600' : 'text-gray-300'}`}>
                                                                {qty}
                                                            </span>
                                                            
                                                            <button 
                                                                onClick={() => updateQuantity(order.id, p.id, 1)}
                                                                disabled={isLocked} 
                                                                className="w-10 h-10 rounded-full flex items-center justify-center shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 bg-blue-500 text-white hover:bg-blue-600"
                                                            >
                                                                <i className="fa-solid fa-plus text-xs"></i>
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    
                    {/* 3. 總計區 */}
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 mb-6 text-white">
                        <h2 className="text-xl font-bold mb-4 flex items-center">
                            <span className="bg-white text-orange-600 w-7 h-7 rounded-full flex items-center justify-center text-sm mr-2">3</span>
                            全團統計
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            {PRODUCTS.map(p => {
                                const total = stats[p.id] || 0;
                                const actualPrice = getActualPrice(p.id, vendorNotes?.priceAdjustments, PRODUCTS);
                                const isAdjusted = actualPrice !== p.price;
                                
                                return (
                                    <div key={p.id} className={`bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center ${total > 0 ? 'ring-2 ring-white/50' : ''}`}>
                                        <div className="font-bold text-lg">{p.name}</div>
                                        <div className="text-2xl font-bold my-1">{total}</div>
                                        <div className="text-xs opacity-90">
                                            {isAdjusted ? (
                                                <>
                                                    <span className="line-through">${p.price}</span>
                                                    <span className="ml-1 font-bold">${actualPrice}</span>
                                                </>
                                            ) : (
                                                `$${p.price}`
                                            )} /{p.unit}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {/* 價格明細 */}
                        {hasDiscount ? (
                            <div className="space-y-3">
                                {/* 原始總價 */}
                                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                                    <div className="flex justify-between items-center text-sm mb-2">
                                        <span className="text-white/80">原始總價</span>
                                        <span className="font-mono text-lg line-through text-white/60">
                                            ${originalTotalMoney.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-white/80">
                                            {discount > 0 ? '折扣優惠' : '價格調整'}
                                        </span>
                                        <span className={`font-mono text-lg font-bold ${discount > 0 ? 'text-green-300' : 'text-red-300'}`}>
                                            {discount > 0 ? '-' : '+'} ${Math.abs(discount).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                
                                {/* 應付金額 */}
                                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 border-2 border-white/30">
                                    <div className="flex justify-between items-center">
                                        <div className="text-lg font-medium">應付金額</div>
                                        <div className="text-4xl font-bold">${grandTotalMoney.toLocaleString()}</div>
                                    </div>
                                    {discount > 0 && (
                                        <div className="text-right text-sm text-green-200 mt-1">
                                            已為您節省 ${discount.toLocaleString()} 元 🎉
                                        </div>
                                    )}
                                </div>
                                
                                {/* 提示訊息 */}
                                <div className="bg-yellow-500/20 border border-yellow-300/30 rounded-lg p-3 text-sm">
                                    <i className="fa-solid fa-info-circle mr-2"></i>
                                    廠商已調整價格，以上為實際應付金額
                                </div>
                            </div>
                        ) : (
                            /* 無折扣時的顯示 */
                            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
                                <div className="text-lg font-medium mb-1">全團總金額</div>
                                <div className="text-4xl font-bold">${grandTotalMoney.toLocaleString()}</div>
                            </div>
                        )}
                    </div>
                    
                    {/* 4. 操作按鈕 */}
                    <div className="flex flex-col md:flex-row gap-3 mb-6">
                        <button
                            onClick={shareImage}
                            disabled={isGenerating}
                            className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg hover:from-green-600 hover:to-green-700 transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? '生成中...' : '📤 分享訂單圖片'}
                        </button>
                        
                        <button
                            onClick={downloadImage}
                            disabled={isGenerating}
                            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? '生成中...' : '💾 下載訂單圖片'}
                        </button>
                    </div>
                    
                    {/* 訂單管理按鈕 */}
                    {!isClosed && (
                        <div className="space-y-3">
                            {/* 送單按鈕 (草稿狀態) */}
                            {orderStatus === 'draft' && (
                                <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-lg p-5 text-white text-center">
                                    <h3 className="font-bold text-lg mb-2">📤 準備送單給廠商</h3>
                                    <p className="text-sm text-purple-100 mb-4">確認訂單無誤後，點擊下方按鈕送給廠商確認</p>
                                    <button
                                        onClick={handleSubmitToVendor}
                                        disabled={orders.length === 0}
                                        className="bg-white text-purple-600 px-8 py-3 rounded-lg font-bold shadow-md hover:bg-purple-50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                    >
                                        {orders.length === 0 ? '尚無訂單' : '送單給廠商'}
                                    </button>
                                </div>
                            )}
                            
                            {/* 已送單狀態 */}
                            {orderStatus === 'submitted' && (
                                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-5 text-center">
                                    <h3 className="font-bold text-lg text-yellow-800 mb-2">⏳ 等待廠商確認中</h3>
                                    <p className="text-sm text-yellow-700 mb-4">訂單已送出，請等待廠商確認收單</p>
                                    <button
                                        onClick={handleCancelSubmission}
                                        className="bg-white text-yellow-700 px-6 py-2 rounded-lg font-medium hover:bg-yellow-100 transition-colors text-sm border border-yellow-300"
                                    >
                                        取消送單
                                    </button>
                                </div>
                            )}
                            
                            {/* 已確認狀態 */}
                            {orderStatus === 'confirmed' && (
                                <div className="bg-green-50 border-2 border-green-300 rounded-xl p-5 text-center">
                                    <h3 className="font-bold text-lg text-green-800 mb-2">✅ 廠商已確認收單</h3>
                                    <p className="text-sm text-green-700">訂單已成立，請等待廠商出貨通知</p>
                                </div>
                            )}
                            
                            {/* 關閉團購按鈕 */}
                            <div className="text-center pt-3 border-t">
                                <button
                                    onClick={handleCloseGroup}
                                    className="bg-red-100 text-red-700 px-6 py-2 rounded-lg font-medium hover:bg-red-200 transition-colors text-sm"
                                >
                                    🔒 關閉團購
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {/* 5. 訂單預覽區（用於截圖） */}
                    <div id="preview-container" className="mt-8">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">預覽畫面（此區會被產生為圖片）</h2>
                        
                        <div ref={printRef} className="bg-white p-8 rounded-xl shadow-xl mx-auto" style={{width: '800px', maxWidth: '100%'}}>
                            {/* Logo */}
                            <div className="text-center mb-6">
                                <img 
                                    src="/wan_dong_logo.jpg" 
                                    alt="丸東魚丸" 
                                    className="h-24 mx-auto object-contain mb-3"
                                />
                                <h1 className="text-3xl font-bold text-gray-800 mb-2">丸東魚丸團購單</h1>
                                
                                {/* 標籤區 */}
                                <div className="flex justify-center gap-3 my-4">
                                    <span className="inline-block text-center bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-md" style={{lineHeight: '1.2'}}>
                                        不含硼砂
                                    </span>
                                    <span className="inline-block text-center bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-md" style={{lineHeight: '1.2'}}>
                                        口感紮實
                                    </span>
                                    <span className="inline-block text-center bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-md" style={{lineHeight: '1.2'}}>
                                        安心美味
                                    </span>
                                </div>
                            </div>
                            
                            {/* 團主資訊 */}
                            <div className="bg-blue-50 rounded-lg p-4 mb-6">
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div><span className="font-bold text-gray-700">團主：</span>{leaderInfo.name || '(未填寫)'}</div>
                                    <div><span className="font-bold text-gray-700">電話：</span>{leaderInfo.phone || '(未填寫)'}</div>
                                    <div><span className="font-bold text-gray-700">地點：</span>{leaderInfo.location || '(未填寫)'}</div>
                                    <div><span className="font-bold text-gray-700">日期：</span>{leaderInfo.date}</div>
                                </div>
                            </div>
                            
                            {/* 團員訂購明細表格 */}
                            <div className="mb-6">
                                <h3 className="font-bold text-lg mb-3 text-gray-800">團員分發明細</h3>
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-blue-600 text-white">
                                            <th className="border border-blue-700 px-2 py-2 text-left">團員</th>
                                            {PRODUCTS.map(p => {
                                                const actualPrice = getActualPrice(p.id, vendorNotes?.priceAdjustments, PRODUCTS);
                                                return (
                                                    <th key={p.id} className="border border-blue-700 px-2 py-2 text-center whitespace-nowrap">
                                                        <div className="font-bold">{p.name}</div>
                                                        <div className="text-xs font-normal">${actualPrice}/{p.unit}</div>
                                                    </th>
                                                );
                                            })}
                                            <th className="border border-blue-700 px-2 py-2 text-right">金額</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders.map((order) => (
                                            <tr key={order.id} className="border-b hover:bg-gray-50">
                                                <td className="border border-gray-300 px-2 py-2 font-medium">{order.memberName || '未命名'}</td>
                                                {PRODUCTS.map(p => {
                                                    const qty = order.items?.[p.id] || 0;
                                                    return (
                                                        <td key={p.id} className="border border-gray-300 px-2 py-2 text-center font-mono">
                                                            {qty > 0 ? qty : '-'}
                                                        </td>
                                                    );
                                                })}
                                                <td className="border border-gray-300 px-2 py-2 text-right font-bold text-red-600">
                                                    ${order.total || 0}
                                                </td>
                                            </tr>
                                        ))}
                                        {/* 總計行 */}
                                        <tr className="bg-orange-100 font-bold">
                                            <td className="border border-gray-300 px-2 py-2">總計</td>
                                            {PRODUCTS.map(p => (
                                                <td key={p.id} className="border border-gray-300 px-2 py-2 text-center text-blue-700">
                                                    {stats[p.id] || 0}
                                                </td>
                                            ))}
                                            <td className="border border-gray-300 px-2 py-2 text-right text-red-700 text-lg">
                                                ${grandTotalMoney.toLocaleString()}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Footer */}
                            <div className="text-center text-xs text-gray-500 pt-4 border-t">
                                <p>丸東魚丸 · 不含硼砂 · 口感紮實 · 安心美味</p>
                                <p className="mt-1">本單由「丸東魚丸團購系統」產生</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default LeaderView;

