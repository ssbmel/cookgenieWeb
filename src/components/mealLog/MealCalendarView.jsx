import { useEffect, useState } from 'react'
import * as mealLogApi from '../../api/mealLog'
import { MEAL_TYPE_COLOR, MEAL_TYPE_LABEL, todayString } from '../../utils/mealType'
import '../RecipeCardSkeleton.css'
import './MealCalendarView.css'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function pad(n) {
  return String(n).padStart(2, '0')
}

function toDateString(year, month, day) {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

/** 이번 달 1일이 속한 주의 일요일부터, 마지막 날이 속한 주의 토요일까지 셀을 만든다. */
function buildGridDays(year, month) {
  const firstOfMonth = new Date(year, month, 1)
  const lastOfMonth = new Date(year, month + 1, 0)
  const start = new Date(firstOfMonth)
  start.setDate(start.getDate() - start.getDay())
  const end = new Date(lastOfMonth)
  end.setDate(end.getDate() + (6 - end.getDay()))

  const days = []
  const cursor = new Date(start)
  while (cursor <= end) {
    days.push({
      date: toDateString(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()),
      day: cursor.getDate(),
      inMonth: cursor.getMonth() === month,
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

export default function MealCalendarView({ selectedDate, onSelectDate }) {
  const initial = new Date(selectedDate + 'T00:00:00')
  const [year, setYear] = useState(initial.getFullYear())
  const [month, setMonth] = useState(initial.getMonth()) // 0-indexed
  const [summaries, setSummaries] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const days = buildGridDays(year, month)
    const startDate = days[0].date
    const endDate = days[days.length - 1].date
    setLoading(true)
    setError('')
    mealLogApi
      .getCalendarSummary(startDate, endDate)
      .then((list) => setSummaries(new Map(list.map((item) => [item.date, item]))))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [year, month])

  function goPrevMonth() {
    if (month === 0) {
      setYear((y) => y - 1)
      setMonth(11)
    } else {
      setMonth((m) => m - 1)
    }
  }

  function goNextMonth() {
    if (month === 11) {
      setYear((y) => y + 1)
      setMonth(0)
    } else {
      setMonth((m) => m + 1)
    }
  }

  const days = buildGridDays(year, month)
  const today = todayString()
  const weekRowCount = days.length / 7

  return (
    <div className="meal-calendar-view">
      <div className="meal-calendar-nav">
        <button type="button" className="daily-meal-nav-btn" onClick={goPrevMonth}>
          ‹
        </button>
        <span className="meal-calendar-title">
          {year}년 {month + 1}월
        </span>
        <button type="button" className="daily-meal-nav-btn" onClick={goNextMonth}>
          ›
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div
        className="meal-calendar-grid"
        style={{ gridTemplateRows: `auto repeat(${weekRowCount}, 1fr)` }}
      >
        {WEEKDAYS.map((w) => (
          <div key={w} className="meal-calendar-weekday">
            {w}
          </div>
        ))}
        {days.map(({ date, day, inMonth }) => {
          const summary = summaries.get(date)
          return (
            <button
              type="button"
              key={date}
              className={`meal-calendar-cell${inMonth ? '' : ' meal-calendar-cell--outside'}${
                date === today ? ' meal-calendar-cell--today' : ''
              }${date === selectedDate ? ' meal-calendar-cell--selected' : ''}`}
              onClick={() => onSelectDate(date)}
            >
              <span className="meal-calendar-day">{day}</span>
              {loading && inMonth ? (
                <span className="meal-calendar-tags" aria-hidden="true">
                  <span className="skeleton-block meal-calendar-skeleton-tag" />
                </span>
              ) : (
                summary && (
                  <span className="meal-calendar-tags">
                    {summary.meals.slice(0, 2).map((meal, i) => (
                      <span
                        key={i}
                        className="meal-calendar-tag"
                        style={{ background: MEAL_TYPE_COLOR[meal.mealType] }}
                        title={`${MEAL_TYPE_LABEL[meal.mealType]}: ${meal.label}`}
                      >
                        {meal.label}
                      </span>
                    ))}
                    {summary.meals.length > 2 && (
                      <span className="meal-calendar-tag-more">+{summary.meals.length - 2}</span>
                    )}
                  </span>
                )
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
