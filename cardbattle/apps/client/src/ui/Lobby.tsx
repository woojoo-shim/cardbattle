import { useEffect, useState } from 'react';
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
  /** Wall-clock ms the public-lobby bot auto-fill lands; 0 hides the countdown. */
  autofillDeadline?: number;
  /** Entered via "대전 찾기": show a matchmaking search (auto-ready, no invite code), not a friend room. */
  matchmaking?: boolean;
}

/** Live seconds remaining until an auto-fill deadline (0 once elapsed / when disabled). */
function useCountdown(deadline?: number): number {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!deadline) { setLeft(0); return; }
    const tick = () => setLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [deadline]);
  return left;
}

// The display serif shared with the main menu — the engraved "back-room sign" look.
const serif = "'Times New Roman', Georgia, 'Nanum Myeongjo', serif";

export function Lobby({ ui, myId, onReady, onAddBot, onRemoveBot, onExit, autofillDeadline, matchmaking }: Props) {
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const toggle = () => { const next = !ready; setReady(next); playSfx(next ? 'select' : 'back'); onReady(next); };
  // Matchmaking flow: the moment we're seated we auto-ready so the server starts the opponent
  // search (and the 15s bot-fill countdown) with no "준비하기" click — it just runs a match.
  useEffect(() => {
    if (!matchmaking) return;
    setReady(true);
    onReady(true);
  }, [matchmaking, onReady]);
  // Copy a full invite URL (origin + ?join=CODE) so a friend just clicks it to land in this room.
  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/?join=${ui.code}`);
      playSfx('coin'); setCopied(true); window.setTimeout(() => setCopied(false), 1800);
    } catch { playSfx('back'); }
  };
  const n = ui.players.length;
  const gm = GAME_MODES[(ui.mode as GameModeId)] ?? GAME_MODES.standard;
  const fillLeft = useCountdown(autofillDeadline);

  return (
    <div style={wrap}>
      <style>{lobbyCss}</style>
      <Atmosphere />
      {onExit && (
        <button style={backBtn} onClick={() => { playSfx('back'); onExit(); }} title="방을 나가고 목록으로">
          ←&nbsp;나가기
        </button>
      )}

      <div style={content} className="cb-gate-in">
        <span style={kicker}>{matchmaking ? '매칭 · FINDING MATCH' : '대기실 · WAITING ROOM'}</span>
        <h1 style={title}>{matchmaking ? '상대를 찾는 중' : (ui.title || '심연의 투기장')}</h1>
        <div style={flourish} aria-hidden>
          <span style={flourishRule} />
          <span style={flourishGem}>◆</span>
          <span style={flourishRule} />
        </div>

        <div style={panel}>
          <div style={modeBadge} title={gm.desc}>
            <span style={modeBadgeIcon}><Icon name={MODE_ICON[gm.id]} size={18} color="#e6ad3e" /></span>
            <span style={modeBadgeName}>{gm.name}</span>
            <span style={modeBadgeTag}>{gm.tagline}</span>
          </div>

          {!matchmaking && ui.code && (
            <div style={inviteBox}>
              <div style={codeBadge}>
                <span style={codeLabel}>방 코드</span>
                <span style={codeValue}>{ui.code}</span>
              </div>
              <button style={inviteBtn} className="cb-seat-add" onClick={copyInvite}>
                <Icon name={copied ? 'check' : 'chain'} size={15} />
                &nbsp;{copied ? '초대 링크가 복사됐어요' : '초대 링크 복사'}
              </button>
            </div>
          )}

          <p style={subtitle}>
            {matchmaking
              ? '공개 매칭 · 상대를 자동으로 찾고 있어요'
              : `${n}/${MAX_PLAYERS} 플레이어 · 최소 ${MIN_PLAYERS}명 필요`}
          </p>

          {/* The roster is the arena seating chart: every one of the MAX_PLAYERS chairs is shown, so an
              empty chair is a visible, clickable invitation to seat a bot — the bot-add lives IN the grid. */}
          <div style={seatGrid}>
            {Array.from({ length: MAX_PLAYERS }, (_, i) => ui.players.find((p) => p.seat === i) ?? null).map((p, i) => {
              if (!p) {
                // Matchmaking: an open chair is the opponent we're searching for — a passive,
                // pulsing "상대 찾는 중" placeholder, never a manual "봇 추가" button.
                if (matchmaking) {
                  return (
                    <div key={`seat-${i}`} style={searchSeat} className="cb-fill-pulse">
                      <span style={searchThumb} aria-hidden />
                      <span style={emptyText}>
                        <span style={searchLabel}>상대 찾는 중…</span>
                        <span style={seatTag}>좌석 {i + 1}</span>
                      </span>
                    </div>
                  );
                }
                return (
                  <button
                    key={`seat-${i}`}
                    className="cb-seat-add"
                    style={emptySeat}
                    onClick={() => { playSfx('select'); onAddBot(); }}
                    title="이 자리를 봇으로 채우기"
                  >
                    <span style={emptyPlus}>+</span>
                    <span style={emptyText}>
                      <span style={emptyLabel}>봇 추가</span>
                      <span style={seatTag}>좌석 {i + 1}</span>
                    </span>
                  </button>
                );
              }
              const isBot = p.id.startsWith('bot-');
              const isMe = p.id === myId;
              return (
                <div key={p.id} style={{ ...seatCell, ...(isMe ? seatMe : null), opacity: p.connected ? 1 : 0.45 }}>
                  <span style={seatThumb}>
                    <AvatarArt avatar={p.avatar} tint={BOT_TINTS[p.seat % BOT_TINTS.length]} size={38} />
                  </span>
                  <span style={seatText}>
                    <span style={seatName}>{p.name}{isMe ? ' (나)' : ''}</span>
                    <span style={seatTag}>{isBot ? 'BOT · ' : ''}좌석 {p.seat + 1}</span>
                  </span>
                  {isBot && (
                    <button style={kickBtn} onClick={() => { playSfx('back'); onRemoveBot(p.id); }} title="봇 내보내기"><Icon name="close" size={11} /></button>
                  )}
                </div>
              );
            })}
          </div>

          {fillLeft > 0 && (
            <div style={fillBanner} className="cb-fill-pulse">
              <span style={fillDot} />
              상대를 찾는 중… <b style={fillCount}>{fillLeft}초</b> 후 봇과 함께 시작합니다
            </div>
          )}

          {matchmaking ? (
            <div style={searchingRow}>
              <span style={searchSpinner} aria-hidden />
              상대를 찾고 있어요…
            </div>
          ) : (
            <button onClick={toggle} style={{ ...btn, ...(ready ? btnReady : null) }}>
              {ready ? <>준비 완료&nbsp;<Icon name="check" size={16} /></> : '준비하기'}
            </button>
          )}
        </div>

        <p style={hint}>
          {matchmaking
            ? '공개 매칭으로 상대를 찾고 있어요. 상대가 없으면 잠시 후 봇과 대전이 시작됩니다.'
            : '빈 자리를 눌러 봇을 채우면 혼자서도 플레이할 수 있습니다. 모두 준비되면 시작!'}
        </p>
      </div>
    </div>
  );
}

// A candlelit waiting-hall glow — same warm-core/cool-edge pit as the room browser. SHOW layer only.
function Atmosphere() {
  return (
    <div aria-hidden style={atmos}>
      <div style={atmosGlow} />
      <div style={atmosVignette} />
      <div style={emberField} className="cb-lb-embers">
        {EMBERS.map((e, i) => (
          <span
            key={i}
            style={{
              position: 'absolute', left: `${e.x}%`, bottom: '-4%',
              width: e.s, height: e.s, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(214,200,255,0.9), rgba(168,107,255,0) 70%)',
              animation: `cb-lb-ember ${e.d}s linear ${e.delay}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
const EMBERS = [
  { x: 14, s: 3, d: 14, delay: 0 }, { x: 28, s: 2, d: 18, delay: 4 },
  { x: 42, s: 4, d: 12, delay: 7 }, { x: 58, s: 2, d: 16, delay: 2 },
  { x: 72, s: 3, d: 20, delay: 5 }, { x: 86, s: 2, d: 13, delay: 9 },
];
const lobbyCss = `
@keyframes cb-lb-ember {
  0%   { transform: translateY(0) scale(1); opacity: 0; }
  12%  { opacity: 0.9; }
  85%  { opacity: 0.5; }
  100% { transform: translateY(-102vh) scale(0.5); opacity: 0; }
}
`;

const wrap: React.CSSProperties = {
  position: 'relative', minHeight: '100vh', width: '100%', overflow: 'hidden', boxSizing: 'border-box',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  fontFamily: sans, color: C.text,
  background: 'linear-gradient(180deg, #101422 0%, #0a0d16 60%, #06080f 100%)',
};
const atmos: React.CSSProperties = { position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' };
const atmosGlow: React.CSSProperties = {
  position: 'absolute', inset: 0,
  background:
    'radial-gradient(120% 70% at 50% -8%, rgba(168,107,255,0.16), transparent 55%),' +
    'radial-gradient(90% 60% at 50% 0%, rgba(55,224,160,0.10), transparent 60%),' +
    'radial-gradient(80% 50% at 50% 4%, rgba(74,48,86,0.12), transparent 62%),' +
    'radial-gradient(100% 80% at 50% 110%, rgba(90,60,190,0.12), transparent 60%)',
};
const atmosVignette: React.CSSProperties = {
  position: 'absolute', inset: 0,
  background: 'radial-gradient(115% 100% at 50% 42%, transparent 52%, rgba(0,0,0,0.62) 100%)',
};
const emberField: React.CSSProperties = { position: 'absolute', inset: 0, mixBlendMode: 'screen' };
const flourish: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, width: 'clamp(180px, 26vw, 300px)', margin: '0 0 2px' };
const flourishRule: React.CSSProperties = {
  flex: 1, height: 1,
  background: 'linear-gradient(90deg, transparent, rgba(224,165,60,0.5) 30%, rgba(224,165,60,0.5) 70%, transparent)',
};
const flourishGem: React.CSSProperties = { fontSize: 11, color: '#e0a53c', textShadow: '0 0 10px rgba(224,165,60,0.6)' };
const content: React.CSSProperties = {
  position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center',
  gap: 14, padding: '0 20px', textAlign: 'center',
};
const kicker: React.CSSProperties = {
  fontFamily: mono, fontSize: 11, letterSpacing: 5, color: C.faint, textTransform: 'uppercase',
};
const title: React.CSSProperties = {
  margin: '2px 0 4px', fontFamily: serif, fontWeight: 700, letterSpacing: 'clamp(2px, 0.8vw, 8px)',
  fontSize: 'clamp(34px, 6vw, 64px)', color: '#eef2fb',
  textShadow: '0 2px 0 #0d1019, 0 8px 24px rgba(0,0,0,0.6)',
};
// A framed slate slab holding the room details — cool cardstock with an amethyst top accent.
const panel: React.CSSProperties = {
  position: 'relative', zIndex: 2,
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
  width: 'min(400px, 92vw)', padding: '22px 22px 24px', borderRadius: 4,
  background: 'linear-gradient(180deg, rgba(30,38,58,0.82), rgba(16,20,32,0.78))',
  border: `1px solid ${C.border}`, borderTop: '2px solid #a86bff',
  boxShadow: '0 24px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(150,180,230,0.05)',
};
const subtitle: React.CSSProperties = { margin: 0, color: C.dim, fontSize: 13.5 };
const modeBadge: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderRadius: 4,
  background: 'rgba(216,162,60,0.08)', border: '1px solid rgba(216,162,60,0.3)',
};
const modeBadgeIcon: React.CSSProperties = { fontSize: 18 };
const modeBadgeName: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: '#e0b24d', letterSpacing: 1 };
const modeBadgeTag: React.CSSProperties = { fontSize: 12, color: C.dim };
const inviteBox: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 8, width: '100%',
};
const codeBadge: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '10px 20px', borderRadius: 4,
  background: 'rgba(216,162,60,0.1)', border: '1px solid rgba(216,162,60,0.34)',
};
const codeLabel: React.CSSProperties = { fontSize: 13, color: C.dim };
const codeValue: React.CSSProperties = {
  fontFamily: mono, fontSize: 26, fontWeight: 800, letterSpacing: 8, color: C.rare,
};
// Share-by-link button — dashed brass, warms on hover (reuses .cb-seat-add), copies the invite URL.
const inviteBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, width: '100%',
  padding: '11px 18px', fontSize: 14, fontWeight: 700, letterSpacing: 0.4, cursor: 'pointer',
  fontFamily: sans, color: C.rare, borderRadius: 4,
  border: '1px dashed rgba(216,162,60,0.45)', background: 'rgba(216,162,60,0.06)',
};
// The seating chart: a 2-column grid of every chair, filled portraits and open (dashed) invitations.
const seatGrid: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%',
};
const seatCell: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', minWidth: 0,
  borderRadius: 4, textAlign: 'left',
  background: 'rgba(28,34,51,0.66)',
  border: `1px solid ${C.border}`,
};
const seatMe: React.CSSProperties = { borderColor: C.magic };
const seatThumb: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 4, display: 'grid', placeItems: 'center', flexShrink: 0, overflow: 'hidden',
  background: '#141b2b', border: '1px solid rgba(255,255,255,0.1)',
};
const seatText: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 };
const seatName: React.CSSProperties = {
  fontSize: 14, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};
