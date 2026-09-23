import { Fragment } from 'react'
import '../RecipeCardSkeleton.css'
import './DailyMealViewSkeleton.css'

/** DailyMealView의 실제 레이아웃 클래스를 그대로 써서 칼로리 요약카드 + 탄단지 + 끼니별 슬롯
 * 자리를 크기까지 동일하게 잡아준다. */
export default function DailyMealViewSkeleton() {
  return (
    <Fragment>
      <div className="daily-meal-summary-card" aria-hidden="true">
        <div className="daily-meal-calorie-row">
          <span className="skeleton-block daily-meal-skeleton-calorie" />
          <span className="skeleton-block daily-meal-skeleton-target" />
        </div>
        <div className="daily-meal-gauge">
          <div className="daily-meal-gauge-fill" style={{ width: '0%' }} />
        </div>
        <div className="daily-meal-macros">
          {[0, 1, 2].map((i) => (
            <div key={i} className="daily-meal-macro-tile">
              <span className="skeleton-block daily-meal-skeleton-macro-label" />
              <span className="skeleton-block daily-meal-skeleton-macro-value" />
            </div>
          ))}
        </div>
      </div>

      <div className="daily-meal-slots" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="daily-meal-slot">
            <div className="daily-meal-slot-header">
              <span className="skeleton-block daily-meal-skeleton-slot-label" />
              <span className="skeleton-block daily-meal-skeleton-slot-kcal" />
            </div>
          </div>
        ))}
      </div>
    </Fragment>
  )
}
