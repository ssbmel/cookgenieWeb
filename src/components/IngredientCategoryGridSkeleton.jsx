import './RecipeCardSkeleton.css'
import './IngredientCategoryGridSkeleton.css'

/** IngredientPicker/ShoppingItemPicker의 .ingredient-category-grid 카드 자리를
 * 크기까지 동일하게 잡아준다. */
export default function IngredientCategoryGridSkeleton({ count = 9 }) {
  return (
    <div className="ingredient-category-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="ingredient-category-card ingredient-category-skeleton-card">
          <span className="skeleton-block ingredient-category-skeleton-icon" />
          <span className="skeleton-block ingredient-category-skeleton-label" />
        </div>
      ))}
    </div>
  )
}
