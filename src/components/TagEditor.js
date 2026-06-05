import React from 'react';
import { overlayClose } from './common';
import QuickTags from './QuickTags';

function TagEditor({ allTags, draft, onClose, onSave, onUpdate, selectedCount }) {
  return (
    <div className="settings-overlay tag-overlay" onClick={event => overlayClose(event, onClose)} role="dialog" aria-modal="true" aria-labelledby="tag-title">
      <section className="tag-modal">
        <header className="settings-head">
          <div>
            <span className="eyebrow">{selectedCount} selected</span>
            <h2 id="tag-title">Edit tags</h2>
          </div>
          <button className="icon-close" onClick={onClose} type="button">x</button>
        </header>
        <div className="settings-body">
          <label className="setting-row wide">
            <span>Comma-separated tags</span>
            <input value={draft} onChange={event => onUpdate(event.target.value)} type="text" />
          </label>
          <QuickTags allTags={allTags} draft={draft} onUpdate={onUpdate} />
          <p className="settings-hint">Add, edit, remove, or create tags here. In qBittorrent mode this uses the tag APIs.</p>
        </div>
        <footer className="settings-footer">
          <span>Tags apply to the current selection.</span>
          <div>
            <button onClick={onClose} type="button">Cancel</button>
            <button className="save-settings" onClick={onSave} type="button">Save tags</button>
          </div>
        </footer>
      </section>
    </div>
  );
}

export default TagEditor;
