import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  PackageSearch,
  Pencil,
  Refrigerator,
  ScanLine,
  Search,
  Trash2,
} from 'lucide-react';
import * as ingredientApi from '../api/ingredient';
import * as fridgeApi from '../api/fridge';
import CategoryIcon from './CategoryIcon';
import ReferenceNutritionTag from './ReferenceNutritionTag';
import NutritionFactsLine from './NutritionFactsLine';
import ReceiptScanModal from './ReceiptScanModal';
import IngredientCategoryGridSkeleton from './IngredientCategoryGridSkeleton';
import { nutritionFacts, nutritionSourceLabel } from '../utils/nutrition';
import {
  addRecentIngredient,
  getRecentIngredients,
} from '../utils/recentIngredients';
import Button from './Button';
import '../styles/forms.css';
import './RecipeCardSkeleton.css';
import './IngredientPicker.css';

/** FridgeItemResponse -> IngredientPicker/ReferenceNutritionTag가 기대하는 "재료" 모양으로 변환. */
function fridgeItemToIngredient(item) {
  return {
    id: item.ingredientId,
    name: item.ingredientName,
    categoryName: item.categoryName,
    defaultUnit: item.unit,
    referenceAmount: item.referenceAmount,
    referenceUnit: item.referenceUnit,
    referenceCalories: item.referenceCalories,
    referenceCarbohydrateG: item.referenceCarbohydrateG,
    referenceProteinG: item.referenceProteinG,
    referenceFatG: item.referenceFatG,
    dataSource: item.nutritionDataSource,
    isVerified: item.nutritionVerified,
  };
}

const EMPTY_FORM = { name: '', categoryName: '', defaultUnit: '' };
const EMPTY_NUTRITION_FORM = {
  calories: '',
  carbohydrateG: '',
  proteinG: '',
  fatG: '',
};

function toNutritionForm(ingredient) {
  return {
    calories: ingredient?.referenceCalories ?? '',
    carbohydrateG: ingredient?.referenceCarbohydrateG ?? '',
    proteinG: ingredient?.referenceProteinG ?? '',
    fatG: ingredient?.referenceFatG ?? '',
  };
}

function hasNutritionInput(nutritionForm) {
  return Object.values(nutritionForm).some((v) => v !== '' && v != null);
}

function toNutritionPayload(nutritionForm) {
  const toNumber = (v) => (v === '' || v == null ? null : Number(v));
  return {
    calories: toNumber(nutritionForm.calories),
    carbohydrateG: toNumber(nutritionForm.carbohydrateG),
    proteinG: toNumber(nutritionForm.proteinG),
    fatG: toNumber(nutritionForm.fatG),
  };
}

/** 하위 화면(검색/등록/수정) 공통 헤더: 뒤로가기 + 제목 + 설명. */
function PickerHeader({ title, description, backLabel, onBack }) {
  return (
    <div className="ingredient-picker-header">
      <button type="button" className="ingredient-picker-back" onClick={onBack}>
        <ArrowLeft size={16} aria-hidden="true" />
        {backLabel}
      </button>
      <h3 className="ingredient-picker-title">{title}</h3>
      {description && <p className="ingredient-picker-desc">{description}</p>}
    </div>
  );
}

/** 메인 화면을 기능별로 나누는 제목 있는 구획. */
function PickerSection({ icon: Icon, title, children }) {
  return (
    <section className="ingredient-section">
      <h4 className="ingredient-section-title">
        <Icon size={14} aria-hidden="true" />
        {title}
      </h4>
      {children}
    </section>
  );
}

function QuickPickChips({ ingredients, onPick }) {
  return (
    <div className="ingredient-recent-chips">
      {ingredients.map((ingredient) => (
        <button
          type="button"
          key={ingredient.id}
          className="ingredient-recent-chip"
          onClick={() => onPick(ingredient)}
        >
          <CategoryIcon categoryName={ingredient.categoryName} size={18} />
          {ingredient.name}
        </button>
      ))}
    </div>
  );
}

/** fridgeIngredients를 불러오는 동안 칩 목록 자리에 크기가 비슷한 자리표시자를 보여줘서, 로딩이 끝났을 때
 * 그 부분만 갑자기 생기면서 모달 높이가 튀는 걸(레이아웃 시프트) 막는다. */
