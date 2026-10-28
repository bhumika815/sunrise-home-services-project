import React from 'react';
import { Page } from '../types';

interface CtaSectionProps {
  onNavigate: (page: Page) => void;
  title?: string;
  subtitle?: string;
}

export const CtaSection: React.FC<CtaSectionProps> = ({ 
  onNavigate,
  title = "Need Reliable Home Services Today?",
  subtitle = "Get fast, affordable and professional help from Sunrise Home Services. Book your service now or request a free quote."
}) => {
  return (
    <section className="cta">
      <div className="container cta-box">
        <h2>{title}</h2>
        <p>{subtitle}</p>

        <div className="cta-buttons">
          <button
            type="button"
            className="btn-primary"
            onClick={() => onNavigate('contact')}
          >
            Get Free Quote
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => onNavigate('contact')}
          >
            Contact Us
          </button>
        </div>
      </div>
    </section>
  );
};
