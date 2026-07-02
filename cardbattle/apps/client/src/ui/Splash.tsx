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
  background: '#000', overflow: 'hidden',
};
// The logo image covers the entire viewport. Its own black background bleeds edge-to-edge so
// there's no visible square, and object-fit: cover keeps the mark centred on any aspect ratio
// (iPad 4:3, wide desktop, portrait phone) — cropping only the empty black margins.
const logo: React.CSSProperties = {
  position: 'absolute', inset: 0, width: '100%', height: '100%',
  objectFit: 'cover', objectPosition: 'center',
  userSelect: 'none', pointerEvents: 'none',
};
