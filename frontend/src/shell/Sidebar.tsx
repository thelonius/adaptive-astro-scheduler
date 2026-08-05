import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUi } from './ui';
import { NAV } from './nav';

export function Sidebar() {
    const { t } = useTranslation();
    const ui = useUi();
    const location = useLocation();

    const cls = [
        'ag-sidebar',
        ui.desktopSidebarCollapsed ? 'collapsed' : '',
        ui.mobileSidebarOpen ? 'open' : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <nav className={cls} aria-label={t('nav.appTitle', 'Навигация')}>
            <div className="ag-sidebar-header">
                <NavLink to="/" onClick={ui.closeMobileSidebar} style={{ textDecoration: 'none' }}>
                    <h1>{t('nav.appTitle', 'Adaptive Astro')}</h1>
                    <p>{t('nav.subtitle', 'Планировщик по небу')}</p>
                </NavLink>
            </div>

            <div className="ag-nav">
                {NAV.map((section) => {
                    const closed = section.collapsible && ui.closedSections.includes(section.id);
                    // Свёрнутую секцию раскрываем принудительно, если активна страница
                    // внутри неё — иначе пользователь не видит, где находится.
                    const hasActive = section.items.some(
                        (i) => location.pathname === i.path || location.pathname.startsWith(i.path + '/'),
                    );
                    const hidden = closed && !hasActive;

                    return (
                        <div key={section.id}>
                            <button
                                type="button"
                                className={`ag-section-header${section.collapsible ? ' collapsible' : ''}`}
                                onClick={section.collapsible ? () => ui.toggleSection(section.id) : undefined}
                                aria-expanded={section.collapsible ? !hidden : undefined}
                            >
                                {section.collapsible && (
                                    <span className={`ag-section-caret${hidden ? '' : ' open'}`}>▶</span>
                                )}
                                {t(section.i18nKey, section.fallback)}
                            </button>

                            {!hidden &&
                                section.items.map((item) => (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        className={({ isActive }) => `ag-nav-btn${isActive ? ' active' : ''}`}
                                        onClick={ui.closeMobileSidebar}
                                    >
                                        <span className="ag-nav-icon">{item.icon}</span>
                                        <span className="ag-nav-title">{t(item.i18nKey, item.fallback)}</span>
                                    </NavLink>
                                ))}
                        </div>
                    );
                })}
            </div>
        </nav>
    );
}
