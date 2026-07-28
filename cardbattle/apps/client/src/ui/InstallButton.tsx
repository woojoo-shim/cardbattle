import { useEffect, useState } from 'react';
import { C, mono, sans } from './theme.js';
import { Icon } from './art/Icon.js';

// The browser fires `beforeinstallprompt` when the PWA is installable; main.tsx
// stashes that event on `window.__installPrompt` (it fires before React mounts).
// We read it here and fire it from our own button. When no prompt is available
// (iOS, Firefox, or the event hasn't fired yet) we fall back to a short manual
// how-to so the button is always useful.
interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const getStashed = () =>
  (window as unknown as { __installPrompt?: BIPEvent }).__installPrompt ?? null;

// Fire the native install prompt. Must be called synchronously from a real user
// gesture (a click/keypress handler) or the browser ignores it. Returns the
// user's choice, or 'unavailable' when no prompt has been captured yet.
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const w = window as unknown as { __installPrompt?: BIPEvent };
  const evt = w.__installPrompt;
  if (!evt) return 'unavailable';
  await evt.prompt();
  const { outcome } = await evt.userChoice;
  w.__installPrompt = undefined;
  window.dispatchEvent(new Event('pwa-installable')); // let the button refresh
  return outcome;
}

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  // @ts-expect-error iOS-only flag
  window.navigator.standalone === true;

const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function manualHint(): string {
  if (isIOS()) return '사파리 하단의 공유 버튼을 누른 뒤 "홈 화면에 추가"를 선택하세요.';
  if (/firefox/i.test(navigator.userAgent)) return '브라우저 메뉴(오른쪽 위 줄 세 개)에서 "이 사이트 설치"를 누르세요.';
  return '주소창 오른쪽의 설치 아이콘, 또는 브라우저 메뉴에서 "앱 설치"를 누르세요.';
}

export function InstallButton() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(getStashed);
  const [installed, setInstalled] = useState(isStandalone());
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    const onAvailable = () => setDeferred(getStashed());
    const onInstalled = () => { setInstalled(true); setDeferred(null); setHint(null); };
    window.addEventListener('pwa-installable', onAvailable);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('pwa-installable', onAvailable);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;

  const onClick = () => {
    if (deferred ?? getStashed()) {
      const p = promptInstall(); // sync call keeps the user gesture valid
      setDeferred(null);
      p.then((outcome) => { if (outcome === 'dismissed') setHint(manualHint()); });
      return;
    }
    setHint((h) => (h ? null : manualHint())); // no prompt: toggle manual how-to
  };

  return (
    <div style={wrap}>
      <button style={btn} onClick={onClick} aria-label="앱 설치">
        <Icon name="download" size={16} />&nbsp;앱 설치
      </button>
      {hint && <div style={hintBox}>{hint}</div>}
    </div>
  );
}

const wrap: React.CSSProperties = {
  position: 'fixed', top: 16, right: 16, zIndex: 40,
  display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, fontFamily: sans,
};
const btn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', padding: '9px 16px', fontSize: 13.5, fontWeight: 800,
  letterSpacing: 0.3, color: '#eef2fb', cursor: 'pointer', borderRadius: 999,
  border: `1px solid ${C.borderHi}`, fontFamily: sans,
  background: 'linear-gradient(180deg, rgba(40,48,70,0.94), rgba(16,20,32,0.94))',
  boxShadow: '0 8px 22px rgba(30,24,70,0.42)', backdropFilter: 'blur(6px)',
};
const hintBox: React.CSSProperties = {
  maxWidth: 240, padding: '9px 13px', borderRadius: 10, fontFamily: mono, fontSize: 12, lineHeight: 1.5,
  color: C.text, background: 'rgba(12,16,26,0.97)', border: `1px solid ${C.border}`,
  boxShadow: '0 12px 30px rgba(0,0,0,0.5)', textAlign: 'right',
};
