const AUTO_TAG_FIELDS = new Set(['name', 'tracker_url']);
const AUTO_TAG_OPERATORS = new Set(['contains', 'like']);

export function createAutoTagRule(overrides = {}) {
  return {
    id: overrides.id || `auto-tag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    field: AUTO_TAG_FIELDS.has(overrides.field) ? overrides.field : 'name',
    operator: AUTO_TAG_OPERATORS.has(overrides.operator) ? overrides.operator : 'contains',
    value: typeof overrides.value === 'string' ? overrides.value : '',
    tag: typeof overrides.tag === 'string' ? overrides.tag : '',
  };
}

export function normalizeAutoTagRules(candidate) {
  if (!Array.isArray(candidate)) {
    return [];
  }

  return candidate
    .filter(rule => rule && typeof rule === 'object')
    .map((rule, index) => createAutoTagRule({
      ...rule,
      id: typeof rule.id === 'string' && rule.id ? rule.id : `stored-auto-tag-${index}`,
    }));
}

export function matchesAutoTagValue(input, operator, pattern) {
  const value = String(input || '');
  const expected = String(pattern || '');
  if (!expected) {
    return false;
  }
  if (operator === 'contains') {
    return value.toLowerCase().includes(expected.toLowerCase());
  }
  if (operator !== 'like') {
    return false;
  }

  const expression = Array.from(expected, character => {
    if (character === '%') return '.*';
    if (character === '_') return '.';
    return character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('');
  return new RegExp(`^${expression}$`, 'iu').test(value);
}

export function matchingAutoTags(torrent, rules, trackerUrls = []) {
  const found = new Map();
  normalizeAutoTagRules(rules).forEach(rule => {
    const tag = rule.tag.trim();
    const pattern = rule.value.trim();
    if (!tag || !pattern) {
      return;
    }
    const values = rule.field === 'tracker_url'
      ? trackerUrls
      : [torrent?.name || ''];
    if (values.some(value => matchesAutoTagValue(value, rule.operator, pattern))) {
      const key = tag.toLowerCase();
      if (!found.has(key)) {
        found.set(key, tag);
      }
    }
  });
  return Array.from(found.values());
}

export function trackerUrlsFrom(torrent, trackers = []) {
  const urls = [];
  const add = value => {
    const url = typeof value === 'string' ? value : value?.url;
    if (url && !urls.includes(url)) {
      urls.push(url);
    }
  };
  add(torrent?.tracker);
  (torrent?.trackers || []).forEach(add);
  (trackers || []).forEach(add);
  return urls;
}
