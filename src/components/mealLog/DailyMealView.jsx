import { useCallback, useEffect, useState } from 'react'
import * as mealLogApi from '../../api/mealLog'
import AddMealLogModal from './AddMealLogModal'
import DailyMealViewSkeleton from './DailyMealViewSkeleton'
import { MEAL_TYPES, MEAL_TYPE_LABEL, addDays, formatDateLabel, todayString } from '../../utils/mealType'
import './DailyMealView.css'

function round1(value) {
  return value == null ? 0 : Math.round(value * 10) / 10
}

export default function DailyMealView({ date, onChangeDate }) {
  const [daily, setDaily] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addTarget, setAddTarget] = useState(null) // mealType | null

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    mealLogApi
      .getDailyMealLog(date)
      .then(setDaily)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [date])

  useEffect(() => {
    load()
  }, [load])

  async function handleSubmitted(payload) {
    await mealLogApi.createMealLog(payload)
    setAddTarget(null)
    load()
  }

  async function handleDelete(logId) {
    if (!window.confirm('이 기록을 삭제할까요?')) return
    await mealLogApi.deleteMealLog(logId)
    load()
  }

  const totalCalories = daily?.totalCalories ?? 0
  const targetCalories = daily?.targetCalories
  const progress = targetCalories ? Math.min(100, Math.round((totalCalories / targetCalories) * 100)) : 0

  const macros = [
    { label: '탄수화물', value: daily?.totalCarbohydrateG, target: daily?.targetCarbohydrateG, color: '#f2b134' },
    { label: '단백질', value: daily?.totalProteinG, target: daily?.targetProteinG, color: '#e07a3f' },
    { label: '지방', value: daily?.totalFatG, target: daily?.targetFatG, color: '#4f8fdb' },
  ]

  const mealsByType = new Map((daily?.meals ?? []).map((slot) => [slot.mealType, slot]))

  return (
    <div className="daily-meal-view">
      <div className="daily-meal-nav">
        <button type="button" className="daily-meal-nav-btn" onClick={() => onChangeDate(addDays(date, -1))}>
          ‹
        </button>
        <button
          type="button"
          className="daily-meal-nav-date"
          onClick={() => date !== todayString() && onChangeDate(todayString())}
        >
          {formatDateLabel(date)}
        </button>
        <button type="button" className="daily-meal-nav-btn" onClick={() => onChangeDate(addDays(date, 1))}>
          ›
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}
      {loading && <DailyMealViewSkeleton />}

      {!loading && daily && (
        <>
          <div className="daily-meal-summary-card">
            <div className="daily-meal-calorie-row">
              <span className="daily-meal-calorie-value">{totalCalories}</span>
              <span className="daily-meal-calorie-unit">kcal</span>
              {targetCalories != null ? (
                <span className="daily-meal-calorie-target">목표 {targetCalories}kcal</span>
              ) : (
                <span className="daily-meal-calorie-target daily-meal-calorie-target--empty">목표 미설정</span>
              )}
            </div>
            <div className="daily-meal-gauge">
              <div className="daily-meal-gauge-fill" style={{ width: `${progress}%` }} />
            </div>

            <div className="daily-meal-macros">
              {macros.map((macro) => (
                <div key={macro.label} className="daily-meal-macro-tile">
                  <span className="daily-meal-macro-label" style={{ color: macro.color }}>
                    {macro.label}
                  </span>
                  <span className="daily-meal-macro-value">
                    {round1(macro.value)}g
                    {macro.target != null && <span className="daily-meal-macro-target"> / {round1(macro.target)}g</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="daily-meal-slots">
            {MEAL_TYPES.map((mealType) => {
              const slot = mealsByType.get(mealType)
              return (
                <div key={mealType} className="daily-meal-slot">
                  <div className="daily-meal-slot-header">
                    <span className="daily-meal-slot-label">{MEAL_TYPE_LABEL[mealType]}</span>
                    <span className="daily-meal-slot-kcal">{slot?.totalCalories ?? 0} kcal</span>
                    <button type="button" className="daily-meal-slot-add" onClick={() => setAddTarget(mealType)}>
                      +
                    </button>
                  </div>
                  {slot?.logs?.length > 0 && (
                    <ul className="daily-meal-slot-logs">
                      {slot.logs.map((log) => (
                        <li key={log.id}>
                          <span>
                            {log.logType === 'RECIPE'
                              ? log.recipeTitle
                              : log.items.map((item) => item.ingredientName).join(', ')}
                          </span>
                          <span className="daily-meal-slot-log-kcal">{log.totalCalories ?? 0}kcal</span>
                          <button type="button" className="daily-meal-slot-log-delete" onClick={() => handleDelete(log.id)}>
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {addTarget && (
        <AddMealLogModal
          mealDate={date}
          mealType={addTarget}
          onClose={() => setAddTarget(null)}
          onSubmitted={handleSubmitted}
        />
      )}
    </div>
  )
}
