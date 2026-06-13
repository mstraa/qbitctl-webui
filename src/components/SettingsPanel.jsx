import { useState } from 'react';
import { overlayClose } from './common';

function WebUISection({ onRevert, onUpdate, settings }) {
  return (
    <section className="settings-section critical">
      <div>
        <h3>WebUI</h3>
        <p>Revert disables qBittorrent&apos;s Alternative WebUI and returns the app to the default qBittorrent interface after reload.</p>
      </div>
      <label className="setting-row">
        <span>Alternative WebUI</span>
        <input checked={Boolean(settings.alternative_webui_enabled)} onChange={event => onUpdate('alternative_webui_enabled', event.target.checked)} type="checkbox" />
      </label>
      <label className="setting-row wide">
        <span>WebUI path</span>
        <input onChange={event => onUpdate('alternative_webui_path', event.target.value)} type="text" value={settings.alternative_webui_path || ''} />
      </label>
      <button className="revert-button" onClick={onRevert} type="button">Revert to default qBittorrent WebUI</button>
      <p className="settings-hint">Manual fallback: qBittorrent Settings - Web UI - uncheck "Use alternative WebUI", then apply and reload.</p>
    </section>
  );
}

function InterfaceSection({ onUpdate, settings }) {
  return (
    <section className="settings-section">
      <h3>Interface</h3>
      <label className="setting-row">
        <span>Color hint</span>
        <input onChange={event => onUpdate('ui_accent_color', event.target.value)} type="color" value={settings.ui_accent_color || '#f07b24'} />
      </label>
      <label className="setting-row">
        <span>Ratio progress bar</span>
        <input checked={Boolean(settings.ui_show_ratio_progress)} onChange={event => onUpdate('ui_show_ratio_progress', event.target.checked)} type="checkbox" />
      </label>
      <label className="setting-row">
        <span>Category filters</span>
        <input checked={settings.ui_show_category_filters !== false} onChange={event => onUpdate('ui_show_category_filters', event.target.checked)} type="checkbox" />
      </label>
      <label className="setting-row">
        <span>Tag filters</span>
        <input checked={settings.ui_show_tag_filters !== false} onChange={event => onUpdate('ui_show_tag_filters', event.target.checked)} type="checkbox" />
      </label>
      <label className="setting-row">
        <span>Queue column</span>
        <input checked={settings.ui_show_queue_column !== false} onChange={event => onUpdate('ui_show_queue_column', event.target.checked)} type="checkbox" />
      </label>
      <label className="setting-row">
        <span>Version update check</span>
        <input checked={Boolean(settings.ui_version_check_enabled)} onChange={event => onUpdate('ui_version_check_enabled', event.target.checked)} type="checkbox" />
      </label>
      <p className="settings-hint">Off by default. When enabled, qbitctl asks GitHub for the newest release once per page load and shows the version button.</p>
      <label className="setting-row wide">
        <span>Table density</span>
        <select onChange={event => onUpdate('ui_table_density', event.target.value)} value={settings.ui_table_density || 'normal'}>
          <option value="normal">normal</option>
          <option value="compact">compact</option>
        </select>
      </label>
    </section>
  );
}

function AccessSection({ onLogout, onUpdate, settings, status }) {
  return (
    <section className="settings-section">
      <h3>Access</h3>
      <label className="setting-row"><span>Web UI port</span><input onChange={event => onUpdate('web_ui_port', event.target.value)} type="number" value={settings.web_ui_port || ''} /></label>
      <label className="setting-row"><span>Bypass auth for localhost</span><input checked={Boolean(settings.bypass_local_auth)} onChange={event => onUpdate('bypass_local_auth', event.target.checked)} type="checkbox" /></label>
      {status === 'live' && (
        <button className="logout-button" onClick={onLogout} type="button">Log out of qBittorrent</button>
      )}
    </section>
  );
}

function SpeedLimitsSection({ onUpdate, settings }) {
  return (
    <section className="settings-section">
      <h3>Speed limits</h3>
      <label className="setting-row"><span>Download limit B/s</span><input onChange={event => onUpdate('dl_limit', event.target.value)} type="number" value={settings.dl_limit || 0} /></label>
      <label className="setting-row"><span>Upload limit B/s</span><input onChange={event => onUpdate('up_limit', event.target.value)} type="number" value={settings.up_limit || 0} /></label>
    </section>
  );
}

function QueueingSection({ onUpdate, settings }) {
  return (
    <section className="settings-section">
      <h3>Queueing</h3>
      <label className="setting-row"><span>Enable queueing</span><input checked={Boolean(settings.queueing_enabled)} onChange={event => onUpdate('queueing_enabled', event.target.checked)} type="checkbox" /></label>
      <label className="setting-row"><span>Max active downloads</span><input onChange={event => onUpdate('max_active_downloads', event.target.value)} type="number" value={settings.max_active_downloads || 0} /></label>
      <label className="setting-row"><span>Max active uploads</span><input onChange={event => onUpdate('max_active_uploads', event.target.value)} type="number" value={settings.max_active_uploads || 0} /></label>
      <label className="setting-row"><span>Max active torrents</span><input onChange={event => onUpdate('max_active_torrents', event.target.value)} type="number" value={settings.max_active_torrents || 0} /></label>
    </section>
  );
}

