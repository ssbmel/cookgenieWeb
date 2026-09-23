import { useEffect, useState } from 'react'
import * as recipeApi from '../api/recipe'
import Modal from './Modal'
import Button from './Button'
import RecipeDetailSkeleton from './RecipeDetailSkeleton'
import '../styles/forms.css'
import './RecipeDetailModal.css'

const RECIPE_TYPE_LABEL = { AI: 'AI 생성', YOUTUBE: '유튜브', USER: '내가 등록' }

// 조리 순서 문장에서 시간("4분", "약 30초")·불 세기("중불" 등) 표현을 강조 표시한다.
const STEP_HIGHLIGHT_PATTERN = /(\d+~?\d*\s?(?:시간|분|초)간?|약한?불|중약불|중강불|중불|강불|센불)/g

function renderStepText(step) {
  const parts = step.split(STEP_HIGHLIGHT_PATTERN)
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="recipe-step-highlight">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

export default function RecipeDetailModal({ recipeId, fridgeId, onClose, onDeleted, onAddToShopping }) {
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [addedNames, setAddedNames] = useState([])
  const [addingName, setAddingName] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError('')
    recipeApi
      .getRecipe(recipeId, fridgeId)
      .then(setRecipe)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [recipeId, fridgeId])

  async function handleAddToShopping(ing) {
    if (!onAddToShopping) return
    setAddingName(ing.ingredientNameText)
    try {
      await onAddToShopping(ing.ingredientNameText)
      setAddedNames((prev) => [...prev, ing.ingredientNameText])
    } catch (err) {
      setError(err.message)
    } finally {
      setAddingName(null)
    }
  }

  async function handleDelete() {
    if (!window.confirm('이 레시피를 삭제할까요?')) return
    setDeleting(true)
    try {
      await recipeApi.deleteRecipe(recipeId)
      onDeleted(recipeId)
      onClose()
    } catch (err) {
      setError(err.message)
      setDeleting(false)
    }
  }

  return (
    <Modal
      title={recipe ? recipe.title : '레시피'}
      onClose={onClose}
      width={860}
      footer={
        recipe && (
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? '삭제 중...' : '레시피 삭제'}
          </Button>
        )
      }
    >
      {loading && <RecipeDetailSkeleton />}
      {error && <div className="form-error">{error}</div>}

      {recipe && (
        <div className="recipe-detail-grid">
          <div className="recipe-detail">
            <div className="recipe-detail-tags">
              <span className="recipe-detail-type">
                {RECIPE_TYPE_LABEL[recipe.recipeType] ?? recipe.recipeType}
              </span>
              {recipe.tags?.map((tag) => (
                <span key={tag} className="recipe-detail-tag">
                  #{tag}
                </span>
              ))}
            </div>

            {(recipe.cookingType || recipe.servingSize) && (
              <div className="recipe-detail-quickstats">
                {recipe.cookingType && (
                  <div className="recipe-detail-quickstat">
                    <span>조리방식</span>
                    <strong>{recipe.cookingType}</strong>
                  </div>
                )}
                {recipe.servingSize && (
                  <div className="recipe-detail-quickstat">
                    <span>기준 분량</span>
                    <strong>{recipe.servingSize}인분</strong>
                  </div>
                )}
                {recipe.ingredients?.length > 0 && (
                  <div className="recipe-detail-quickstat">
                    <span>재료 수</span>
                    <strong>{recipe.ingredients.length}개</strong>
                  </div>
                )}
              </div>
            )}

            {(recipe.caloriesPerServing != null ||
              recipe.proteinG != null ||
              recipe.carbohydrateG != null ||
              recipe.fatG != null) && (
              <div className="recipe-detail-macros">
                {recipe.caloriesPerServing != null && (
                  <div className="recipe-detail-macro">
                    <span>칼로리</span>
                    <strong className="is-primary">{recipe.caloriesPerServing}kcal</strong>
                  </div>
                )}
                {recipe.proteinG != null && (
                  <div className="recipe-detail-macro">
                    <span>단백질</span>
                    <strong className="is-tertiary">{recipe.proteinG}g</strong>
                  </div>
                )}
                {recipe.carbohydrateG != null && (
                  <div className="recipe-detail-macro">
                    <span>탄수화물</span>
                    <strong>{recipe.carbohydrateG}g</strong>
                  </div>
                )}
                {recipe.fatG != null && (
                  <div className="recipe-detail-macro">
                    <span>지방</span>
                    <strong>{recipe.fatG}g</strong>
                  </div>
                )}
              </div>
            )}

            {recipe.sourceUrl && (
              <a href={recipe.sourceUrl} target="_blank" rel="noreferrer" className="recipe-detail-source">
                {recipe.authorNickname ? `${recipe.authorNickname} · 원본 보기 ↗` : '원본 보기 ↗'}
              </a>
            )}

            <h4 className="recipe-detail-section-title">조리 순서</h4>
            <ol className="recipe-detail-instructions">
              {recipe.instructions?.map((step, i) => (
                <li key={i}>
                  <div className="recipe-step-head">
                    <span className="recipe-step-badge">STEP {String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <span className="recipe-step-text">{renderStepText(step)}</span>
                </li>
              ))}
            </ol>
          </div>

          {(() => {
            const owned = recipe.ingredients?.filter((ing) => ing.matched) ?? []
            const missing = recipe.ingredients?.filter((ing) => !ing.matched) ?? []
            return (
              <div className="recipe-detail-ingredient-groups">
                <h4 className="recipe-detail-section-title recipe-detail-section-title--first">
                  재료 점검 &amp; 매칭
                </h4>
                {owned.length > 0 && (
                  <div className="recipe-detail-ingredient-group">
                    <span className="recipe-detail-group-label recipe-detail-group-label--owned">
                      우리집 냉장고 보유 재료
                    </span>
                    <ul className="recipe-detail-ingredients">
                      {owned.map((ing) => (
                        <li key={ing.id} className="is-matched">
                          <span>{ing.ingredientNameText}</span>
                          <span className="recipe-detail-ingredient-qty">{ing.quantityText}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {missing.length > 0 && (
                  <div className="recipe-detail-ingredient-group">
                    <span className="recipe-detail-group-label recipe-detail-group-label--missing">
                      채워 넣으면 더 맛있는 재료
                    </span>
                    <ul className="recipe-detail-ingredients">
                      {missing.map((ing) => {
                        const isAdded = addedNames.includes(ing.ingredientNameText)
                        const showAddButton = onAddToShopping && ing.inFridge === false
                        return (
                          <li key={ing.id}>
                            <span>{ing.ingredientNameText}</span>
                            <span className="recipe-detail-ingredient-right">
                              <span className="recipe-detail-ingredient-qty">{ing.quantityText}</span>
                              {showAddButton && (
                                <button
                                  type="button"
                                  className="recipe-detail-add-btn"
                                  disabled={isAdded || addingName === ing.ingredientNameText}
                                  onClick={() => handleAddToShopping(ing)}
                                >
                                  {isAdded ? '담았어요' : addingName === ing.ingredientNameText ? '담는 중...' : '🛒 담기'}
                                </button>
                              )}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}
    </Modal>
  )
}
