import { useRef, useState } from 'react';

/** Drag-and-drop + click-to-browse image upload zone. */
export default function Dropzone({ onFile, disabled }) {
  const inputRef = useRef(null);
  const [active, setActive] = useState(false);

  function handleFiles(files) {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    onFile(file);
  }

  return (
    <div
      className={`dropzone ${active ? 'dropzone--active' : ''}`}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setActive(true); }}
      onDragLeave={() => setActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setActive(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !disabled) inputRef.current?.click(); }}
    >
      <div className="dropzone__icon" aria-hidden>🖼️</div>
      <div style={{ fontWeight: 600 }}>Drop an answer sheet here</div>
      <div className="dropzone__hint">or click to browse — PNG / JPG with a QR code</div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
