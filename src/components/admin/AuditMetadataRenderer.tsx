import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

export interface ParsedMetadataResult {
  status: 'empty' | 'malformed' | 'primitive' | 'object' | 'array';
  data: unknown;
  rawString?: string;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const LABEL_MAP: Record<string, string> = {
  newStatus: 'New Status',
  previousStatus: 'Previous Status',
  oldStatus: 'Previous Status',
  status: 'Status',
  service: 'Service',
  service_id: 'Service ID',
  serviceId: 'Service ID',
  serviceName: 'Service Name',
  service_name: 'Service Name',
  price: 'Price',
  agreed_price_inr: 'Agreed Price',
  agreedPrice: 'Agreed Price',
  oldPrice: 'Previous Price',
  newPrice: 'Updated Price',
  date: 'Date',
  booking_date: 'Booking Date',
  bookingDate: 'Booking Date',
  slot: 'Time Slot',
  time_slot: 'Time Slot',
  timeSlot: 'Time Slot',
  professional: 'Professional',
  professionalName: 'Professional',
  professional_name: 'Professional',
  professionalId: 'Professional ID',
  professional_id: 'Professional ID',
  profReassigned: 'Technician Reassigned',
  assignedProfessionalId: 'Assigned Professional ID',
  assigned_professional_id: 'Assigned Professional ID',
  email: 'Email',
  phone: 'Phone',
  locality: 'Locality',
  address: 'Address',
  message: 'Message',
  reason: 'Reason',
  changeReason: 'Reason for Change',
  active: 'Status',
  is_active: 'Status',
  isActive: 'Status',
  from: 'From',
  to: 'To',
  bookingId: 'Booking ID',
  booking_id: 'Booking ID',
  rating: 'Rating',
  category: 'Category',
  categories: 'Categories',
  service_areas: 'Service Areas',
  serviceAreas: 'Service Areas',
  duration: 'Duration',
  estimated_duration_min: 'Duration',
};

const SENSITIVE_KEY_REGEX = /password|secret|token|hash|auth_key|private/i;
const PRICE_KEY_REGEX = /^(price|amount|fee|cost|total|agreed_price_inr|old_price|new_price|newPrice|oldPrice)$/i;

export function formatLabel(key: string): string {
  if (LABEL_MAP[key]) {
    return LABEL_MAP[key];
  }
  // Convert camelCase or snake_case to Title Case across all words
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Parses YYYY-MM-DD or ISO date strings without applying browser timezone shifts,
 * ensuring the calendar day is never altered.
 */
export function formatDateSafe(dateStr: string): string {
  if (typeof dateStr !== 'string') return String(dateStr);
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    if (!isNaN(year) && month >= 0 && month < 12 && !isNaN(day)) {
      return `${day} ${MONTH_NAMES[month]} ${year}`;
    }
  }
  return dateStr;
}

/**
 * Safely parses audit log metadata whether it arrives as an object, array,
 * JSON string, double-serialized JSON string, primitive, or null/undefined.
 */
export function parseAuditMetadata(raw: unknown): ParsedMetadataResult {
  if (raw === null || raw === undefined) {
    return { status: 'empty', data: null };
  }

  if (typeof raw === 'string') {
    const current = raw.trim();
    if (!current || current === 'null' || current === '{}' || current === '[]' || current === 'undefined') {
      return { status: 'empty', data: null };
    }

    let parsed: unknown = current;
    let attempts = 0;
    while (typeof parsed === 'string' && attempts < 3) {
      const trimmed = parsed.trim();
      if (!trimmed || trimmed === 'null' || trimmed === '{}' || trimmed === '[]') {
        return { status: 'empty', data: null };
      }
      if (
        trimmed.startsWith('{') ||
        trimmed.startsWith('[') ||
        (trimmed.startsWith('"') && trimmed.endsWith('"'))
      ) {
        try {
          parsed = JSON.parse(trimmed);
          attempts++;
        } catch {
          if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            return { status: 'malformed', data: raw, rawString: trimmed };
          }
          break;
        }
      } else {
        break;
      }
    }

    if (parsed === null || parsed === undefined) {
      return { status: 'empty', data: null };
    }

    if (Array.isArray(parsed)) {
      return parsed.length === 0
        ? { status: 'empty', data: [] }
        : { status: 'array', data: parsed };
    }

    if (typeof parsed === 'object') {
      return Object.keys(parsed as object).length === 0
        ? { status: 'empty', data: {} }
        : { status: 'object', data: parsed };
    }

    return { status: 'primitive', data: parsed };
  }

  if (Array.isArray(raw)) {
    return raw.length === 0
      ? { status: 'empty', data: [] }
      : { status: 'array', data: raw };
  }

  if (typeof raw === 'object') {
    return Object.keys(raw as object).length === 0
      ? { status: 'empty', data: {} }
      : { status: 'object', data: raw };
  }

  return { status: 'primitive', data: raw };
}

