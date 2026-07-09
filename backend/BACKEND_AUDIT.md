# Anxiety Care Backend Audit

Date: 2026-06-14

## Existing APIs

### Public
- `GET /`
- `GET /api/health`
- `GET /api/public/stats`
- `GET /api/public/featured-doctors`
- `GET /api/public/testimonials`
- `POST /api/public/contact`

### Auth
- `POST /api/register`
- `POST /api/login`
- `POST /api/forgot-password`
- `POST /api/reset-password`
- `POST /api/otp/send`
- `POST /api/otp/verify`

### Patient Mobile
- `POST /api/predict`
- `GET /api/history`
- `GET /api/recommendations`
- `GET /api/doctors`
- `GET /api/doctors/<doctor_id>/availability`
- `POST /api/appointments`
- `GET /api/appointments`
- `GET /api/appointments/user/<user_id>`
- `PUT /api/appointments/<appointment_id>`
- `POST /api/payments`
- `GET /api/payments`
- `GET /api/payments/<payment_id>/status`
- `GET /api/profile`
- `PUT /api/profile`
- `POST /api/profile/avatar`
- `GET /api/user/notifications`
- `PUT /api/user/notifications/<notification_id>/read`
- `PUT /api/user/notifications/<notification_id>/unread`
- `PUT /api/user/notifications/mark-all-read`
- `DELETE /api/user/notifications/<notification_id>`
- `GET /api/user/stats`
- `GET /api/dashboard/stats`

### Admin, Doctor, Super Admin
- Admin, doctor, reports, analytics, and super-admin endpoints exist in `app.py` and `routes/super_admin.py`.

## Fixed Issues

- `POST /api/predict` now requires JWT before writing prediction history.
- `GET /api/recommendations` now requires JWT before writing recommendation history.
- `GET /api/users` is no longer public; admin role is required.
- `GET /api/dashboard-stats` is no longer public; admin role is required.
- `POST /api/login` now returns both top-level `token` and existing nested `user.token`.
- `POST /api/reset-password` now validates the `user_id` token actually issued by `POST /api/forgot-password`.
- Password reset and profile password changes now enforce strong password rules.
- Profile password changes now require `current_password`.
- Appointment creation now keeps `doctor_id` as `doctors.id` instead of mistakenly remapping it to `users.id`.
- New appointments now start as `Pending Payment`.
- Appointment status validation now supports `Pending Payment`.
- Payment no longer falls back to fake local success when merchant configuration is missing.
- Payment only confirms appointments when merchant result is `Completed`.
- Payment success/failure creates user notifications.
- Added `GET /api/payments/<payment_id>/status` for pending payment checks.
- Added `doctor_availability` table migration and normalized schedule reader.
- Doctor availability endpoint now returns normalized `availability_schedule` and booked slots.
- Doctors response now includes specialty, hospital/clinic, location, district, city, bio, fee, and availability fields.
- OTP API no longer returns test OTP codes in responses.
- OTP delivery now requires `OTP_DELIVERY_WEBHOOK_URL`.
- Removed JWT payload debug logging.
- `/api/appointments/user/<user_id>` now returns `{ "appointments": [...] }` instead of a raw list.

## Missing Or External Requirements

- Hormuud Merchant production payment requires environment variables:
  - `HORMUUD_MERCHANT_API_URL`
  - `HORMUUD_MERCHANT_STATUS_URL`
  - `HORMUUD_MERCHANT_API_KEY`
  - `HORMUUD_MERCHANT_ID`
- OTP delivery requires:
  - `OTP_DELIVERY_WEBHOOK_URL`
- The exact Hormuud request/response schema must be confirmed against the private merchant documentation. The backend uses a configurable HTTP JSON integration and normalizes common status fields.

## Inconsistent Responses Still To Standardize

- Admin/report endpoints still mix snake_case and camelCase response fields.
- Public testimonials are not backed by a dedicated testimonials table.
- Report creation endpoints need a dedicated production report-create contract if used by mobile.

## Security Notes

- `JWT_SECRET` should be set in production; the default development secret must not be used in deployment.
- CORS is currently broad for non-local origins. Production should restrict allowed origins.
- OTP and payment integrations now fail closed when external service configuration is missing.

## Database Tables

Core tables created/migrated by `ensure_database_tables()`:
- `users`
- `doctors`
- `doctor_availability`
- `predictions`
- `appointments`
- `payments`
- `recommendations`
- `notifications`
- `reports`
- `admins`
- `super_admins`
- `audit_logs`
- `system_settings`
- `backups`
- `role_permissions`
- `security_logs`
