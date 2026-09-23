import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlarmClock,
  Boxes,
  Check,
  Fan,
  Leaf,
  Pencil,
  Plus,
  ScanLine,
  Search,
  Share2,
  Snowflake,
  Sparkles,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import { useFridge } from '../context/FridgeContext';
import * as fridgeApi from '../api/fridge';
import * as recipeApi from '../api/recipe';
import ExpiryBadge from '../components/ExpiryBadge';
import CategoryIcon from '../components/CategoryIcon';
import FridgeItemModal from '../components/FridgeItemModal';
import GenerateRecipeModal from '../components/GenerateRecipeModal';
import ReceiptScanModal from '../components/ReceiptScanModal';
import RecipeDetailModal from '../components/RecipeDetailModal';
import IngredientStatsView from '../components/IngredientStatsView';
import IngredientStatsSkeleton from '../components/IngredientStatsSkeleton';
import FridgeItemRowSkeleton from '../components/FridgeItemRowSkeleton';
import {
  STORAGE_LOCATION_LABEL,
  getDday,
  getShelfLifeProgress,
} from '../utils/expiry';
import { nutritionFacts, nutritionSourceLabel } from '../utils/nutrition';
import EmptyFridgeState from '../components/EmptyFridgeState';
import Button from '../components/Button';
import NutritionFactsLine from '../components/NutritionFactsLine';
import '../styles/tabs.css';
import '../components/NutritionTag.css';
import './FridgeItemsPage.css';

const URGENCY_LABEL = {
  danger: '소비기한 임박',
  warning: '신선도 보통',
  safe: '신선 유지 중',
};

const STORAGE_LOCATION_ICON = {
  REFRIGERATED: Fan,
  FROZEN: Snowflake,
  ROOM_TEMP: Sun,
};

const SORT_OPTIONS = [
  { value: 'expiry', label: '기한순' },
  { value: 'created', label: '등록순' },
  { value: 'updated', label: '수정순' },
];

const PRIMARY_VIEWS = [
  { value: 'list', label: '재료 목록' },
  { value: 'stats', label: '재료 현황' },
];

