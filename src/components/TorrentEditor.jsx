import { useMemo, useState } from 'react';
import {
  buildTrackerUnion,
  createTorrentEditorDraft,
  getCommonTorrentFields,
  parseTrackerDraft,
} from '../lib/torrentEditor';
import { overlayClose } from './common';
import QuickTags from './QuickTags';

function TorrentEditor({
  allCategories,
  allTags,
  apiVersion,
  busy,
  loadingTrackers,
  notice,
  onClose,
  onSave,
  onTrackerAdd,
  onTrackerEdit,
  onTrackerRemove,
  selectedTorrents,
  trackerBusy,
  trackersByHash,
}) {
  const [torrentSnapshot] = useState(selectedTorrents);
  const commonFields = useMemo(
    () => getCommonTorrentFields(torrentSnapshot, apiVersion),
    [apiVersion, torrentSnapshot]
  );
  const initialDraft = useMemo(() => createTorrentEditorDraft(commonFields), [commonFields]);
  const [draft, setDraft] = useState(initialDraft);
  const [trackerDraft, setTrackerDraft] = useState('');
  const [editingUrl, setEditingUrl] = useState('');
  const [editedUrl, setEditedUrl] = useState('');
  const [confirmRemoveUrl, setConfirmRemoveUrl] = useState('');
  const trackerRows = useMemo(
    () => buildTrackerUnion(selectedTorrents, trackersByHash),
    [selectedTorrents, trackersByHash]
  );
  const hiddenCount = Object.values(commonFields).filter(field => !field.common).length;
  const selectedCount = selectedTorrents.length;

  function update(key, value) {
    setDraft(current => ({ ...current, [key]: value }));
  }

  async function addTrackers() {
    const urls = parseTrackerDraft(trackerDraft);
    if (!urls.length) {
      return;
    }
    if (await onTrackerAdd(urls)) {
      setTrackerDraft('');
    }
  }

  async function editTracker(originalUrl) {
    const nextUrl = editedUrl.trim();
    if (!nextUrl || nextUrl === originalUrl) {
      return;
    }
    if (await onTrackerEdit(originalUrl, nextUrl)) {
      setEditingUrl('');
      setEditedUrl('');
    }
  }

  async function removeTracker(url) {
    if (confirmRemoveUrl !== url) {
      setConfirmRemoveUrl(url);
      return;
    }
    if (await onTrackerRemove(url)) {
      setConfirmRemoveUrl('');
    }
  }

  return (
    <div className="settings-overlay torrent-editor-overlay" onClick={event => overlayClose(event, onClose)} role="dialog" aria-modal="true" aria-labelledby="torrent-editor-title">
      <section className="torrent-editor-modal">
        <header className="settings-head">
          <div>
            <span className="eyebrow">{selectedCount} selected · WebAPI {apiVersion || 'detecting'}</span>
            <h2 id="torrent-editor-title">Edit {selectedCount === 1 ? 'torrent' : 'torrents'}</h2>
          </div>
          <button aria-label="Close torrent editor" className="icon-close" onClick={onClose} type="button">x</button>
        </header>

        <div className="settings-body torrent-editor-body">
          {selectedCount > 1 && hiddenCount > 0 && (
            <p className="editor-summary">{hiddenCount} setting{hiddenCount === 1 ? '' : 's'} with different values are hidden. Tracker actions remain available.</p>
          )}

          <EditorSection title="General">
            <TextField field={commonFields.name} label="Torrent name" onChange={value => update('name', value)} value={draft.name} />
            <TextField field={commonFields.save_path} label="Save location" onChange={value => update('save_path', value)} value={draft.save_path} wide />
            {commonFields.save_path?.common && (
              <p className="settings-hint editor-warning">Changing the save location moves torrent data and switches Automatic Torrent Management off.</p>
            )}
            <SelectField field={commonFields.category} label="Category" onChange={value => update('category', value)} value={draft.category}>
              <option value="">none</option>
              {Array.from(new Set([draft.category, ...allCategories].filter(Boolean))).map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </SelectField>
            {commonFields.tags?.common && (
              <div className="editor-wide-group">
                <TextField field={commonFields.tags} label="Tags" onChange={value => update('tags', value)} value={draft.tags} wide />
                <QuickTags allTags={allTags} draft={draft.tags || ''} onUpdate={value => update('tags', value)} />
              </div>
            )}
            <TextAreaField field={commonFields.comment} label="Comment" onChange={value => update('comment', value)} value={draft.comment} />
          </EditorSection>

          {(commonFields.dl_limit?.common || commonFields.up_limit?.common) && (
            <EditorSection title="Transfer limits">
              <NumberField field={commonFields.dl_limit} label="Download limit (B/s, 0 = unlimited)" min="0" onChange={value => update('dl_limit', value)} value={draft.dl_limit > 0 ? draft.dl_limit : 0} />
              <NumberField field={commonFields.up_limit} label="Upload limit (B/s, 0 = unlimited)" min="0" onChange={value => update('up_limit', value)} value={draft.up_limit > 0 ? draft.up_limit : 0} />
            </EditorSection>
          )}

          {['ratio_limit', 'seeding_time_limit', 'inactive_seeding_time_limit', 'share_limit_action'].some(key => commonFields[key]?.common) && (
            <EditorSection title="Share limits">
              <ShareLimitField field={commonFields.ratio_limit} label="Ratio limit" onChange={value => update('ratio_limit', value)} step="0.01" value={draft.ratio_limit} />
              <ShareLimitField field={commonFields.seeding_time_limit} label="Seeding time (minutes)" onChange={value => update('seeding_time_limit', value)} step="1" value={draft.seeding_time_limit} />
              <ShareLimitField field={commonFields.inactive_seeding_time_limit} label="Inactive seeding time (minutes)" onChange={value => update('inactive_seeding_time_limit', value)} step="1" value={draft.inactive_seeding_time_limit} />
              <SelectField field={commonFields.share_limit_action} label="When a share limit is reached" onChange={value => update('share_limit_action', value)} value={draft.share_limit_action} wide>
                <option value="Default">Use global action</option>
                <option value="Stop">Stop torrent</option>
                <option value="Remove">Remove torrent</option>
                <option value="RemoveWithContent">Remove torrent and content</option>
                <option value="EnableSuperSeeding">Enable super seeding</option>
              </SelectField>
            </EditorSection>
          )}

          {['auto_tmm', 'seq_dl', 'f_l_piece_prio', 'force_start', 'super_seeding'].some(key => commonFields[key]?.common) && (
            <EditorSection title="Behaviour">
              <CheckboxField field={commonFields.auto_tmm} label="Automatic Torrent Management" onChange={value => update('auto_tmm', value)} value={draft.auto_tmm} />
              <CheckboxField field={commonFields.seq_dl} label="Sequential download" onChange={value => update('seq_dl', value)} value={draft.seq_dl} />
              <CheckboxField field={commonFields.f_l_piece_prio} label="First and last pieces first" onChange={value => update('f_l_piece_prio', value)} value={draft.f_l_piece_prio} />
              <CheckboxField field={commonFields.force_start} label="Force start" onChange={value => update('force_start', value)} value={draft.force_start} />
              <CheckboxField field={commonFields.super_seeding} label="Super seeding" onChange={value => update('super_seeding', value)} value={draft.super_seeding} />
            </EditorSection>
          )}

          <section className="settings-section tracker-editor-section">
            <div className="editor-section-heading">
              <div>
                <h3>Trackers</h3>
                <p>Tracker changes are applied immediately.</p>
              </div>
              <strong>{loadingTrackers ? 'loading' : `${trackerRows.length} URLs`}</strong>
            </div>
            <label className="setting-row wide tracker-add-row">
              <span>New tracker URLs, one per line</span>
              <textarea onChange={event => setTrackerDraft(event.target.value)} rows="3" value={trackerDraft} />
              <button disabled={Boolean(trackerBusy) || !parseTrackerDraft(trackerDraft).length} onClick={addTrackers} type="button">Add to {selectedCount}</button>
            </label>
            <ul className="tracker-editor-list">
              {!loadingTrackers && !trackerRows.length && <li className="tracker-editor-empty">No editable trackers reported.</li>}
              {trackerRows.map(tracker => {
                const isEditing = editingUrl === tracker.url;
                const isConfirming = confirmRemoveUrl === tracker.url;
                return (
                  <li key={tracker.url}>
                    {isEditing ? (
                      <div className="tracker-edit-form">
                        <span>{tracker.url}</span>
                        <input aria-label={`Replacement URL for ${tracker.url}`} onChange={event => setEditedUrl(event.target.value)} type="text" value={editedUrl} />
                        <div>
                          <button onClick={() => { setEditingUrl(''); setEditedUrl(''); }} type="button">Cancel</button>
                          <button className="primary-inline" disabled={Boolean(trackerBusy) || !editedUrl.trim()} onClick={() => editTracker(tracker.url)} type="button">Replace</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="tracker-editor-url">
                          <code>{tracker.url}</code>
                          <small>{tracker.hashes.length} of {selectedCount} torrent{selectedCount === 1 ? '' : 's'}</small>
                        </div>
                        <div className="tracker-editor-actions">
                          <button disabled={Boolean(trackerBusy)} onClick={() => { setEditingUrl(tracker.url); setEditedUrl(tracker.url); setConfirmRemoveUrl(''); }} type="button">Edit</button>
                          <button className={isConfirming ? 'confirm-inline' : ''} disabled={Boolean(trackerBusy)} onClick={() => removeTracker(tracker.url)} type="button">
                            {isConfirming ? `Confirm ${tracker.hashes.length}` : 'Remove'}
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <footer className="settings-footer">
          <span className={notice?.tone ? `editor-notice ${notice.tone}` : 'editor-notice'}>{notice?.text || 'Only changed settings will be sent to qBittorrent.'}</span>
          <div>
            <button onClick={onClose} type="button">Cancel</button>
            <button className="save-settings" disabled={busy || Boolean(trackerBusy)} onClick={() => onSave(initialDraft, draft)} type="button">
              {busy ? 'Applying…' : 'Apply settings'}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function EditorSection({ children, title }) {
  const visibleChildren = Array.isArray(children) ? children.filter(Boolean) : [children].filter(Boolean);
  if (!visibleChildren.length) {
    return null;
  }
  return (
    <section className="settings-section torrent-editor-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function TextField({ field, label, onChange, value, wide }) {
  if (!field?.common) return null;
  return <label className={`setting-row${wide ? ' wide' : ''}`}><span>{label}</span><input onChange={event => onChange(event.target.value)} type="text" value={value ?? ''} /></label>;
}

function TextAreaField({ field, label, onChange, value }) {
  if (!field?.common) return null;
  return <label className="setting-row wide"><span>{label}</span><textarea onChange={event => onChange(event.target.value)} rows="3" value={value ?? ''} /></label>;
}

function NumberField({ field, label, min, onChange, step = '1', value }) {
  if (!field?.common) return null;
  return <label className="setting-row"><span>{label}</span><input min={min} onChange={event => onChange(Number(event.target.value))} step={step} type="number" value={value ?? 0} /></label>;
}

function SelectField({ children, field, label, onChange, value, wide }) {
  if (!field?.common) return null;
  return <label className={`setting-row${wide ? ' wide' : ''}`}><span>{label}</span><select onChange={event => onChange(event.target.value)} value={value ?? ''}>{children}</select></label>;
}

function CheckboxField({ field, label, onChange, value }) {
  if (!field?.common) return null;
  return <label className="setting-row"><span>{label}</span><input checked={Boolean(value)} onChange={event => onChange(event.target.checked)} type="checkbox" /></label>;
}

function ShareLimitField({ field, label, onChange, step, value }) {
  if (!field?.common) return null;
  const mode = value === -2 ? 'global' : value === -1 ? 'unlimited' : 'custom';
  return (
    <label className="setting-row share-limit-row">
      <span>{label}</span>
      <span className="share-limit-controls">
        <select onChange={event => {
          const nextMode = event.target.value;
          onChange(nextMode === 'global' ? -2 : nextMode === 'unlimited' ? -1 : (step === '0.01' ? 1 : 60));
        }} value={mode}>
          <option value="global">global</option>
          <option value="unlimited">unlimited</option>
          <option value="custom">custom</option>
        </select>
        {mode === 'custom' && <input min="0" onChange={event => onChange(Number(event.target.value))} step={step} type="number" value={value} />}
      </span>
    </label>
  );
}

export default TorrentEditor;
