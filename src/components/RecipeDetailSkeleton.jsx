import './RecipeCardSkeleton.css'
import './RecipeDetailModal.css'
import './RecipeDetailSkeleton.css'

/** RecipeDetailModal의 실제 레이아웃 클래스를 그대로 써서 태그/퀵스탯/탄단지/조리순서/재료
 * 자리를 크기까지 동일하게 잡아준다. */
export default function RecipeDetailSkeleton() {
  return (
    <div className="recipe-detail-grid" aria-hidden="true">
      <div className="recipe-detail">
        <div className="recipe-detail-tags">
          <span className="skeleton-block recipe-detail-skeleton-tag" />
          <span className="skeleton-block recipe-detail-skeleton-tag recipe-detail-skeleton-tag--sm" />
        </div>

        <div className="recipe-detail-quickstats">
          {[0, 1, 2].map((i) => (
            <div key={i} className="recipe-detail-quickstat">
              <span className="skeleton-block recipe-detail-skeleton-quickstat-label" />
              <span className="skeleton-block recipe-detail-skeleton-quickstat-value" />
            </div>
          ))}
        </div>

        <div className="recipe-detail-macros">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="recipe-detail-macro">
              <span className="skeleton-block recipe-detail-skeleton-macro-label" />
              <span className="skeleton-block recipe-detail-skeleton-macro-value" />
            </div>
          ))}
        </div>

        <span className="skeleton-block recipe-detail-skeleton-section-title" />
        <div className="recipe-detail-instructions">
          {[0, 1, 2].map((i) => (
            <div key={i} className="recipe-detail-skeleton-step">
              <span className="skeleton-block recipe-detail-skeleton-step-badge" />
              <span className="skeleton-block recipe-detail-skeleton-step-text" />
            </div>
          ))}
        </div>
      </div>

      <div className="recipe-detail-ingredient-groups">
        <span className="skeleton-block recipe-detail-skeleton-section-title" />
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="skeleton-block recipe-detail-skeleton-ingredient" />
        ))}
      </div>
    </div>
  )
}
