# IT Management Panel

A completely independent IT Management frontend application for AnxietyCare system administration.

## Tech Stack

- React 18
- Vite
- React Router
- Axios
- TailwindCSS
- Lucide Icons
- Recharts

## Features

- **Authentication**: Dedicated IT administrator login with role-based access
- **Dashboard**: Real-time system statistics and metrics
- **Admin Management**: Create, edit, suspend, activate, and delete administrators
- **User Management**: View, search, suspend, activate, delete, and export users
- **Doctor Management**: View, approve, suspend, activate, and delete doctors with ratings and revenue
- **Payments**: Transaction history with revenue summary cards
- **Appointments**: View all platform appointments
- **Predictions**: AI anxiety prediction results
- **Reports**: Generate and download system reports
- **Audit Logs**: System activity and security logs with search and filter
- **Role Management**: Manage system roles and permissions
- **Backup Management**: Create, download, and delete database backups
- **System Monitoring**: API, database, server, CPU, memory, storage, and uptime monitoring
- **Service Verification**: Paid appointment and service completion monitoring
- **System Settings**: Configure system-wide settings
- **Security Center**: Monitor failed logins, blocked accounts, and suspicious activity
- **Notifications**: Send broadcast notifications to users, doctors, or admins
- **Profile**: Manage personal information and change password

## Installation

```bash
cd super-admin-panel
npm install
```

## Development

```bash
npm run dev
```

The application will be available at `http://localhost:5174`

## Build

```bash
npm run build
```

## API Configuration

The application connects to the backend API at:
- Development: `/api` (proxied through Vite)
- Production: configure the deployed backend URL via `VITE_API_BASE_URL`

## Theme

The IT Management Panel uses a custom dark theme with the following color scheme:

- Background: `#0B1120`
- Sidebar: `#111827`
- Card: `#1F2937`
- Primary: `#06B6D4`
- Accent: `#14B8A6`
- Success: `#10B981`
- Warning: `#F59E0B`
- Danger: `#EF4444`

## Routes

- `/super-admin/login` - Login page
- `/super-admin/dashboard` - Dashboard overview
- `/super-admin/admins` - Administrator management
- `/super-admin/users` - User management
- `/super-admin/doctors` - Doctor management
- `/super-admin/payments` - Payment history
- `/super-admin/service-verification` - Service verification monitoring
- `/super-admin/appointments` - Appointment management
- `/super-admin/predictions` - Prediction results
- `/super-admin/reports` - System reports
- `/super-admin/audit-logs` - Audit logs
- `/super-admin/roles` - Role and permission management
- `/super-admin/backups` - Backup management
- `/super-admin/system-monitoring` - System monitoring
- `/super-admin/system-settings` - System settings
- `/super-admin/security` - Security center
- `/super-admin/notifications` - Send notifications
- `/super-admin/profile` - Profile management

## Authentication

The IT Management Panel uses a dedicated authentication system:
- Login endpoint: `POST /api/super-admin/login`
- Stores: `token`, `super_admin_id`, `username`, `role`
- Required role: `SUPER_ADMIN` or `IT_ADMIN`

## Architecture

This is a completely independent application with its own:
- Pages
- Layout
- Routes
- Authentication
- Sidebar
- Dashboard
- API Services
- Theme

It is NOT merged with the existing Admin Panel and operates as a separate system-management application.
