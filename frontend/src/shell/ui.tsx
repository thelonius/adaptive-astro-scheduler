import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'ag.sidebar.collapsed';
const SECTIONS_KEY = 'ag.sidebar.sections';

function loadCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function loadClosedSections(): string[] {
  try {
    const raw = localStorage.getItem(SECTIONS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : ['lab'];
  } catch {
    return ['lab'];
  }
}

interface UiContextValue {
  /** Десктоп: схлопывание сайдбара в 0px, персистится. */
  desktopSidebarCollapsed: boolean;
  toggleDesktopSidebar: () => void;
  /** Мобайл: сайдбар поверх контента, сбрасывается на каждый переход. */
  mobileSidebarOpen: boolean;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  /** Свёрнутые секции навигации по id. */
  closedSections: string[];
  toggleSection: (id: string) => void;
}

const UiContext = createContext<UiContextValue | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const [desktopCollapsed, setDesktopCollapsed] = useState<boolean>(loadCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [closedSections, setClosedSections] = useState<string[]>(loadClosedSections);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, desktopCollapsed ? '1' : '0');
    } catch {
      /* приватный режим — переживём без персиста */
    }
  }, [desktopCollapsed]);

  useEffect(() => {
    try {
      localStorage.setItem(SECTIONS_KEY, JSON.stringify(closedSections));
    } catch {
      /* см. выше */
    }
  }, [closedSections]);

  const toggleDesktopSidebar = useCallback(() => setDesktopCollapsed((v) => !v), []);
  const openMobileSidebar = useCallback(() => setMobileOpen(true), []);
  const closeMobileSidebar = useCallback(() => setMobileOpen(false), []);
  const toggleSection = useCallback(
    (id: string) =>
      setClosedSections((prev) =>
        prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
      ),
    [],
  );

  return (
    <UiContext.Provider
      value={{
        desktopSidebarCollapsed: desktopCollapsed,
        toggleDesktopSidebar,
        mobileSidebarOpen: mobileOpen,
        openMobileSidebar,
        closeMobileSidebar,
        closedSections,
        toggleSection,
      }}
    >
      {children}
    </UiContext.Provider>
  );
}

export function useUi(): UiContextValue {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi must be used inside <UiProvider>');
  return ctx;
}
