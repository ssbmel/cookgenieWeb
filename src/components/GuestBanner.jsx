import { useState } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { daysUntil } from '../utils/time'
import GuestUpgradeModal from './GuestUpgradeModal'
import Button from './Button'
import './GuestBanner.css'

export default function GuestBanner() {
  const { user } = useAuth()
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  if (!user?.guest || dismissed) return null

  const remaining = daysUntil(user.guestExpiresAt)

  return (
    <div className="guest-banner">
      <span>
        게스트로 이용 중이에요.{' '}
        {remaining != null &&
          (remaining <= 0
            ? '오늘 데이터가 삭제될 수 있어요.'
            : `${remaining}일 후 데이터가 삭제돼요.`)}{' '}
        지금 가입하면 계속 이어서 쓸 수 있어요.
      </span>
      <div className="guest-banner-actions">
        <Button className="guest-banner-btn" onClick={() => setShowUpgrade(true)}>
          회원가입하고 이어가기
        </Button>
        <button
          type="button"
          className="guest-banner-close"
          aria-label="닫기"
          title="닫기"
          onClick={() => setDismissed(true)}
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      {showUpgrade && <GuestUpgradeModal onClose={() => setShowUpgrade(false)} />}
    </div>
  )
}
