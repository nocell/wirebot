/**
 * Modal chrome shared by every overlay: the scroll-lock/Escape/BackButton
 * hook, the confirm dialog, the generic sheet, and the full-screen text
 * editors behind every multiline input.
 */
import { Check, Maximize2, X } from "lucide-react";
import {
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type TextareaHTMLAttributes,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { cn } from "./cn.js";
import { confirmDiscardChanges, useTelegramBackButton, useUnsavedChanges } from "./telegram.js";
import { Button, Caption } from "./ui.js";

/**
 * Overlay chrome: locks body scroll while mounted, and closes on Escape or
 * the Telegram BackButton while `enabled` (pass false while a mutation is in
 * flight to make the overlay non-dismissable).
 */
export function useModalChrome(onClose: () => void, enabled = true): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  useTelegramBackButton(enabled ? () => onCloseRef.current() : undefined);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && enabledRef.current) onCloseRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);
}

interface ConfirmDialogProps {
  readonly title: string;
  readonly description: string;
  readonly facts?: readonly (readonly [label: string, value: string])[] | undefined;
  readonly error: string | undefined;
  readonly busy: boolean;
  readonly confirmLabel: string;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

export function ConfirmDialog(props: ConfirmDialogProps): ReactElement {
  useModalChrome(props.onCancel, !props.busy);
  const dialogId = useId();
  const dismissBackdrop = (event: MouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget && !props.busy) props.onCancel();
  };
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: the backdrop dismisses on click; Escape is handled while the dialog is open.
    <div className="modalBackdrop" onMouseDown={dismissBackdrop}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${dialogId}-title`}
        aria-describedby={`${dialogId}-description`}
      >
        <h2 id={`${dialogId}-title`} className="modal-title">
          {props.title}
        </h2>
        <p id={`${dialogId}-description`} className="modal-description">
          {props.description}
        </p>
        {props.facts === undefined || props.facts.length === 0 ? undefined : (
          <dl className="modal-facts">
            {props.facts.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
        {props.error === undefined ? undefined : (
          <Caption className="modal-error" role="alert">
            {props.error}
          </Caption>
        )}
        <div className="modal-actions">
          <Button variant="secondary" disabled={props.busy} onClick={props.onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" loading={props.busy} autoFocus onClick={props.onConfirm}>
            {props.confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}

interface SheetProps {
  readonly title: string;
  readonly description?: ReactNode;
  readonly footer?: ReactNode;
  readonly className?: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}

/** A dismissable panel: a bottom sheet on phones, a centered card on desktop. */
export function Sheet(props: SheetProps): ReactElement {
  useModalChrome(props.onClose);
  const sheetId = useId();
  const dismissBackdrop = (event: MouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget) props.onClose();
  };
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: the backdrop dismisses on click; Escape is handled while the sheet is open.
    <div className="modalBackdrop modalBackdrop-sheet" onMouseDown={dismissBackdrop}>
      <section
        className={cn("sheet", props.className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${sheetId}-title`}
      >
        <header className="sheet-header">
          <div className="sheet-heading">
            <strong id={`${sheetId}-title`}>{props.title}</strong>
            {props.description === undefined ? undefined : (
              <Caption className="sheet-description">{props.description}</Caption>
            )}
          </div>
          <button type="button" className="sheet-close" aria-label="Close" onClick={props.onClose}>
            <X aria-hidden="true" />
          </button>
        </header>
        <div className="sheet-body">{props.children}</div>
        {props.footer === undefined ? undefined : (
          <footer className="sheet-footer">{props.footer}</footer>
        )}
      </section>
    </div>
  );
}

interface ExpandableTextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> {
  readonly label: string;
  readonly value: string;
  readonly onValueChange: (value: string) => void;
}

export function ExpandableTextarea({
  label,
  value,
  onValueChange,
  className,
  disabled,
  id,
  rows,
  ...textareaProps
}: ExpandableTextareaProps): ReactElement {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <div className="expandable">
        <textarea
          {...textareaProps}
          id={id}
          className={cn("control control-textarea", className)}
          value={value}
          rows={rows}
          disabled={disabled}
          onChange={(event) => onValueChange(event.currentTarget.value)}
        />
        <button
          type="button"
          className="expandable-button"
          aria-label={`Edit ${label} full screen`}
          title="Edit full screen"
          disabled={disabled}
          onClick={() => setExpanded(true)}
        >
          <Maximize2 aria-hidden="true" />
        </button>
      </div>
      {expanded ? (
        <FullscreenTextEditor
          label={label}
          initialValue={value}
          textareaProps={textareaProps}
          onApply={(nextValue) => {
            onValueChange(nextValue);
            setExpanded(false);
          }}
          onCancel={() => setExpanded(false)}
        />
      ) : undefined}
    </>
  );
}

interface FullscreenTextEditorProps {
  readonly label: string;
  readonly initialValue: string;
  readonly textareaProps: Omit<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    "className" | "disabled" | "id" | "onChange" | "rows" | "value"
  >;
  readonly onApply: (value: string) => void;
  readonly onCancel: () => void;
}

function FullscreenTextEditor(props: FullscreenTextEditorProps): ReactElement {
  const [value, setValue] = useState(props.initialValue);
  const textareaId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dirty = value !== props.initialValue;
  useUnsavedChanges(dirty);

  const close = useCallback((): void => {
    if (!dirty) {
      props.onCancel();
      return;
    }
    void confirmDiscardChanges(`Discard changes to ${props.label}?`).then((confirmed) => {
      if (confirmed) props.onCancel();
    });
  }, [dirty, props.label, props.onCancel]);
  useModalChrome(close);

  useEffect(() => {
    const textarea = textareaRef.current;
    textarea?.focus();
    textarea?.setSelectionRange(props.initialValue.length, props.initialValue.length);
  }, [props.initialValue.length]);

  return (
    <section
      className="editor"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${textareaId}-title`}
    >
      <header className="editor-header">
        <Button variant="plain" size="s" className="editor-close" onClick={close}>
          <X aria-hidden="true" />
          <span className="editor-closeLabel">Cancel</span>
        </Button>
        <div className="editor-heading">
          <strong id={`${textareaId}-title`}>{props.label}</strong>
          <Caption>{dirty ? "Draft not applied" : "Editing draft"}</Caption>
        </div>
        <Button size="s" className="editor-apply" onClick={() => props.onApply(value)}>
          <Check aria-hidden="true" />
          Apply
        </Button>
      </header>
      <div className="editor-body">
        <textarea
          {...props.textareaProps}
          ref={textareaRef}
          id={textareaId}
          className="editor-textarea"
          value={value}
          onChange={(event) => setValue(event.currentTarget.value)}
        />
      </div>
      <footer className="editor-footer">
        <Caption>
          {value.length.toLocaleString()}
          {props.textareaProps.maxLength === undefined
            ? " characters"
            : ` / ${Number(props.textareaProps.maxLength).toLocaleString()}`}
        </Caption>
        <Caption>Apply returns this draft to the form. Save the form to persist it.</Caption>
      </footer>
    </section>
  );
}
