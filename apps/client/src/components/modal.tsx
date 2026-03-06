import { useEffect, useRef, type ReactNode } from 'react';
import styles from './modal.module.css';

interface ModalProps {
  open: boolean;
  eyebrow: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ open, eyebrow, title, onClose, children }: ModalProps) {
  const panelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open || !panelRef.current) {
      return undefined;
    }

    const panel = panelRef.current;
    const firstFocusable = panel.querySelector<HTMLElement>('button, input, [tabindex]:not([tabindex="-1"])');
    firstFocusable?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <section
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h2>{title}</h2>
          </div>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Close
          </button>
        </header>
        <div className={styles.body}>{children}</div>
      </section>
    </div>
  );
}
