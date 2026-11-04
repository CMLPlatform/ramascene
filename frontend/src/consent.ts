// The analytics choice is remembered in the browser; analytics themselves are not loaded yet.
export type Consent = 'accepted' | 'declined';

const KEY = 'ramascene-consent';

export function loadConsent(): Consent | null {
  try {
    const value = window.localStorage.getItem(KEY);
    return value === 'accepted' || value === 'declined' ? value : null;
  } catch {
    return null;
  }
}

export function saveConsent(value: Consent): void {
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    // Storage can be blocked; the choice then only lasts for this visit.
  }
}
