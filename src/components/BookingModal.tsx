import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, Service, Booking } from '../services/api';
import { X, Calendar, Clock, MapPin, Phone, AlertCircle, CheckCircle, IndianRupee, ShieldCheck, ChevronDown } from 'lucide-react';
import { VALID_TIME_SLOTS, PUNE_LOCALITIES } from '../constants';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedServiceId?: string;
  onBookingSuccess: (booking: Booking) => void;
  onRequireLogin: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  preselectedServiceId,
  onBookingSuccess,
  onRequireLogin,
}) => {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(preselectedServiceId || '');
  const [bookingDate, setBookingDate] = useState<string>('');
  const [timeSlot, setTimeSlot] = useState<string>(VALID_TIME_SLOTS[0]);
  const [locality, setLocality] = useState<string>(user?.locality || 'Kothrud');
  const [address, setAddress] = useState<string>(user?.address || '');
  const [contactNumber, setContactNumber] = useState<string>(user?.phone || '');
  const [problemDescription, setProblemDescription] = useState<string>('');
  const [additionalInstructions, setAdditionalInstructions] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const serviceDropdownRef = useRef<HTMLDivElement>(null);

  // Close service dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        serviceDropdownRef.current &&
        !serviceDropdownRef.current.contains(event.target as Node)
      ) {
        setServiceDropdownOpen(false);
      }
    };
    if (serviceDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [serviceDropdownOpen]);

  // Keyboard navigation for service dropdown
  const handleServiceKeyDown = (e: React.KeyboardEvent) => {
    if (!serviceDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setServiceDropdownOpen(true);
        const idx = services.findIndex((s) => s.id === selectedServiceId);
        setHighlightedIndex(idx >= 0 ? idx : 0);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setServiceDropdownOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < services.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : services.length - 1));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < services.length) {
        setSelectedServiceId(services[highlightedIndex].id);
        setServiceDropdownOpen(false);
      }
    }
  };

  // Minimum date = today
  const todayStr = new Date().toISOString().slice(0, 10);
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 60);
  const maxDateStr = maxDate.toISOString().slice(0, 10);

  useEffect(() => {
    if (isOpen) {
      api.getServices()
        .then((res) => {
          setServices(res.services);
          if (preselectedServiceId) {
            setSelectedServiceId(preselectedServiceId);
          } else if (res.services.length > 0 && !selectedServiceId) {
            setSelectedServiceId(res.services[0].id);
          }
        })
        .catch((err) => console.error('Failed to load services:', err));
    }
  }, [isOpen, preselectedServiceId]);

  useEffect(() => {
    if (user) {
      if (user.phone && !contactNumber) setContactNumber(user.phone);
      if (user.address && !address) setAddress(user.address);
      if (user.locality) setLocality(user.locality);
    }
  }, [user]);

  if (!isOpen) return null;

  const selectedService = services.find((s) => s.id === selectedServiceId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireLogin();
      return;
    }

    if (!selectedServiceId || !bookingDate || !timeSlot || !address || !locality || !contactNumber || !problemDescription) {
      setError('Please fill in all required fields.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await api.createBooking({
        service_id: selectedServiceId,
        booking_date: bookingDate,
        time_slot: timeSlot,
        service_address: address,
        locality,
        contact_number: contactNumber,
        problem_description: problemDescription,
        additional_instructions: additionalInstructions,
      });

      setConfirmedBooking(res.booking);
      onBookingSuccess(res.booking);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create booking.');
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setConfirmedBooking(null);
    setError(null);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={resetAndClose}>
      <div className="modal-content booking-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={resetAndClose} aria-label="Close">
          <X size={20} />
        </button>

        {confirmedBooking ? (
          <div className="booking-modal-body">
            <div className="booking-success-view">
            <div className="success-icon-badge">
              <CheckCircle size={48} color="#16a34a" />
            </div>
            <h2>Booking Confirmed!</h2>
            <p className="success-subtitle">
              Your appointment has been successfully scheduled. Our coordinator will assign a certified Pune technician shortly.
            </p>

            <div className="success-details-card">
              <div className="detail-row">
                <span className="label">Booking ID:</span>
                <span className="value highlight">{confirmedBooking.id}</span>
              </div>
              <div className="detail-row">
                <span className="label">Service:</span>
                <span className="value">{confirmedBooking.service_name_snapshot}</span>
              </div>
              <div className="detail-row">
                <span className="label">Date &amp; Time:</span>
                <span className="value">{confirmedBooking.booking_date} ({confirmedBooking.time_slot})</span>
              </div>
              <div className="detail-row">
                <span className="label">Location:</span>
                <span className="value">{confirmedBooking.locality}, Pune</span>
              </div>
              <div className="detail-row">
                <span className="label">Agreed Rate:</span>
                <span className="value price">₹{confirmedBooking.agreed_price_inr}</span>
              </div>
              <div className="detail-row">
                <span className="label">Payment:</span>
                <span className="value badge-pay">Pay on Service Completion (Cash / UPI)</span>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-primary"
                style={{ width: '100%' }}
                onClick={() => {
                  resetAndClose();
                  window.location.hash = 'my-bookings';
                }}
              >
                View in My Bookings
              </button>
            </div>
          </div>
          </div>
        ) : (
          <>
            <div className="booking-modal-header">
              <h2>Schedule Home Service</h2>
              <p>Verified Pune technicians • Clear upfront rates • Pay after service</p>
            </div>

            <div className="booking-modal-body">

            {!user && (
              <div className="login-notice-banner">
                <AlertCircle size={18} />
                <span>You need to be logged in to confirm a booking.</span>
                <button type="button" onClick={onRequireLogin}>
                  Log In / Sign Up
                </button>
              </div>
            )}

            {error && (
              <div className="auth-error-banner">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="booking-form">
              <div className="form-group service-select-group" ref={serviceDropdownRef}>
                <label id="service-select-label">Select Service *</label>
                <div className="custom-select-container">
                  <button
                    type="button"
                    className={`custom-select-trigger ${serviceDropdownOpen ? 'open' : ''}`}
                    onClick={() => {
                      setServiceDropdownOpen(!serviceDropdownOpen);
                      const idx = services.findIndex((s) => s.id === selectedServiceId);
                      setHighlightedIndex(idx >= 0 ? idx : 0);
                    }}
                    onKeyDown={handleServiceKeyDown}
                    aria-haspopup="listbox"
                    aria-expanded={serviceDropdownOpen}
                    aria-labelledby="service-select-label"
                  >
                    <span className="selected-service-text">
                      {selectedService
                        ? `[${selectedService.category}] ${selectedService.name} - ₹${selectedService.price_inr} (~${selectedService.estimated_duration_min}m)`
                        : 'Choose a service...'}
                    </span>
                    <ChevronDown
                      size={18}
                      className={`select-chevron ${serviceDropdownOpen ? 'rotated' : ''}`}
                    />
                  </button>

                  {serviceDropdownOpen && (
                    <div
                      className="custom-select-menu"
                      role="listbox"
                      aria-labelledby="service-select-label"
                    >
                      {services.map((s, index) => {
                        const isSelected = s.id === selectedServiceId;
                        const isHighlighted = index === highlightedIndex;
                        return (
                          <div
                            key={s.id}
                            role="option"
                            aria-selected={isSelected}
                            className={`custom-select-option ${isSelected ? 'selected' : ''} ${
                              isHighlighted ? 'highlighted' : ''
                            }`}
                            onClick={() => {
                              setSelectedServiceId(s.id);
                              setServiceDropdownOpen(false);
                            }}
                            onMouseEnter={() => setHighlightedIndex(index)}
                          >
                            <div className="option-primary">
                              <span className="option-category">[{s.category}]</span>
                              <span className="option-name">{s.name}</span>
                            </div>
                            <div className="option-secondary">
                              <span className="option-price">₹{s.price_inr}</span>
                              <span className="option-duration">~{s.estimated_duration_min}m</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Hidden native select for form validation and accessibility tools */}
                  <select
                    name="service_id"
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    required
                    tabIndex={-1}
                    aria-hidden="true"
                    className="visually-hidden-select"
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        [{s.category}] {s.name} - ₹{s.price_inr} (~{s.estimated_duration_min}m)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedService && (
                <div className="service-preview-card">
                  <div className="preview-info">
                    <h4>{selectedService.name}</h4>
                    <p>{selectedService.description}</p>
                  </div>
                  <div className="preview-price">
                    <span className="duration">Est. {selectedService.estimated_duration_min} mins</span>
                    <span className="amount">₹{selectedService.price_inr}</span>
                  </div>
                </div>
              )}

              <div className="form-row-2">
                <div className="form-group">
                  <label>
                    <Calendar size={16} /> Preferred Date *
                  </label>
                  <input
                    type="date"
                    required
                    min={todayStr}
                    max={maxDateStr}
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>
                    <Clock size={16} /> Time Slot *
                  </label>
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    required
                  >
                    {VALID_TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>
                    <MapPin size={16} /> Locality in Pune *
                  </label>
                  <select
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    required
                  >
                    {PUNE_LOCALITIES.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}, Pune
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    <Phone size={16} /> Contact Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98220 12345"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Flat / Society / House Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flat 402, Mayur Residency, Paud Road"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Problem Description &amp; Details *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe what needs repair, symptoms (e.g. leaking sink pipe, faulty switchboard, AC not cooling)..."
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Additional Notes / Instructions (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Call before ringing bell; guard permission required at gate"
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                />
              </div>

              <div className="price-assurance-box">
                <div className="assurance-left">
                  <ShieldCheck size={20} color="#2563eb" />
                  <div>
                    <strong>Sunrise Price Guarantee</strong>
                    <p>Transparent pricing, no hidden travel or visit surcharge.</p>
                  </div>
                </div>
                <div className="assurance-right">
                  <span className="total-label">Estimated Total:</span>
                  <span className="total-val">
                    <IndianRupee size={16} style={{ display: 'inline', verticalAlign: 'text-bottom' }} />
                    {selectedService ? selectedService.price_inr : 0}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ width: '100%', border: 'none', padding: '14px', fontSize: '16px' }}
                disabled={loading}
              >
                {loading ? 'Validating & Scheduling...' : user ? 'Confirm & Book Appointment' : 'Log In to Confirm Booking'}
              </button>
            </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
