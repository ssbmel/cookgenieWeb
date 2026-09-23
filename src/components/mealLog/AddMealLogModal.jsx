import { Fragment, useEffect, useState } from 'react'
import Modal from '../Modal'
import IngredientPicker from '../IngredientPicker'
import * as recipeApi from '../../api/recipe'
import { useFridge } from '../../context/FridgeContext'
import { MEAL_TYPE_LABEL } from '../../utils/mealType'
import Button from '../Button'
import '../../styles/forms.css'
import '../RecipeCardSkeleton.css'
import './AddMealLogModal.css'

/** 저장된 레시피 목록을 불러오는 동안 .add-meal-recipe-item 자리 크기 그대로 자리표시자를 보여준다. */
function RecipeListSkeleton({ count = 4 }) {
  return (
    <Fragment>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="add-meal-recipe-item add-meal-recipe-skeleton-item" aria-hidden="true">
          <span className="skeleton-block add-meal-recipe-skeleton-title" />
          <span className="skeleton-block add-meal-recipe-skeleton-kcal" />
        </div>
      ))}
    </Fragment>
  )
}

/**
 * 식단 기록 추가 모달. "저장된 레시피에서 선택" 또는 "재료 직접입력" 두 가지 방식을 지원한다.
 * 직접입력은 여러 재료를 한 끼에 담을 수 있게 목록에 계속 추가하는 방식.
 */
export default function AddMealLogModal({ mealDate, mealType, onClose, onSubmitted }) {
  const [mode, setMode] = useState(null) // null | 'recipe' | 'freeform'

  return (
    <Modal
      title={`${MEAL_TYPE_LABEL[mealType]} 기록 추가`}
      onClose={onClose}
      width={640}
    >
      {mode === null && (
        <div className="add-meal-mode-select">
          <button type="button" className="add-meal-mode-btn" onClick={() => setMode('recipe')}>
            <span className="add-meal-mode-icon">📖</span>
            <span>
              <strong>저장된 레시피에서 선택</strong>
              <small>냉장고 재료로 만든 AI/유튜브 레시피 중에서 골라요</small>
            </span>
          </button>
          <button type="button" className="add-meal-mode-btn" onClick={() => setMode('freeform')}>
            <span className="add-meal-mode-icon">🥗</span>
            <span>
              <strong>재료 직접 입력</strong>
              <small>먹은 재료와 양을 직접 골라서 기록해요</small>
            </span>
          </button>
        </div>
      )}

      {mode === 'recipe' && (
        <RecipeLogForm
          mealDate={mealDate}
          mealType={mealType}
          onBack={() => setMode(null)}
          onSubmitted={onSubmitted}
        />
      )}

      {mode === 'freeform' && (
        <FreeformLogForm
          mealDate={mealDate}
          mealType={mealType}
          onBack={() => setMode(null)}
          onSubmitted={onSubmitted}
        />
      )}
    </Modal>
  )
}

function RecipeLogForm({ mealDate, mealType, onBack, onSubmitted }) {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [selected, setSelected] = useState(null)
  const [servings, setServings] = useState(1)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    recipeApi
      .getAllRecipes()
      .then(setRecipes)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = recipes.filter((r) => r.title.includes(keyword.trim()))

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await onSubmitted({
        mealDate,
        mealType,
        logType: 'RECIPE',
        recipeId: selected.id,
        servings: Number(servings),
      })
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  if (selected) {
    return (
      <form onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}
        <div className="add-meal-selected-recipe">
          <span>{selected.title}</span>
          <Button variant="ghost" onClick={() => setSelected(null)}>
            변경
          </Button>
        </div>
        <div className="field">
          <label htmlFor="servings">몇 인분 드셨나요?</label>
          <input
            id="servings"
            type="number"
            min="0.1"
            step="0.1"
            className="input"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="add-meal-actions">
          <Button variant="ghost" onClick={onBack}>
            뒤로
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? '기록 중...' : '기록하기'}
          </Button>
        </div>
      </form>
    )
  }

  return (
    <div>
      <input
        className="input"
        placeholder="레시피 이름 검색"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        autoFocus
      />
      {error && <div className="form-error">{error}</div>}
      <div className="add-meal-recipe-list">
        {loading && <RecipeListSkeleton />}
        {!loading && filtered.length === 0 && <p className="form-hint">저장된 레시피가 없어요.</p>}
        {!loading &&
          filtered.map((recipe) => (
            <button
              type="button"
              key={recipe.id}
              className="add-meal-recipe-item"
              onClick={() => setSelected(recipe)}
            >
              <span>{recipe.title}</span>
              {recipe.caloriesPerServing != null && <small>{recipe.caloriesPerServing}kcal / 1인분</small>}
            </button>
          ))}
      </div>
      <Button variant="ghost" block onClick={onBack}>
        뒤로
      </Button>
    </div>
  )
}

function FreeformLogForm({ mealDate, mealType, onBack, onSubmitted }) {
  const { selectedFridgeId } = useFridge()
  const [items, setItems] = useState([])
  const [picking, setPicking] = useState(false)
  const [pendingIngredient, setPendingIngredient] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [unit, setUnit] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handlePicked(ingredient) {
    setPendingIngredient(ingredient)
    setQuantity(1)
    setUnit(ingredient.defaultUnit || '')
    setPicking(false)
  }

  function addPendingItem() {
    if (!pendingIngredient || !unit) return
    setItems((prev) => [
      ...prev,
      { ingredientId: pendingIngredient.id, name: pendingIngredient.name, quantity: Number(quantity), unit },
    ])
    setPendingIngredient(null)
  }

  function removeItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit() {
    if (items.length === 0) {
      setError('재료를 1개 이상 추가해주세요.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await onSubmitted({
        mealDate,
        mealType,
        logType: 'FREEFORM',
        items: items.map(({ ingredientId, quantity: q, unit: u }) => ({ ingredientId, quantity: q, unit: u })),
      })
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  if (picking) {
    return <IngredientPicker onSelect={handlePicked} fridgeId={selectedFridgeId} />
  }

  return (
    <div>
      {error && <div className="form-error">{error}</div>}

      {items.length > 0 && (
        <ul className="add-meal-item-list">
          {items.map((item, i) => (
            <li key={i}>
              <span>{item.name}</span>
              <span className="add-meal-item-qty">
                {item.quantity}
                {item.unit}
              </span>
              <button type="button" className="add-meal-item-remove" onClick={() => removeItem(i)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {pendingIngredient ? (
        <div className="add-meal-pending">
          <p className="add-meal-pending-name">{pendingIngredient.name}</p>
          <div className="field-row">
            <div className="field">
              <label htmlFor="fq">수량</label>
              <input
                id="fq"
                type="number"
                min="0"
                step="0.1"
                className="input"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="fu">단위</label>
              <input
                id="fu"
                className="input"
                placeholder="예: 개, g, ml"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
          </div>
          <div className="add-meal-actions">
            <Button variant="ghost" onClick={() => setPendingIngredient(null)}>
              취소
            </Button>
            <Button onClick={addPendingItem} disabled={!unit}>
              목록에 담기
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="ghost" block className="add-meal-add-item-btn" onClick={() => setPicking(true)}>
          + 재료 추가
        </Button>
      )}

      <div className="add-meal-actions">
        <Button variant="ghost" onClick={onBack}>
          뒤로
        </Button>
        <Button onClick={handleSubmit} disabled={submitting || items.length === 0}>
          {submitting ? '기록 중...' : `기록하기 (${items.length}개)`}
        </Button>
      </div>
    </div>
  )
}
