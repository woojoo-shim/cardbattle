import { useEffect, useRef } from 'react';

interface Props {
  /** Fired once the whole in → hold → out sequence has finished. */
  onDone: () => void;
}

// A Diablo-style brand intro: the PHOTON logo swells up out of the dark, holds a beat, then
// fades back out before the menu takes over. The image lives in /public so it ships as a static
// asset (drop the provided logo there as photon-splash.png). A hard fallback timer guarantees we
// always advance to the menu even if the image 404s and the animationend never fires.
export function Splash({ onDone }: Props) {
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };

  useEffect(() => {
    // Safety net: the CSS run is ~3.6s; bail to the menu by 4.4s no matter what.
    const t = setTimeout(finish, 4400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={wrap} onClick={finish} title="건너뛰기">
      <div style={glow} aria-hidden />
      <img
        src="/photon-splash.png"
        alt="PHOTON"
        style={logo}
        className="cb-splash"
        onAnimationEnd={finish}
        onError={finish}
        draggable={false}
      />
    </div>
  );
}

const wrap: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 200, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: '#000', overflow: 'hidden',
};
// A cool electric pool behind the mark, echoing the logo's blue cracks.
const glow: React.CSSProperties = {
  position: 'absolute', left: '50%', top: '50%', width: '70vmin', height: '70vmin',
  transform: 'translate(-50%, -50%)', pointerEvents: 'none', borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(56,160,255,0.14), transparent 66%)',
  filter: 'blur(10px)',
};
const logo: React.CSSProperties = {
  position: 'relative', width: 'min(560px, 82vw)', height: 'auto',
  userSelect: 'none', pointerEvents: 'none',
  filter: 'drop-shadow(0 0 40px rgba(56,160,255,0.28))',
};
