import { useEffect, useState } from 'react';
import { C, mono, sans } from './theme.js';

// The browser fires `beforeinstallprompt` when the PWA is installable; we stash
// that event and fire it from our own button so users get an obvious "install"
// affordance instead of hunting for the address-bar icon. iOS Safari has no such
// event, so there we show a short "share → add to home screen" hint instead.
interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  // @ts-expect-error iOS-only flag
  window.navigator.standalone === true;

const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function InstallButton() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) { setInstalled(true); return; }
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as BIPEvent); };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;
  // Show for Chromium (deferred prompt ready) or iOS (manual instructions).
  if (!deferred && !isIOS()) return null;

  const onClick = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      return;
    }
    setIosHint((v) => !v); // iOS: toggle the how-to hint
  };

  return (
    <div style={wrap}>
      <button style={btn} onClick={onClick} aria-label="앱 설치">
        <span style={{ fontSize: 16 }}>⬇</span>&nbsp;앱 설치
      </button>
      {iosHint && (
        <div style={hint}>
          공유 버튼 <span style={{ fontWeight: 900 }}>⬆</span> → <b>홈 화면에 추가</b>
        </div>
      )}
    </div>
  );
}

const wrap: React.CSSProperties = {
  position: 'fixed', top: 16, right: 16, zIndex: 40,
  display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, fontFamily: sans,
};
const btn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', padding: '9px 16px', fontSize: 13.5, fontWeight: 800,
  letterSpacing: 0.3, color: '#eaf6ff', cursor: 'pointer', borderRadius: 999,
  border: '1px solid #3a5da0', fontFamily: sans,
  background: 'linear-gradient(180deg, rgba(28,40,72,0.94), rgba(16,24,44,0.94))',
  boxShadow: '0 8px 22px rgba(30,70,150,0.4)', backdropFilter: 'blur(6px)',
};
const hint: React.CSSProperties = {
  maxWidth: 220, padding: '8px 12px', borderRadius: 10, fontFamily: mono, fontSize: 12,
  color: C.text, background: 'rgba(16,20,30,0.96)', border: `1px solid ${C.border}`,
  boxShadow: '0 12px 30px rgba(0,0,0,0.5)', textAlign: 'right',
};
