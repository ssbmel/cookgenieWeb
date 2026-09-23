import './RecipeCardSkeleton.css'
import './ShoppingRowSkeleton.css'

/** ShoppingPage의 실제 .shopping-row 레이아웃 클래스를 그대로 써서 체크박스/아이콘/이름/시간
 * 자리를 크기까지 동일하게 잡아준다. */
export default function ShoppingRowSkeleton({ count = 4 }) {
  return (
    <ul className="shopping-list" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="shopping-row">
          <span className="skeleton-block shopping-skeleton-checkbox" />
          <span className="skeleton-block shopping-skeleton-icon" />
          <div className="shopping-row-main">
            <span className="skeleton-block shopping-skeleton-name" />
            <span className="skeleton-block shopping-skeleton-time" />
          </div>
        </li>
      ))}
    </ul>
  )
}
