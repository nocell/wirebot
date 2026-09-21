/**
 * Screen chrome: the phone tab bar and sub-page headers, the desktop rail
 * and content header, and the breakpoint hook that chooses between them.
 */
import { CalendarClock, ChevronLeft, LogOut, SlidersHorizontal, Sparkles } from "lucide-react";
import { type ReactElement, type ReactNode, useSyncExternalStore } from "react";
import { cn } from "./cn.js";
import { WirebotLogo } from "./logo.js";
import { navigate, type Route, routeLink, type SettingsPage } from "./route.js";
import { nativeTelegramNavigation, telegramReady, useTelegramBackButton } from "./telegram.js";

const desktopQuery = window.matchMedia("(min-width: 900px)");

function subscribeDesktop(listener: () => void): () => void {
  desktopQuery.addEventListener("change", listener);
  return () => desktopQuery.removeEventListener("change", listener);
}

/** Wide browsers get the rail layout; Telegram always uses the phone layout. */
export function useDesktop(): boolean {
  const wide = useSyncExternalStore(subscribeDesktop, () => desktopQuery.matches);
  return wide && !telegramReady;
}

export const tabItems = [
  { id: "settings", label: "Settings", icon: SlidersHorizontal },
  { id: "skills", label: "Skills", icon: Sparkles },
  { id: "schedules", label: "Schedules", icon: CalendarClock },
] as const;

export function Screen({
  className,
  children,
}: {
  readonly className?: string;
  readonly children: ReactNode;
}): ReactElement {
  return <div className={cn("screen", className)}>{children}</div>;
}

export function ScreenBody({
  className,
  children,
}: {
  readonly className?: string;
  readonly children: ReactNode;
}): ReactElement {
  return <main className={cn("screenBody", className)}>{children}</main>;
}

export function TabBar({ route }: { readonly route: Route }): ReactElement {
  return (
    <nav className="tabBar" aria-label="Main navigation">
      {tabItems.map(({ id, label, icon: Icon }) => {
        const selected = route.tab === id;
        return (
          <a
            key={id}
            className={cn("tabBar-item", selected && "tabBar-selected")}
            aria-current={selected ? "page" : undefined}
            {...routeLink({ tab: id })}
          >
            <Icon className="tabBar-icon" aria-hidden="true" />
            <span>{label}</span>
          </a>
        );
      })}
    </nav>
  );
}

interface PageTitleProps {
  readonly title: string;
  readonly subtitle?: ReactNode;
  readonly action?: ReactNode;
}

/** The large title at the top of a phone tab root. */
export function PageTitle({ title, subtitle, action }: PageTitleProps): ReactElement {
  return (
    <header className="pageTitle">
      <div className="pageTitle-copy">
        <h1>{title}</h1>
        {subtitle === undefined ? undefined : <div className="pageTitle-subtitle">{subtitle}</div>}
      </div>
      {action}
    </header>
  );
}

interface SubpageHeaderProps {
  readonly back: { readonly label: string; readonly route: Route };
  readonly title: string;
}

/** Registers the Telegram back button for a phone sub-page. */
export function useSubpageBack(route: Route): void {
  useTelegramBackButton(() => navigate(route));
}

/** A phone sub-page header: back link, centered title, no tab bar below. */
export function SubpageHeader({ back, title }: SubpageHeaderProps): ReactElement {
  return (
    <header className="subpageHeader">
      {nativeTelegramNavigation ? (
        <span />
      ) : (
        <a className="subpageHeader-back" {...routeLink(back.route)}>
          <ChevronLeft aria-hidden="true" />
          {back.label}
        </a>
      )}
      <h1 className="subpageHeader-title">{title}</h1>
      <span />
    </header>
  );
}

interface BottomBarProps {
  readonly status?: ReactNode;
  readonly children: ReactNode;
}

/** The single action docked at the bottom of a phone sub-page. */
export function BottomBar({ status, children }: BottomBarProps): ReactElement {
  return (
    <div className="bottomBar">
      {status === undefined ? undefined : (
        <div className="bottomBar-status" aria-live="polite">
          {status}
        </div>
      )}
      {children}
    </div>
  );
}