export function formatSingleValue(key: string, val: unknown): string {
  if (val === null || val === undefined) {
    return 'None';
  }

  if (SENSITIVE_KEY_REGEX.test(key)) {
    return '[REDACTED]';
  }

  if (key === 'active' || key === 'is_active' || key === 'isActive') {
    if (val === 1 || val === true || val === '1') return 'Active';
    if (val === 0 || val === false || val === '0') return 'Inactive';
  }

  if (typeof val === 'boolean') {
    return val ? 'Yes' : 'No';
  }

  if (typeof val === 'number') {
    if (PRICE_KEY_REGEX.test(key)) {
      return `₹${val.toLocaleString('en-IN')}`;
    }
    if (key.toLowerCase().includes('duration')) {
      return `${val} mins`;
    }
    if (key.toLowerCase() === 'rating') {
      return `★ ${val}`;
    }
    return val.toString();
  }

  if (typeof val === 'string') {
    // If string is numeric price
    if (PRICE_KEY_REGEX.test(key) && /^\d+(\.\d+)?$/.test(val.trim())) {
      const num = Number(val);
      return `₹${num.toLocaleString('en-IN')}`;
    }

    if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
      return formatDateSafe(val);
    }

    if (key.toLowerCase().includes('slot')) {
      return val.replace(' - ', '–');
    }

    return val;
  }

  if (Array.isArray(val)) {
    return val.map((item) => (typeof item === 'object' ? JSON.stringify(item) : String(item))).join(', ');
  }

  if (typeof val === 'object') {
    return JSON.stringify(val);
  }

  return String(val);
}

function getStatusBadgeClass(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const s = val.toLowerCase();
  if (s === 'confirmed') return 'badge-confirmed';
  if (s === 'in progress') return 'badge-in-progress';
  if (s === 'completed') return 'badge-completed';
  if (s === 'cancelled') return 'badge-cancelled';
  if (s === 'pending') return 'badge-pending';
  return null;
}

export const AuditMetadataRenderer: React.FC<{ metadata: unknown }> = ({ metadata }) => {
  const [expanded, setExpanded] = useState(false);
  const parsed = parseAuditMetadata(metadata);

  if (parsed.status === 'empty') {
    return <span className="metadata-empty-label">No additional metadata</span>;
  }

  if (parsed.status === 'malformed') {
    return (
      <div className="metadata-malformed-fallback" title="Raw unparseable metadata">
        <AlertCircle size={14} className="metadata-alert-icon" />
        <span className="metadata-malformed-text">
          Unformatted: {String(parsed.rawString || parsed.data)}
        </span>
      </div>
    );
  }

  if (parsed.status === 'primitive') {
    return <span className="metadata-primitive-text">{String(parsed.data)}</span>;
  }

  if (parsed.status === 'array') {
    const arr = parsed.data as unknown[];
    return (
      <div className="metadata-chips-list">
        {arr.map((item, idx) => (
          <span key={idx} className="metadata-chip">
            {typeof item === 'object' ? JSON.stringify(item) : String(item)}
          </span>
        ))}
      </div>
    );
  }

  // Object metadata rendering
  const obj = parsed.data as Record<string, unknown>;
  const entries = Object.entries(obj).filter(([k]) => !SENSITIVE_KEY_REGEX.test(k));

  if (entries.length === 0) {
    return <span className="metadata-empty-label">No additional metadata</span>;
  }

  const MAX_INITIAL_FIELDS = 3;
  const hasMany = entries.length > MAX_INITIAL_FIELDS;
  const visibleEntries = expanded ? entries : entries.slice(0, MAX_INITIAL_FIELDS);

  return (
    <div className="metadata-structured-container">
      <div className="metadata-keyvalue-grid">
        {visibleEntries.map(([key, value]) => {
          const isNestedObject =
            typeof value === 'object' && value !== null && !Array.isArray(value);
          const isArray = Array.isArray(value);
          const isStatusKey = /status/i.test(key);
          const statusClass = isStatusKey ? getStatusBadgeClass(value) : null;

          return (
            <div key={key} className="metadata-item-row">
              <span className="metadata-key">{formatLabel(key)}:</span>
              {isNestedObject ? (
                <div className="metadata-nested-box">
                  {Object.entries(value as Record<string, unknown>).map(
                    ([subKey, subVal]) => (
                      <span key={subKey} className="metadata-subitem">
                        <strong className="metadata-subitem-key">{formatLabel(subKey)}:</strong>{' '}
                        <span className="metadata-subitem-val">{formatSingleValue(subKey, subVal)}</span>
                      </span>
                    )
                  )}
                </div>
              ) : isArray ? (
                <div className="metadata-chips-inline">
                  {(value as unknown[]).map((arrVal, idx) => (
                    <span key={idx} className="metadata-chip-mini">
                      {String(arrVal)}
                    </span>
                  ))}
                </div>
              ) : statusClass ? (
                <span className={`metadata-status-pill ${statusClass}`}>
                  {String(value)}
                </span>
              ) : (
                <span className="metadata-value">
                  {formatSingleValue(key, value)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {hasMany && (
        <button
          type="button"
          className="metadata-toggle-btn"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              Show less <ChevronUp size={12} />
            </>
          ) : (
            <>
              +{entries.length - MAX_INITIAL_FIELDS} more details <ChevronDown size={12} />
            </>
          )}
        </button>
      )}
    </div>
  );
};
