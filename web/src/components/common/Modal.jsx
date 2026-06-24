export default function Modal({ isOpen, onClose, title, children, footer, size = 'md' }) {
  if (!isOpen) return null;
  const maxW = { sm: '400px', md: '600px', lg: '800px', xl: '1100px' }[size];
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: maxW }}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
