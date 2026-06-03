import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { LanguageProvider } from '@/lib/LanguageContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import SplashScreen from '@/components/SplashScreen';
import RouteProgress from '@/components/RouteProgress';

import Login from '@/pages/Login';
import Landing from '@/pages/Landing';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Clients from '@/pages/Clients';
import ClientDetail from '@/pages/ClientDetail';
import Packages from '@/pages/Packages.jsx';
import Bookings from '@/pages/Bookings';
import BookingDetail from '@/pages/BookingDetail';
import Calendar from '@/pages/Calendar';
import Quotes from '@/pages/Quotes';
import Invoices from '@/pages/Invoices';
import Payments from '@/pages/Payments';
import Vouchers from '@/pages/Vouchers';
import Flights from '@/pages/Flights';
import Manifests from '@/pages/Manifests';
import History from '@/pages/History';
import Messages from '@/pages/Messages';
import Settings from '@/pages/Settings';
import Profile from '@/pages/Profile';
import Users from '@/pages/Users';
import Agents from '@/pages/Agents';
import OTAs from '@/pages/OTAs';
import Testimonials from '@/pages/Testimonials';
import Availability from '@/pages/Availability';
import Automations from '@/pages/Automations';
import Vehicles from '@/pages/Vehicles';
import Drivers from '@/pages/Drivers';
import Equipment from '@/pages/Equipment';
import ResourceAssignments from '@/pages/ResourceAssignments';
import DriverPortal from '@/pages/DriverPortal';
import DriverPerformance from '@/pages/DriverPerformance';
import AgentDashboard from '@/pages/AgentDashboard';
import GuideDashboard from '@/pages/GuideDashboard';
import CurrencyConverter from '@/pages/CurrencyConverter';
import ResourceScheduler from '@/pages/ResourceScheduler';
import Expenses from '@/pages/Expenses';
import IncomePage from '@/pages/IncomePage';
import FinancialStatements from '@/pages/FinancialStatements';
import ClientPortalLayout from '@/components/layout/ClientPortalLayout';
import Blog from '@/pages/Blog';
import BlogAdmin from '@/pages/BlogAdmin';
import BookingAgent from '@/pages/BookingAgent';
import ItineraryManager from '@/pages/ItineraryManager';
import Analytics from '@/pages/Analytics';
import SafariLibrary from '@/pages/SafariLibrary';
import SafariQuoteBuilder from '@/pages/SafariQuoteBuilder';
import PackageImport from '@/pages/PackageImport';
import WhenToVisit from '@/pages/WhenToVisit';
import TripPlanner from '@/pages/TripPlanner';
import Scanner from '@/pages/Scanner';
import MyBookings from '@/pages/portal/MyBookings';
import MyBookingDetail from '@/pages/portal/MyBookingDetail';
import MyInvoices from '@/pages/portal/MyInvoices';

// Allowed paths per role (null = unrestricted admin access)
const ROLE_PATHS = {
  admin: null,
  user:   ['/', '/bookings', '/calendar', '/messages', '/profile'],
  agent:  ['/agent-dashboard', '/bookings', '/clients', '/packages', '/availability', '/calendar', '/messages', '/profile', '/quotes'],
  driver: ['/driver', '/scanner', '/profile'],
  guide:  ['/guide-dashboard', '/bookings', '/scanner', '/vehicles', '/calendar', '/messages', '/profile'],
  client: ['/portal'],
  other:  ['/messages', '/profile'],
};

// Default landing page per role when their current path isn't allowed
const ROLE_HOME = {
  agent:  '/agent-dashboard',
  guide:  '/guide-dashboard',
  driver: '/driver',
  client: '/portal',
  other:  '/profile',
};

// Redirects to the role's home if the current path is not allowed
const RoleGuard = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const role = user?.role;
  const allowed = ROLE_PATHS[role] ?? null;  // null = admin (unrestricted)

  if (allowed) {
    const ok = allowed.some(p =>
      p === '/' ? location.pathname === '/' : location.pathname.startsWith(p)
    );
    if (!ok) {
      const dest = ROLE_HOME[role] || '/';
      return <Navigate to={dest} replace />;
    }
  }
  return children;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <SplashScreen loading={true} />;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <RoleGuard>
    <RouteProgress />
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/:id" element={<ClientDetail />} />
        <Route path="/packages" element={<Packages />} />
        <Route path="/itinerary-manager" element={<ItineraryManager />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/bookings/:id" element={<BookingDetail />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/quotes" element={<Quotes />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/vouchers" element={<Vouchers />} />
        <Route path="/flights" element={<Flights />} />
        <Route path="/manifests" element={<Manifests />} />
        <Route path="/history" element={<History />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/users" element={<Users />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/otas" element={<OTAs />} />
        <Route path="/testimonials" element={<Testimonials />} />
        <Route path="/availability" element={<Availability />} />
        <Route path="/automations" element={<Automations />} />
        <Route path="/vehicles" element={<Vehicles />} />
        <Route path="/drivers" element={<Drivers />} />
        <Route path="/equipment" element={<Equipment />} />
        <Route path="/resource-assignments" element={<ResourceAssignments />} />
        <Route path="/driver" element={<DriverPortal />} />
        <Route path="/driver-performance" element={<DriverPerformance />} />
        <Route path="/agent-dashboard" element={<AgentDashboard />} />
        <Route path="/guide-dashboard" element={<GuideDashboard />} />
        <Route path="/currency-converter" element={<CurrencyConverter />} />
        <Route path="/resource-scheduler" element={<ResourceScheduler />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/income" element={<IncomePage />} />
        <Route path="/financial-statements" element={<FinancialStatements />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog-admin" element={<BlogAdmin />} />
        <Route path="/booking-ai" element={<BookingAgent />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/safari-library" element={<SafariLibrary />} />
        <Route path="/safari-quote-builder" element={<SafariQuoteBuilder />} />
        <Route path="/package-import" element={<PackageImport />} />
        <Route path="/when-to-visit" element={<WhenToVisit />} />
        <Route path="/trip-planner" element={<TripPlanner />} />
        <Route path="/scanner" element={<Scanner />} />
      </Route>
      <Route element={<ClientPortalLayout />}>
        <Route path="/portal" element={<MyBookings />} />
        <Route path="/portal/bookings/:id" element={<MyBookingDetail />} />
        <Route path="/portal/invoices" element={<MyInvoices />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </RoleGuard>
  );
};

function App() {
  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            {/* Public routes — no auth required */}
            <Route path="/login" element={<Login />} />
            <Route path="/landing" element={<Landing />} />
            {/* All other routes require auth */}
            <Route path="*" element={
              <AuthProvider>
                <AuthenticatedApp />
              </AuthProvider>
            } />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </LanguageProvider>
  )
}

export default App