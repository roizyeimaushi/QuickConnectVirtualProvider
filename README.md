# QuickConn Virtual - Attendance Sheet System

A production-ready, enterprise-level Attendance Sheet System built with Next.js and Laravel, designed for high-integrity attendance tracking with strict timestamp locking and session-based management.

![Version](https://img.shields.io/badge/version-1.0.0-green)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![Tailwind](https://img.shields.io/badge/Tailwind-4.0-blue)
![Laravel](https://img.shields.io/badge/Laravel-10-red)

---

## 📖 System Implementation Guide
*For Thesis, System Proposal, & Developer Reference*

### 1. Admin Role Overview
The **Admin** is the highest authority in the system. They do not manually mark attendance but validate and manage the recording process.

**Responsibilities:**
- Manage Employee Accounts (CRUD)
- Define Work Schedules
- Create Daily Attendance Sessions
- Monitor Attendance & Breaks
- View Reports & Audit Logs

### 2. Admin Navigation Structure
The Admin Dashboard is structured into specific functional areas:

1.  **Dashboard** (Real-time Overview)
2.  **Employee Management** (Employees & Schedules)
3.  **Attendance Management** (Sessions, History, Breaks)
4.  **Reports & Logs** (Exportable Data & System Audits)
5.  **Admin User** (Profile & System Settings)

### 3. Dashboard (Admin)
**Purpose:** Provides a real-time snapshot of the current day's attendance status.

**Key Metrics:**
- **Present Today**: Employees checked in within the allowed window.
- **Late Today**: Employees checked in after the grace period.
- **Absent Today**: Employees who have not checked in.
- **Attendance Rate**: Percentage-based daily overview.

**System Logic:**
- Data automatically resets daily at **12:00 AM**.
- Counts are derived from the intersection of **Active Employees** and **Today's Active Session**.
- **Rule**: Employees cannot check in if no Active Session exists for the day.

### 4. Employee Management

#### 4.1 Employees
- **Employee List**: Directory of all registered staff showing ID, Name, Position, and Status.
- **Add Employee**: Registers new accounts with auto-generated login credentials.
    - *Note*: Newly created staff are inactive until assigned a schedule.
- **Deactivated Employees**: Stores soft-deleted accounts.
    - *Rules*: Deactivated users cannot log in or check in, but their historical data is preserved.

#### 4.2 Schedules
- **Schedule List**: Reusable work patterns (e.g., "Morning Shift: 8:00 PM – 6:00 AM").
- **Create Schedule**: Defines strict time rules.
    - **Check-in Window**: Start time.
    - **Check-out Time**: End of shift.
    - **Break Duration**: Fixed (e.g., 1 Hour).
    - **Grace Period**: Allowable lateness before "Late" status applies.

### 5. Attendance Management (Core Logic)

#### 5.1 Design Philosophy: Fixed-Time Event Model
This system uses a **Session-Based, Fixed-Time Model** rather than a live-running timer.
1.  **Timestamp Locking**: When an action occurs (e.g., Check-in at 8:00 PM), that exact server time is locked permanently.
2.  **Server-Authoritative**: The system ignores the device/client clock to prevent cheating.
3.  **Visuals**: Timers do not "run" visually on the dashboard; they are static timestamps of record.

#### 5.2 Sessions
- **Definition**: A "Session" represents a single workday cycle (e.g., Jan 24, 2026).
- **Rules**:
    - Only **ONE** active session can exist per day.
    - An Admin must manually **Create Session** to start the day (prevents automated errors and ensures oversight).
    - Default status for all employees is "Absent" until they Check In.

#### 5.3 Break Time
- **Rule**: Strict 1-hour break duration.
- **Color Coding**:
    - 🟠 **Orange**: On Break
    - 🟢 **Green**: Active / Working
    - 🔴 **Red**: Absent
- **Behavior**: Clicking "Start Break" initiates a server-side timer. The system auto-calculates remaining time.

#### 5.4 Attendance History
- Comprehensive log of all attendance records adaptable for Payroll and Disciplinary review.
- Filters: Date Range, Employee, Status.

### 6. Reports & Logs

#### 6.1 Reports
- **Daily Attendance**: Single-day summary.
- **Employee Reports**: Individual history with date filtering.
- **Excel Export**:
    - Generates `.xlsx` files with real-time data from the database.
    - Includes dynamic columns for "Time In", "Break Times", and "hours Worked".
    - **Use Case**: Payroll processing and HR audits.

#### 6.2 Audit Logs
- Automatically tracks **"Who did what, and when"**.
- logs critical actions: Session Creation, Schedule Edits, Employee Deactivation, Manual Attendance Overrides.

### 7. Settings (Admin)
Accessible via the Admin Avatar Profile menu.
- **System Rules**: Configure global defaults like Night Shift logic, Auto-Absent triggers, and Time Zone settings.
- Changes here affect the behavior of the entire system immediately.

---

## 🛠 Technology Stack - Implementation Details

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS 4.0 + shadcn/ui
- **Icons**: Lucide React
- **State**: React Context
- **Export**: `xlsx` library (Backend Streamed)

### Backend
- **Framework**: Laravel 10.x
- **API**: RESTful API with Sanctum Authentication
- **Database**: MySQL/PostgreSQL
- **Architecture**:
    - **Controllers**: Handle business logic (e.g., `AttendanceRecordController`).
    - **middleware**: Enforce RBAC (`RoleMiddleware` for Admin vs Employee).
    - **Exports**: `Maatwebsite/Excel` for server-side report generation.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PHP 8.1+ & Composer
- MySQL Database

### Installation

1.  **Frontend Setup**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

2.  **Backend Setup**
    ```bash
    cd backend
    composer install
    cp .env.example .env
    php artisan key:generate
    php artisan migrate --seed
    php artisan serve
    ```

3.  **Authentication**
    - **Admin Login**: `admin@quickconn.com` / `password`
    - **Employee Login**: Generated upon creation (Default: `password`)

---

## 📄 License
Proprietary software for **QuickConn Virtual**.
