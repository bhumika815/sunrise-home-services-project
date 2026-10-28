# Academic Project Documentation
## Sunrise Home Services — Full-Stack Service Booking and Management System
**Degree Course:** Third Year B.Sc. Computer Science (Semester 5)  
**Curriculum Component:** Mini-Project Assessment  
**Author:** Bhumika Nikam  
**Academic Year:** 2026–2027  

---

## 1. SDLC Methodology & Justification

The **Agile Incremental Software Development Life Cycle (SDLC)** was chosen for Sunrise Home Services. 

### Justification:
1. **Incremental Enhancement of Existing Work**: The initial project existed as a static HTML/CSS/JavaScript layout. An incremental model allowed preserving original visual branding, typography, and marketing assets while iteratively attaching database persistence, authentication, business logic, and reporting.
2. **Test-Driven Verification**: Each increment (Authentication → Services → Bookings → Technician Scheduling → Reviews → Reporting) was verified through automated unit/integration tests before progressing to subsequent modules.
3. **Risk Mitigation**: Business constraints such as technician scheduling collisions and client price tampering were resolved early in backend middleware before final UI assembly.

```mermaid
graph TD
    A[Initial Static Site Audit] --> B[Phase 1: Architecture & SQLite Schema Design]
    B --> C[Phase 2: Express Server & JWT Authentication]
    C --> D[Phase 3: Relational Service Catalogue]
    D --> E[Phase 4: Transactional Booking Engine]
    E --> F[Phase 5: Scheduling Conflict Algorithm]
    F --> G[Phase 6: Admin Portal, Reviews & Reports]
    G --> H[Phase 7: Vitest Automated Testing & Polish]
    H --> I[Academic Evaluation & Export]
```

---

## 2. System Architecture Diagram

The system follows a three-tier architecture with clear separation of presentation, business logic, and relational persistence.

```mermaid
flowchart TB
    subgraph ClientLayer [Presentation Layer - React 18 SPA]
        PublicViews[Public Catalog & Marketing Views]
        CustomerPortal[Customer Dashboard & Booking Workflow]
        AdminPortal[Administrator Dispatch & Analytics Portal]
        ClientApi[Client API Service Layer]
    end

    subgraph ServerLayer [Business Logic Layer - Node.js 22 & Express 5]
        AuthMiddleware[JWT & RBAC Authorization Guard]
        PriceEngine[Server-Authoritative Pricing Engine]
        ConflictDetector[Technician Collision Detection Logic]
        AuditNotifier[Audit Logger & Notification Dispatcher]
        RestRoutes[RESTful API Route Endpoints]
    end

    subgraph DataLayer [Data Persistence Layer - SQLite 3]
        Database[(Persistent SQLite DB: /data/sunrise.db)]
        UsersTbl[users]
        ServicesTbl[services]
        BookingsTbl[bookings]
        HistoryTbl[booking_status_history]
        ProfsTbl[professionals]
        ReviewsTbl[reviews]
        EnquiriesTbl[enquiries]
        AuditTbl[audit_logs]
        NotifTbl[notifications]
    end

    ClientLayer <-->|HTTP / JSON REST API| ServerLayer
    ServerLayer <-->|ACID Transactions via better-sqlite3| DataLayer
```

---

## 3. Use-Case Diagram

```mermaid
graph LR
    actorCustomer((Customer / Homeowner))
    actorAdmin((Operations Administrator))
    actorGuest((Guest Visitor))

    subgraph SunriseSystem [Sunrise Home Services System]
        UC1[Browse Services & Check Rates]
        UC2[Submit Contact Enquiry / WhatsApp]
        UC3[Register Customer Account]
        UC4[Log In / Authenticate via JWT]
        UC5[Book Service Appointment]
        UC6[Reschedule Booking]
        UC7[Cancel Booking with Reason]
        UC8[Submit Verified Review]
        UC9[Manage Service Catalogue]
        UC10[Assign Technicians with Conflict Check]
        UC11[Advance Booking Status]
        UC12[Moderate Customer Reviews]
        UC13[Inspect Security Audit Trail]
        UC14[Export CSV Reports]
    end

    actorGuest --> UC1
    actorGuest --> UC2
    actorGuest --> UC3
    actorGuest --> UC4

    actorCustomer --> UC4
    actorCustomer --> UC5
    actorCustomer --> UC6
    actorCustomer --> UC7
    actorCustomer --> UC8

    actorAdmin --> UC4
    actorAdmin --> UC9
    actorAdmin --> UC10
    actorAdmin --> UC11
    actorAdmin --> UC12
    actorAdmin --> UC13
    actorAdmin --> UC14
```

---

