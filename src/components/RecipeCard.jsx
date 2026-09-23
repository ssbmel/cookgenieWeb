import './RecipeCard.css'

const RECIPE_TYPE_LABEL = { AI: 'AI 생성', YOUTUBE: '유튜브', USER: '내가 등록' }

export default function RecipeCard({ recipe, onClick, onDelete }) {
  const hasMatch = recipe.totalIngredientCount != null
  const fullyMakeable = hasMatch && recipe.matchedIngredientCount === recipe.totalIngredientCount
  const cardModifier = !hasMatch ? '' : fullyMakeable ? ' recipe-card--ready' : ' recipe-card--partial'
  const matchPercent = hasMatch && recipe.totalIngredientCount > 0
    ? Math.round((recipe.matchedIngredientCount / recipe.totalIngredientCount) * 100)
    : null

  return (
    <div className={`recipe-card${cardModifier}`} onClick={onClick} role="button" tabIndex={0}>
      <div className="recipe-card-top">
        <span className="recipe-card-type">{RECIPE_TYPE_LABEL[recipe.recipeType] ?? recipe.recipeType}</span>
        {matchPercent !== null && (
          <span className="recipe-card-match-badge">내 재료 {matchPercent}% 일치</span>
        )}
        {onDelete && (
          <button
            type="button"
            className="recipe-card-delete"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(recipe)
            }}
            aria-label="레시피 삭제"
          >
            ×
          </button>
        )}
      </div>
      <h3 className="recipe-card-title">{recipe.title}</h3>
      <p className="recipe-card-meta">
        {recipe.cookingType ? `${recipe.cookingType} · ` : ''}
        {recipe.servingSize ? `${recipe.servingSize}인분` : ''}
        {recipe.caloriesPerServing != null ? ` · ${recipe.caloriesPerServing}kcal` : ''}
      </p>
      {hasMatch &&
        (fullyMakeable ? (
          <p className="recipe-card-match recipe-card-match--ready">✓ 지금 바로 만들 수 있어요</p>
        ) : (
          <p className="recipe-card-match recipe-card-match--partial">
            재료 {recipe.totalIngredientCount - recipe.matchedIngredientCount}개 더 필요해요 (
            {recipe.matchedIngredientCount}/{recipe.totalIngredientCount}개 보유)
          </p>
        ))}
    </div>
  )
}
