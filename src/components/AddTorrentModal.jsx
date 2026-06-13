import { overlayClose } from './common';
import QuickTags from './QuickTags';

function AddTorrentModal({ allTags, files, magnet, notice, onClose, onFiles, onMagnet, onStopped, onSubmit, onTags, status, stopped, tags }) {
  return (
    <div className="settings-overlay tag-overlay" onClick={event => overlayClose(event, onClose)} role="dialog" aria-modal="true" aria-labelledby="add-title">
      <section className="tag-modal add-modal">
        <header className="settings-head">
          <div>
            <span className="eyebrow">/api/v2/torrents/add</span>
            <h2 id="add-title">Add torrents</h2>
          </div>
          <button className="icon-close" onClick={onClose} type="button">x</button>
        </header>
        <div className="settings-body">
          <label className="setting-row wide add-file-row">
            <span>Torrent files</span>
            {/* The native file widget renders in the browser locale, so it is
                visually hidden behind an English trigger. */}
            <span aria-hidden="true" className="file-trigger">Browse files</span>
            <input
              accept=".torrent,application/x-bittorrent"
              multiple
              onChange={event => onFiles(event.target.files ? Array.from(event.target.files) : [])}
              type="file"
            />
            <strong>
              {files.length
                ? `${files.length} file${files.length === 1 ? '' : 's'}: ${files.map(file => file.name).join(', ')}`
                : 'no files selected'}
            </strong>
          </label>
          <label className="setting-row wide add-text-row">
            <span>Magnet or URL</span>
            <textarea
              onChange={event => onMagnet(event.target.value)}
              placeholder="magnet:?xt=urn:btih:... (one per line)"
              rows="5"
              value={magnet}
            />
          </label>
          <label className="setting-row wide">
            <span>Tags</span>
            <input
              onChange={event => onTags(event.target.value)}
              placeholder="comma-separated tags"
              type="text"
              value={tags}
            />
          </label>
          <QuickTags allTags={allTags} draft={tags} onUpdate={onTags} />
          <label className="setting-row wide">
            <span>Add stopped</span>
            <input checked={stopped} onChange={event => onStopped(event.target.checked)} type="checkbox" />
          </label>
          <p className="settings-hint">
            Current mode: {status}. Enable Add stopped when importing your own data, then recheck it before resuming.
          </p>
        </div>
        <footer className="settings-footer">
          <span>{notice || 'Ready to add to qBittorrent.'}</span>
          <div>
            <button onClick={onClose} type="button">Cancel</button>
            <button className="save-settings" onClick={onSubmit} type="button">Add</button>
          </div>
        </footer>
      </section>
    </div>
  );
}

export default AddTorrentModal;
