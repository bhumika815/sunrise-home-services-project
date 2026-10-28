import React, { useEffect, useState } from 'react';
import { api, Review } from '../services/api';
import { TESTIMONIALS } from '../data';
import { ShieldCheck } from 'lucide-react';

export const Testimonials: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState<number>(4.9);
  const [totalCount, setTotalCount] = useState<number>(6);

  useEffect(() => {
    api.getApprovedReviews()
      .then((res) => {
        if (res.reviews && res.reviews.length > 0) {
          setReviews(res.reviews);
          setAvgRating(res.stats.average);
          setTotalCount(res.stats.total);
        }
      })
      .catch((err) => console.error('Failed to load live reviews:', err));
  }, []);

  return (
    <section className="testimonials">
      <div className="container">
        <h2>What Our Customers Say</h2>
        <p className="section-subtitle">
          Real feedback from verified homeowners across Pune
        </p>

        <div className="rating-summary-pill">
          <ShieldCheck size={18} color="#16a34a" />
          <span>
            Rated <strong>{avgRating} / 5.0</strong> based on {totalCount}+ verified service completions
          </span>
        </div>

        <div className="testimonial-row">
          {reviews.length > 0
            ? reviews.map((item) => (
                <div key={item.id} className="testimonial-card">
                  <div>
                    <div className="stars">
                      {'★'.repeat(item.rating) + '☆'.repeat(5 - item.rating)}
                    </div>
                    <p>"{item.comment}"</p>
                  </div>
                  <div className="reviewer-info">
                    <h4>{item.customer_name}</h4>
                    <small>{item.service_name}</small>
                  </div>
                </div>
              ))
            : TESTIMONIALS.map((item) => (
                <div key={item.id} className="testimonial-card">
                  <div>
                    <div className="stars">
                      {'★'.repeat(item.stars) + '☆'.repeat(5 - item.stars)}
                    </div>
                    <p>"{item.content}"</p>
                  </div>
                  <h4>{item.name}</h4>
                </div>
              ))}
        </div>
      </div>
    </section>
  );
};
