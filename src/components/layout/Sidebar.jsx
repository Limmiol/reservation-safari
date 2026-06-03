import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Package, CalendarDays, BookOpen,
  FileText, Receipt, CreditCard, Ticket, Plane, ClipboardList,
  History, ChevronLeft, ChevronRight, LogOut, Compass, MessageSquare, Settings, Bot, User, Globe,
  Truck, Wrench, Briefcase, Map, DollarSign, Layers, TrendingDown, TrendingUp, Newspaper, PenSquare, MapPin, X,
  Compass as GuideIcon, Zap, BarChart2, Library, Sparkles, FileUp, Sun, Wand2, ScanLine
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { getSiteConfig } from '@/lib/siteConfig';
import { useLanguage } from '@/lib/LanguageContext';
import { translate } from '@/lib/translations';

const NavSection = ({ items, label, collapsed, location, onNavClick }) => {
  return (
    <div>
      {!collapsed && label && (
        <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</div>
      )}
      <div className="px-2 space-y-0.5">
        {items.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : ''}
              onClick={onNavClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary text-white [&_svg]:text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-primary/10"
              )}
            >
              <item.icon className="w-4.5 h-4.5 flex-shrink-0" style={{ width: 18, height: 18 }} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default function Sidebar({ mobileOpen, onMobileClose, collapsed, onCollapse }) {
  const location = useLocation();
  const [siteConfig, setSiteConfig] = useState(getSiteConfig());
  const [userRole, setUserRole] = useState('admin');
  const [userInfo, setUserInfo] = useState(null);
  const { language } = useLanguage();
  const t = (key) => translate(key, language);

  const mainNavItems = [
    { label: t('dashboard'), icon: LayoutDashboard, path: '/' },
    { label: 'Analytics', icon: BarChart2, path: '/analytics' },
    { label: t('agent_dashboard'), icon: Bot, path: '/agent-dashboard' },
    { label: t('guide_dashboard'), icon: GuideIcon, path: '/guide-dashboard' },
    { label: t('clients'), icon: Users, path: '/clients' },
    { label: t('packages'), icon: Package, path: '/packages' },
    { label: t('bookings'), icon: BookOpen, path: '/bookings' },
    { label: t('booking_ai'), icon: Bot, path: '/booking-ai' },
    { label: t('calendar'), icon: CalendarDays, path: '/calendar' },
    { label: 'Safari Library', icon: Library, path: '/safari-library' },
    { label: 'Trip Planner', icon: Wand2, path: '/trip-planner' },
    { label: 'Quote Builder', icon: Sparkles, path: '/safari-quote-builder' },
    { label: 'Package Import', icon: FileUp, path: '/package-import' },
    { label: 'When to Visit', icon: Sun, path: '/when-to-visit' },
    { label: t('blog'), icon: Newspaper, path: '/blog' },
    { label: t('blog_admin'), icon: PenSquare, path: '/blog-admin' },
    { label: t('testimonials'), icon: MessageSquare, path: '/testimonials' },
  ];

  const operationsItems = [
    { label: t('quotes'), icon: FileText, path: '/quotes' },
    { label: t('itinerary_manager'), icon: MapPin, path: '/itinerary-manager' },
    { label: t('invoices'), icon: Receipt, path: '/invoices' },
    { label: t('payments'), icon: CreditCard, path: '/payments' },
    { label: t('vouchers'), icon: Ticket, path: '/vouchers' },
    { label: t('flights'), icon: Plane, path: '/flights' },
    { label: t('manifests'), icon: ClipboardList, path: '/manifests' },
    { label: 'Scanner', icon: ScanLine, path: '/scanner' },
    { label: t('messages'), icon: MessageSquare, path: '/messages' },
    { label: t('income'), icon: TrendingUp, path: '/income' },
    { label: t('expenses'), icon: TrendingDown, path: '/expenses' },
    { label: t('financial_statements'), icon: FileText, path: '/financial-statements' },
  ];

  const inventoryItems = [
    { label: t('vehicles'), icon: Truck, path: '/vehicles' },
    { label: t('drivers'), icon: Users, path: '/drivers' },
    { label: t('equipment'), icon: Wrench, path: '/equipment' },
    { label: t('resource_scheduler'), icon: Layers, path: '/resource-scheduler' },
    { label: t('resources'), icon: Briefcase, path: '/resource-assignments' },
    { label: t('availability'), icon: Map, path: '/availability' },
  ];

  const settingsItems = [
    { label: t('agents'), icon: Bot, path: '/agents' },
    { label: 'Automations', icon: Zap, path: '/automations' },
    { label: t('ota_channels'), icon: Globe, path: '/otas' },
    { label: t('currency_converter'), icon: DollarSign, path: '/currency-converter' },
    { label: t('users'), icon: Users, path: '/users' },
    { label: t('profile'), icon: User, path: '/profile' },
    { label: t('settings'), icon: Settings, path: '/settings' },
  ];

  useEffect(() => {
    const handler = () => setSiteConfig(getSiteConfig());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  useEffect(() => {
    base44.auth.me().then(me => {
      if (me?.role) setUserRole(me.role);
      if (me) setUserInfo(me);
    }).catch(() => {});
  }, []);

  // null means admin (unrestricted). Defined array means filtered.
  // If the role isn't in navPermissions at all, fall back to a minimal safe set.
  const navPerms = siteConfig.navPermissions || {};
  const allowedPaths = Object.prototype.hasOwnProperty.call(navPerms, userRole)
    ? navPerms[userRole]   // could be null (admin) or array
    : ['/', '/profile'];   // unknown role: only home + profile

  const filterItems = (items) =>
    allowedPaths === null
      ? items
      : items.filter(i => allowedPaths.includes(i.path));

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen bg-card border-r border-border z-40 flex flex-col transition-all duration-300 ease-in-out",
      // Desktop: always visible, collapsible
      "hidden md:flex",
      collapsed ? "md:w-16" : "md:w-60",
      // Mobile: drawer overlay
      mobileOpen && "flex w-72 md:flex",
    )}>
      {/* Logo */}
      <div className={cn(
        "flex items-center justify-between border-b border-border flex-shrink-0 transition-all duration-300 px-3",
        collapsed && !mobileOpen ? "h-16 justify-center" : "h-16"
      )}>
        <div className={cn("flex items-center gap-2 overflow-hidden", collapsed && !mobileOpen ? "justify-center" : "")}>
          <img src="/rs-logo-icon.svg" alt="RS" className="w-8 h-8 object-contain flex-shrink-0" />
          {(!collapsed || mobileOpen) && (
            <span className="text-primary font-extrabold text-sm leading-tight tracking-wide whitespace-nowrap">
              Reservation Safari
            </span>
          )}
        </div>
        {/* Close button on mobile */}
        {mobileOpen && (
          <button
            onClick={onMobileClose}
            className="md:hidden p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors flex-shrink-0"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto space-y-6 py-6">
        {filterItems(mainNavItems).length > 0 && (
          <NavSection
            items={filterItems(mainNavItems)}
            label={null}
            collapsed={collapsed && !mobileOpen}
            location={location}
            onNavClick={mobileOpen ? onMobileClose : undefined}
          />
        )}

        {filterItems(operationsItems).length > 0 && (
          <div className="border-t border-border">
            <NavSection
              items={filterItems(operationsItems)}
              label={t('operations')}
              collapsed={collapsed && !mobileOpen}
              location={location}
              onNavClick={mobileOpen ? onMobileClose : undefined}
            />
          </div>
        )}

        {filterItems(inventoryItems).length > 0 && (
          <div className="border-t border-border">
            <NavSection
              items={filterItems(inventoryItems)}
              label={t('inventory')}
              collapsed={collapsed && !mobileOpen}
              location={location}
              onNavClick={mobileOpen ? onMobileClose : undefined}
            />
          </div>
        )}

        {filterItems(settingsItems).length > 0 && (
          <div className="border-t border-border">
            <NavSection
              items={filterItems(settingsItems)}
              label={t('settings')}
              collapsed={collapsed && !mobileOpen}
              location={location}
              onNavClick={mobileOpen ? onMobileClose : undefined}
            />
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-border flex-shrink-0">
        {/* User info card */}
        {(!collapsed || mobileOpen) && userInfo && (
          <div className="px-3 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
              {(userInfo.full_name || userInfo.email || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{userInfo.full_name || 'Admin'}</p>
              <p className="text-[10px] text-muted-foreground truncate capitalize">{userInfo.role}</p>
            </div>
          </div>
        )}
        <div className="p-2 space-y-1">
          {(!collapsed || mobileOpen) && (
            <div className="px-3 py-2">
              <LanguageSwitcher />
            </div>
          )}
          {/* Collapse toggle — desktop only */}
          <button
            onClick={() => onCollapse && onCollapse(!collapsed)}
            className="hidden md:flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent w-full transition-colors"
            title={collapsed ? t('settings') : t('collapse')}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {(!collapsed || mobileOpen) && <span>{t('collapse')}</span>}
          </button>
          <button
            onClick={() => base44.auth.logout()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent w-full transition-colors"
            title={t('logout')}
          >
            <LogOut className="w-4 h-4" />
            {(!collapsed || mobileOpen) && <span>{t('logout')}</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
