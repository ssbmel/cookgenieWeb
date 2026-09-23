import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlarmClock,
  Archive,
  Banknote,
  Bell,
  ChefHat,
  Droplets,
  Fan,
  LayoutGrid,
  Leaf,
  Play,
  Snowflake,
  Sparkles,
  Zap,
} from 'lucide-react';
import { FridgeIcon } from '../components/layout/icons';
import { useAuth } from '../context/AuthContext';
import { useFridge } from '../context/FridgeContext';
import * as fridgeApi from '../api/fridge';
import * as recipeApi from '../api/recipe';
import ExpiryBadge from '../components/ExpiryBadge';
import CategoryIcon from '../components/CategoryIcon';
import EmptyFridgeState from '../components/EmptyFridgeState';
import GenerateRecipeModal from '../components/GenerateRecipeModal';
import RecipeDetailModal from '../components/RecipeDetailModal';
import { getDday, STORAGE_LOCATION_LABEL } from '../utils/expiry';
import './HomePage.css';

const URGENT_WITHIN_DAYS = 7;

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedFridge, loading: fridgeLoading } = useFridge();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [recipeIngredients, setRecipeIngredients] = useState({});
  const [openRecipeId, setOpenRecipeId] = useState(null);

  useEffect(() => {
    if (!selectedFridge) {
      setItems([]);
      return;
    }
    setLoading(true);
    fridgeApi
      .getFridgeItems(selectedFridge.id)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [selectedFridge]);

  useEffect(() => {
    if (!selectedFridge) {
      setRecipes([]);
      setRecipeIngredients({});
      return;
    }
    setRecipesLoading(true);
    (async () => {
      const recommended = await recipeApi.getRecommendations(
        selectedFridge.id,
        10,
      );
      const aiRecipes = recommended
        .filter((r) => r.recipeType === 'AI')
        .slice(0, 3);
      let combined = aiRecipes;
      if (combined.length < 3) {
        const all = await recipeApi.getAllRecipes();
        const usedIds = new Set(combined.map((r) => r.id));
        // 유튜브 레시피로 먼저 채우고, 그래도 3개가 안 되면(유튜브 레시피도 부족하면) 저장된 다른 레시피로 채운다.
        const youtubeRecipes = all.filter(
          (r) => r.recipeType === 'YOUTUBE' && !usedIds.has(r.id),
        );
        combined = [
          ...combined,
          ...youtubeRecipes.slice(0, 3 - combined.length),
        ];
        if (combined.length < 3) {
          const usedIdsAfterYoutube = new Set(combined.map((r) => r.id));
          const rest = all.filter((r) => !usedIdsAfterYoutube.has(r.id));
          combined = [...combined, ...rest.slice(0, 3 - combined.length)];
        }
      }
      setRecipes(combined);
      const entries = await Promise.all(
        combined.map((r) =>
          recipeApi
            .getRecipe(r.id, selectedFridge.id)
            .then((full) => [r.id, full.ingredients ?? []]),
        ),
      );
      setRecipeIngredients(Object.fromEntries(entries));
    })().finally(() => setRecipesLoading(false));
  }, [selectedFridge]);

  if (!fridgeLoading && !selectedFridge) {
    return <EmptyFridgeState />;
  }

  async function handleGenerate(note, useFridgeIngredients) {
    await recipeApi.generateRecipe(
      selectedFridge.id,
      note,
      useFridgeIngredients,
    );
    navigate('/recipes');
  }

  const urgentItems = items
    .filter((item) => {
      const dday = getDday(item.expiryDate);
      return dday !== null && dday <= URGENT_WITHIN_DAYS;
    })
    .sort((a, b) => getDday(a.expiryDate) - getDday(b.expiryDate));

  const freshnessScore = items.length
    ? Math.round(((items.length - urgentItems.length) / items.length) * 100)
    : null;
  const freshnessLabel =
    freshnessScore === null
      ? null
      : freshnessScore >= 80
        ? '양호'
        : freshnessScore >= 50
          ? '보통'
          : '주의';

  const safeCount = items.length - urgentItems.length;

  const expiringTodayItems = items.filter(
    (item) => getDday(item.expiryDate) === 0,
  );
  let urgentDetail = null;
  if (expiringTodayItems.length > 0) {
    urgentDetail = `오늘 자정 만료 ${expiringTodayItems.length}건 (${expiringTodayItems[0].ingredientName})`;
  } else if (urgentItems.length > 0) {
    const soonest = urgentItems[0];
    urgentDetail = `${soonest.ingredientName} D-${getDday(soonest.expiryDate)} 임박`;
  }

  // 식비 절감액을 계산할 결제/구매 데이터가 아직 없어서 디자인 반영용으로 고정값을 보여준다.
  const PLACEHOLDER_MONTHLY_SAVED = 48200;
  const PLACEHOLDER_SAVED_DELTA = 12400;

  function previewNames(list, max = 4) {
    return list
      .slice(0, max)
      .map((i) => i.ingredientName)
      .join(', ');
  }

  const refrigeratedItems = items.filter(
    (i) => i.storageLocation === 'REFRIGERATED',
  );
  const frozenItems = items.filter((i) => i.storageLocation === 'FROZEN');
  const roomTempItems = items.filter((i) => i.storageLocation === 'ROOM_TEMP');
  const seasoningItems = items.filter((i) => i.categoryName === '양념·소스');
  const seasoningLevel =
    seasoningItems.length >= 5
      ? '풍족'
      : seasoningItems.length >= 2
        ? '보통'
        : '부족';

  const ZONES = [
    {
      key: 'fridge',
      label: '냉장실',
      icon: Fan,
      colorClass: 'tertiary',
      count: refrigeratedItems.length,
      preview: previewNames(refrigeratedItems),
    },
    {
      key: 'freezer',
      label: '냉동실',
      icon: Snowflake,
      colorClass: 'frozen',
      count: frozenItems.length,
      preview: previewNames(frozenItems),
    },
    {
      key: 'pantry',
      label: '실온 팬트리',
      icon: Archive,
      colorClass: 'secondary',
      count: roomTempItems.length,
      preview: previewNames(roomTempItems),
    },
  ];

  return (
    <div className="home-page">
      <h1 className="home-greeting">
        {user?.nickname}님, 오늘도 알뜰하게 관리해봐요
      </h1>

      <div className="home-kpi-grid">
        <div className="home-kpi-card">
          <div className="home-kpi-card-top">
            <span className="home-kpi-label">보유 식재료</span>
            <span className="home-kpi-icon home-kpi-icon--primary">
              <FridgeIcon />
            </span>
          </div>
          {loading ? (
            <span className="skeleton-block home-kpi-value-skeleton" />
          ) : (
            <p className="home-kpi-value">
              {items.length}
              <span>개</span>
            </p>
          )}
          {!loading && items.length > 0 && (
            <div className="home-kpi-sub-pills">
              <span className="home-kpi-sub-pill home-kpi-sub-pill--safe">
                안전 {safeCount}
              </span>
              <span className="home-kpi-sub-pill home-kpi-sub-pill--warning">
                주의 {urgentItems.length}
              </span>
            </div>
          )}
        </div>

        <div className="home-kpi-card">
          <div className="home-kpi-card-top">
            <span className="home-kpi-label">소비기한 임박</span>
            <span className="home-kpi-icon home-kpi-icon--danger">
              <AlarmClock size={18} aria-hidden="true" />
            </span>
          </div>
          {loading ? (
            <span className="skeleton-block home-kpi-value-skeleton" />
          ) : (
            <p className="home-kpi-value home-kpi-value--danger">
              {urgentItems.length}
              <span>개</span>
            </p>
          )}
          {!loading && urgentDetail && (
            <p className="home-kpi-detail home-kpi-detail--danger">
              <span className="home-kpi-detail-dot" />
              {urgentDetail}
            </p>
          )}
        </div>

        <div className="home-kpi-card">
          <div className="home-kpi-card-top">
            <span className="home-kpi-label">이번 달 방어한 식비</span>
            <span className="home-kpi-icon home-kpi-icon--secondary">
              <Banknote size={18} aria-hidden="true" />
            </span>
          </div>
          <p className="home-kpi-value">
            ₩{PLACEHOLDER_MONTHLY_SAVED.toLocaleString('ko-KR')}
          </p>
          <p className="home-kpi-detail">
            지난달 대비 +₩{PLACEHOLDER_SAVED_DELTA.toLocaleString('ko-KR')} 절약
            중
          </p>
        </div>

        <div className="home-kpi-card">
          <div className="home-kpi-card-top">
            <span className="home-kpi-label">냉장고 신선도 지수</span>
            <span className="home-kpi-icon home-kpi-icon--tertiary">
              <Leaf size={18} aria-hidden="true" />
            </span>
          </div>
          {freshnessScore === null ? (
            <span className="skeleton-block home-kpi-value-skeleton" />
          ) : (
            <p className="home-kpi-value">
              {freshnessScore}
              <span>%</span>
            </p>
          )}
          {freshnessLabel && (
            <div className="home-kpi-sub-pills">
              <span className="home-kpi-sub-pill home-kpi-sub-pill--safe">
                {freshnessLabel}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="home-row-2col">
        <div className="home-urgent-panel">
          <div className="home-urgent-panel-top">
            <div className="home-urgent-panel-heading">
              <span className="home-urgent-panel-icon">
                <Bell size={18} aria-hidden="true" />
              </span>
              <div>
                <h2>
                  서둘러 먹어야 해요!{' '}
                  <span className="home-urgent-panel-title-note">
                    (냉장고 긴급 탈출)
                  </span>
                </h2>
                {!loading && (
                  <p className="home-urgent-panel-desc">
                    소비기한이 지나면 버려질 수 있는 식재료 {urgentItems.length}
                    건
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              className="home-urgent-panel-cta"
              disabled={!selectedFridge?.id}
              onClick={() => setShowGenerate(true)}
            >
              <Zap size={14} aria-hidden="true" />
              원터치 냉털 레시피 3초 생성
            </button>
          </div>

          {loading ? (
            <div className="home-urgent-panel-scroll">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="home-urgent-panel-card">
                  <div className="home-urgent-panel-card-top">
                    <span className="skeleton-block home-urgent-panel-icon-skeleton" />
                    <span className="skeleton-block home-urgent-panel-badge-skeleton" />
                  </div>
                  <span className="skeleton-block home-urgent-panel-name-skeleton" />
                  <span className="skeleton-block home-urgent-panel-meta-skeleton" />
                </div>
              ))}
            </div>
          ) : urgentItems.length === 0 ? (
            <p className="home-urgent-panel-empty">
              지금은 급하게 소진할 재료가 없어요.
            </p>
          ) : (
            <div className="home-urgent-panel-scroll">
              {urgentItems.slice(0, 3).map((item) => (
                <div key={item.id} className="home-urgent-panel-card">
                  <div className="home-urgent-panel-card-top">
                    <CategoryIcon categoryName={item.categoryName} size={40} />
                    <ExpiryBadge expiryDate={item.expiryDate} />
                  </div>
                  <p className="home-urgent-panel-card-name">
                    {item.ingredientName}
                  </p>
                  <p className="home-urgent-panel-card-meta">
                    {item.quantity}
                    {item.unit}
                  </p>
                  <p className="home-urgent-panel-card-storage">
                    보관위치:{' '}
                    {STORAGE_LOCATION_LABEL[item.storageLocation] ?? '-'}
                    <Link to="/recipes" className="home-urgent-panel-card-tip">
                      활용 팁
                    </Link>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="home-zones-panel">
          <div className="home-zones-panel-top">
            <div className="home-zones-panel-heading">
              <span className="home-zones-panel-icon">
                <LayoutGrid size={16} aria-hidden="true" />
              </span>
              <h2>우리 집 냉장고 구역별 현황</h2>
            </div>
            <Link to="/fridge" className="home-zones-panel-more">
              전체 보기
            </Link>
          </div>

          <ul className="home-zones-list">
            {ZONES.map((zone) => (
              <li key={zone.key} className="home-zones-row">
                <span
                  className={`home-zones-row-icon home-zones-row-icon--${zone.colorClass}`}
                >
                  <zone.icon size={18} aria-hidden="true" />
                </span>
                <div className="home-zones-row-main">
                  <p className="home-zones-row-label">{zone.label}</p>
                  <p className="home-zones-row-preview">
                    {zone.preview || '아직 등록된 재료가 없어요'}
                  </p>
                </div>
                <div className="home-zones-row-side">
                  {zone.badge && (
                    <span className="home-zones-row-badge">{zone.badge}</span>
                  )}
                  <span className="home-zones-row-count">
                    {zone.count}
                    {zone.unit ?? '개'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="home-recipe-feature">
        <div className="home-recipe-feature-top">
          <h2>
            <Sparkles size={18} aria-hidden="true" />
            오늘의 레시피 추천
          </h2>
          <Link to="/recipes" className="home-zones-panel-more">
            더보기
          </Link>
        </div>

        {recipesLoading ? (
          <div className="home-recipe-feature-grid">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="home-recipe-feature-card">
                <span className="skeleton-block home-recipe-feature-media-skeleton" />
                <div className="home-recipe-feature-body">
                  <span className="skeleton-block home-recipe-feature-tag-skeleton" />
                  <span className="skeleton-block home-recipe-feature-title-skeleton" />
                  <span className="skeleton-block home-recipe-feature-title-skeleton home-recipe-feature-title-skeleton--short" />
                  <span className="skeleton-block home-recipe-feature-cta-skeleton" />
                </div>
              </div>
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <p className="home-recipe-feature-empty">
            냉장고 재료로 추천할 수 있는 레시피가 아직 없어요. 상단의 "원터치
            냉털 레시피 3초 생성"으로 만들어보세요.
          </p>
        ) : (
          <div className="home-recipe-feature-grid">
            {recipes.map((recipe) => {
              const hasMatch = recipe.totalIngredientCount != null;
              const matchPercent =
                hasMatch && recipe.totalIngredientCount > 0
                  ? Math.round(
                      (recipe.matchedIngredientCount /
                        recipe.totalIngredientCount) *
                        100,
                    )
                  : null;
              const ingredients = recipeIngredients[recipe.id] ?? [];
              return (
                <div key={recipe.id} className="home-recipe-feature-card">
                  <div className="home-recipe-feature-media">
                    <ChefHat size={26} aria-hidden="true" />
                    {matchPercent !== null && (
                      <span className="home-recipe-feature-match">
                        내 재료 {matchPercent}% 일치
                      </span>
                    )}
                  </div>
                  <div className="home-recipe-feature-body">
                    <div className="home-recipe-feature-tags">
                      {recipe.cookingType && (
                        <span className="home-recipe-feature-tag">
                          {recipe.cookingType}
                        </span>
                      )}
                      {recipe.caloriesPerServing != null && (
                        <span className="home-recipe-feature-cal">
                          칼로리 {recipe.caloriesPerServing}kcal
                        </span>
                      )}
                    </div>
                    <h3>{recipe.title}</h3>
                    {ingredients.length > 0 && (
                      <div className="home-recipe-feature-chips">
                        {ingredients.slice(0, 4).map((ing) => (
                          <span
                            key={ing.id}
                            className={`home-recipe-feature-chip${ing.matched ? ' is-matched' : ''}`}
                          >
                            {ing.matched ? '✓' : '+'} {ing.ingredientNameText}
                          </span>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      className="home-recipe-feature-cta"
                      onClick={() => setOpenRecipeId(recipe.id)}
                    >
                      <Play size={14} aria-hidden="true" />
                      단계별 조리 가이드 시작
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showGenerate && (
        <GenerateRecipeModal
          onClose={() => setShowGenerate(false)}
          onGenerate={handleGenerate}
        />
      )}

      {openRecipeId && (
        <RecipeDetailModal
          recipeId={openRecipeId}
          fridgeId={selectedFridge?.id}
          onClose={() => setOpenRecipeId(null)}
        />
      )}
    </div>
  );
}
