import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Plus, ReceiptText, Sparkles } from 'lucide-react'
import { useFridge } from '../../context/FridgeContext'
import * as recipeApi from '../../api/recipe'
import Modal from '../Modal'
import Button from '../Button'
import Dropdown from '../Dropdown'
import GenerateRecipeModal from '../GenerateRecipeModal'
import ReceiptScanModal from '../ReceiptScanModal'
import '../../styles/forms.css'
import './TopBar.css'

export default function TopBar() {
  const navigate = useNavigate()
  const { fridges, selectedFridgeId, setSelectedFridgeId, createFridge } = useFridge()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)
  const [showReceiptScan, setShowReceiptScan] = useState(false)

  async function handleCreate(event) {
    event.preventDefault()
    if (!newName.trim()) return
    setSubmitting(true)
    setError('')
    try {
      await createFridge(newName.trim())
      setNewName('')
      setCreating(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGenerate(note, useFridgeIngredients) {
    await recipeApi.generateRecipe(selectedFridgeId, note, useFridgeIngredients)
    navigate('/recipes')
  }

  return (
    <header className="topbar">
      <div className="topbar-fridge">
        {fridges.length > 0 ? (
          <Dropdown
            className="topbar-select"
            ariaLabel="냉장고 선택"
            options={fridges.map((fridge) => ({ value: fridge.id, label: fridge.name }))}
            value={selectedFridgeId}
            onChange={setSelectedFridgeId}
          />
        ) : (
          <span className="topbar-no-fridge">등록된 냉장고가 없어요</span>
        )}
        <Button
          variant="ghost"
          className="topbar-new-fridge"
          aria-label="냉장고 추가"
          title="냉장고 추가"
          onClick={() => setCreating(true)}
        >
          <Plus size={16} aria-hidden="true" />
          <span className="topbar-label">냉장고 추가</span>
        </Button>
      </div>

      <div className="topbar-user">
        <button type="button" className="topbar-bell" aria-label="알림" title="알림">
          <Bell size={18} aria-hidden="true" />
        </button>
        <Button
          variant="ghost"
          className="topbar-ocr-btn"
          disabled={!selectedFridgeId}
          onClick={() => setShowReceiptScan(true)}
        >
          <ReceiptText size={16} aria-hidden="true" />
          <span className="topbar-label">영수증 OCR 등록</span>
        </Button>
        <Button className="topbar-generate-btn" disabled={!selectedFridgeId} onClick={() => setShowGenerate(true)}>
          <Sparkles size={16} aria-hidden="true" />
          <span className="topbar-label">AI 냉털 레시피 생성</span>
        </Button>
      </div>

      {creating && (
        <Modal
          title="새 냉장고 만들기"
          onClose={() => setCreating(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setCreating(false)}>
                취소
              </Button>
              <Button type="submit" form="create-fridge-form" disabled={submitting}>
                {submitting ? '만드는 중...' : '만들기'}
              </Button>
            </>
          }
        >
          {error && <div className="form-error">{error}</div>}
          <form id="create-fridge-form" onSubmit={handleCreate}>
            <div className="field">
              <label htmlFor="fridge-name">냉장고 이름</label>
              <input
                id="fridge-name"
                className="input"
                placeholder="예: 우리집 냉장고"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                required
              />
            </div>
          </form>
        </Modal>
      )}

      {showGenerate && (
        <GenerateRecipeModal onClose={() => setShowGenerate(false)} onGenerate={handleGenerate} />
      )}

      {showReceiptScan && (
        <ReceiptScanModal
          fridgeId={selectedFridgeId}
          onClose={() => setShowReceiptScan(false)}
          onComplete={async () => {
            setShowReceiptScan(false)
            navigate('/fridge')
          }}
        />
      )}
    </header>
  )
}
