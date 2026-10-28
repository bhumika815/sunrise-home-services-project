import { ServiceItem, TestimonialItem, StatItem } from './types';

export const COMPANY_INFO = {
  name: 'Sunrise Home Services',
  tagline: 'Reliable Home Solutions You Can Trust',
  phone: '9321841500',
  phoneRaw: '+919321841500',
  whatsappNumber: '919321841500',
  email: 'nikambhumika18@gmail.com',
  location: 'Pune, Maharashtra',
  workingHours: 'Mon - Sat | 9 AM - 7 PM',
  quickResponse: 'We usually respond within 30–60 minutes.',
  yearsExperience: '8+',
  jobsCompleted: '500+',
  satisfaction: '100%',
  support: '24/7',
};

export const SERVICES: ServiceItem[] = [
  {
    id: 'plumbing',
    title: 'Plumbing',
    icon: 'wrench',
    shortDesc: 'Leak repairs, pipe installation, and full plumbing maintenance services.',
    fullDesc: 'Complete plumbing maintenance including leak repairs, pipeline installations, bathroom fittings, faucet repairs, drainage cleaning, and overhead water tank maintenance.',
    features: ['Leak & Pipe Repairs', 'Bathroom & Kitchen Fittings', 'Water Tank Cleaning & Maintenance', 'Clogged Drain Clearing']
  },
  {
    id: 'electrical',
    title: 'Electrical Work',
    icon: 'zap',
    shortDesc: 'Wiring, switchboard repairs, lighting installation, and troubleshooting.',
    fullDesc: 'Certified electrical repairs covering household wiring, switchboard troubleshooting, MCB / fuse box setups, interior/exterior lighting installation, and appliance points.',
    features: ['Short Circuit & Fault Finding', 'Switchboard Repair & Replacement', 'LED & Chandelier Installation', 'Appliance Power Point Setup']
  },
  {
    id: 'ac-repair',
    title: 'Air Conditioning',
    icon: 'wind',
    shortDesc: 'AC installation, servicing, gas filling, and repair solutions.',
    fullDesc: 'End-to-end AC care for split and window units: precision deep cleaning, chemical wash, refrigerant gas refilling, compressor troubleshooting, and new AC installations.',
    features: ['Complete AC Deep Servicing', 'Gas Leak Checking & Refilling', 'Split & Window AC Installation', 'Cooling Problem Troubleshooting']
  },
  {
    id: 'renovation',
    title: 'Renovation',
    icon: 'home',
    shortDesc: 'Painting, remodeling, interiors, and home improvement solutions.',
    fullDesc: 'High-quality home makeover solutions: interior & exterior wall painting, waterproof coatings, modular kitchen remodeling, tile work, carpentry, and full interior improvements.',
    features: ['Interior & Exterior Painting', 'Waterproofing & Wall Plastering', 'Modular Kitchen & Carpentry', 'Bathroom & Floor Tiling']
  }
];

export const TESTIMONIALS: TestimonialItem[] = [
  {
    id: '1',
    name: 'Rahul Sharma',
    stars: 5,
    content: 'Excellent plumbing service. The team arrived on time and fixed the issue quickly. Very professional.'
  },
  {
    id: '2',
    name: 'Priya Patel',
    stars: 5,
    content: 'Very reliable AC maintenance service. They explained everything clearly and charged fairly.'
  },
  {
    id: '3',
    name: 'Amit Deshmukh',
    stars: 5,
    content: 'Our home renovation was completed on time with great attention to detail. Highly recommended.'
  },
  {
    id: '4',
    name: 'Rahul',
    stars: 5,
    content: 'I booked plumbing service for a leaking kitchen pipe. The technician arrived quickly and solved the issue perfectly.'
  },
  {
    id: '5',
    name: 'Zoya Khan',
    stars: 4,
    content: 'The wiring issue in our apartment was fixed safely within one visit.'
  },
  {
    id: '6',
    name: 'Siddhi Pathak',
    stars: 5,
    content: 'The team was polite and pricing was reasonable.'
  }
];

export const STATS: StatItem[] = [
  { value: '8+', label: 'Years Experience' },
  { value: '100%', label: 'Customer Satisfaction' },
  { value: '24/7', label: 'Support Available' },
  { value: '500+', label: 'Jobs Completed' }
];
