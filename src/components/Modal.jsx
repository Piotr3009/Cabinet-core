import { useEffect } from 'react';

export default function Modal({ title, onClose, children, footer, width = 'w-[420px]' }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/45" onPointerDown={onClose}>
      <div className={`cc-panel ${width} max-h-[80%] flex flex-col`} onPointerDown={(e) => e.stopPropagation()}>
        <div className="flex items-center px-4 py-2.5 border-b border-shell-600">
          <h2 className="text-sm text-ink-50">{title}</h2>
          <span className="flex-1" />
          <button type="button" className="cc-btn-ghost" onClick={onClose}>×</button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-4 py-3 border-t border-shell-600 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
