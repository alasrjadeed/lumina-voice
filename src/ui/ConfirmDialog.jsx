import { useEffect, useRef } from 'react'

// In-app replacement for window.confirm(), which Android WebView does not show.
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel
}) {
  const cancelRef = useRef(null)

  useEffect(() => {
    cancelRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message">
        <div className="kicker">Please confirm</div>
        <h2 id="confirm-title" className="display" style={{ fontSize: 24, margin: '8px 0 10px' }}>
          {title}
        </h2>
        <p id="confirm-message" className="synopsis" style={{ marginTop: 0 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button ref={cancelRef} className="btn btn-primary btn-block" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="btn btn-ghost danger btn-block" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
