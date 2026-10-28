import React, { useState, useEffect } from 'react';
import { Page } from '../types';
import { api, Service } from '../services/api';
import {
  Wrench,
  Zap,
  Wind,
  Home,
  Clock,
  IndianRupee,
  Search,
  Calendar,
} from 'lucide-react';

interface ServicesSectionProps {
  isFullPage?: boolean;
  onNavigate: (page: Page) => void;
  onSelectServiceForBooking: (serviceId: string) => void;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({
  isFullPage = false,
  onNavigate,
  onSelectServiceForBooking,
}) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [search, setSearch] = useState<string>('');
  const [sort, setSort] = useState<string>('default');

  useEffect(() => {
    setLoading(true);
    api.getServices({
      category: selectedCategory !== 'All' ? selectedCategory : undefined,
      search: search || undefined,
      sort: sort !== 'default' ? sort : undefined,
    })
      .then((res) => setServices(res.services))
      .catch((err) => console.error('Failed to load services:', err))
      .finally(() => setLoading(false));
  }, [selectedCategory, search, sort]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Plumbing':
        return <Wrench size={26} />;
      case 'Electrical':
        return <Zap size={26} />;
      case 'Air Conditioning':
        return <Wind size={26} />;
      case 'Renovation':
        return <Home size={26} />;
      default:
        return <Wrench size={26} />;
    }
  };

  const categories = ['All', 'Plumbing', 'Electrical', 'Air Conditioning', 'Renovation'];

  return (
    <>
      {isFullPage && (
        <section className="page-header">
          <div className="container">
            <h1>Our Services</h1>
            <p>Professional Home Repair &amp; Maintenance Solutions in Pune</p>
          </div>
        </section>
      )}

      <section className={isFullPage ? 'services-page' : 'services'}>
        <div className="container">
          {!isFullPage && (
            <>
              <h2>Our Services</h2>
              <p className="section-subtitle">
                Complete home maintenance, plumbing, electrical &amp; AC repairs under one roof
              </p>
            </>
          )}

          {/* Filtering and Search Controls */}
          <div className="service-filter-controls">
            <div className="category-pills">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {isFullPage && (
              <div className="service-search-sort-row">
                <div className="service-search-box">
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Search repair services in Pune..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div className="service-sort-box">
                  <select value={sort} onChange={(e) => setSort(e.target.value)}>
                    <option value="default">Default Order</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="duration">Shortest Duration</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Services Cards Grid */}
          {loading ? (
            <p className="empty-state">Loading service offerings from database...</p>
          ) : services.length === 0 ? (
            <div className="empty-state-box">
              <p>No services match your search criteria.</p>
            </div>
          ) : (
            <div className="services-grid">
              {services.map((service) => (
                <div key={service.id} className="service-card enhanced">
                  <div className="icon-wrapper">
                    {getCategoryIcon(service.category)}
                  </div>
                  <h3>{service.name}</h3>
                  <p>{service.description}</p>

                  <div className="service-meta-footer">
                    <div className="service-price-block">
                      <span className="price-label">Standard Rate</span>
                      <strong className="service-inr">
                        <IndianRupee size={15} style={{ display: 'inline', verticalAlign: 'baseline' }} />
                        {service.price_inr}
                      </strong>
                    </div>
                    <div className="service-duration-block">
                      <Clock size={13} style={{ display: 'inline', marginRight: '4px' }} />
                      <span>~{service.estimated_duration_min} mins</span>
                    </div>
                  </div>

                  <div className="service-card-actions">
                    <button
                      type="button"
                      className="book-service-btn"
                      onClick={() => onSelectServiceForBooking(service.id)}
                    >
                      <Calendar size={14} /> Book Service
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isFullPage && (
            <div style={{ textAlign: 'center', marginTop: '40px' }}>
              <button
                type="button"
                className="btn-primary"
                style={{ background: '#2563eb', color: 'white', padding: '12px 30px' }}
                onClick={() => onNavigate('services')}
              >
                View Complete Catalog &amp; Rates
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
};
