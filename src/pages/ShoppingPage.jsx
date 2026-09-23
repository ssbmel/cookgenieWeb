import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Clock,
  EyeOff,
  ListChecks,
  Search,
  ShoppingBag,
  Tag,
  X,
} from 'lucide-react';
import { useFridge } from '../context/FridgeContext';
import * as shoppingApi from '../api/shopping';
import Modal from '../components/Modal';
import ShoppingItemPicker from '../components/ShoppingItemPicker';
import CoupangPriceResults from '../components/CoupangPriceResults';
import EmptyFridgeState from '../components/EmptyFridgeState';
import ShoppingRowSkeleton from '../components/ShoppingRowSkeleton';
import { formatRelativeTime } from '../utils/time';
import './ShoppingPage.css';

export default function ShoppingPage() {
  const { selectedFridge, loading: fridgeLoading } = useFridge();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [priceCheckItem, setPriceCheckItem] = useState(null);
  const [hideDone, setHideDone] = useState(false);

  const fridgeId = selectedFridge?.id;
  // 냉장고를 빠르게 전환했을 때 이전 냉장고의 응답이 늦게 도착해서 지금 선택된 냉장고의 목록을
  // 덮어써버리는 걸 막기 위해, 응답이 왔을 때도 여전히 같은 냉장고인지 확인한다.
  const fridgeIdRef = useRef(fridgeId);
  useEffect(() => {
    fridgeIdRef.current = fridgeId;
  }, [fridgeId]);

  const loadItems = useCallback(async () => {
    const requestedFridgeId = fridgeId;
    if (!requestedFridgeId) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await shoppingApi.getShoppingItems(requestedFridgeId);
      if (fridgeIdRef.current !== requestedFridgeId) return;
      setItems(data);
    } catch (err) {
      if (fridgeIdRef.current === requestedFridgeId) setError(err.message);
    } finally {
      if (fridgeIdRef.current === requestedFridgeId) setLoading(false);
    }
  }, [fridgeId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const doneCount = useMemo(
    () => items.filter((i) => i.checked).length,
    [items],
  );
  const visibleItems = useMemo(
    () => (hideDone ? items.filter((i) => !i.checked) : items),
    [items, hideDone],
  );

  async function handleToggleChecked(item) {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)),
    );
    try {
      await shoppingApi.updateShoppingItemChecked(
        fridgeId,
        item.id,
        !item.checked,
      );
    } catch (err) {
      setError(err.message);
      loadItems();
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`'${item.name}'을(를) 목록에서 삭제할까요?`)) return;
    try {
      await shoppingApi.deleteShoppingItem(fridgeId, item.id);
      await loadItems();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handlePickName(name) {
    await shoppingApi.addShoppingItem(fridgeId, name);
    await loadItems();
  }

  if (!fridgeLoading && !selectedFridge) {
    return <EmptyFridgeState />;
  }

  return (
    <div className="shopping-page">
      <div className="shopping-hero">
        <h1>장보기</h1>
        <p>{selectedFridge ? selectedFridge.name : '냉장고를 선택해주세요'}</p>

        <div className="shopping-hero-kpis">
          <div className="shopping-hero-kpi">
            <span className="shopping-hero-kpi-icon shopping-hero-kpi-icon--primary">
              <ShoppingBag size={15} aria-hidden="true" />
            </span>
            <div>
              <span>담긴 품목수</span>
              <strong>{items.length}개</strong>
            </div>
          </div>
          <div className="shopping-hero-kpi">
            <span className="shopping-hero-kpi-icon shopping-hero-kpi-icon--tertiary">
              <ListChecks size={15} aria-hidden="true" />
            </span>
            <div>
              <span>완료</span>
              <strong>{doneCount}개</strong>
            </div>
          </div>
          <div className="shopping-hero-kpi">
            <span className="shopping-hero-kpi-icon shopping-hero-kpi-icon--secondary">
              <Clock size={15} aria-hidden="true" />
            </span>
            <div>
              <span>미완료</span>
              <strong>{items.length - doneCount}개</strong>
            </div>
          </div>
        </div>

        {items.length > 0 && (
          <div className="shopping-hero-controls">
            <button
              type="button"
              className={`shopping-hide-done${hideDone ? ' shopping-hide-done--active' : ''}`}
              onClick={() => setHideDone((v) => !v)}
            >
              <EyeOff size={13} aria-hidden="true" />
              완료 항목 숨기기
            </button>
            <span className="shopping-hero-controls-note">
              체크하면 완료 처리, 옆 태그로 최저가를 바로 확인해요.
            </span>
          </div>
        )}
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="shopping-columns">
        <div className="shopping-list-col">
          {loading ? (
            <ShoppingRowSkeleton />
          ) : items.length === 0 ? (
            <p className="shopping-empty">
              아직 담아둔 재료가 없어요. 재료를 추가해보세요.
            </p>
          ) : visibleItems.length === 0 ? (
            <p className="shopping-empty">
              완료된 항목만 있어요. "완료 항목 숨기기"를 꺼보세요.
            </p>
          ) : (
            <ul className="shopping-list">
              {visibleItems.map((item) => (
                <li
                  key={item.id}
                  className={`shopping-row${item.checked ? ' shopping-row--checked' : ''}${priceCheckItem?.id === item.id ? ' shopping-row--selected' : ''}`}
                >
                  <button
                    type="button"
                    className="shopping-checkbox"
                    aria-label={item.checked ? '완료 해제' : '완료 처리'}
                    onClick={() => handleToggleChecked(item)}
                  >
                    {item.checked && (
                      <Check size={14} aria-hidden="true" strokeWidth={3} />
                    )}
                  </button>
                  <span className="shopping-row-icon">
                    <ShoppingBag size={18} aria-hidden="true" />
                  </span>
                  <div className="shopping-row-main">
                    <span className="shopping-row-name">{item.name}</span>
                    <span className="shopping-row-time">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="shopping-price-btn"
                    aria-label="최저가 확인"
                    title="최저가 확인"
                    onClick={() => setPriceCheckItem(item)}
                  >
                    <Tag size={14} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="shopping-delete-btn"
                    aria-label="삭제"
                    onClick={() => handleDelete(item)}
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            className="shopping-fab"
            disabled={!fridgeId}
            onClick={() => setShowPicker(true)}
          >
            + 재료 추가
          </button>
        </div>

        <div className="shopping-price-col">
          <div className="shopping-price-panel">
            <div className="shopping-price-panel-header">
              <Search size={16} aria-hidden="true" />
              <h2>
                {priceCheckItem
                  ? `'${priceCheckItem.name}' 최저가 비교`
                  : '최저가 비교'}
              </h2>
            </div>
            {priceCheckItem ? (
              <CoupangPriceResults keyword={priceCheckItem.name} />
            ) : (
              <p className="shopping-price-panel-empty">
                목록에서 재료의 '최저가 확인'을 눌러보세요. 쿠팡 최저가 상품을
                바로 보여드려요.
              </p>
            )}
          </div>
        </div>
      </div>

      {showPicker && (
        <Modal title="장보기 재료 추가" onClose={() => setShowPicker(false)}>
          <ShoppingItemPicker
            onSelect={async (name) => {
              await handlePickName(name);
              setShowPicker(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
