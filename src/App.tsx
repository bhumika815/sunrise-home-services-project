import React, { useState, useEffect } from 'react';
import { Page } from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { About } from './components/About';
import { ServicesSection } from './components/ServicesSection';
import { Testimonials } from './components/Testimonials';
import { CtaSection } from './components/CtaSection';
import { ContactSection } from './components/ContactSection';
import { FloatingActions } from './components/FloatingActions';
import { Footer } from './components/Footer';

// Modals
import { AuthModal } from './components/AuthModal';
import { BookingModal } from './components/BookingModal';
import { NotificationModal } from './components/NotificationModal';

// Customer Views
import { MyBookingsView } from './components/customer/MyBookingsView';
import { MyProfileView } from './components/customer/MyProfileView';

// Admin Views
import { AdminNavbar } from './components/admin/AdminNavbar';
import { AdminDashboardView } from './components/admin/AdminDashboardView';
import { AdminBookingsView } from './components/admin/AdminBookingsView';
import { AdminCalendarView } from './components/admin/AdminCalendarView';
import { AdminServicesView } from './components/admin/AdminServicesView';
import { AdminProfessionalsView } from './components/admin/AdminProfessionalsView';
import { AdminReviewsView } from './components/admin/AdminReviewsView';
import { AdminEnquiriesView } from './components/admin/AdminEnquiriesView';
import { AdminReportsView } from './components/admin/AdminReportsView';
import { AdminAuditView } from './components/admin/AdminAuditView';


const AppContent: React.FC = () => {
  const { user, refreshUser } = useAuth();

  const getInitialPage = (): Page => {
    const hash = window.location.hash.replace('#', '').toLowerCase();
    const validPages: Page[] = [
      'home',
      'services',
      'contact',
      'book-service',
      'my-bookings',
      'my-profile',
      'admin-dashboard',
      'admin-bookings',
      'admin-calendar',
      'admin-services',
      'admin-professionals',
      'admin-reviews',
      'admin-enquiries',
      'admin-reports',
      'admin-audit',
    ];
    if (validPages.includes(hash as Page)) {
      return hash as Page;
    }
    return 'home';
  };

  const [currentPage, setCurrentPage] = useState<Page>(getInitialPage);

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [notifModalOpen, setNotifModalOpen] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase() as Page;
      if (hash) {
        setCurrentPage(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (page: Page) => {
    // Role protection for admin pages
    if (page.startsWith('admin-') && user?.role !== 'admin') {
      setAuthMode('login');
      setAuthModalOpen(true);
      return;
    }

    // Role protection for customer pages
    if ((page === 'my-bookings' || page === 'my-profile') && !user) {
      setAuthMode('login');
      setAuthModalOpen(true);
      return;
    }

    setCurrentPage(page);
    window.location.hash = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenBooking = (serviceId?: string) => {
    if (serviceId) {
      setSelectedServiceId(serviceId);
    }
    setBookingModalOpen(true);
  };

  const handleOpenAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const isAdminView = currentPage.startsWith('admin-');

  return (
    <div className="app-root">
      <Navbar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onOpenAuth={handleOpenAuth}
        onOpenBooking={() => handleOpenBooking()}
        onOpenNotifications={() => setNotifModalOpen(true)}
      />

      {isAdminView && (
        <AdminNavbar currentPage={currentPage} onNavigate={handleNavigate} />
      )}

      <main>
        {/* PUBLIC VIEWS */}
        {currentPage === 'home' && (
          <>
            <Hero onNavigate={handleNavigate} />
            <About onNavigate={handleNavigate} />
            <ServicesSection
              onNavigate={handleNavigate}
              onSelectServiceForBooking={handleOpenBooking}
            />
            <Testimonials />
            <CtaSection onNavigate={handleNavigate} />
          </>
        )}

        {currentPage === 'services' && (
          <>
            <ServicesSection
              isFullPage={true}
              onNavigate={handleNavigate}
              onSelectServiceForBooking={handleOpenBooking}
            />
            <CtaSection
              onNavigate={handleNavigate}
              title="Need Any Service?"
              subtitle="Contact us today for quick and affordable home solutions in Pune."
            />
          </>
        )}

        {currentPage === 'contact' && <ContactSection />}

        {/* CUSTOMER VIEWS */}
        {currentPage === 'my-bookings' && (
          <MyBookingsView onOpenBookingModal={() => handleOpenBooking()} />
        )}

        {currentPage === 'my-profile' && <MyProfileView />}

        {/* ADMINISTRATOR VIEWS */}
        {currentPage === 'admin-dashboard' && (
          <AdminDashboardView onNavigate={handleNavigate} />
        )}

        {currentPage === 'admin-bookings' && <AdminBookingsView />}

        {currentPage === 'admin-calendar' && <AdminCalendarView />}

        {currentPage === 'admin-services' && <AdminServicesView />}

        {currentPage === 'admin-professionals' && <AdminProfessionalsView />}

        {currentPage === 'admin-reviews' && <AdminReviewsView />}

        {currentPage === 'admin-enquiries' && <AdminEnquiriesView />}

        {currentPage === 'admin-reports' && <AdminReportsView />}

        {currentPage === 'admin-audit' && <AdminAuditView />}
      </main>

      <Footer onNavigate={handleNavigate} />

      {/* Floating Buttons: WhatsApp, Direct Call, Package Purchase */}
      <FloatingActions />

      {/* Modals */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          refreshUser();
        }}
      />

      <BookingModal
        isOpen={bookingModalOpen}
        preselectedServiceId={selectedServiceId}
        onClose={() => setBookingModalOpen(false)}
        onRequireLogin={() => {
          setBookingModalOpen(false);
          setAuthMode('login');
          setAuthModalOpen(true);
        }}
        onBookingSuccess={() => {
          refreshUser();
        }}
      />

      <NotificationModal
        isOpen={notifModalOpen}
        onClose={() => setNotifModalOpen(false)}
        onRefreshCount={() => {
          refreshUser();
        }}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