function DownloadsSection({ onUpdate, settings }) {
  return (
    <section className="settings-section">
      <h3>Downloads</h3>
      <label className="setting-row wide"><span>Default save path</span><input onChange={event => onUpdate('save_path', event.target.value)} type="text" value={settings.save_path || ''} /></label>
      <label className="setting-row"><span>Use incomplete path</span><input checked={Boolean(settings.temp_path_enabled)} onChange={event => onUpdate('temp_path_enabled', event.target.checked)} type="checkbox" /></label>
      <label className="setting-row wide"><span>Incomplete path</span><input onChange={event => onUpdate('temp_path', event.target.value)} type="text" value={settings.temp_path || ''} /></label>
      <h3>External program</h3>
      <label className="setting-row wide"><span>Run on torrent completion</span><input checked={Boolean(settings.autorun_enabled)} onChange={event => onUpdate('autorun_enabled', event.target.checked)} type="checkbox" /></label>
      <label className="setting-row wide"><span>Command on completion</span><textarea onChange={event => onUpdate('autorun_program', event.target.value)} rows="4" value={settings.autorun_program || ''} /></label>
      <label className="setting-row wide"><span>Run on torrent added</span><input checked={Boolean(settings.autorun_on_torrent_added_enabled)} onChange={event => onUpdate('autorun_on_torrent_added_enabled', event.target.checked)} type="checkbox" /></label>
      <label className="setting-row wide"><span>Command on added</span><textarea onChange={event => onUpdate('autorun_on_torrent_added_program', event.target.value)} rows="4" value={settings.autorun_on_torrent_added_program || ''} /></label>
    </section>
  );
}

function SettingValueInput({ name, onUpdate, value }) {
  if (typeof value === 'boolean') {
    return <input checked={value} onChange={event => onUpdate(name, event.target.checked)} type="checkbox" />;
  }
  if (typeof value === 'number') {
    return <input onChange={event => onUpdate(name, Number(event.target.value))} type="number" value={Number.isFinite(value) ? value : 0} />;
  }
  if (Array.isArray(value) || (value && typeof value === 'object')) {
    return <textarea onChange={event => onUpdate(name, event.target.value)} rows="3" value={JSON.stringify(value, null, 2)} />;
  }
  return <input onChange={event => onUpdate(name, event.target.value)} type="text" value={value == null ? '' : String(value)} />;
}

function AdvancedSection({ onUpdate, settings, status }) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const advancedSettings = Object.entries(settings).sort(([left], [right]) => left.localeCompare(right));
  return (
    <section className="settings-section advanced-section">
      <button className="advanced-toggle" onClick={() => setAdvancedOpen(open => !open)} type="button">
        <span>Advanced: all qBittorrent settings</span>
        <strong>{advancedOpen ? 'hide' : `show ${advancedSettings.length}`}</strong>
      </button>
      <p className="settings-hint">Current mode: {status}. Live mode reads and writes qBittorrent preferences.</p>
      {advancedOpen && (
        <div className="advanced-grid">
          {advancedSettings.map(([key, value]) => (
            <label className="advanced-row" key={key}>
              <span>{key}</span>
              <SettingValueInput name={key} onUpdate={onUpdate} value={value} />
            </label>
          ))}
        </div>
      )}
    </section>
  );
}

function SettingsPanel({ notice, onClose, onLogout, onRevert, onSave, onUpdate, settings, status }) {
  return (
    <div className="settings-overlay" onClick={event => overlayClose(event, onClose)} role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <section className="settings-panel">
        <header className="settings-head">
          <div>
            <span className="eyebrow">/api/v2/app/preferences</span>
            <h2 id="settings-title">Settings</h2>
          </div>
          <button className="icon-close" onClick={onClose} type="button">x</button>
        </header>
        <div className="settings-body">
          <WebUISection onRevert={onRevert} onUpdate={onUpdate} settings={settings} />
          <InterfaceSection onUpdate={onUpdate} settings={settings} />
          <AccessSection onLogout={onLogout} onUpdate={onUpdate} settings={settings} status={status} />
          <SpeedLimitsSection onUpdate={onUpdate} settings={settings} />
          <QueueingSection onUpdate={onUpdate} settings={settings} />
          <DownloadsSection onUpdate={onUpdate} settings={settings} />
          <AdvancedSection onUpdate={onUpdate} settings={settings} status={status} />
        </div>
        <footer className="settings-footer">
          <span>{notice || 'Settings are staged locally until saved.'}</span>
          <div>
            <button onClick={onClose} type="button">Close</button>
            <button className="save-settings" onClick={onSave} type="button">Save settings</button>
          </div>
        </footer>
      </section>
    </div>
  );
}

export default SettingsPanel;