const seatTag: React.CSSProperties = { fontFamily: mono, fontSize: 11, letterSpacing: 0.5, color: C.faint };
// An open chair — dashed brass frame, ghost "+" thumb, tap to seat a bot.
const emptySeat: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', minWidth: 0,
  borderRadius: 4, textAlign: 'left', cursor: 'pointer', fontFamily: sans,
  border: '1px dashed rgba(216,162,60,0.38)', background: 'rgba(216,162,60,0.03)',
};
const emptyPlus: React.CSSProperties = {
  width: 40, height: 40, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 4,
  fontSize: 24, fontWeight: 300, lineHeight: 1, color: C.rare,
  border: '1px dashed rgba(216,162,60,0.4)', background: 'rgba(216,162,60,0.05)',
};
const emptyText: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 };
const emptyLabel: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: C.rare, letterSpacing: 0.3 };
// A matchmaking opponent slot — passive, pulsing, no click. The chair we're searching to fill.
const searchSeat: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', minWidth: 0,
  borderRadius: 4, textAlign: 'left',
  border: '1px dashed rgba(168,107,255,0.4)', background: 'rgba(168,107,255,0.05)',
};
const searchThumb: React.CSSProperties = {
  width: 40, height: 40, flexShrink: 0, borderRadius: 4,
  border: '1px dashed rgba(168,107,255,0.4)', background: 'rgba(168,107,255,0.06)',
};
const searchLabel: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#c9b0ff', letterSpacing: 0.3 };
// The auto-ready "searching" row that replaces the 준비하기 button in matchmaking.
const searchingRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', marginTop: 2,
  padding: '14px 24px', fontSize: 15, fontWeight: 700, letterSpacing: 0.4, color: '#e6ddff',
  borderRadius: 4, border: '1px solid rgba(168,107,255,0.35)', background: 'rgba(168,107,255,0.08)',
};
const searchSpinner: React.CSSProperties = {
  width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
  border: '2px solid rgba(168,107,255,0.3)', borderTopColor: '#c9b0ff',
  animation: 'cb-spin 0.8s linear infinite',
};
const btn: React.CSSProperties = {
  width: '100%', marginTop: 2, padding: '14px 34px', fontSize: 17, fontWeight: 700, color: '#2a1a06', cursor: 'pointer',
  border: '1px solid #b98a2c', borderRadius: 4, fontFamily: sans,
  background: '#cf9a2f',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const btnReady: React.CSSProperties = { background: '#e6b845', borderColor: '#cf9a2f', color: '#2a1a06' };
const kickBtn: React.CSSProperties = {
  marginLeft: 'auto', width: 22, height: 22, display: 'grid', placeItems: 'center', flexShrink: 0,
  fontSize: 12, fontWeight: 800, color: '#ff9a9a', cursor: 'pointer', lineHeight: 1,
  border: '1px solid rgba(255,120,120,0.35)', borderRadius: 4, background: 'rgba(255,80,80,0.12)',
};
const fillBanner: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 9, padding: '9px 16px', borderRadius: 4,
  fontSize: 13, color: '#eef2fb', width: '100%', justifyContent: 'center',
  background: 'rgba(216,162,60,0.1)', border: '1px solid rgba(216,162,60,0.34)',
};
const fillDot: React.CSSProperties = {
  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
  background: '#e6ad3e',
};
const fillCount: React.CSSProperties = { color: C.rare, fontFamily: mono, fontWeight: 800, fontSize: 15 };
const hint: React.CSSProperties = { margin: '2px 0 0', color: C.faint, fontSize: 13 };
const backBtn: React.CSSProperties = {
  position: 'fixed', top: 16, left: 16, zIndex: 40,
  padding: '9px 16px', fontSize: 13, fontWeight: 700, color: C.dim, cursor: 'pointer',
  borderRadius: 4, border: `1px solid ${C.border}`, background: 'rgba(16,20,32,0.8)', fontFamily: sans,
};
