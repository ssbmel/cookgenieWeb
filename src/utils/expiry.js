const MS_PER_DAY = 1000 * 60 * 60 * 24

/** expiryDate("YYYY-MM-DD")와 오늘 사이의 일수 차이(D-day)를 계산한다. */
export function getDday(expiryDate) {
  if (!expiryDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(expiryDate)
  target.setHours(0, 0, 0, 0)
  return Math.round((target - today) / MS_PER_DAY)
}

export function formatDday(expiryDate) {
  const dday = getDday(expiryDate)
  if (dday === null) return '기한 미지정'
  if (dday === 0) return 'D-Day'
  return dday > 0 ? `D-${dday}` : `D+${Math.abs(dday)}`
}

/** urgency: danger(3일 이하/지남) | warning(7일 이하) | safe(그 외) | neutral(기한 없음) */
export function getExpiryUrgency(expiryDate) {
  const dday = getDday(expiryDate)
  if (dday === null) return 'neutral'
  if (dday <= 3) return 'danger'
  if (dday <= 7) return 'warning'
  return 'safe'
}

export const STORAGE_LOCATION_LABEL = {
  REFRIGERATED: '냉장',
  FROZEN: '냉동',
  ROOM_TEMP: '실온',
}

/** 구매일→소비기한 구간에서 오늘이 몇 % 지점인지(0~100). 둘 중 하나라도 없으면 null. */
export function getShelfLifeProgress(purchasedAt, expiryDate) {
  if (!purchasedAt || !expiryDate) return null
  const start = new Date(purchasedAt).getTime()
  const end = new Date(expiryDate).getTime()
  if (end <= start) return 100
  const now = Date.now()
  const ratio = ((now - start) / (end - start)) * 100
  return Math.min(100, Math.max(0, Math.round(ratio)))
}
