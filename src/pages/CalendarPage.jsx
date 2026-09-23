import { useState } from 'react'
import DailyMealView from '../components/mealLog/DailyMealView'
import MealCalendarView from '../components/mealLog/MealCalendarView'
import { todayString } from '../utils/mealType'
import '../styles/tabs.css'
import './CalendarPage.css'

const TABS = [
  { value: 'today', label: '오늘' },
  { value: 'calendar', label: '달력' },
]

export default function CalendarPage() {
  const [tab, setTab] = useState('today')
  const [selectedDate, setSelectedDate] = useState(todayString)

  return (
    <div className={`calendar-page${tab === 'calendar' ? ' calendar-page--fill' : ''}`}>
      <div className="calendar-page-header">
        <h1>식단 캘린더</h1>
        <p>오늘 먹은 음식과 하루 섭취 칼로리·탄단지를 기록해요</p>
      </div>

      <div className="primary-tabs">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            className={`primary-tab${tab === t.value ? ' primary-tab--active' : ''}`}
            onClick={() => setTab(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'today' ? (
        <DailyMealView date={selectedDate} onChangeDate={setSelectedDate} />
      ) : (
        <MealCalendarView
          selectedDate={selectedDate}
          onSelectDate={(date) => {
            setSelectedDate(date)
            setTab('today')
          }}
        />
      )}
    </div>
  )
}