export default function FridgeItemsPage() {
  const { selectedFridge, loading: fridgeLoading } = useFridge();
  const [view, setView] = useState('list');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState('expiry');
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [storageFilter, setStorageFilter] = useState(null);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // { mode: 'create' } | { mode: 'edit', item }
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [showBulkGenerate, setShowBulkGenerate] = useState(false);
  const [openRecipeId, setOpenRecipeId] = useState(null);
  const [showReceiptScan, setShowReceiptScan] = useState(false);

  const fridgeId = selectedFridge?.id;
  // 냉장고를 빠르게 전환했을 때 이전 냉장고의 응답이 늦게 도착해서 지금 선택된 냉장고의 목록을
  // 덮어써버리는 걸 막기 위해, 응답이 왔을 때도 여전히 같은 냉장고인지 확인한다.
  const fridgeIdRef = useRef(fridgeId);
  useEffect(() => {
    fridgeIdRef.current = fridgeId;
  }, [fridgeId]);

  // silent: 추가/수정/삭제 후 갱신처럼 이미 목록이 떠 있는 상태에서는 로딩 문구로 목록을 갈아끼우지 않는다(깜빡임 방지).
  const loadItems = useCallback(
    async ({ silent = false } = {}) => {
      const requestedFridgeId = fridgeId;
      if (!requestedFridgeId) {
        setItems([]);
        return;
      }
      if (!silent) setLoading(true);
      setError('');
      try {
        const data = await fridgeApi.getFridgeItems(requestedFridgeId);
        if (fridgeIdRef.current !== requestedFridgeId) return;
        setItems(data);
      } catch (err) {
        if (fridgeIdRef.current === requestedFridgeId) setError(err.message);
      } finally {
        if (fridgeIdRef.current === requestedFridgeId) setLoading(false);
      }
    },
    [fridgeId],
  );

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const sortedItems = useMemo(() => {
    const copy = [...items];
    if (sort === 'expiry') {
      copy.sort((a, b) => {
        const da = getDday(a.expiryDate);
        const db = getDday(b.expiryDate);
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db;
      });
    } else if (sort === 'created') {
      copy.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sort === 'updated') {
      copy.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }
    return copy;
  }, [items, sort]);

  const storageCounts = useMemo(() => {
    const counts = { REFRIGERATED: 0, FROZEN: 0, ROOM_TEMP: 0 };
    for (const item of items) {
      if (counts[item.storageLocation] != null)
        counts[item.storageLocation] += 1;
    }
    return counts;
  }, [items]);

  const urgentCount = useMemo(
    () =>
      items.filter((item) => {
        const dday = getDday(item.expiryDate);
        return dday !== null && dday <= 7;
      }).length,
    [items],
  );
  const freshnessScore = items.length
    ? Math.round(((items.length - urgentCount) / items.length) * 100)
    : null;

  const categories = useMemo(() => {
    const names = new Set();
    for (const item of items) {
      if (item.categoryName) names.add(item.categoryName);
    }
    return [...names].sort();
  }, [items]);

  // 냉장고를 전환해서 이전에 고른 카테고리가 더 이상 없으면(예: 다른 냉장고로 넘어옴) "전체"로 취급한다.
  const effectiveCategoryFilter = categories.includes(categoryFilter)
    ? categoryFilter
    : null;

  const visibleItems = useMemo(() => {
    let result = sortedItems;
    if (storageFilter) {
      result = result.filter((item) => item.storageLocation === storageFilter);
    }
    if (effectiveCategoryFilter) {
      result = result.filter(
        (item) => item.categoryName === effectiveCategoryFilter,
      );
    }
    const keyword = search.trim().toLowerCase();
    if (keyword) {
      result = result.filter((item) =>
        item.ingredientName.toLowerCase().includes(keyword),
      );
    }
    return result;
  }, [sortedItems, storageFilter, effectiveCategoryFilter, search]);

  async function handleCreate(payload) {
    await fridgeApi.createFridgeItem(fridgeId, payload);
    await loadItems({ silent: true });
  }

  async function handleUpdate(itemId, payload) {
    await fridgeApi.updateFridgeItem(fridgeId, itemId, payload);
    await loadItems({ silent: true });
  }

  async function handleDelete(item) {
    if (!window.confirm(`'${item.ingredientName}'을(를) 삭제할까요?`)) return;
    await fridgeApi.deleteFridgeItem(fridgeId, item.id);
    await loadItems({ silent: true });
  }

  function toggleSelected(itemId) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  const selectedItems = items.filter((item) => selectedIds.has(item.id));

  async function handleBulkGenerate(note, useFridgeIngredients) {
    const names = selectedItems.map((item) => item.ingredientName).join(', ');
    const combinedNote = [note, `${names} 재료를 활용한 레시피로 만들어줘.`]
      .filter(Boolean)
      .join(' ');
    const recipe = await recipeApi.generateRecipe(
      fridgeId,
      combinedNote,
      useFridgeIngredients,
    );
    setSelectedIds(new Set());
    setOpenRecipeId(recipe.id);
  }

  async function handleBulkDelete() {
    if (!window.confirm(`선택한 재료 ${selectedItems.length}개를 삭제할까요?`))
      return;
    await Promise.all(
      selectedItems.map((item) =>
        fridgeApi.deleteFridgeItem(fridgeId, item.id),
      ),
    );
    setSelectedIds(new Set());
    await loadItems({ silent: true });
  }

  if (!fridgeLoading && !selectedFridge) {
    return <EmptyFridgeState />;
  }

  return (
    <div className="fridge-items-page">
      <div className="fridge-items-banner">
        <div className="fridge-items-banner-main">
          <span className="fridge-items-banner-eyebrow">
            <Sparkles size={12} aria-hidden="true" />
            스마트 냉장고 인벤토리
          </span>
          <h1>냉장고 재료 관리 &amp; 스마트 인벤토리</h1>
          <p className="fridge-items-banner-description">
            오늘 당장 조리 가능한 냉털 레시피를 매칭합니다.
          </p>
        </div>
      </div>

      <div className="primary-tabs">
        {PRIMARY_VIEWS.map((v) => (
          <button
            key={v.value}
            type="button"
            className={`primary-tab${view === v.value ? ' primary-tab--active' : ''}`}
            onClick={() => setView(v.value)}
          >
            {v.label}
          </button>
        ))}
        {view === 'list' && (
          <div className="fridge-items-sort">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`sort-chip${sort === opt.value ? ' sort-chip--active' : ''}`}
                onClick={() => setSort(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <div className="form-error">{error}</div>}

      {view === 'stats' ? (
        loading ? (
          <IngredientStatsSkeleton />
        ) : (
          <IngredientStatsView items={items} />
        )
      ) : (
        <>
          <div className="fridge-storage-toolbar">
            <div className="fridge-storage-tabs">
              <button
                type="button"
                className={`fridge-storage-tab${storageFilter === null ? ' fridge-storage-tab--active' : ''}`}
                onClick={() => setStorageFilter(null)}
              >
                전체
                <span className="fridge-storage-tab-count">{items.length}</span>
              </button>
              {Object.entries(STORAGE_LOCATION_LABEL).map(([value, label]) => {
                const StorageIcon = STORAGE_LOCATION_ICON[value];
                return (
                  <button
                    key={value}
                    type="button"
                    className={`fridge-storage-tab${storageFilter === value ? ' fridge-storage-tab--active' : ''}`}
                    onClick={() => setStorageFilter(value)}
                  >
                    {StorageIcon && (
                      <StorageIcon size={14} aria-hidden="true" />
                    )}
                    {label}
                    <span className="fridge-storage-tab-count">
                      {storageCounts[value] ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="fridge-storage-toolbar-actions">
              {fridgeId && (
                <Link to="/share" className="btn btn-ghost fridge-scan-btn">
                  <Share2 size={16} aria-hidden="true" />
                  <span className="fridge-toolbar-btn-full">
                    냉장고 공유하기
                  </span>
                  <span className="fridge-toolbar-btn-short">공유하기</span>
                </Link>
              )}
              <Button
                variant="ghost"
                className="fridge-scan-btn"
                disabled={!fridgeId}
                onClick={() => setShowReceiptScan(true)}
              >
                <ScanLine size={16} aria-hidden="true" />
                <span className="fridge-toolbar-btn-full">영수증 스캔 OCR</span>
                <span className="fridge-toolbar-btn-short">영수증 스캔</span>
              </Button>
              <Button
                className="fridge-add-btn"
                disabled={!fridgeId}
                onClick={() => setModal({ mode: 'create' })}
              >
                <Plus size={16} aria-hidden="true" />
                <span className="fridge-toolbar-btn-full">재료 직접 등록</span>
                <span className="fridge-toolbar-btn-short">재료 등록</span>
              </Button>
            </div>
          </div>

          <div className="fridge-items-search">
            <Search size={18} aria-hidden="true" />
            <input
              type="text"
              className="fridge-items-search-input"
              placeholder="재료명 검색 (예: 계란, 양파)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {categories.length > 0 && (
            <div className="fridge-items-toolbar fridge-items-category-filter">
              <button
                type="button"
                className={`sort-chip${effectiveCategoryFilter === null ? ' sort-chip--active' : ''}`}
                onClick={() => setCategoryFilter(null)}
              >
                전체
              </button>
              {categories.map((name) => (
                <button
                  key={name}
                  type="button"
                  className={`sort-chip${effectiveCategoryFilter === name ? ' sort-chip--active' : ''}`}
                  onClick={() => setCategoryFilter(name)}
                >
                  {name}
                </button>
              ))}
            </div>
          )}

          {!loading && visibleItems.length > 0 && (
            <div className="fridge-items-list-hint">
              <div className="fridge-items-list-hint-left">
                <span>총 {visibleItems.length}개 품목</span>
                <button
                  type="button"
                  className="fridge-items-select-all"
                  onClick={() => {
                    const allSelected = visibleItems.every((item) =>
                      selectedIds.has(item.id),
                    );
                    setSelectedIds(
                      allSelected
                        ? new Set()
                        : new Set(visibleItems.map((item) => item.id)),
                    );
                  }}
                >
                  {visibleItems.every((item) => selectedIds.has(item.id))
                    ? '전체 선택 해제'
                    : '전체 선택'}
                </button>
              </div>
              {selectedIds.size === 0 && (
                <span className="fridge-items-list-hint-note">
                  체크박스를 선택하면 선택한 재료로 레시피를 만들 수 있어요.
                </span>
              )}
            </div>
          )}

          {loading ? (
            <ul className="fridge-item-list">
              {Array.from({ length: 6 }).map((_, i) => (
                <li key={i}>
                  <FridgeItemRowSkeleton />
                </li>
              ))}
            </ul>
          ) : visibleItems.length === 0 ? (
            <p className="fridge-items-empty">
              {search.trim()
                ? `'${search.trim()}' 검색 결과가 없어요.`
                : effectiveCategoryFilter
                  ? '이 카테고리에는 재료가 없어요.'
                  : storageFilter
                    ? `${STORAGE_LOCATION_LABEL[storageFilter]} 보관 재료가 없어요.`
                    : '아직 등록된 재료가 없어요. 재료를 추가해보세요.'}
            </p>
          ) : (
            <ul className="fridge-item-list">
              {visibleItems.map((item) => {
                const StorageIcon = STORAGE_LOCATION_ICON[item.storageLocation];
                const nutrition = nutritionFacts(item);
                const source = nutritionSourceLabel(
                  item.nutritionDataSource,
                  item.nutritionVerified,
                );
                const shelfProgress = getShelfLifeProgress(
                  item.purchasedAt,
                  item.expiryDate,
                );
                const urgency =
                  getDday(item.expiryDate) === null
                    ? null
                    : getDday(item.expiryDate) <= 3
                      ? 'danger'
                      : getDday(item.expiryDate) <= 7
                        ? 'warning'
                        : 'safe';
                const isSelected = selectedIds.has(item.id);
                return (
                  <li
                    key={item.id}
                    className={`fridge-item-card${isSelected ? ' fridge-item-card--selected' : ''}`}
                  >
                    <div className="fridge-item-card-top">
                      <button
                        type="button"
                        className="fridge-item-checkbox"
                        aria-pressed={isSelected}
                        aria-label={isSelected ? '선택 해제' : '선택'}
                        onClick={() => toggleSelected(item.id)}
                      >
                        {isSelected && (
                          <Check size={13} aria-hidden="true" strokeWidth={3} />
                        )}
                      </button>
                      <div className="fridge-item-card-thumb">
                        <CategoryIcon
                          categoryName={item.categoryName}
                          size={44}
                        />
                      </div>
                      <div className="fridge-item-card-main">
                        <div className="fridge-item-card-tags">
                          {item.categoryName && (
                            <span className="fridge-item-card-tag">
                              {item.categoryName}
                            </span>
                          )}
                          {StorageIcon && (
                            <span
                              className="fridge-item-card-storage-icon"
                              data-storage={item.storageLocation}
                              title={
                                STORAGE_LOCATION_LABEL[item.storageLocation]
                              }
                            >
                              <StorageIcon size={13} aria-hidden="true" />
                            </span>
                          )}
                        </div>
                        <div className="fridge-item-card-title-row">
                          <span className="fridge-item-card-name">
                            {item.ingredientName}
                          </span>
                          <ExpiryBadge expiryDate={item.expiryDate} />
                        </div>
                        <p className="fridge-item-card-meta">
                          {item.quantity}
                          {item.unit}
                          {item.memo ? ` · ${item.memo}` : ''}
                        </p>
                      </div>
                    </div>

                    {nutrition && (
                      <NutritionFactsLine
                        basis={nutrition.basis}
                        facts={nutrition.facts}
                        source={source}
                      />
                    )}

                    <div
                      className={`fridge-item-card-progress fridge-item-card-progress--${shelfProgress !== null ? (urgency ?? 'safe') : 'neutral'}`}
                    >
                      <span className="fridge-item-card-progress-label">
                        {shelfProgress !== null
                          ? URGENCY_LABEL[urgency ?? 'safe']
                          : '소비기한 미지정'}
                      </span>
                      <span className="fridge-item-card-progress-track">
                        <span
                          className="fridge-item-card-progress-fill"
                          style={{ width: `${shelfProgress ?? 0}%` }}
                        />
                      </span>
                      <span className="fridge-item-card-progress-value">
                        {shelfProgress !== null
                          ? `${shelfProgress}% 경과`
                          : '-'}
                      </span>
                    </div>

                    <div className="fridge-item-card-footer">
                      <span className="fridge-item-card-date">
                        소비기한:{' '}
                        {item.expiryDate
                          ? item.expiryDate.replaceAll('-', '.')
                          : '미지정'}
                      </span>

                      <div className="fridge-item-card-qty-actions">
                        <span className="fridge-item-card-qty">
                          {item.quantity}
                          {item.unit}
                        </span>
                        <div className="fridge-item-card-actions">
                          <button
                            type="button"
                            className="fridge-item-card-actions-edit"
                            aria-label="수정"
                            title="수정"
                            onClick={() => setModal({ mode: 'edit', item })}
                          >
                            <Pencil size={14} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="fridge-item-card-actions-delete"
                            aria-label="삭제"
                            title="삭제"
                            onClick={() => handleDelete(item)}
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {modal?.mode === 'create' && (
        <FridgeItemModal
          mode="create"
          fridgeId={fridgeId}
          onClose={() => setModal(null)}
          onSubmit={handleCreate}
          onRefresh={() => loadItems({ silent: true })}
        />
      )}
      {modal?.mode === 'edit' && (
        <FridgeItemModal
          mode="edit"
          initialItem={modal.item}
          onClose={() => setModal(null)}
          onSubmit={(payload) => handleUpdate(modal.item.id, payload)}
        />
      )}

      {showBulkGenerate && (
        <GenerateRecipeModal
          onClose={() => setShowBulkGenerate(false)}
          onGenerate={handleBulkGenerate}
        />
      )}

      {showReceiptScan && (
        <ReceiptScanModal
          fridgeId={fridgeId}
          onClose={() => setShowReceiptScan(false)}
          onComplete={() => loadItems({ silent: true })}
        />
      )}

      {openRecipeId && (
        <RecipeDetailModal
          recipeId={openRecipeId}
          fridgeId={fridgeId}
          onClose={() => setOpenRecipeId(null)}
        />
      )}

      {selectedIds.size > 0 && (
        <div className="fridge-selection-bar">
          <button
            type="button"
            className="fridge-selection-bar-cancel"
            aria-label="선택 취소"
            title="선택 취소"
            onClick={() => setSelectedIds(new Set())}
          >
            <X size={16} aria-hidden="true" />
          </button>

          <div className="fridge-selection-bar-info">
            <span className="fridge-selection-bar-count">
              {selectedIds.size}
            </span>
            <div>
              <p className="fridge-selection-bar-title">
                선택된 재료 {selectedIds.size}개
              </p>
              <p className="fridge-selection-bar-names">
                {selectedItems.map((item) => item.ingredientName).join(', ')}
              </p>
            </div>
          </div>
          <div className="fridge-selection-bar-actions">
            <button
              type="button"
              className="fridge-selection-bar-delete"
              onClick={handleBulkDelete}
            >
              <Trash2 size={14} aria-hidden="true" />
              재료 삭제
            </button>
            <button
              type="button"
              className="fridge-selection-bar-generate"
              onClick={() => setShowBulkGenerate(true)}
            >
              <Sparkles size={14} aria-hidden="true" />
              선택 재료로 AI 레시피 만들기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
