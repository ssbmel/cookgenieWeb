import { useEffect, useState } from 'react'
import * as ingredientApi from '../api/ingredient'
import CategoryIcon from './CategoryIcon'
import Button from './Button'
import IngredientCategoryGridSkeleton from './IngredientCategoryGridSkeleton'
import '../styles/forms.css'
import './IngredientPicker.css'
import './ShoppingItemPicker.css'

/**
 * 냉장고 재료 추가와 같은 카테고리 그리드 -> 추천 재료 그리드 흐름을 재사용해서,
 * Ingredient를 등록하지 않고 이름만 장보기 리스트에 담는다 (onSelect(name) 호출).
 */
export default function ShoppingItemPicker({ onSelect }) {
  const [categories, setCategories] = useState([])
  const [categoryName, setCategoryName] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [manualName, setManualName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    ingredientApi.getCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    if (!categoryName) return
    const category = categories.find((c) => c.name === categoryName)
    if (!category) {
      setSuggestions([])
      return
    }
    setSuggestionsLoading(true)
    ingredientApi
      .getIngredientSuggestions(category.id)
      .then((list) => setSuggestions(list.map((s) => s.name)))
      .catch(() => setSuggestions([]))
      .finally(() => setSuggestionsLoading(false))
  }, [categoryName, categories])

  async function handlePick(name) {
    setError('')
    setSubmitting(true)
    try {
      await onSelect(name)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleManualSubmit(event) {
    event.preventDefault()
    const name = manualName.trim()
    if (!name) return
    await handlePick(name)
    setManualName('')
  }

  if (categoryName) {
    return (
      <div className="ingredient-picker">
        <div className="ingredient-pick-header">
          <button type="button" className="ingredient-back-btn" onClick={() => setCategoryName(null)}>
            ← {categoryName}
          </button>
        </div>
        {error && <div className="form-error">{error}</div>}

        {suggestionsLoading ? (
          <IngredientCategoryGridSkeleton />
        ) : (
          <div className="ingredient-category-grid">
            {suggestions.map((name) => (
              <button
                type="button"
                key={name}
                className="ingredient-category-card"
                onClick={() => handlePick(name)}
                disabled={submitting}
              >
                <CategoryIcon categoryName={categoryName} size={44} />
                <span>{name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="ingredient-picker">
      <p className="ingredient-picker-hint">어떤 종류의 재료를 살까요?</p>
      {error && <div className="form-error">{error}</div>}

      <div className="ingredient-category-grid">
        {categories.map((c) => (
          <button
            type="button"
            key={c.id}
            className="ingredient-category-card"
            onClick={() => setCategoryName(c.name)}
          >
            <CategoryIcon categoryName={c.name} size={44} />
            <span>{c.name}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleManualSubmit} className="ingredient-manual-form">
        <div className="field">
          <label htmlFor="shopping-manual-name">목록에 없나요? 직접 입력하기</label>
          <div className="shopping-manual-row">
            <input
              id="shopping-manual-name"
              className="input"
              placeholder="예: 두부, 우유"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
            />
            <Button type="submit" disabled={submitting || !manualName.trim()}>
              담기
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
