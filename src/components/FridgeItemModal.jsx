import { useState } from 'react';
import Modal from './Modal';
import IngredientPicker from './IngredientPicker';
import { STORAGE_LOCATION_LABEL } from '../utils/expiry';
import Button from './Button';
import Dropdown from './Dropdown';
import '../styles/forms.css';
import './FridgeItemModal.css';

const STORAGE_OPTIONS = Object.entries(STORAGE_LOCATION_LABEL).map(
  ([value, label]) => ({ value, label }),
);

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function FridgeItemModal({
  mode,
  initialItem,
  fridgeId,
  onClose,
  onSubmit,
  onRefresh,
}) {
  const isEdit = mode === 'edit';
  const [ingredient, setIngredient] = useState(
    isEdit
      ? { id: initialItem.ingredientId, name: initialItem.ingredientName }
      : null,
  );
  const [form, setForm] = useState({
    quantity: initialItem?.quantity ?? 1,
    unit: initialItem?.unit ?? '',
    storageLocation: initialItem?.storageLocation ?? 'REFRIGERATED',
    purchasedAt: initialItem?.purchasedAt ?? today(),
    expiryDate: initialItem?.expiryDate ?? '',
    memo: initialItem?.memo ?? '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleIngredientSelected(selected) {
    setIngredient(selected);
    setForm((prev) => ({
      ...prev,
      unit: prev.unit || selected.defaultUnit || '',
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!ingredient) {
      setError('식재료를 먼저 선택해주세요.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await onSubmit({
        ingredientId: ingredient.id,
        quantity: Number(form.quantity),
        unit: form.unit,
        storageLocation: form.storageLocation,
        purchasedAt: form.purchasedAt,
        expiryDate: form.expiryDate || null,
        memo: form.memo || null,
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!isEdit && !ingredient) {
    return (
      <Modal title="재료 추가 · 1/2 식재료 선택" onClose={onClose} width={560}>
        <IngredientPicker
          onSelect={handleIngredientSelected}
          fridgeId={fridgeId}
          onReceiptDone={async () => {
            await onRefresh();
            onClose();
          }}
        />
      </Modal>
    );
  }

  return (
    <Modal
      title={isEdit ? '재료 수정' : '재료 추가 · 2/2 상세 정보'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" form="fridge-item-form" disabled={submitting}>
            {submitting ? '저장 중...' : '저장'}
          </Button>
        </>
      }
    >
      {error && <div className="form-error">{error}</div>}

      <div className="fridge-item-modal-ingredient">
        <span>{ingredient.name}</span>
        {!isEdit && (
          <Button
            variant="ghost"
            className="fridge-item-modal-change-btn"
            onClick={() => setIngredient(null)}
          >
            변경
          </Button>
        )}
      </div>

      <form id="fridge-item-form" className="fridge-item-form" onSubmit={handleSubmit}>
        <div className="field-row">
          <div className="field">
            <label htmlFor="quantity">수량</label>
            <input
              id="quantity"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              className="input"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="unit">단위</label>
            <input
              id="unit"
              className="input"
              placeholder="예: 개, g, ml"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="storageLocation">보관 위치</label>
          <Dropdown
            id="storageLocation"
            options={STORAGE_OPTIONS}
            value={form.storageLocation}
            onChange={(storageLocation) =>
              setForm({ ...form, storageLocation })
            }
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="purchasedAt">구매일</label>
            <input
              id="purchasedAt"
              type="date"
              className="input"
              value={form.purchasedAt}
              onChange={(e) =>
                setForm({ ...form, purchasedAt: e.target.value })
              }
              required
            />
          </div>
          <div className="field">
            <label htmlFor="expiryDate">소비기한 (선택)</label>
            <input
              id="expiryDate"
              type="date"
              className="input"
              value={form.expiryDate}
              onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="memo">메모 (선택)</label>
          <textarea
            id="memo"
            className="textarea resize-none"
            value={form.memo}
            onChange={(e) => setForm({ ...form, memo: e.target.value })}
          />
        </div>
      </form>
    </Modal>
  );
}
