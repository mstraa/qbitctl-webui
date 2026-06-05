import React from 'react';
import { overlayClose } from './common';

function RemoveTorrentModal({ deleteData, onClose, onConfirm, onDeleteData, selectedCount }) {
  return (
    <div className="settings-overlay tag-overlay" onClick={event => overlayClose(event, onClose)} role="dialog" aria-modal="true" aria-labelledby="remove-title">
      <section className="tag-modal remove-modal">
        <header className="settings-head">
          <div>
            <span className="eyebrow">{selectedCount} selected</span>
            <h2 id="remove-title">Remove torrents</h2>
          </div>
          <button className="icon-close" onClick={onClose} type="button">x</button>
        </header>
        <div className="settings-body">
          <p className="settings-hint">
            This removes {selectedCount === 1 ? 'the selected torrent' : 'the selected torrents'} from qBittorrent.
          </p>
          <label className="setting-row wide danger-row">
            <span>Delete downloaded data</span>
            <input checked={deleteData} onChange={event => onDeleteData(event.target.checked)} type="checkbox" />
          </label>
          <p className="settings-hint">Data deletion is off by default.</p>
        </div>
        <footer className="settings-footer">
          <span>{deleteData ? 'Torrent data files will be deleted.' : 'Torrent data files will be kept.'}</span>
          <div>
            <button onClick={onClose} type="button">Cancel</button>
            <button className="danger-confirm" onClick={onConfirm} type="button">Remove</button>
          </div>
        </footer>
      </section>
    </div>
  );
}

export default RemoveTorrentModal;
