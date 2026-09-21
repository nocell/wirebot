/**
 * Presentational primitives shared by every screen: buttons, grouped lists
 * and rows, form fields, the segmented control, switches, and small text
 * elements. Layout density (phone vs. desktop) comes from the stylesheet.
 */
import * as SwitchPrimitive from "@radix-ui/react-switch";
import {
  ChevronRight,
  CircleAlert,
  CircleCheck,
  LoaderCircle,
  Search,
  TriangleAlert,
} from "lucide-react";
import {
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  forwardRef,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "./cn.js";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: "primary" | "secondary" | "plain" | "destructive";
  readonly size?: "s" | "m" | "l";
  readonly stretched?: boolean;
  readonly loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, stretched, loading, children, disabled, type, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      className={cn(
        "btn",
        `btn-${variant ?? "primary"}`,
        `btn-${size ?? "m"}`,
        stretched && "btn-stretched",
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <LoaderCircle className="btn-spinner" aria-hidden="true" /> : undefined}
      {children}
    </button>
  );
});

/** A grouped list card; rows separate themselves with inset rules. */
export function Group({
  className,
  inset,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { readonly inset?: "icon" }): ReactElement {
  return (
    <div className={cn("group", inset === "icon" && "group-insetIcon", className)} {...props}>
      {children}
    </div>
  );
}

interface RowContentProps {
  readonly label: ReactNode;
  readonly detail?: ReactNode | undefined;
  readonly value?: ReactNode | undefined;
  readonly before?: ReactNode | undefined;
  readonly after?: ReactNode | undefined;
  readonly chevron?: boolean | undefined;
  readonly tone?: "default" | "primary" | "muted" | undefined;
}

function RowContent(props: RowContentProps): ReactElement {
  return (
    <>
      {props.before === undefined ? undefined : <span className="row-before">{props.before}</span>}
      <span className="row-copy">
        <span className="row-label">{props.label}</span>
        {props.detail === undefined ? undefined : (
          <span className="row-detail">{props.detail}</span>
        )}
      </span>
      {props.value === undefined ? undefined : <span className="row-value">{props.value}</span>}
      {props.after}
      {props.chevron === true ? (
        <ChevronRight className="row-chevron" aria-hidden="true" />
      ) : undefined}
    </>
  );
}

type RowLinkProps = RowContentProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "value"> & { readonly href: string };

/** A tappable list row that navigates. */
export function RowLink({
  label,
  detail,
  value,
  before,
  after,
  chevron,
  tone,
  className,
  ...props
}: RowLinkProps): ReactElement {
  return (
    <a className={cn("row row-interactive", tone && `row-${tone}`, className)} {...props}>
      <RowContent
        label={label}
        detail={detail}
        value={value}
        before={before}
        after={after}
        chevron={chevron}
      />
    </a>
  );
}

type RowButtonProps = RowContentProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "value">;

/** A tappable list row that performs an action. */
export function RowButton({
  label,
  detail,
  value,
  before,
  after,
  chevron,
  tone,
  className,
  type,
  ...props
}: RowButtonProps): ReactElement {
  return (
    <button
      type={type ?? "button"}
      className={cn("row row-interactive", tone && `row-${tone}`, className)}
      {...props}
    >
      <RowContent
        label={label}
        detail={detail}
        value={value}
        before={before}
        after={after}
        chevron={chevron}
      />
    </button>
  );
}

/** A static list row (for example a toggle or a status line). */
export function Row({
  label,
  detail,
  value,
  before,
  after,
  chevron: _chevron,
  tone,
  className,
  ...props
}: RowContentProps & Omit<HTMLAttributes<HTMLDivElement>, "children">): ReactElement {
  return (
    <div className={cn("row", tone && `row-${tone}`, className)} {...props}>
      <RowContent label={label} detail={detail} value={value} before={before} after={after} />
    </div>
  );
}

interface SwitchProps {
  readonly id?: string;
  readonly checked: boolean;
  readonly disabled?: boolean;
  readonly size?: "m" | "s";
  readonly onCheckedChange: (checked: boolean) => void;
  readonly "aria-label"?: string;
}

export function Switch(props: SwitchProps): ReactElement {
  return (
    <SwitchPrimitive.Root
      id={props.id}
      checked={props.checked}
      disabled={props.disabled === true}
      onCheckedChange={props.onCheckedChange}
      aria-label={props["aria-label"]}
      className={cn("switch", props.size === "s" && "switch-s")}
    >
      <SwitchPrimitive.Thumb className="switch-thumb" />
    </SwitchPrimitive.Root>
  );
}

interface ToggleRowProps {
  readonly id: string;
  readonly label: ReactNode;
  readonly detail?: ReactNode;
  readonly badge?: ReactNode;
  readonly checked: boolean;
  readonly disabled?: boolean;
  readonly locked?: boolean;
  readonly busy?: boolean;
  readonly onChange: (checked: boolean) => void;
}

/** A list row whose action is a switch; the label is the switch's label. */
export function ToggleRow(props: ToggleRowProps): ReactElement {
  return (
    <div className={cn("row row-toggle", props.locked && "row-locked")}>
      <label className="row-copy" htmlFor={props.id}>
        <span className="row-label">
          {props.label}
          {props.badge}
        </span>
        {props.detail === undefined ? undefined : (
          <span className="row-detail">{props.detail}</span>
        )}
      </label>
      {props.busy ? <Spinner /> : undefined}
      <Switch
        id={props.id}
        checked={props.checked}
        disabled={props.disabled === true || props.busy === true}
        onCheckedChange={props.onChange}
      />
    </div>
  );
}

export function Badge({ children }: { readonly children: ReactNode }): ReactElement {
  return <span className="badge">{children}</span>;
}

interface FieldProps {
  readonly label: ReactNode;
  readonly htmlFor?: string | undefined;
  /** Rendered as a label element only when the control can be labelled. */
  readonly as?: "label" | "span";
  readonly hint?: ReactNode;
  readonly issue?: string | undefined;
  readonly changed?: boolean | undefined;
  readonly className?: string;
  readonly children: ReactNode;
}

/** A labelled control with a hint; stacked on phones, label-left on desktop. */
export function Field(props: FieldProps): ReactElement {
  const labelBody = (
    <>
      {props.label}
      {props.changed === true ? (
        <span className="field-changed" title="Changed" role="img" aria-label="Changed" />
      ) : undefined}
    </>
  );
  return (
    <div className={cn("field", props.className)}>
      {props.as === "span" || props.htmlFor === undefined ? (
        <span className="field-label">{labelBody}</span>
      ) : (
        <label className="field-label" htmlFor={props.htmlFor}>
          {labelBody}
        </label>
      )}
      <div className="field-control">
        {props.children}
        {props.issue !== undefined ? (
          <div className="field-hint field-issue" role="alert">
            {props.issue}
          </div>
        ) : props.hint === undefined ? undefined : (
          <div className="field-hint">{props.hint}</div>
        )}
      </div>
    </div>
  );
}

interface SegmentedOption<Value extends string> {
  readonly value: Value;
  readonly label: string;
}

interface SegmentedProps<Value extends string> {
  readonly options: readonly SegmentedOption<Value>[];
  readonly value: Value;
  readonly disabled?: boolean;
  readonly "aria-label"?: string;
  readonly onChange: (value: Value) => void;
}

export function Segmented<Value extends string>(props: SegmentedProps<Value>): ReactElement {
  return (
    <fieldset
      className="segmented"
      style={{ gridTemplateColumns: `repeat(${props.options.length}, minmax(0, 1fr))` }}
    >
      {props["aria-label"] === undefined ? undefined : (
        <legend className="srOnly">{props["aria-label"]}</legend>
      )}
      {props.options.map((option) => {
        const selected = option.value === props.value;
        return (
          <button
            key={option.value}
            type="button"
            className={cn("segmented-item", selected && "segmented-selected")}
            aria-pressed={selected}
            disabled={props.disabled}
            onClick={() => props.onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </fieldset>
  );
}

export function SearchField(props: InputHTMLAttributes<HTMLInputElement>): ReactElement {
  const { className, ...rest } = props;
  return (
    <div className={cn("search", className)}>
      <Search className="search-icon" aria-hidden="true" />
      <input type="search" className="search-input" autoComplete="off" {...rest} />
    </div>
  );
}

interface SectionLabelProps {
  readonly children: ReactNode;
  readonly action?: ReactNode;
}

/** An uppercase caption above a group, optionally with a trailing action. */
export function SectionLabel({ children, action }: SectionLabelProps): ReactElement {
  return (
    <div className="sectionLabel">
      <span>{children}</span>
      {action}
    </div>
  );
}

export function Hint({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement {
  return (
    <div className={cn("hint", className)} {...props}>
      {children}
    </div>
  );
}

export function Rule(): ReactElement {
  return <hr className="rule" />;
}

interface NoticeProps {
  readonly tone: "success" | "warning" | "error";
  readonly children: ReactNode;
}

/** A one-line status message shown at the top of a screen. */
export function Notice({ tone, children }: NoticeProps): ReactElement {
  const Icon = tone === "success" ? CircleCheck : tone === "warning" ? TriangleAlert : CircleAlert;
  return (
    <div className={`notice notice-${tone}`} role={tone === "error" ? "alert" : "status"}>
      <Icon className="notice-icon" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

interface BannerProps extends HTMLAttributes<HTMLDivElement> {
  readonly header: ReactNode;
  readonly subheader?: ReactNode;
}

export function Banner({
  header,
  subheader,
  className,
  children,
  ...props
}: BannerProps): ReactElement {
  return (
    <div className={cn("banner", className)} role="alert" {...props}>
      <div className="banner-header">{header}</div>
      {subheader === undefined ? undefined : <div className="banner-body">{subheader}</div>}
      {children === undefined ? undefined : <div className="banner-actions">{children}</div>}
    </div>
  );
}

interface PlaceholderProps extends HTMLAttributes<HTMLDivElement> {
  readonly header: ReactNode;
  readonly description?: ReactNode;
  readonly action?: ReactNode;
}

export function Placeholder({
  header,
  description,
  action,
  className,
  children,
  ...props
}: PlaceholderProps): ReactElement {
  return (
    <div className={cn("placeholder", className)} {...props}>
      {children}
      <div className="placeholder-header">{header}</div>
      {description === undefined ? undefined : (
        <div className="placeholder-description">{description}</div>
      )}
      {action === undefined ? undefined : <div className="placeholder-action">{action}</div>}
    </div>
  );
}

interface SpinnerProps extends HTMLAttributes<SVGSVGElement> {
  readonly size?: "m" | "l";
}

export function Spinner({ size = "m", className, ...props }: SpinnerProps): ReactElement {
  return (
    <LoaderCircle
      className={cn("spinner", size === "l" && "spinner-l", className)}
      aria-label="Loading"
      {...props}
    />
  );
}

/** A centered loading or error state that fills the screen body. */
export function LoadingState({
  header,
  description,
  error,
  onRetry,
}: {
  readonly header: string;
  readonly description?: string;
  readonly error?: string | undefined;
  readonly onRetry?: () => void;
}): ReactElement {
  return (
    <div className="loadingState">
      {error !== undefined ? (
        <Placeholder
          header={header}
          description={error}
          action={onRetry === undefined ? undefined : <Button onClick={onRetry}>Try again</Button>}
        />
      ) : (
        <Placeholder header={header} description={description}>
          <Spinner size="l" />
        </Placeholder>
      )}
    </div>
  );
}

export function Caption({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement>): ReactElement {
  return (
    <span className={cn("caption", className)} {...props}>
      {children}
    </span>
  );
}
