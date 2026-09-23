import './RecipeCardSkeleton.css'
import './FridgeItemRowSkeleton.css'

/** FridgeItemsPage의 실제 재료 카드(.fridge-item-card)와 같은 레이아웃 클래스를 그대로 써서
 * 체크박스/썸네일/태그/이름/진행률바/하단(소비기한+수량+수정삭제) 자리를 크기까지 동일하게 잡아준다. */
export default function FridgeItemRowSkeleton() {
  return (
    <div className="fridge-item-card" aria-hidden="true">
      <div className="fridge-item-card-top">
        <span className="skeleton-block fridge-item-skeleton-checkbox" />
        <span className="skeleton-block fridge-item-skeleton-thumb" />
        <div className="fridge-item-card-main">
          <div className="fridge-item-card-tags">
            <span className="skeleton-block fridge-item-skeleton-tag" />
            <span className="skeleton-block fridge-item-skeleton-tag fridge-item-skeleton-tag--sm" />
          </div>
          <div className="fridge-item-card-title-row">
            <span className="skeleton-block fridge-item-skeleton-name" />
            <span className="skeleton-block fridge-item-skeleton-badge" />
          </div>
          <span className="skeleton-block fridge-item-skeleton-meta" />
        </div>
      </div>

      <div className="fridge-item-card-progress">
        <span className="skeleton-block fridge-item-skeleton-progress-label" />
        <span className="skeleton-block fridge-item-card-progress-track" />
        <span className="skeleton-block fridge-item-skeleton-progress-value" />
      </div>

      <div className="fridge-item-card-footer">
        <span className="skeleton-block fridge-item-skeleton-date" />
        <div className="fridge-item-card-qty-actions">
          <span className="skeleton-block fridge-item-skeleton-qty" />
          <span className="skeleton-block fridge-item-skeleton-action" />
          <span className="skeleton-block fridge-item-skeleton-action" />
        </div>
      </div>
    </div>
  )
}
