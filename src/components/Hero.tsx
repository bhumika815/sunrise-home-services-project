import React from 'react';
import { Page } from '../types';

interface HeroProps {
  onNavigate: (page: Page) => void;
}

export const Hero: React.FC<HeroProps> = ({ onNavigate }) => {
  return (
    <section className="hero">
      <div className="hero-content">
        <span className="hero-badge">
          Trusted by Homeowners Across Pune
        </span>

        <h1>
          Reliable Home Solutions
          <span>You Can Trust</span>
        </h1>

        <p>
          Professional Plumbing, Electrical Repairs, AC Maintenance
          and Renovation Services with Fast Response Times and
          Affordable Pricing.
        </p>

        <div className="hero-buttons">
          <button
            type="button"
            className="btn-primary"
            onClick={() => onNavigate('contact')}
          >
            Get Free Quote
          </button>

          <a
            href="tel:+919321841500"
            className="btn-secondary"
          >
            Call Now
          </a>
        </div>
      </div>
    </section>
  );
};