function QuickPickChipsSkeleton({ count = 5 }) {
  return (
    <div className="ingredient-recent-chips" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="skeleton-block ingredient-recent-chip-skeleton"
          style={{ width: 60 + ((i * 17) % 40) }}
        />
      ))}
    </div>
  );
}

/**
 * 식재료 검색 + 등록/수정/삭제까지 처리하고, 선택이 끝나면 onSelect(ingredient)를 호출한다.
 * 새 식재료 등록은 카테고리 그리드 -> 추천 재료 그리드 2단계로 진행되고, 목록에 없으면 직접 입력할 수 있다.
 * fridgeId를 주면 그 냉장고에 있는 재료를 바로 골라 담을 수 있는 목록을 보여주고, onReceiptDone까지
 * 같이 주면(냉장고에 실제로 등록하는 흐름일 때만) 영수증 인식으로 여러 재료를 한 번에 담는 기능도 제공한다.
 */
export default function IngredientPicker({
  onSelect,
  fridgeId,
  onReceiptDone,
}) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formMode, setFormMode] = useState(null); // null | 'create' | 'edit' | 'official' | 'dish'
  const [createStep, setCreateStep] = useState('category'); // 'category' | 'pick'
  const [manualEntry, setManualEntry] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [categoryKeyword, setCategoryKeyword] = useState('');
  const [categoryResults, setCategoryResults] = useState([]);
  const [categoryResultsLoading, setCategoryResultsLoading] = useState(false);
  const [scanMode, setScanMode] = useState(null); // null | 'receipt' | 'orderHistory' | 'product'
  const [recentIngredients] = useState(getRecentIngredients);
  const [fridgeIngredients, setFridgeIngredients] = useState([]);
  const [fridgeIngredientsLoading, setFridgeIngredientsLoading] = useState(false);
  const [nutritionForm, setNutritionForm] = useState(EMPTY_NUTRITION_FORM);
  const [estimating, setEstimating] = useState(false);
  const [officialKeyword, setOfficialKeyword] = useState('');
  const [officialResults, setOfficialResults] = useState([]);
  const [officialLoading, setOfficialLoading] = useState(false);
  const [officialSelecting, setOfficialSelecting] = useState(null);
  const [dishKeyword, setDishKeyword] = useState('');
  const [dishResults, setDishResults] = useState([]);
  const [dishLoading, setDishLoading] = useState(false);
  const [dishSelecting, setDishSelecting] = useState(null);

  function selectIngredient(ingredient) {
    addRecentIngredient(ingredient);
    onSelect(ingredient);
  }

  useEffect(() => {
    ingredientApi
      .getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!fridgeId) {
      setFridgeIngredients([]);
      return;
    }
    setFridgeIngredientsLoading(true);
    fridgeApi
      .getFridgeItems(fridgeId)
      .then((items) => {
        const seen = new Set();
        const deduped = [];
        for (const item of items) {
          if (seen.has(item.ingredientId)) continue;
          seen.add(item.ingredientId);
          deduped.push(fridgeItemToIngredient(item));
        }
        setFridgeIngredients(deduped);
      })
      .catch(() => setFridgeIngredients([]))
      .finally(() => setFridgeIngredientsLoading(false));
  }, [fridgeId]);

  useEffect(() => {
    if (formMode !== 'create' || createStep !== 'pick') return;
    const category = categories.find((c) => c.name === form.categoryName);
    if (!category) {
      setSuggestions([]);
      return;
    }
    setSuggestionsLoading(true);
    ingredientApi
      .getIngredientSuggestions(category.id)
      .then((list) => setSuggestions(list.map((s) => s.name)))
      .catch(() => setSuggestions([]))
      .finally(() => setSuggestionsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formMode, createStep, form.categoryName, categories]);

  useEffect(() => {
    if (
      formMode !== 'create' ||
      createStep !== 'pick' ||
      !categoryKeyword.trim()
    ) {
      setCategoryResults([]);
      return;
    }
    const category = categories.find((c) => c.name === form.categoryName);
    if (!category) {
      setCategoryResults([]);
      return;
    }
    setCategoryResultsLoading(true);
    const timer = setTimeout(() => {
      ingredientApi
        .searchIngredients(categoryKeyword, category.id)
        .then(setCategoryResults)
        .catch(() => setCategoryResults([]))
        .finally(() => setCategoryResultsLoading(false));
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formMode, createStep, form.categoryName, categories, categoryKeyword]);

  const runSearch = useCallback(() => {
    if (!keyword.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    ingredientApi
      .searchIngredients(keyword)
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [keyword]);

  useEffect(() => {
    const timer = setTimeout(runSearch, 250);
    return () => clearTimeout(timer);
  }, [runSearch]);

  useEffect(() => {
    if (formMode !== 'official' || !officialKeyword.trim()) {
      setOfficialResults([]);
      return;
    }
    setOfficialLoading(true);
    const timer = setTimeout(() => {
      ingredientApi
        .searchOfficialFoods(officialKeyword.trim())
        .then(setOfficialResults)
        .catch(() => setOfficialResults([]))
        .finally(() => setOfficialLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [formMode, officialKeyword]);

  useEffect(() => {
    if (formMode !== 'dish' || !dishKeyword.trim()) {
      setDishResults([]);
      return;
    }
    setDishLoading(true);
    const timer = setTimeout(() => {
      ingredientApi
        .searchDishes(dishKeyword.trim())
        .then(setDishResults)
        .catch(() => setDishResults([]))
        .finally(() => setDishLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [formMode, dishKeyword]);

  function openCreateForm() {
    setForm({ ...EMPTY_FORM, name: keyword });
    setFormMode('create');
    setCreateStep('category');
    setManualEntry(false);
    setEditingId(null);
    setError('');
  }

  function openOfficialSearch() {
    setFormMode('official');
    setOfficialKeyword(keyword);
    setError('');
  }

  function openDishSearch() {
    setFormMode('dish');
    setDishKeyword(keyword);
    setError('');
  }

  /** 정부 데이터 후보를 그대로(100g/100ml 기준 정규화된 값) 직접 입력값으로 등록한다 - AI 추정 호출 안 함. */
  async function handleSelectOfficial(candidate) {
    setError('');
    setOfficialSelecting(candidate.foodCd);
    try {
      const ingredient = await ingredientApi.createIngredient({
        name: candidate.foodNm,
        categoryName: '가공식품',
        defaultUnit: candidate.referenceUnit,
        calories: candidate.calories,
        carbohydrateG: candidate.carbohydrateG,
        proteinG: candidate.proteinG,
        fatG: candidate.fatG,
        referenceUnit: candidate.referenceUnit,
      });
      selectIngredient(ingredient);
    } catch (err) {
      setError(err.message);
    } finally {
      setOfficialSelecting(null);
    }
  }

  /** 정부 데이터 후보를 그대로(100g/100ml 기준 정규화된 값) 직접 입력값으로 등록한다 - AI 추정 호출 안 함. */
  async function handleSelectDish(candidate) {
    setError('');
    setDishSelecting(candidate.foodCd);
    try {
      const ingredient = await ingredientApi.createIngredient({
        name: candidate.foodNm,
        categoryName: '가공식품',
        defaultUnit: candidate.referenceUnit,
        calories: candidate.calories,
        carbohydrateG: candidate.carbohydrateG,
        proteinG: candidate.proteinG,
        fatG: candidate.fatG,
        referenceUnit: candidate.referenceUnit,
      });
      selectIngredient(ingredient);
    } catch (err) {
      setError(err.message);
    } finally {
      setDishSelecting(null);
    }
  }

  function openEditForm(ingredient) {
    setForm({
      name: ingredient.name,
      categoryName: ingredient.categoryName ?? categories[0]?.name ?? '',
      defaultUnit: ingredient.defaultUnit ?? '',
    });
    setNutritionForm(toNutritionForm(ingredient));
    setFormMode('edit');
    setEditingId(ingredient.id);
    setError('');
  }

  function closeForm() {
    setFormMode(null);
    setEditingId(null);
    setError('');
  }

  function selectCategory(categoryName) {
    setForm((prev) => ({ ...prev, categoryName }));
    setCreateStep('pick');
    setManualEntry(false);
    setCategoryKeyword('');
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (formMode === 'edit') {
        await ingredientApi.updateIngredient(editingId, form);
        if (hasNutritionInput(nutritionForm)) {
          await ingredientApi.updateNutrition(
            editingId,
            toNutritionPayload(nutritionForm),
          );
        }
        closeForm();
        runSearch();
      } else {
        // 카테고리 그리드에서 고르지 않고 직접 이름을 입력하는 경우라 자동 AI 추정을 켜서 기존과 동일하게 동작시킨다.
        const ingredient = await ingredientApi.createIngredient({
          ...form,
          autoEstimateNutrition: true,
        });
        selectIngredient(ingredient);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSuggestionClick(name) {
    setError('');
    setSubmitting(true);
    try {
      const ingredient = await ingredientApi.createIngredient({
        ...form,
        name,
        autoEstimateNutrition: true,
      });
      selectIngredient(ingredient);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEstimateNutrition() {
    setError('');
    setEstimating(true);
    try {
      const ingredient = await ingredientApi.estimateNutrition(editingId);
      setNutritionForm(toNutritionForm(ingredient));
    } catch (err) {
      setError(err.message);
    } finally {
      setEstimating(false);
    }
  }

  async function handleDelete(ingredient) {
    if (!window.confirm(`'${ingredient.name}'을(를) 목록에서 삭제할까요?`))
      return;
    setError('');
    try {
      await ingredientApi.deleteIngredient(ingredient.id);
      runSearch();
    } catch (err) {
      setError(err.message);
    }
  }

  if (formMode === 'edit') {
    return (
      <div className="ingredient-picker">
        <PickerHeader
          title="식재료 수정"
          description="이름·단위·영양정보를 고칠 수 있어요."
          backLabel="검색으로"
          onBack={closeForm}
        />
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="ing-name">식재료 이름</label>
            <input
              id="ing-name"
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoFocus
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="ing-category">카테고리</label>
              <div className="ingredient-picker-category-row">
                <CategoryIcon categoryName={form.categoryName} size={32} />
                <select
                  id="ing-category"
                  className="select"
                  value={form.categoryName}
                  onChange={(e) =>
                    setForm({ ...form, categoryName: e.target.value })
                  }
                  required
                >
                  {categories.length === 0 && (
                    <option value="">카테고리 없음</option>
                  )}
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="ing-unit">기본 단위</label>
              <input
                id="ing-unit"
                className="input"
                placeholder="예: 개, g, ml"
                value={form.defaultUnit}
                onChange={(e) =>
                  setForm({ ...form, defaultUnit: e.target.value })
                }
              />
            </div>
          </div>

          <div className="ingredient-nutrition-section">
            <div className="ingredient-nutrition-header">
              <label>영양정보 (100g/ml 기준)</label>
              <Button
                variant="ghost"
                onClick={handleEstimateNutrition}
                disabled={estimating}
              >
                {estimating ? '추정 중...' : '🤖 AI로 추정하기'}
              </Button>
            </div>
            <p className="form-hint">
              직접 입력하거나, AI 추정 버튼으로 채울 수 있어요. 비워두면
              영양정보 없이 저장돼요.
            </p>
            <div className="ingredient-nutrition-grid">
              <div className="field">
                <label htmlFor="ing-calories">칼로리(kcal)</label>
                <input
                  id="ing-calories"
                  type="number"
                  step="0.1"
                  className="input"
                  value={nutritionForm.calories}
                  onChange={(e) =>
                    setNutritionForm({
                      ...nutritionForm,
                      calories: e.target.value,
                    })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="ing-carb">탄수화물(g)</label>
                <input
                  id="ing-carb"
                  type="number"
                  step="0.1"
                  className="input"
                  value={nutritionForm.carbohydrateG}
                  onChange={(e) =>
                    setNutritionForm({
                      ...nutritionForm,
                      carbohydrateG: e.target.value,
                    })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="ing-protein">단백질(g)</label>
                <input
                  id="ing-protein"
                  type="number"
                  step="0.1"
                  className="input"
                  value={nutritionForm.proteinG}
                  onChange={(e) =>
                    setNutritionForm({
                      ...nutritionForm,
                      proteinG: e.target.value,
                    })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="ing-fat">지방(g)</label>
                <input
                  id="ing-fat"
                  type="number"
                  step="0.1"
                  className="input"
                  value={nutritionForm.fatG}
                  onChange={(e) =>
                    setNutritionForm({ ...nutritionForm, fatG: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <div className="ingredient-picker-actions">
            <Button variant="ghost" onClick={closeForm}>
              취소
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? '저장 중...' : '수정 완료'}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  if (formMode === 'official') {
    return (
      <div className="ingredient-picker">
        <PickerHeader
          title="식약처 가공식품 검색"
          description={'공공데이터에서 찾아요. "불닭"처럼 짧게 검색하고 "볶음면"처럼 이어서 좁혀보세요.'}
          backLabel="검색으로"
          onBack={closeForm}
        />
        {error && <div className="form-error">{error}</div>}

        <input
          className="input"
          placeholder="예: 불닭볶음면"
          value={officialKeyword}
          onChange={(e) => setOfficialKeyword(e.target.value)}
          autoFocus
        />

        <div className="ingredient-picker-results">
          {officialLoading && (
            <p className="ingredient-picker-hint">검색 중...</p>
          )}
          {!officialLoading &&
            officialKeyword.trim() &&
            officialResults.length === 0 && (
              <p className="ingredient-picker-hint">검색 결과가 없어요.</p>
            )}
          {!officialLoading &&
            officialResults.map((candidate) => (
              <button
                type="button"
                key={candidate.foodCd}
                className="ingredient-picker-result-main"
                onClick={() => handleSelectOfficial(candidate)}
                disabled={officialSelecting === candidate.foodCd}
              >
                <span className="ingredient-picker-result-text">
                  <span className="ingredient-picker-result-name">
                    {candidate.foodNm}
                  </span>
                  <span className="ingredient-picker-result-tags">
                    {candidate.mfrNm && (
                      <span className="ingredient-picker-result-category">
                        {candidate.mfrNm}
                      </span>
                    )}
                    {candidate.calories != null && (
                      <span className="ingredient-official-kcal">
                        {candidate.calories}kcal / 100{candidate.referenceUnit}
                      </span>
                    )}
                  </span>
                </span>
                {officialSelecting === candidate.foodCd && (
                  <span className="form-hint">등록 중...</span>
                )}
              </button>
            ))}
        </div>
      </div>
    );
  }

  if (formMode === 'dish') {
    return (
      <div className="ingredient-picker">
        <PickerHeader
          title="식약처 음식 검색"
          description={'배달·외식 메뉴 공공데이터에서 찾아요. "짜장면"처럼 짧게 검색해보세요.'}
          backLabel="검색으로"
          onBack={closeForm}
        />
        {error && <div className="form-error">{error}</div>}

        <input
          className="input"
          placeholder="예: 짜장면, 김치찌개"
          value={dishKeyword}
          onChange={(e) => setDishKeyword(e.target.value)}
          autoFocus
        />

        <div className="ingredient-picker-results">
          {dishLoading && <p className="ingredient-picker-hint">검색 중...</p>}
          {!dishLoading && dishKeyword.trim() && dishResults.length === 0 && (
            <p className="ingredient-picker-hint">검색 결과가 없어요.</p>
          )}
          {!dishLoading &&
            dishResults.map((candidate) => (
              <button
                type="button"
                key={candidate.foodCd}
                className="ingredient-picker-result-main"
                onClick={() => handleSelectDish(candidate)}
                disabled={dishSelecting === candidate.foodCd}
              >
                <span className="ingredient-picker-result-text">
                  <span className="ingredient-picker-result-name">
                    {candidate.foodNm}
                  </span>
                  <span className="ingredient-picker-result-tags">
                    {candidate.restNm && (
                      <span className="ingredient-picker-result-category">
                        {candidate.restNm}
                      </span>
                    )}
                    {candidate.calories != null && (
                      <span className="ingredient-official-kcal">
                        {candidate.calories}kcal / 100{candidate.referenceUnit}
                      </span>
                    )}
                  </span>
                </span>
                {dishSelecting === candidate.foodCd && (
                  <span className="form-hint">등록 중...</span>
                )}
              </button>
            ))}
        </div>
      </div>
    );
  }

  if (formMode === 'create' && createStep === 'category') {
    return (
      <div className="ingredient-picker">
        <PickerHeader
          title="새 식재료 등록"
          description="1/2 · 어떤 종류의 재료인가요?"
          backLabel="검색으로"
          onBack={closeForm}
        />
        {error && <div className="form-error">{error}</div>}
        <div className="ingredient-category-grid">
          {categories.map((c) => (
            <button
              type="button"
              key={c.id}
              className="ingredient-category-card"
              onClick={() => selectCategory(c.name)}
            >
              <CategoryIcon categoryName={c.name} size={44} />
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (formMode === 'create' && createStep === 'pick') {
    return (
      <div className="ingredient-picker">
        <PickerHeader
          title={`새 식재료 등록 · ${form.categoryName}`}
          description="2/2 · 목록에서 고르거나, 없으면 직접 입력하세요."
          backLabel="종류 다시 고르기"
          onBack={() => setCreateStep('category')}
        />
        {error && <div className="form-error">{error}</div>}

        <input
          className="input"
          placeholder={`${form.categoryName} 안에서 검색 (예: 양파, 고등어)`}
          value={categoryKeyword}
          onChange={(e) => setCategoryKeyword(e.target.value)}
          autoFocus
        />

        <div className="ingredient-picker-results">
          {categoryResultsLoading && (
            <p className="ingredient-picker-hint">검색 중...</p>
          )}
          {!categoryResultsLoading &&
            categoryKeyword &&
            categoryResults.length === 0 && (
              <p className="ingredient-picker-hint">
                검색 결과가 없어요. 아래 추천 재료를 골라보세요.
              </p>
            )}
          {!categoryResultsLoading &&
            categoryResults.map((ingredient) => (
              <button
                type="button"
                key={ingredient.id}
                className="ingredient-picker-result-main"
                onClick={() => selectIngredient(ingredient)}
              >
                <CategoryIcon
                  categoryName={ingredient.categoryName}
                  size={32}
                />
                <span className="ingredient-picker-result-text">
                  <span className="ingredient-picker-result-name">
                    {ingredient.name}
                  </span>
                  <ReferenceNutritionTag ingredient={ingredient} />
                </span>
              </button>
            ))}
        </div>

        <p className="ingredient-picker-hint">자주 찾는 재료</p>
        {suggestionsLoading ? (
          <IngredientCategoryGridSkeleton />
        ) : (
          <div className="ingredient-category-grid">
            {suggestions.map((name) => (
              <button
                type="button"
                key={name}
                className="ingredient-category-card"
                onClick={() => handleSuggestionClick(name)}
                disabled={submitting}
              >
                <CategoryIcon categoryName={form.categoryName} size={44} />
                <span>{name}</span>
              </button>
            ))}
          </div>
        )}

        {!manualEntry ? (
          <Button
            variant="ghost"
            block
            className="ingredient-picker-new"
            onClick={() => setManualEntry(true)}
          >
            + 목록에 없나요? 직접 입력하기
          </Button>
        ) : (
          <form onSubmit={handleSubmit} className="ingredient-manual-form">
            <div className="field-row">
              <div className="field">
                <label htmlFor="ing-name">식재료 이름</label>
                <input
                  id="ing-name"
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div className="field">
                <label htmlFor="ing-unit">기본 단위 (선택)</label>
                <input
                  id="ing-unit"
                  className="input"
                  placeholder="예: 개, g, ml"
                  value={form.defaultUnit}
                  onChange={(e) =>
                    setForm({ ...form, defaultUnit: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="ingredient-picker-actions">
              <Button variant="ghost" onClick={() => setManualEntry(false)}>
                취소
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? '등록 중...' : '등록하고 선택'}
              </Button>
            </div>
          </form>
        )}
      </div>
    );
  }

  const isSearching = keyword.trim() !== '';
  const sourceOptions = [
    {
      icon: '🏛️',
      title: '식약처 가공식품에서 찾기',
      desc: '라면·과자 등 포장 식품의 공식 영양정보',
      onClick: openOfficialSearch,
    },
    {
      icon: '🍽️',
      title: '식약처 음식에서 찾기',
      desc: '배달·외식 메뉴의 공식 영양정보',
      onClick: openDishSearch,
    },
    {
      icon: '➕',
      title: '새 식재료 직접 등록',
      desc: '종류를 고르고 직접 만들어요',
      onClick: openCreateForm,
    },
  ];

  return (
    <div className="ingredient-picker">
      <div className="ingredient-picker-search">
        <Search
          className="ingredient-picker-search-icon"
          size={16}
          aria-hidden="true"
        />
        <input
          className="input"
          placeholder="식재료 이름 검색 (예: 계란, 대파)"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          autoFocus
        />
      </div>

      {error && <div className="form-error">{error}</div>}

      {isSearching ? (
        <div className="ingredient-picker-results">
          {loading && <p className="ingredient-picker-hint">검색 중...</p>}
          {!loading && results.length === 0 && (
            <p className="ingredient-picker-hint">
              검색 결과가 없어요. 아래에서 다른 방법으로 찾아보세요.
            </p>
          )}
          {!loading &&
            results.map((ingredient) => {
              const nutrition = nutritionFacts(ingredient);
              const source = nutritionSourceLabel(
                ingredient.dataSource,
                ingredient.isVerified,
              );
              return (
                <div key={ingredient.id} className="ingredient-picker-result">
                  <button
                    type="button"
                    className="ingredient-picker-result-main"
                    onClick={() => selectIngredient(ingredient)}
                  >
                    <CategoryIcon
                      categoryName={ingredient.categoryName}
                      size={32}
                    />
                    <div className="ingredient-picker-result-text">
                      <div className="ingredient-picker-result-name-container">
                        <div className="ingredient-picker-result-info">
                          <span className="ingredient-picker-result-name">
                            {ingredient.name}
                          </span>
                          <span className="ingredient-picker-result-tags">
                            {ingredient.categoryName && (
                              <span className="ingredient-picker-result-category">
                                {ingredient.categoryName}
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="ingredient-picker-result-actions">
                          <Button
                            variant="warning"
                            aria-label="수정"
                            title="수정"
                            size="sm"
                            onClick={() => openEditForm(ingredient)}
                          >
                            <Pencil size={16} aria-hidden="true" />
                          </Button>
                          <Button
                            variant="danger"
                            aria-label="삭제"
                            title="삭제"
                            size="sm"
                            onClick={() => handleDelete(ingredient)}
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                      {nutrition && (
                        <NutritionFactsLine
                          basis={nutrition.basis}
                          facts={nutrition.facts}
                          source={source}
                        />
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
        </div>
      ) : (
        <>
          {fridgeId && fridgeIngredientsLoading && (
            <PickerSection icon={Refrigerator} title="내 냉장고에 있는 재료">
              <QuickPickChipsSkeleton />
            </PickerSection>
          )}

          {fridgeId && !fridgeIngredientsLoading && fridgeIngredients.length > 0 && (
            <PickerSection icon={Refrigerator} title="내 냉장고에 있는 재료">
              <QuickPickChips
                ingredients={fridgeIngredients}
                onPick={selectIngredient}
              />
            </PickerSection>
          )}

          {recentIngredients.length > 0 && (
            <PickerSection icon={Clock} title="최근 선택한 재료">
              <QuickPickChips
                ingredients={recentIngredients}
                onPick={selectIngredient}
              />
            </PickerSection>
          )}

          {fridgeId && onReceiptDone && (
            <PickerSection icon={ScanLine} title="사진으로 한 번에 추가">
              <div className="ingredient-recognition-row">
                <button
                  type="button"
                  className="ingredient-recognition-btn"
                  onClick={() => setScanMode('receipt')}
                >
                  <span className="ingredient-recognition-icon">🧾</span>
                  영수증 인식
                  <span className="ingredient-recognition-desc">
                    종이 영수증
                  </span>
                </button>
                <button
                  type="button"
                  className="ingredient-recognition-btn"
                  onClick={() => setScanMode('orderHistory')}
                >
                  <span className="ingredient-recognition-icon">🛍️</span>
                  주문 내역 인식
                  <span className="ingredient-recognition-desc">
                    컬리·네이버·쿠팡
                  </span>
                </button>
                <button
                  type="button"
                  className="ingredient-recognition-btn"
                  onClick={() => setScanMode('product')}
                >
                  <span className="ingredient-recognition-icon">🍎</span>
                  재료 인식
                  <span className="ingredient-recognition-desc">
                    사진으로 인식
                  </span>
                </button>
              </div>
            </PickerSection>
          )}
        </>
      )}

      <PickerSection icon={PackageSearch} title="찾는 재료가 없나요?">
        <div className="ingredient-source-list">
          {sourceOptions.map((option) => (
            <button
              type="button"
              key={option.title}
              className="ingredient-source-item"
              onClick={option.onClick}
            >
              <span className="ingredient-source-icon" aria-hidden="true">
                {option.icon}
              </span>
              <span className="ingredient-source-text">
                <span className="ingredient-source-title">{option.title}</span>
                <span className="ingredient-source-desc">{option.desc}</span>
              </span>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          ))}
        </div>
      </PickerSection>

      {scanMode && (
        <ReceiptScanModal
          mode={scanMode}
          fridgeId={fridgeId}
          onClose={() => setScanMode(null)}
          onComplete={onReceiptDone}
        />
      )}
    </div>
  );
}
