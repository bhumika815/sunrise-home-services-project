import React from 'react';
import { COMPANY_INFO } from '../data';
import { Phone, ShoppingBag } from 'lucide-react';

export const FloatingActions: React.FC = () => {
  return (
    <>
      {/* Call Floating Button */}
      <a
        href={`tel:${COMPANY_INFO.phoneRaw}`}
        className="call-float"
        title="Call Sunrise Home Services"
      >
        <Phone size={16} />
        <span>Call Now</span>
      </a>

      {/* WhatsApp Floating Button */}
      <a
        href={`https://wa.me/${COMPANY_INFO.whatsappNumber}?text=Hi%20Sunrise%20Home%20Services%2C%20I%20would%20like%20to%20inquire%20about%20your%20services.`}
        className="whatsapp-float"
        target="_blank"
        rel="noopener noreferrer"
        title="Chat on WhatsApp"
      >
        <svg
          viewBox="0 0 24 24"
          width="32"
          height="32"
          stroke="currentColor"
          strokeWidth="0"
          fill="white"
        >
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.05 7.47C8.86 7.47 8.56 7.54 8.3 7.82C8.04 8.1 7.31 8.78 7.31 10.18C7.31 11.58 8.33 12.92 8.47 13.11C8.61 13.3 10.45 16.14 13.29 17.36C15.65 18.39 16.13 18.18 16.65 18.14C17.17 18.09 18.33 17.45 18.57 16.77C18.81 16.08 18.81 15.5 18.74 15.38C18.67 15.26 18.49 15.19 18.21 15.05C17.93 14.91 16.57 14.24 16.31 14.15C16.06 14.05 15.87 14.01 15.69 14.29C15.5 14.56 14.99 15.19 14.83 15.38C14.67 15.56 14.52 15.58 14.24 15.44C13.96 15.3 12.78 14.91 11.38 13.67C10.3 12.7 9.56 11.5 9.35 11.13C9.14 10.76 9.33 10.56 9.47 10.42C9.59 10.3 9.74 10.1 9.88 9.94C10.02 9.77 10.07 9.66 10.16 9.47C10.25 9.29 10.21 9.12 10.14 8.98C10.07 8.84 9.56 7.59 9.35 7.08C9.14 6.58 8.94 6.65 8.78 6.64C8.63 6.63 8.45 6.63 8.27 6.63" />
        </svg>
      </a>

      {/* Purchase Float Button */}
      <a
        href={`https://wa.me/${COMPANY_INFO.whatsappNumber}?text=Hi%20Sunrise%20Home%20Services%2C%20I%20am%20interested%20in%20purchasing%20a%20home%20maintenance%20package.`}
        className="purchase-float"
        target="_blank"
        rel="noopener noreferrer"
        title="Purchase Package"
      >
        <ShoppingBag size={16} />
        <span>Purchase this Package</span>
      </a>
    </>
  );
};
