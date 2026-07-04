import { useState } from 'react';
import type { UiState } from '../state/useRoom.js';
import { MIN_PLAYERS, MAX_PLAYERS, GAME_MODES, type GameModeId } from '@cardbattle/shared';
import { AvatarArt, BOT_TINTS } from './art/CreatureArt.js';
import { Icon, MODE_ICON } from './art/Icon.js';
import { playSfx } from '../audio/sfx.js';
import { C, mono, sans } from './theme.js';

interface Props {
  ui: UiState;
  myId: string;
  onReady: (ready: boolean) => void;
  onAddBot: () => void;
  onRemoveBot: (botId?: string) => void;
  onExit?: () => void;
}

// The display serif shared with the main menu — the engraved "back-room sign" look.
const serif = "'Times New Roman', Georgia, 'Nanum Myeongjo', serif";

export function Lobby({ ui, myId, onReady, onAddBot, onRemoveBot, onExit }: Props) {
  const [ready, setReady] = useState(false);
  const toggle = () => { const next = !ready; setReady(next); playSfx(next ? 'select' : 'back'); onReady(next); };
  const n = ui.players.length;
  const gm = GAME_MODES[(ui.mode as GameModeId)] ?? GAME_MODES.standard;

  return (
    <div style={wrap}>
      <div style={vignette} aria-hidden />

      {onExit && (
        <button style={backBtn} onClick={() => { playSfx('back'); onExit(); }} title="방을 나가고 목록으로">
          ←&nbsp;나가기
        </button>
      )}

      <div style={content} className="cb-gate-in">
        <span style={kicker}>◈&nbsp;&nbsp;대기실 · WAITING ROOM&nbsp;&nbsp;◈</span>
        <h1 style={title}>{ui.title || '심연의 투기장'}</h1>

        <div style={panel}>
          <div style={modeBadge} title={gm.desc}>
            <span style={modeBadgeIcon}><Icon name={MODE_ICON[gm.id]} size={18} color="#5af0d3" /></span>
            <span style={modeBadgeName}>{gm.name}</span>
            <span style={modeBadgeTag}>{gm.tagline}</span>
          </div>

          {ui.code && (
            <div style={codeBadge}>
              <span style={codeLabel}>방 코드</span>
              <span style={codeValue}>{ui.code}</span>
              <span style={codeShare}>친구에게 공유하세요</span>
            </div>
          )}

          <p style={subtitle}>
            {n}/{MAX_PLAYERS} 플레이어 · 최소 {MIN_PLAYERS}명 필요
          </p>

          <ul style={list}>
            {ui.players.map((p) => {
              const isBot = p.id.startsWith('bot-');
              return (
                <li key={p.id} style={{ ...row, ...(p.id === myId ? rowMe : null) }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: p.connected ? 1 : 0.4 }}>
                    <span style={thumb}>
                      <AvatarArt avatar={p.avatar} tint={BOT_TINTS[p.seat % BOT_TINTS.length]} size={30} />
                    </span>
                    {p.name}{p.id === myId ? ' (나)' : ''}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: C.you, fontSize: 13 }}>좌석 {p.seat + 1}</span>
                    {isBot && (
                      <button style={kickBtn} onClick={() => { playSfx('back'); onRemoveBot(p.id); }} title="봇 내보내기"><Icon name="close" size={12} /></button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 4 }}>
            <button onClick={() => { playSfx('select'); onAddBot(); }} disabled={n >= MAX_PLAYERS} style={botBtn}>
              + 봇 추가
            </button>
            <button onClick={toggle} style={{ ...btn, ...(ready ? btnReady : null) }}>
              {ready ? <>준비 완료&nbsp;<Icon name="check" size={16} /></> : '준비하기'}
            </button>
          </div>
        </div>

        <p style={hint}>봇을 추가하면 혼자서도 플레이할 수 있습니다. 모두 준비되면 시작!</p>
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = {
  position: 'relative', minHeight: '100vh', width: '100%', overflow: 'hidden',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  fontFamily: sans, color: C.text,
  // The same oxblood back-room haze as the main menu, so the flow feels of one place.
  background:
    'radial-gradient(58% 42% at 50% 20%, rgba(126,38,62,0.20), transparent 68%),' +
    'radial-gradient(70% 50% at 50% 110%, rgba(216,162,60,0.07), transparent 62%),' +
    'linear-gradient(180deg, #140b0e 0%, #0d070a 52%, #060305 100%),' +
    '#060305',
};
const vignette: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
  background: 'radial-gradient(120% 108% at 50% 42%, transparent 46%, rgba(4,3,5,0.9) 100%)',
};
const content: React.CSSProperties = {
  position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center',
  gap: 14, padding: '0 20px', textAlign: 'center',
};
const kicker: React.CSSProperties = {
  fontFamily: mono, fontSize: 11, letterSpacing: 5, color: C.faint, textTransform: 'uppercase',
};
const title: React.CSSProperties = {
  margin: '2px 0 4px', fontFamily: serif, fontWeight: 700, letterSpacing: 'clamp(2px, 0.8vw, 8px)',
  fontSize: 'clamp(34px, 6vw, 64px)', color: '#f3eee6',
  textShadow: '0 3px 0 #1a0f10, 0 10px 30px rgba(0,0,0,0.7), 0 0 40px rgba(126,38,62,0.4)',
};
// A framed slab holding the room details — the felted table where the deal is set up.
const panel: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
  width: 'min(400px, 92vw)', padding: '22px 22px 24px', borderRadius: 16,
  background: 'linear-gradient(180deg, rgba(26,16,19,0.92), rgba(14,9,11,0.92))',
  border: `1px solid ${C.border}`,
  boxShadow: '0 30px 70px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
  backdropFilter: 'blur(6px)',
};
const subtitle: React.CSSProperties = { margin: 0, color: C.dim, fontSize: 13.5 };
const modeBadge: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderRadius: 999,
  background: 'rgba(166,197,63,0.08)', border: '1px solid rgba(166,197,63,0.32)',
};
const modeBadgeIcon: React.CSSProperties = { fontSize: 18 };
const modeBadgeName: React.CSSProperties = { fontSize: 14, fontWeight: 800, color: '#c3e04d', letterSpacing: 1 };
const modeBadgeTag: React.CSSProperties = { fontSize: 12, color: C.dim };
const codeBadge: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderRadius: 12,
  background: 'rgba(216,162,60,0.1)', border: '1px solid rgba(216,162,60,0.34)',
  boxShadow: '0 0 24px rgba(216,162,60,0.2)',
};
const codeLabel: React.CSSProperties = { fontSize: 13, color: C.dim };
const codeValue: React.CSSProperties = {
  fontFamily: mono, fontSize: 26, fontWeight: 900, letterSpacing: 8,
  color: C.rare, textShadow: '0 0 16px rgba(216,162,60,0.5)',
};
const codeShare: React.CSSProperties = { fontSize: 12, color: C.faint };
const list: React.CSSProperties = {
  listStyle: 'none', padding: 0, margin: 0, width: '100%', display: 'flex',
  flexDirection: 'column', gap: 8,
};
const row: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px',
  background: 'rgba(0,0,0,0.28)', borderRadius: 10, border: `1px solid ${C.border}`,
};
const rowMe: React.CSSProperties = { borderColor: C.magic, boxShadow: '0 0 16px rgba(111,160,140,0.35)' };
const thumb: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', flexShrink: 0,
  background: 'linear-gradient(160deg,#211a12,#100b08)', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden',
};
const btn: React.CSSProperties = {
  padding: '13px 34px', fontSize: 17, fontWeight: 800, color: '#141608', cursor: 'pointer',
  border: 'none', borderRadius: 12, fontFamily: sans,
  background: 'linear-gradient(100deg, #b6d24a, #93ad34 58%, #74902a)',
  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
};
const btnReady: React.CSSProperties = { background: 'linear-gradient(90deg,#74902a,#b6d24a)', color: '#141608', boxShadow: '0 8px 24px rgba(166,197,63,0.35)' };
const botBtn: React.CSSProperties = {
  padding: '13px 22px', fontSize: 15, fontWeight: 700, color: C.text, cursor: 'pointer',
  border: `1px solid ${C.borderHi}`, borderRadius: 12, background: 'rgba(255,255,255,0.05)', fontFamily: sans,
};
const kickBtn: React.CSSProperties = {
  width: 24, height: 24, display: 'grid', placeItems: 'center', flexShrink: 0,
  fontSize: 12, fontWeight: 800, color: '#ff9a9a', cursor: 'pointer', lineHeight: 1,
  border: '1px solid rgba(255,120,120,0.35)', borderRadius: 7, background: 'rgba(255,80,80,0.1)',
};
const hint: React.CSSProperties = { margin: '2px 0 0', color: C.faint, fontSize: 13 };
const backBtn: React.CSSProperties = {
  position: 'fixed', top: 16, left: 16, zIndex: 40,
  padding: '9px 16px', fontSize: 13, fontWeight: 700, color: C.dim, cursor: 'pointer',
  borderRadius: 999, border: `1px solid ${C.border}`, background: 'rgba(20,14,16,0.8)', fontFamily: sans,
};
