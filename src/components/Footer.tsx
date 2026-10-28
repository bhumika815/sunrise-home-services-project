import React from 'react';
import { Page } from '../types';
import { COMPANY_INFO, SERVICES } from '../data';

interface FooterProps {
  onNavigate: (page: Page) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-wrapper">
          <div className="footer-brand">
            <h4>{COMPANY_INFO.name}</h4>
            <p>
              Your trusted partner for residential and commercial plumbing, electrical repairs,
              air conditioning maintenance, and home renovations across Pune.
            </p>
          </div>

          <div className="footer-col">
            <h5>Quick Links</h5>
            <ul>
              <li>
                <button type="button" onClick={() => onNavigate('home')}>
                  Home
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('services')}>
                  Our Services
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('contact')}>
                  Contact Us
                </button>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h5>Services</h5>
            <ul>
              {SERVICES.map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => onNavigate('services')}>
                    {s.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} {COMPANY_INFO.name}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
