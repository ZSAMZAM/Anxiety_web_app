import { FiBell, FiMail, FiPhone, FiSettings, FiShield } from 'react-icons/fi';
import SectionHeader from '../../components/SectionHeader.jsx';

function AdminSettings() {
  return (
    <div className="space-y-8">
      <SectionHeader subtitle="Settings" title="System configuration areas for the Admin operations center." />

      <div className="grid gap-6 xl:grid-cols-2">
        <SettingsPanel
          icon={<FiSettings />}
          title="System Configuration"
          description="Operational configuration is managed by backend environment variables and Super Admin system settings."
        />
        <SettingsPanel
          icon={<FiBell />}
          title="Notification Settings"
          description="Use the Notifications module to send broadcasts, appointment notices, and payment messages."
          action="Open Notifications"
          href="/admin/notifications"
        />
        <SettingsPanel
          icon={<FiMail />}
          title="Contact Information"
          description="Public contact information is managed by the platform configuration and landing-page backend data."
        />
        <SettingsPanel
          icon={<FiShield />}
          title="Role Permissions"
          description="Admin permissions are enforced by protected routes and backend role checks. Super Admin controls advanced permissions."
        />
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
        Admin settings are intentionally limited to monitoring and operational links. Patient registration, assessments, booking, and payments are handled in the mobile app.
      </div>
    </div>
  );
}

function SettingsPanel({ icon, title, description, action, href }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
        {icon}
      </div>
      <h2 className="text-xl font-bold text-slate-950 dark:text-white">{title}</h2>
      <p className="mt-3 text-slate-600 dark:text-slate-300">{description}</p>
      {action && href && (
        <a href={href} className="btn-primary mt-5 inline-flex">{action}</a>
      )}
    </div>
  );
}

export default AdminSettings;
