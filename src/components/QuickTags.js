import React from 'react';
import { parseTags } from '../lib/torrents';

// Shared "Quick add / remove" tag toggles for the add-torrent and tag-editor
// modals. `draft` is the comma-separated tag string being edited; toggled
// tags are written back through `onUpdate` in the same format.
function QuickTags({ allTags, draft, onUpdate }) {
  const draftTags = parseTags(draft);

  function toggleTag(tag) {
    const nextTags = draftTags.includes(tag)
      ? draftTags.filter(item => item !== tag)
      : draftTags.concat(tag);
    onUpdate(nextTags.join(', '));
  }

  if (!allTags.length) {
    return null;
  }

  return (
    <section className="quick-tags" aria-label="Existing tags">
      <span>Quick add / remove</span>
      <div>
        {allTags.map(tag => (
          <button
            className={draftTags.includes(tag) ? 'active' : ''}
            key={tag}
            onClick={() => toggleTag(tag)}
            type="button"
          >
            {tag}
          </button>
        ))}
      </div>
    </section>
  );
}

export default QuickTags;
