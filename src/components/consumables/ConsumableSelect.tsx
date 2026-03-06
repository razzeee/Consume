import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import WowIcon from '#/components/WowIcon'
import { getConsumableIconCandidates } from '#/domain/wowIcons'
import type { Consumable } from '#/domain/types'

type Props = {
  value: string
  consumables: Consumable[]
  onChange: (consumableId: string) => void
  disabled?: boolean
  className?: string
}

export default function ConsumableSelect({
  value,
  consumables,
  onChange,
  disabled = false,
  className,
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [menuPosition, setMenuPosition] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const syncMenuPosition = useCallback(() => {
    if (!triggerRef.current) {
      return
    }

    const rect = triggerRef.current.getBoundingClientRect()
    setMenuPosition({
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
    })
  }, [])

  const selectedConsumable = useMemo(
    () => consumables.find((consumable) => consumable.id === value),
    [consumables, value],
  )

  const filteredConsumables = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return consumables
    }

    return consumables.filter((consumable) => {
      const searchText =
        `${consumable.name} ${consumable.category}`.toLowerCase()
      return searchText.includes(normalizedQuery)
    })
  }, [consumables, query])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const onClickOutside = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) {
        return
      }

      const clickedInsideTrigger = Boolean(
        rootRef.current?.contains(event.target),
      )
      const clickedInsideMenu = Boolean(menuRef.current?.contains(event.target))

      if (!clickedInsideTrigger && !clickedInsideMenu) {
        setIsOpen(false)
      }
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onEscape)
    window.addEventListener('resize', syncMenuPosition)
    window.addEventListener('scroll', syncMenuPosition, true)
    syncMenuPosition()

    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEscape)
      window.removeEventListener('resize', syncMenuPosition)
      window.removeEventListener('scroll', syncMenuPosition, true)
    }
  }, [isOpen, syncMenuPosition])

  function chooseConsumable(consumableId: string) {
    onChange(consumableId)
    setIsOpen(false)
    setQuery('')
  }

  const menu =
    isOpen && menuPosition && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] rounded-xl border border-[var(--wow-line)] bg-[var(--wow-surface)] p-2 shadow-[var(--wow-shadow-strong)]"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
            }}
          >
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search consumables"
              className="wow-input mb-2 w-full rounded-lg px-3 py-2 text-sm"
              autoFocus
            />

            <div className="max-h-60 overflow-y-auto">
              {filteredConsumables.length === 0 ? (
                <p className="m-0 px-2 py-1.5 text-sm text-[var(--wow-ink-soft)]">
                  No consumables found.
                </p>
              ) : (
                filteredConsumables.map((consumable) => {
                  const isSelected = consumable.id === value

                  return (
                    <button
                      key={consumable.id}
                      type="button"
                      onClick={() => chooseConsumable(consumable.id)}
                      className={`mb-1 inline-flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${
                        isSelected
                          ? 'bg-[var(--wow-surface-deep)] text-[var(--wow-ink)]'
                          : 'text-[var(--wow-ink-soft)] hover:bg-[var(--wow-surface-deep)] hover:text-[var(--wow-ink)]'
                      }`}
                    >
                      <WowIcon
                        alt={consumable.name}
                        candidates={getConsumableIconCandidates(consumable)}
                        className="h-5 w-5 flex-shrink-0 rounded border border-[var(--wow-line)] object-cover"
                      />
                      <span className="truncate">{consumable.name}</span>
                      <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--wow-ink-soft)]">
                        {consumable.category}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <div ref={rootRef} className={`${className ?? ''}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setIsOpen((current) => !current)
          setTimeout(syncMenuPosition, 0)
        }}
        disabled={disabled}
        className="wow-input inline-flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm"
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          {selectedConsumable ? (
            <>
              <WowIcon
                alt={selectedConsumable.name}
                candidates={getConsumableIconCandidates(selectedConsumable)}
                className="h-5 w-5 flex-shrink-0 rounded border border-[var(--wow-line)] object-cover"
              />
              <span className="truncate">{selectedConsumable.name}</span>
            </>
          ) : (
            <span className="truncate text-[var(--wow-ink-soft)]">
              Select consumable
            </span>
          )}
        </span>
        <span className="ml-2 text-xs text-[var(--wow-ink-soft)]">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>
      {menu}
    </div>
  )
}
