import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useFridge } from '../context/FridgeContext'
import * as fridgeApi from '../api/fridge'
import Button from '../components/Button'
import '../styles/forms.css'
import '../components/RecipeCardSkeleton.css'
import './SharePage.css'

/** 멤버 목록을 불러오는 동안 .member-row 자리 크기 그대로 자리표시자를 보여준다. */
function MemberListSkeleton({ count = 3 }) {
  return (
    <ul className="member-list" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="member-row">
          <div className="member-info">
            <span className="skeleton-block share-skeleton-nickname" />
            <span className="skeleton-block share-skeleton-tag" />
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function SharePage() {
  const { user } = useAuth()
  const { fridges, selectedFridge, joinFridge, refreshFridges } = useFridge()

  const [inviteCode, setInviteCode] = useState(null)
  const [expiryDate, setExpiryDate] = useState(null)
  const [issuing, setIssuing] = useState(false)
  const [issueError, setIssueError] = useState('')
  const [copied, setCopied] = useState(false)

  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [joinSuccess, setJoinSuccess] = useState('')

  const [members, setMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [membersError, setMembersError] = useState('')
  const [actingUserId, setActingUserId] = useState(null)

  const isOwner = selectedFridge?.myRole === 'OWNER'

  const loadMembers = useCallback(async () => {
    if (!selectedFridge) {
      setMembers([])
      return
    }
    setMembersLoading(true)
    setMembersError('')
    try {
      const list = await fridgeApi.getFridgeMembers(selectedFridge.id)
      setMembers(list)
    } catch (err) {
      setMembersError(err.message)
    } finally {
      setMembersLoading(false)
    }
  }, [selectedFridge])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  async function handleKick(member) {
    if (!selectedFridge) return
    if (!window.confirm(`'${member.nickname}'님을 '${selectedFridge.name}'에서 강퇴할까요?`)) return
    setActingUserId(member.userId)
    setMembersError('')
    try {
      await fridgeApi.kickFridgeMember(selectedFridge.id, member.userId)
      await loadMembers()
    } catch (err) {
      setMembersError(err.message)
    } finally {
      setActingUserId(null)
    }
  }

  async function handleLeave() {
    if (!selectedFridge) return
    if (!window.confirm(`'${selectedFridge.name}'에서 탈퇴할까요?`)) return
    setActingUserId(user?.id ?? -1)
    setMembersError('')
    try {
      await fridgeApi.leaveFridge(selectedFridge.id)
      await refreshFridges()
    } catch (err) {
      setMembersError(err.message)
    } finally {
      setActingUserId(null)
    }
  }

  async function handleIssueCode() {
    if (!selectedFridge) return
    setIssuing(true)
    setIssueError('')
    setCopied(false)
    try {
      const result = await fridgeApi.createInviteCode(selectedFridge.id)
      setInviteCode(result.inviteCode)
      setExpiryDate(result.expiryDate)
    } catch (err) {
      setIssueError(err.message)
    } finally {
      setIssuing(false)
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 클립보드 접근이 막혀 있으면 그냥 무시 — 코드가 화면에 이미 보이니 직접 복사하면 된다.
    }
  }

  async function handleJoin(event) {
    event.preventDefault()
    setJoining(true)
    setJoinError('')
    setJoinSuccess('')
    try {
      const fridge = await joinFridge(joinCode.trim())
      setJoinSuccess(`'${fridge.name}' 냉장고에 참여했어요!`)
      setJoinCode('')
    } catch (err) {
      setJoinError(err.message)
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="share-page">
      <div className="share-header">
        <h1>냉장고 공유</h1>
        <p>초대코드로 가족이나 룸메이트와 냉장고를 함께 관리해요.</p>
      </div>

      <div className="share-card">
        <h2 className="share-card-title">초대코드 만들기</h2>
        {!selectedFridge ? (
          <p className="form-hint">초대코드를 만들려면 먼저 냉장고를 선택하거나 만들어주세요.</p>
        ) : !isOwner ? (
          <p className="form-hint">
            '{selectedFridge.name}'의 소유자만 초대코드를 만들 수 있어요. (내 역할: 멤버)
          </p>
        ) : (
          <>
            <p className="form-hint">
              '{selectedFridge.name}'에 참여할 수 있는 4자리 코드를 만들어요. 7일간 유효하고, 새로
              발급하면 이전 코드는 바로 무효화돼요.
            </p>
            {issueError && <div className="form-error">{issueError}</div>}
            {inviteCode && (
              <div className="invite-code-display">
                <span className="invite-code-value">{inviteCode}</span>
                <Button variant="ghost" onClick={handleCopy}>
                  {copied ? '복사됨!' : '복사하기'}
                </Button>
                <span className="invite-code-expiry">
                  {new Date(expiryDate).toLocaleDateString('ko-KR')}까지 유효
                </span>
              </div>
            )}
            <Button onClick={handleIssueCode} disabled={issuing}>
              {issuing ? '만드는 중...' : inviteCode ? '새 코드로 재발급' : '초대코드 발급'}
            </Button>
          </>
        )}
      </div>

      <div className="share-card">
        <h2 className="share-card-title">초대코드로 참여하기</h2>
        <p className="form-hint">상대방에게 받은 4자리 코드를 입력하면 그 냉장고의 멤버로 참여해요.</p>
        {joinError && <div className="form-error">{joinError}</div>}
        {joinSuccess && <div className="share-success">{joinSuccess}</div>}
        <form onSubmit={handleJoin} className="join-form">
          <input
            className="input join-form-input"
            placeholder="1234"
            inputMode="numeric"
            maxLength={4}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            required
          />
          <Button type="submit" disabled={joining || joinCode.length !== 4}>
            {joining ? '참여하는 중...' : '참여하기'}
          </Button>
        </form>
      </div>

      <div className="share-card">
        <h2 className="share-card-title">
          멤버{selectedFridge && members.length > 0 ? ` ${members.length}명` : ''}
        </h2>
        {!selectedFridge ? (
          <p className="form-hint">멤버 목록을 보려면 먼저 냉장고를 선택하거나 만들어주세요.</p>
        ) : membersLoading ? (
          <MemberListSkeleton />
        ) : (
          <>
            {membersError && <div className="form-error">{membersError}</div>}
            <ul className="member-list">
              {members.map((member) => {
                const isSelf = member.userId === user?.id
                return (
                  <li key={member.userId} className="member-row">
                    <div className="member-info">
                      <span className="member-nickname">{member.nickname}</span>
                      {isSelf && <span className="member-tag member-tag--me">나</span>}
                      <span
                        className={`member-tag${member.role === 'OWNER' ? ' member-tag--owner' : ''}`}
                      >
                        {member.role === 'OWNER' ? '소유자' : '멤버'}
                      </span>
                    </div>
                    {isOwner && !isSelf && (
                      <Button
                        variant="danger"
                        className="member-action"
                        onClick={() => handleKick(member)}
                        disabled={actingUserId === member.userId}
                      >
                        {actingUserId === member.userId ? '강퇴 중...' : '강퇴'}
                      </Button>
                    )}
                    {!isOwner && isSelf && (
                      <Button
                        variant="danger"
                        className="member-action"
                        onClick={handleLeave}
                        disabled={actingUserId === user?.id}
                      >
                        {actingUserId === user?.id ? '탈퇴 중...' : '탈퇴하기'}
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>

      <p className="share-note">지금 {fridges.length}개의 냉장고에 속해 있어요.</p>
    </div>
  )
}
