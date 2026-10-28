import React, { useState, useEffect } from 'react';
import { COMPANY_INFO } from '../data';
import { api } from '../services/api';
import { Phone, Mail, Clock, Zap, CheckCircle2, MessageSquare, AlertCircle } from 'lucide-react';

interface ContactSectionProps {
  initialService?: string;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ initialService = '' }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [service, setService] = useState(initialService);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [formFeedback, setFormFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    if (initialService) {
      setService(initialService);
    }
  }, [initialService]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !phone.trim() || !message.trim()) {
      setFormFeedback({
        type: 'error',
        text: 'Please fill all required fields.',
      });
      return;
    }

    setLoading(true);
    setFormFeedback(null);

    try {
      // 1. Record enquiry in the backend SQLite database
      await api.submitEnquiry({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        service_requested: service || undefined,
        message: message.trim(),
      });

      // 2. Format and open WhatsApp message link for direct communication
      const servicePart = service ? `Service: ${service}%0A` : '';
      const whatsappMessage =
        `New Service Request:%0A` +
        `Name: ${encodeURIComponent(name)}%0A` +
        `Email: ${encodeURIComponent(email)}%0A` +
        `Phone: ${encodeURIComponent(phone)}%0A` +
        servicePart +
        `Message: ${encodeURIComponent(message)}`;

      const whatsappUrl = `https://wa.me/${COMPANY_INFO.whatsappNumber}?text=${whatsappMessage}`;
      try {
        if (typeof window !== 'undefined' && window.open) {
          window.open(whatsappUrl, '_blank');
        }
      } catch (err) {
        console.warn('Could not open WhatsApp window (iframe sandbox restriction):', err);
      }

      setFormFeedback({
        type: 'success',
        text: 'Enquiry saved and redirecting to WhatsApp! Our Pune operations team will contact you within 30–60 minutes.',
      });

      // Reset fields
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
      setService('');
    } catch (err: unknown) {
      setFormFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to send message. Please try WhatsApp directly.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <section className="page-header">
        <div className="container">
          <h1>Contact Us</h1>
          <p>Fast response across Pune. Reliable support. We are here to help.</p>
        </div>
      </section>

      <section className="contact-section">
        <div className="container contact-wrapper">
          {/* LEFT: FORM */}
          <div className="contact-card">
            <h2>Send a Message</h2>

            <form id="contactForm" className="contact-form" onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Your Name *"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <input
                type="email"
                placeholder="Your Email *"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                type="tel"
                placeholder="Phone Number (e.g. +91 98765 43210) *"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
              >
                <option value="">Select Service (Optional)</option>
                <option value="Plumbing">Plumbing Services</option>
                <option value="Electrical">Electrical Services</option>
                <option value="Air Conditioning">Air Conditioning (AC)</option>
                <option value="Renovation">Home Renovation</option>
                <option value="Other">Other Home Maintenance</option>
              </select>

              <textarea
                placeholder="Describe your issue or service needed in Pune..."
                rows={5}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />

              <button
                type="submit"
                className="btn-primary"
                style={{ border: 'none', width: '100%', padding: '14px' }}
                disabled={loading}
              >
                {loading ? 'Submitting Enquiry...' : 'Send Message & Chat on WhatsApp'}
              </button>

              {formFeedback && (
                <div className={`form-feedback ${formFeedback.type}`}>
                  {formFeedback.type === 'success' ? (
                    <CheckCircle2 size={18} style={{ display: 'inline', marginRight: '6px' }} />
                  ) : (
                    <AlertCircle size={18} style={{ display: 'inline', marginRight: '6px' }} />
                  )}
                  {formFeedback.text}
                </div>
              )}
            </form>
          </div>

          {/* RIGHT: INFO */}
          <div className="contact-info">
            <h2>Get in Touch</h2>

            <div className="info-box">
              <h3>
                <Phone size={18} color="#2563eb" /> Phone
              </h3>
              <p>
                <a href={`tel:${COMPANY_INFO.phoneRaw}`}>{COMPANY_INFO.phone}</a>
              </p>
            </div>

            <div className="info-box">
              <h3>
                <Mail size={18} color="#2563eb" /> Email
              </h3>
              <p>
                <a href={`mailto:${COMPANY_INFO.email}`}>
                  {COMPANY_INFO.email}
                </a>
              </p>
            </div>

            <div className="info-box">
              <h3>
                <Clock size={18} color="#2563eb" /> Working Hours
              </h3>
              <p>{COMPANY_INFO.workingHours}</p>
            </div>

            <div className="info-box highlight">
              <h3>
                <Zap size={18} color="#fff" /> Quick Response
              </h3>
              <p>{COMPANY_INFO.quickResponse}</p>
            </div>

            <div className="info-box whatsapp-box">
              <h3>
                <MessageSquare size={18} color="#25D366" /> Instant WhatsApp
              </h3>
              <p>
                Chat directly with our dispatch team for urgent plumbing leaks or electrical faults.
              </p>
              <a
                href={`https://wa.me/${COMPANY_INFO.whatsappNumber}?text=Hi%20Sunrise%20Home%20Services%2C%20I%20have%20an%20urgent%20service%20inquiry.`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-whatsapp-chat"
              >
                Open WhatsApp Chat
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
