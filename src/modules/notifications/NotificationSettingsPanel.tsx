import React from 'react';
import { Bell, Loader2, Save, MessageCircle, Mail, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNotificationSettings } from './hooks/useNotifications';
import { NotificationChannel, TenantNotificationConfig } from './NotificationTypes';

interface NotificationSettingsPanelProps {
  tenantId: string;
}

const Toggle = ({
  enabled,
  onChange,
  label,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) => (
  <button
    type="button"
    onClick={() => onChange(!enabled)}
    className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-red-500' : 'bg-white/10'}`}
    aria-label={label}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
        enabled ? 'translate-x-5' : ''
      }`}
    />
  </button>
);

const ChannelToggles = ({
  channels,
  onChange,
}: {
  channels: NotificationChannel[];
  onChange: (channels: NotificationChannel[]) => void;
}) => {
  const toggle = (channel: NotificationChannel) => {
    if (channels.includes(channel)) {
      onChange(channels.filter((c) => c !== channel));
    } else {
      onChange([...channels, channel]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {(['in_app', 'whatsapp', 'email', 'push'] as NotificationChannel[]).map((ch) => (
        <button
          key={ch}
          type="button"
          onClick={() => toggle(ch)}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-colors ${
            channels.includes(ch)
              ? 'bg-red-500/20 border-red-500/40 text-red-300'
              : 'bg-white/5 border-white/10 text-white/40'
          }`}
        >
          {ch.replace('_', ' ')}
        </button>
      ))}
    </div>
  );
};

export const NotificationSettingsPanel: React.FC<NotificationSettingsPanelProps> = ({ tenantId }) => {
  const { config, setConfig, loading, saving, save } = useNotificationSettings(tenantId);

  const updateConfig = (patch: Partial<TenantNotificationConfig>) => {
    if (!config) return;
    setConfig({ ...config, ...patch });
  };

  const handleSave = async () => {
    try {
      await save();
      toast.success('Notification preferences saved');
    } catch {
      toast.error('Failed to save notification preferences');
    }
  };

  if (loading || !config) {
    return (
      <div className="flex justify-center py-12 text-white/50">
        <Loader2 className="animate-spin mr-2" size={20} /> Loading notification settings...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Bell size={20} className="text-red-400" />
          AI Notification Center
        </h2>
        <p className="text-sm text-white/50 mt-1">
          Configure how BhojanOS delivers sales, inventory, and kitchen intelligence.
        </p>
      </div>

      <section className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-white/40">Scheduled Briefings</h3>

        {[
          { key: 'morningBrief' as const, label: 'Morning Brief', time: config.morningBrief.time },
          { key: 'afternoonBrief' as const, label: 'Afternoon Brief', time: config.afternoonBrief.time },
          { key: 'eveningReport' as const, label: 'Evening Report', time: config.eveningReport.time },
        ].map(({ key, label, time }) => (
          <div key={key} className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white text-sm">{label}</p>
                <p className="text-xs text-white/40">Scheduled at {time}</p>
              </div>
              <Toggle
                enabled={config[key].enabled}
                onChange={(enabled) =>
                  updateConfig({ [key]: { ...config[key], enabled } })
                }
                label={label}
              />
            </div>
            <ChannelToggles
              channels={config[key].channels}
              onChange={(channels) => updateConfig({ [key]: { ...config[key], channels } })}
            />
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-white/40">Alert Categories</h3>

        {[
          { key: 'criticalAlerts' as const, label: 'Critical Alerts' },
          { key: 'salesAlerts' as const, label: 'Sales Alerts' },
          { key: 'inventoryAlerts' as const, label: 'Inventory Alerts' },
          { key: 'customerAlerts' as const, label: 'Customer Alerts' },
          { key: 'marketingAlerts' as const, label: 'Marketing Alerts' },
        ].map(({ key, label }) => (
          <div key={key} className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-white text-sm">{label}</p>
              <Toggle
                enabled={config[key].enabled}
                onChange={(enabled) =>
                  updateConfig({ [key]: { ...config[key], enabled } })
                }
                label={label}
              />
            </div>
            <ChannelToggles
              channels={config[key].channels}
              onChange={(channels) => updateConfig({ [key]: { ...config[key], channels } })}
            />
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-white/40">Delivery Channels</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { key: 'whatsappEnabled' as const, label: 'WhatsApp', icon: MessageCircle },
            { key: 'emailEnabled' as const, label: 'Email', icon: Mail },
            { key: 'pushEnabled' as const, label: 'Push', icon: Smartphone },
          ].map(({ key, label, icon: Icon }) => (
            <div key={key} className="rounded-xl border border-white/10 bg-black/20 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Icon size={16} className="text-white/50" />
                {label}
              </div>
              <Toggle
                enabled={config[key]}
                onChange={(enabled) => updateConfig({ [key]: enabled })}
                label={label}
              />
            </div>
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
        Save Notification Preferences
      </button>
    </div>
  );
};

export default NotificationSettingsPanel;
