# Sunrise Home Services — Full-Stack Service Booking and Management System
**TY B.Sc. Computer Science (Semester 5) Mini-Project**  
**Student Name:** Bhumika Nikam  
**Domain:** Enterprise Web Applications / Service Management  
**Target City:** Pune, Maharashtra, India  

---

## 1. Project Abstract & Overview

**Sunrise Home Services** is a full-stack, database-driven service booking and operational management web application designed for residential and commercial property maintenance across Pune, Maharashtra. Built to upgrade an initial static website into a production-grade relational application, the system allows Pune homeowners to browse services (Plumbing, Electrical, Air Conditioning, Renovation), calculate transparent upfront prices in INR (₹), schedule appointments, track technician dispatches, and submit verified reviews.

For business administrators and dispatch coordinators, the system provides a comprehensive management portal featuring appointment dispatching, technician conflict prevention, scheduling calendars, review moderation, customer enquiry desks, financial reconciliation, immutable security audit logging, and CSV exports for academic evaluation.

---

## 2. Actual Technology Stack & Architecture Justification

| Layer | Technology | Justification |
|---|---|---|
| **Frontend Framework** | **React 18 (TypeScript)** | Declarative, component-driven UI with strong typing, reactive state, and modular view architecture. |
| **Bundler & Tooling** | **Vite 6** | Ultra-fast Hot Module Replacement (HMR), optimized production bundling, and smooth SPA routing. |
| **Server & REST APIs** | **Node.js 22 + Express 5** | Non-blocking, event-driven server runtime handling server-authoritative pricing, JWT verification, and business logic. |
| **Persistent Database** | **SQLite (via `better-sqlite3`)** | Server-side ACID compliant relational database with foreign key constraints (`PRAGMA foreign_keys = ON`), WAL journaling mode, and zero-configuration local portability. Stored persistently in `/data/sunrise.db`. |
| **Authentication & RBAC** | **JWT (JSON Web Tokens) + bcryptjs** | Secure token-based session management with 10-round bcrypt password hashing and strict Role-Based Access Control (`customer` vs `admin`). |
| **Automated Testing** | **Vitest 5 + Supertest 7** | Automated integration and unit testing validating authentication, booking collisions, security boundaries, and reporting. |
| **Styling & Design System** | **Custom CSS + Poppins Typography** | Preserves original Sunrise Home Services brand identity (`#2563eb` primary, `#0f172a` dark, `#f59e0b` accent). |

---

## 3. Evaluator Quick-Start Credentials

For academic examiners and evaluators, the application includes a **1-Click Demo Login bar** at the top of the interface:

| Role | Email | Password | Full Name & Territory |
|---|---|---|---|
| **Administrator (Ops Manager)** | `admin@sunrisehomeservices.com` | `AdminSecure@2026` | Suresh Patil (Shivajinagar, Pune) |
| **Customer (Homeowner)** | `customer@demo.com` | `CustomerDemo@2026` | Pooja Joshi (Kothrud, Pune) |

*Public registration is also available; new registrations are strictly assigned the `customer` role to prevent privilege escalation.*

---

## 4. Key Functional Modules

1. **Authentication & Profile Management (`/server/routes/authRoutes.ts`)**:
   - Secure customer registration with input sanitization and duplicate email prevention.
   - Prevention of self-assigned administrator privilege.
   - JWT authentication with 7-day validity and active account verification.
   - Customer profile viewing and updating (phone, address, Pune locality).

2. **Database-Backed Services Catalog (`/server/routes/serviceRoutes.ts`)**:
   - Live catalog covering Plumbing, Electrical, Air Conditioning, and Home Renovation.
   - Upfront pricing in INR (₹) and estimated durations.
   - Search by keyword, category filtering, and sorting.
   - Administrator controls to add new services, edit rates, and toggle active/inactive status.

3. **Booking Engine & Conflict Prevention (`/server/routes/bookingRoutes.ts`)**:
   - End-to-end appointment scheduling for future dates (up to 60 days advance).
   - Server-calculated price snapshots (prevents client price tampering).
   - Unique reference formatting: `SHS-YYYYMMDD-XXXX`.
   - Atomic database transactions creating booking records and initial status history.
   - Customer cancellation (with mandatory reason) and rescheduling.
   - Valid status transitions: `Pending` → `Confirmed` → `In Progress` → `Completed` or `Cancelled`.

4. **Technician Management & Conflict Detection (`/server/routes/professionalRoutes.ts`)**:
   - Roster of field technicians with verified skills and Pune localities.
   - **Scheduling Collision Prevention**: The system automatically verifies that a technician does not have an overlapping active assignment (`Confirmed` or `In Progress`) on the same date and time slot before assignment.

5. **Customer Reviews & Moderation (`/server/routes/reviewRoutes.ts`)**:
   - Only customers with a `Completed` booking can submit a 1–5 star review and comment.
   - Prevents duplicate reviews for the same booking.
   - Administrator moderation queue (`Approved` / `Rejected`).
   - Live average rating calculation displayed on the public site.

6. **Contact Enquiries & WhatsApp Dispatch (`/server/routes/enquiryRoutes.ts`)**:
   - Enquiries are persisted to the database and coordinated with WhatsApp redirection.
   - Administrator enquiry desk with status tracking (`New`, `In Progress`, `Resolved`) and internal notes.

7. **Reports, Financial Reconciliation & CSV Export (`/server/routes/reportRoutes.ts`)**:
   - Real KPI metrics: Total Bookings, Pipeline Value, Completed Revenue, and Technician Workload.
   - One-click CSV downloads for Bookings, Services, Customers, and Enquiries.

8. **Immutable Security Audit Logging (`/server/routes/auditRoutes.ts`)**:
   - Logs sensitive operations (logins, status changes, technician assignments, service price edits) with actor ID, timestamp, and JSON metadata.

---

## 5. Local Setup and VS Code Export Instructions

To run the project locally on your machine (e.g. after downloading or cloning from GitHub):

```bash
# 1. Clone repository or extract exported ZIP
cd sunrise-home-services

# 2. Install dependencies (Node.js 20+ required)
npm install

# 3. Start the full-stack server (runs Express API + Vite dev server)
npm run dev

# 4. Open in browser
# http://localhost:3000
```

### Running Tests
To run the 20 automated integration and security tests:
```bash
npm test
```

### Building for Production
```bash
npm run build
npm start
```

---

## 6. Academic Documentation Reference

Comprehensive Semester-5 project documentation is available in `ACADEMIC_DOCUMENTATION.md`, including:
- SDLC Methodology (Agile Incremental)
- Mermaid System Architecture Diagram
- Mermaid Use-Case Diagram
- Mermaid Entity-Relationship (ER) Diagram
- Mermaid Data Flow Diagrams (DFD Level 0 & Level 1)
- Full Test Execution Matrix
- Security, Limitations & Future Scope
