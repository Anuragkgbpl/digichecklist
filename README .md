# QR-Based Digital Checklist Management System

## 1. Product Overview
### Objective
Develop a QR-enabled digital checklist system to streamline plant operations, ensure compliance, and enable real-time tracking of activities like GMP, Line Clearance, Fire Safety, and Preventive Maintenance.

### Goals
- Eliminate paper-based checklists
- Improve traceability and accountability
- Enable real-time monitoring and reporting
- Standardize processes across units

## 2. User Roles & Access Control
### 2.1 Master Admin
- Create and manage Units
- Define Activity Types
- Full system access

### 2.2 Unit Admin
- Manage employees
- Upload and manage checklist master
- Generate QR codes
- Monitor logs and dashboards

### 2.3 Users (Employees)
- Execute checklists
- Update status
- Raise support requests
- View assigned tasks

## 3. Functional Requirements

### 3.1 Master Login Module
**Features**
- Add / Edit / Delete Units
- Unit Creation Fields: Unit Name (Auto Login ID), Parent Company, Plant Location, District, State, Pincode (Optional), Password
- Activity Types Configuration: GMP, Line Clearance, Fire Safety, Preventive Maintenance (Editable / Extendable)

### 3.2 Unit Admin Module
**3.2.1 Employee Master**
- **Fields:** Employee ID (Login ID), Employee Name, Designation, Department, Mobile Number, Status (Active / Inactive)
- **Features:** Excel upload, Manual entry, Bulk activation/deactivation, Default password: 1234, First login password reset mandatory, Admin password reset capability

**3.2.2 Checklist Master**
- **Fields:** Type of Activity, Line / Equipment, Sub-Line / Sub-Equipment, Component, Activity Description, Frequency (Daily / Weekly / Monthly / Custom), Document Number, Revision, Last Revised Date, Status, Actions
- **Features:** Excel upload with validation, Manual entry, Edit / delete functionality, Version control (Revision tracking)

**3.2.3 QR Code Generation**
- Generate QR codes at 3 hierarchy levels: Type of Activity, Line / Equipment, Sub-Line / Sub-Equipment
- **QR Behavior:** Encodes hierarchy and unit info, Printable format, Supports batch generation

### 3.3 User Module
**3.3.1 Login**
- Employee ID + Password
- QR-based login (after scan)

**3.3.2 QR Workflow Logic**
- **Activity:** Select Line → Sub-Line
- **Line:** Select Sub-Line
- **Sub-Line:** Direct checklist display

**3.3.3 Checklist Execution**
- **Display:** Activities filtered by frequency, Pending tasks highlighted
- **Status Options:** Done, Pending, WIP, Postponed, Hold, Support Required

**3.3.4 Support Required Workflow**
- User selects "Support Required"
- Assign task to another employee
- Add remarks
- **Assigned User Can:** View in inbox, Update status, Track TAT

### 3.4 Logs & Audit Trail
- Store all activities with: User ID, Timestamp, Activity details, Status updates, Remarks, Task assignment history
- **Features:** Full audit trail, Search & filter logs

### 3.5 Dashboard & Analytics
Accessible to all roles (with filters)
- **Dashboard Components:** Type of Activity-wise Trend, Line/Equipment-wise Trend, Sub-Line-wise Trend, Status-wise Trend
- **Filters:** Unit, Activity Type, Line / Sub-Line, Date Range, Status

## 4. Non-Functional Requirements
- **Performance:** Dashboard load time < 3 seconds, QR scan response < 2 seconds
- **Scalability:** Multi-unit support, Handle 10,000+ users
- **Security:** Role-based access control, Encrypted passwords, Session management
- **Usability:** Mobile-first design, Simple UI for shop-floor users, QR scanning optimized
- **Reliability:** Auto-save functionality, Offline capability (optional PWA)

## 5. Data Model (High-Level)
- **Entities:** Unit, Employee, Checklist Master, Activity Logs, QR Mapping, Task Assignment
- **Relationships:** One Unit → Many Employees, One Unit → Many Checklists, One Checklist → Many Logs, One User → Many Tasks