## 4. Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    USERS ||--o{ BOOKINGS : "places"
    USERS ||--o{ REVIEWS : "writes"
    USERS ||--o{ NOTIFICATIONS : "receives"
    USERS ||--o{ BOOKING_STATUS_HISTORY : "initiates_change"
    SERVICES ||--o{ BOOKINGS : "booked_for"
    SERVICES ||--o{ REVIEWS : "evaluated_in"
    PROFESSIONALS ||--o{ BOOKINGS : "assigned_to"
    BOOKINGS ||--|| REVIEWS : "has"
    BOOKINGS ||--o{ BOOKING_STATUS_HISTORY : "tracks_lifecycle"
    BOOKINGS ||--o{ NOTIFICATIONS : "triggers"

    USERS {
        string id PK
        string full_name
        string email UK
        string phone
        string password_hash
        string role "customer | admin"
        string address
        string locality
        string status "active | suspended"
        string created_at
        string updated_at
    }

    SERVICES {
        string id PK
        string name
        string category "Plumbing | Electrical | Air Conditioning | Renovation | Other"
        string description
        integer price_inr
        integer estimated_duration_min
        string image_url
        integer is_active "0 | 1"
        string created_at
        string updated_at
    }

    PROFESSIONALS {
        string id PK
        string full_name
        string email UK
        string phone
        string categories "JSON Array"
        string service_areas "JSON Array"
        integer is_active "0 | 1"
        string created_at
        string updated_at
    }

    BOOKINGS {
        string id PK "SHS-YYYYMMDD-XXXX"
        string customer_id FK
        string service_id FK
        string service_name_snapshot
        integer agreed_price_inr
        string service_address
        string locality
        string contact_number
        string booking_date
        string time_slot
        string problem_description
        string additional_instructions
        string status "Pending | Confirmed | In Progress | Completed | Cancelled"
        string cancellation_reason
        string cancelled_at
        string assigned_professional_id FK
        string assigned_at
        string created_at
        string updated_at
    }

    BOOKING_STATUS_HISTORY {
        string id PK
        string booking_id FK
        string previous_status
        string new_status
        string changed_by_user_id FK
        string change_reason
        string created_at
    }

    REVIEWS {
        string id PK
        string booking_id FK, UK
        string customer_id FK
        string service_id FK
        integer rating "1 to 5"
        string comment
        string moderation_status "Pending | Approved | Rejected"
        string moderated_by_user_id FK
        string moderated_at
        string created_at
    }

    ENQUIRIES {
        string id PK
        string name
        string email
        string phone
        string service_requested
        string message
        string status "New | In Progress | Resolved"
        string internal_notes
        string created_at
        string updated_at
    }

    NOTIFICATIONS {
        string id PK
        string recipient_user_id FK
        string booking_id FK
        string title
        string message
        integer is_read "0 | 1"
        string created_at
    }

    AUDIT_LOGS {
        string id PK
        string actor_id
        string actor_name
        string actor_role
        string action
        string entity_type
        string entity_id
        string metadata "JSON"
        string created_at
    }
```

---

## 5. Data Flow Diagrams (DFD)

### Level 0 Context Diagram
```mermaid
graph TD
    Customer([Customer]) -->|Registration & Credentials| System[Sunrise Home Services System]
    Customer -->|Booking Request & Details| System
    Customer -->|Feedback & Ratings| System

    System -->|Booking Confirmation & Status| Customer
    System -->|In-App Notifications| Customer
    System -->|Approved Public Reviews| Customer

    Admin([Administrator]) -->|Service & Price Edits| System
    Admin -->|Technician Assignments| System
    Admin -->|Status Updates & Moderation| System

    System -->|Real-Time Analytics & KPIs| Admin
    System -->|Security Audit Logs| Admin
    System -->|Authoritative CSV Exports| Admin
```

### Level 1 Data Flow Diagram (Booking & Dispatch Process)
```mermaid
graph TD
    C([Customer]) -->|1. Select Service & Slot| P1[1.0 Validation & Pricing Engine]
    D1[(services)] -->|Service Price & Active Status| P1
    P1 -->|2. Check Slot & Date| P2[2.0 Availability Checker]
    P2 -->|3. Write Record| D2[(bookings)]
    P2 -->|4. Log Initial State| D3[(booking_status_history)]
    P2 -->|5. Generate Alert| D4[(notifications)]
    D4 -->|6. Unread Alert| C
    
    A([Administrator]) -->|7. Query Pending Jobs| P3[3.0 Dispatch & Assignment]
    D2 -->|Pending Bookings| P3
    D5[(professionals)] -->|Technician Roster & Skills| P3
    P3 -->|8. Verify No Overlapping Active Job| P4[4.0 Collision Detection Gate]
    P4 -->|9. Update Assignment & Status| D2
    P4 -->|10. Record Audit Event| D6[(audit_logs)]
```

---

## 6. Functional & Non-Functional Requirements Specification (SRS)

### Functional Requirements
- **FR1**: System must allow customers to register with full name, email, phone, locality, and password. Public registration must strictly create `customer` accounts.
- **FR2**: System must enforce authentication using JSON Web Tokens (JWT) and reject passwords that fail bcrypt hash verification.
- **FR3**: The server must authoritatively determine service prices based on database records, ignoring client-submitted prices.
- **FR4**: System must reject past dates and invalid time slots.
- **FR5**: Each booking must receive a unique reference formatted as `SHS-YYYYMMDD-XXXX`.
- **FR6**: System must allow customers to cancel eligible bookings (`Pending` or `Confirmed`) with a mandatory cancellation reason.
- **FR7**: System must prevent assigning a technician who already has an active assignment (`Confirmed` or `In Progress`) on the same date and slot.
- **FR8**: Only completed bookings can be reviewed by their customer. Reviews cannot be submitted more than once for a single booking.
- **FR9**: Public site must only display `Approved` reviews and dynamically compute average ratings.
- **FR10**: System must log sensitive operations to an immutable audit table.

### Non-Functional Requirements
- **NFR1 (Security)**: Passwords hashed with 10 rounds of bcrypt. Role-based access control guards all administrative endpoints. Customer records are isolated.
- **NFR2 (Reliability & ACID Compliance)**: SQLite configured with WAL mode (`PRAGMA journal_mode = WAL`) and foreign key enforcement (`PRAGMA foreign_keys = ON`). Atomic transactions wrap multi-table state changes.
- **NFR3 (Performance)**: Server responds to API queries in under 50ms. Indexes placed on `customer_id`, `status`, `booking_date`, and `assigned_professional_id`.
- **NFR4 (Usability & Responsiveness)**: Responsive design across mobile, tablet, and desktop viewports with Poppins typography.
- **NFR5 (Portability)**: Zero-configuration local execution using Node.js without needing external cloud database subscriptions.

---

## 7. Test Plan & Actual Execution Matrix

Testing was performed using **Vitest 5.0.4** and **Supertest 7.3.1**. All 20 tests executed with 100% pass rate.

| Test Case ID | Test Description | Target Module | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| **TC-01** | Rejects login with invalid password | Auth | HTTP 401 Unauthorized | HTTP 401 Unauthorized | **PASS** |
| **TC-02** | Customer registration & role enforcement | Auth | HTTP 201 with role='customer' | Role is strictly 'customer' | **PASS** |
| **TC-03** | Rejects registration with duplicate email | Auth | HTTP 409 Conflict | HTTP 409 Conflict | **PASS** |
| **TC-04** | Protects admin endpoints from customers | Security | HTTP 403 Forbidden | HTTP 403 Forbidden | **PASS** |
| **TC-05** | Retrieves active services catalogue | Services | HTTP 200 with active array | HTTP 200 with prices & duration | **PASS** |
| **TC-06** | Service search & category filtering | Services | Filtered service items | Correct category subsets | **PASS** |
| **TC-07** | Booking creation with server price | Bookings | Unique ID format & server price | `SHS-YYYYMMDD-XXXX` created | **PASS** |
| **TC-08** | Rejection of past booking dates | Bookings | HTTP 400 Bad Request | Rejection error returned | **PASS** |
| **TC-09** | Rejection of invalid time slots | Bookings | HTTP 400 Bad Request | Rejection error returned | **PASS** |
| **TC-10** | Customer rescheduling pending booking | Bookings | HTTP 200, date/slot updated | Booking rescheduled | **PASS** |
| **TC-11** | Customer cancellation with valid reason | Bookings | HTTP 200, status='Cancelled' | Status changed, reason logged | **PASS** |
| **TC-12** | Rejection of duplicate cancellation | Bookings | HTTP 400 Bad Request | Rejection error returned | **PASS** |
| **TC-13** | Fresh booking for assignment test | Bookings | HTTP 201 Created | Created successfully | **PASS** |
| **TC-14** | Assign technician Santosh (prof_001) | Scheduling | HTTP 200, status='Confirmed' | Professional assigned | **PASS** |
| **TC-15** | Overlapping scheduling collision check | Scheduling | HTTP 409 Conflict | Conflict detected & blocked | **PASS** |
| **TC-16** | Rejects review for non-completed booking | Reviews | HTTP 400 Bad Request | Rejection error returned | **PASS** |
| **TC-17** | Saves contact enquiry to database | Enquiries | HTTP 201 Created | Saved with status 'New' | **PASS** |
| **TC-18** | Calculates real summary metrics | Reports | Total count & values calculated | Accurate financial metrics | **PASS** |
| **TC-19** | Exports bookings as CSV for admin | Reports | text/csv content type | Valid CSV spreadsheet output | **PASS** |
| **TC-20** | Retrieves immutable audit trail | Audit | Chronological log list | Audit actions recorded | **PASS** |

---

## 8. Known Limitations & Future Scope

### Known Limitations:
1. **SMS / Email Gateways**: The application delivers in-app notifications and formats WhatsApp direct communication strings. Live SMS gateways (e.g. Twilio) were not integrated to avoid external recurring billing charges.
2. **Online Payment Processing**: The project implements a "Pay on Service Completion" model (Cash / UPI) to avoid external banking payment gateway merchant approvals.

### Future Scope:
1. **GPS Live Tracking**: Integrating technician geolocation on a real-time Pune map to show estimated time of arrival (ETA).
2. **Automated Inventory Tracking**: Linking replacement parts (valves, pipes, capacitors) with service costs and technician vans.
3. **PWA Mobile App**: Converting into an installable Progressive Web App for offline technician job sheet caching.
