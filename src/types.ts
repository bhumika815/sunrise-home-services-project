export type Page =
  | 'home'
  | 'services'
  | 'contact'
  | 'book-service'
  | 'my-bookings'
  | 'my-profile'
  | 'admin-dashboard'
  | 'admin-bookings'
  | 'admin-calendar'
  | 'admin-services'
  | 'admin-professionals'
  | 'admin-reviews'
  | 'admin-enquiries'
  | 'admin-reports'
  | 'admin-audit';

export interface ServiceItem {
  id: string;
  title: string;
  icon: string;
  shortDesc: string;
  fullDesc: string;
  features: string[];
}

export interface TestimonialItem {
  id: string;
  name: string;
  stars: number;
  content: string;
}

export interface StatItem {
  value: string;
  label: string;
}

export interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  service?: string;
  message: string;
}
