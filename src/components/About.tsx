import React from 'react';
import { Page } from '../types';
import { STATS } from '../data';

interface AboutProps {
  onNavigate: (page: Page) => void;
}

export const About: React.FC<AboutProps> = ({ onNavigate }) => {
  return (
    <section className="about">
      <div className="container about-wrapper">
        <div className="about-left">
          <h2>About Us</h2>
          <p>
            Sunrise Home Services has been delivering trusted home solutions
            for over 8 years. We specialize in plumbing, electrical work,
            AC maintenance, and renovation services with a focus on quality
            and customer satisfaction.
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => onNavigate('contact')}
          >
            Get Free Quote
          </button>
        </div>

        <div className="about-right">
          {STATS.map((stat) => (
            <div key={stat.label} className="stat-card">
              <h3>{stat.value}</h3>
              <p>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