export interface RailSettingsPage {
  readonly page: SettingsPage;
  readonly label: string;
  readonly value: string;
}

interface RailProps {
  readonly route: Route;
  readonly settingsPages: readonly RailSettingsPage[];
  readonly skillsCount: number | undefined;
  readonly schedulesSummary: string | undefined;
  readonly footer?: ReactNode;
  readonly version: string | undefined;
  readonly signOutBusy: boolean;
  readonly onSignOut: () => void;
}

/** The desktop left rail: tabs, Settings pages with their values, and a footer. */
export function Rail(props: RailProps): ReactElement {
  const activePage = props.route.tab === "settings" ? (props.route.detail ?? "model") : undefined;
  const meta = {
    settings: undefined,
    skills: props.skillsCount === undefined ? undefined : String(props.skillsCount),
    schedules: props.schedulesSummary,
  } as const;
  return (
    <aside className="rail">
      <div className="rail-brand">
        <WirebotLogo className="rail-logo" />
      </div>
      <nav className="rail-nav" aria-label="Main navigation">
        {tabItems.map(({ id, label, icon: Icon }) => {
          const selected = props.route.tab === id;
          return (
            <div key={id} className="rail-group">
              <a
                className={cn("rail-item", selected && "rail-selected")}
                aria-current={selected ? "page" : undefined}
                {...routeLink({ tab: id })}
              >
                <Icon className="rail-icon" aria-hidden="true" />
                <span className="rail-label">{label}</span>
                {meta[id] === undefined ? undefined : <span className="rail-meta">{meta[id]}</span>}
              </a>
              {id === "settings" && selected ? (
                <div className="rail-pages">
                  {props.settingsPages.map((entry) => (
                    <a
                      key={entry.page}
                      className={cn("rail-page", activePage === entry.page && "rail-pageSelected")}
                      aria-current={activePage === entry.page ? "page" : undefined}
                      {...routeLink({ tab: "settings", detail: entry.page })}
                    >
                      <span className="rail-pageLabel">{entry.label}</span>
                      <span className="rail-pageValue">{entry.value}</span>
                    </a>
                  ))}
                </div>
              ) : undefined}
            </div>
          );
        })}
      </nav>
      <div className="rail-footer">
        {props.footer}
        <div className="rail-meta-line">
          <span>{props.version === undefined ? "Wirebot" : `Wirebot ${props.version}`}</span>
          <button
            type="button"
            className="rail-signOut"
            disabled={props.signOutBusy}
            onClick={props.onSignOut}
          >
            <LogOut aria-hidden="true" />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}

interface ContentHeaderProps {
  readonly crumbs: readonly ReactNode[];
  readonly children?: ReactNode;
}

/** The desktop content header: breadcrumb on the left, actions on the right. */
export function ContentHeader({ crumbs, children }: ContentHeaderProps): ReactElement {
  return (
    <header className="contentHeader">
      <div className="crumbs">
        {crumbs.map((crumb, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: breadcrumbs are positional.
          <span key={index} className="crumb">
            {index > 0 ? (
              <span className="crumb-separator" aria-hidden="true">
                /
              </span>
            ) : undefined}
            <span className={index === crumbs.length - 1 ? "crumb-current" : undefined}>
              {crumb}
            </span>
          </span>
        ))}
      </div>
      {children === undefined ? undefined : <div className="contentHeader-actions">{children}</div>}
    </header>
  );
}

interface SplitViewProps {
  readonly list: ReactNode;
  readonly wide?: boolean;
  readonly children: ReactNode;
}

/** Desktop master-detail: a list column beside the detail pane. */
export function SplitView({ list, wide, children }: SplitViewProps): ReactElement {
  return (
    <div className={cn("split", wide && "split-wide")}>
      <aside className="listCol">{list}</aside>
      <div className="pane">{children}</div>
    </div>
  );
}

export function ListColHeader({ children }: { readonly children: ReactNode }): ReactElement {
  return <div className="listCol-header">{children}</div>;
}
