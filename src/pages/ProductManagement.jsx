import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../hooks/useProducts';
import { addProduct, updateProduct, deleteProduct, initProducts } from '../utils/firebase';
import { DEFAULT_PRODUCTS } from '../utils/constants';
import UpdatePrompt from '../components/UpdatePrompt';

function ProductManagement() {
  const navigate = useNavigate();
  const { products, loading } = useProducts();

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', price: '', unit: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', price: '', unit: '斤' });
  const [saving, setSaving] = useState(false);

  // 初始化產品到 Firebase
  const handleInit = async () => {
    if (!confirm('確定要將預設產品匯入 Firebase 嗎？這會覆蓋目前的產品資料。')) return;
    setSaving(true);
    try {
      await initProducts(DEFAULT_PRODUCTS);
    } catch (err) {
      alert('匯入失敗：' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // 開始編輯
  const startEdit = (product) => {
    setEditingId(product.id);
    setEditForm({ name: product.name, price: product.price, unit: product.unit });
  };

  // 儲存編輯
  const handleSave = async (productId) => {
    if (!editForm.name.trim() || !editForm.price) return;
    setSaving(true);
    try {
      await updateProduct(productId, {
        name: editForm.name.trim(),
        price: Number(editForm.price),
        unit: editForm.unit.trim()
      });
      setEditingId(null);
    } catch (err) {
      alert('儲存失敗：' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // 刪除產品
  const handleDelete = async (productId, productName) => {
    if (!confirm(`確定要刪除「${productName}」嗎？已建立的訂單不會受影響。`)) return;
    setSaving(true);
    try {
      await deleteProduct(productId);
    } catch (err) {
      alert('刪除失敗：' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // 新增產品
  const handleAdd = async () => {
    if (!newForm.name.trim() || !newForm.price) return;
    setSaving(true);
    try {
      await addProduct({
        name: newForm.name.trim(),
        price: Number(newForm.price),
        unit: newForm.unit.trim() || '斤'
      });
      setNewForm({ name: '', price: '', unit: '斤' });
      setIsAdding(false);
    } catch (err) {
      alert('新增失敗：' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">載入中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <UpdatePrompt />

      {/* 頂部導覽 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 hover:text-gray-800 flex items-center gap-1"
          >
            <i className="fa-solid fa-arrow-left"></i>
            <span>返回</span>
          </button>
          <h1 className="text-lg font-bold text-gray-800">產品管理</h1>
          <div className="w-16"></div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* 初始化提示 */}
        {products.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
            <p className="text-yellow-800 mb-3">Firebase 尚無產品資料</p>
            <button
              onClick={handleInit}
              disabled={saving}
              className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
            >
              匯入預設產品
            </button>
          </div>
        )}

        {/* 產品列表 */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
            <h2 className="font-bold text-gray-700">
              產品列表
              <span className="ml-2 text-sm font-normal text-gray-500">({products.length} 項)</span>
            </h2>
            {products.length > 0 && (
              <button
                onClick={handleInit}
                disabled={saving}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                重設為預設
              </button>
            )}
          </div>

          <div className="divide-y">
            {products.map((product) => (
              <div key={product.id} className="px-4 py-3">
                {editingId === product.id ? (
                  /* 編輯模式 */
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="產品名稱"
                        className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                      <input
                        type="number"
                        value={editForm.price}
                        onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                        placeholder="價格"
                        className="w-24 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                      <input
                        type="text"
                        value={editForm.unit}
                        onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                        placeholder="單位"
                        className="w-20 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => handleSave(product.id)}
                        disabled={saving}
                        className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        儲存
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 顯示模式 */
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-800">{product.name}</span>
                      <span className="ml-3 text-orange-600 font-bold">${product.price}</span>
                      <span className="ml-1 text-gray-500 text-sm">/ {product.unit}</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(product)}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <i className="fa-solid fa-pen text-sm"></i>
                      </button>
                      <button
                        onClick={() => handleDelete(product.id, product.name)}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <i className="fa-solid fa-trash text-sm"></i>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 新增產品 */}
          {isAdding ? (
            <div className="px-4 py-3 border-t bg-blue-50">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newForm.name}
                    onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                    placeholder="產品名稱"
                    className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                    autoFocus
                  />
                  <input
                    type="number"
                    value={newForm.price}
                    onChange={(e) => setNewForm({ ...newForm, price: e.target.value })}
                    placeholder="價格"
                    className="w-24 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                  <input
                    type="text"
                    value={newForm.unit}
                    onChange={(e) => setNewForm({ ...newForm, unit: e.target.value })}
                    placeholder="單位"
                    className="w-20 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setIsAdding(false); setNewForm({ name: '', price: '', unit: '斤' }); }}
                    className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={saving || !newForm.name.trim() || !newForm.price}
                    className="px-3 py-1.5 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    新增
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 border-t">
              <button
                onClick={() => setIsAdding(true)}
                className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                <i className="fa-solid fa-plus"></i>
                新增產品
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductManagement;
