import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import './Dropdown.css';

/** options: [{ value, label }]. 바깥 클릭/Esc로 닫히고, 방향키 + Enter로도 고를 수 있다. */
export default function Dropdown({
  options,
  value,
  onChange,
  className = '',
  ariaLabel,
  id,
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef(null);
  const listId = useId();
  const selectedIndex = options.findIndex((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  function openMenu() {
    setActiveIndex(Math.max(selectedIndex, 0));
    setOpen(true);
  }

  function select(option) {
    onChange(option.value);
    setOpen(false);
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape' || event.key === 'Tab') {
      setOpen(false);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex(
        (index) => (index + step + options.length) % options.length,
      );
    } else if ((event.key === 'Enter' || event.key === ' ') && open) {
      event.preventDefault();
      select(options[activeIndex]);
    }
  }

  return (
    <div
      ref={rootRef}
      className={`dropdown ${className}`}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        id={id}
        role="combobox"
        className={`dropdown-trigger ${open ? ' dropdown-trigger--open' : ''}`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
      >
        <span className="dropdown-label">
          {options[selectedIndex]?.label ?? ''}
        </span>
        <ChevronDown
          className="dropdown-chevron"
          size={16}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul id={listId} className="dropdown-menu" role="listbox">
          {options.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <li
                key={option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={isSelected}
                className={`dropdown-option${index === activeIndex ? ' dropdown-option--active' : ''}${
                  isSelected ? ' dropdown-option--selected' : ''
                }`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => select(option)}
              >
                <span className="dropdown-option-label">{option.label}</span>
                {isSelected && <Check size={16} aria-hidden="true" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
