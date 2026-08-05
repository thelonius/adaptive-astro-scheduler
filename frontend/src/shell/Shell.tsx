import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UiProvider, useUi } from './ui';
import { Sidebar } from './Sidebar';
import { findNavItem } from './nav';
import { GlossaryProvider } from './Glossary/GlossaryProvider';
import { TooltipController } from './Glossary/Tooltip';
import './shell.css';

function ShellInner() {
    const { t } = useTranslation();
    const ui = useUi();
    const location = useLocation();
    const item = findNavItem(location.pathname);

    return (
        <>
            <TooltipController />
            <div
                className={`ag-overlay${ui.mobileSidebarOpen ? ' show' : ''}`}
                onClick={ui.closeMobileSidebar}
            />
            <div className="ag-shell">
                <Sidebar />
                <div className="ag-main">
                    <header className="ag-header">
                        <button
                            type="button"
                            className="ag-sidebar-toggle"
                            title={t('nav.toggleSidebar', 'Свернуть меню')}
                            onClick={ui.toggleDesktopSidebar}
                        >
                            {ui.desktopSidebarCollapsed ? '▶' : '◀'}
                        </button>
                        <button
                            type="button"
                            className="ag-hamburger"
                            aria-label={t('nav.menu', 'Меню')}
                            onClick={ui.openMobileSidebar}
                        >
                            ☰
                        </button>
                        <span className="ag-header-title">
                            {item ? t(item.i18nKey, item.fallback) : t('nav.appTitle', 'Adaptive Astro')}
                        </span>
                    </header>

                    <div className="ag-content">
                        <Outlet />
                    </div>
                </div>
            </div>
        </>
    );
}

export function Shell() {
    return (
        <UiProvider>
            <GlossaryProvider>
                <ShellInner />
            </GlossaryProvider>
        </UiProvider>
    );
}
