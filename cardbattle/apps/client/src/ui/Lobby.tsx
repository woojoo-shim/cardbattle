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

export function Lobby({ ui, myId, onReady, onAddBot, onRemoveBot, onExit, autofillDeadline }: Props) {
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const toggle = () => { const next = !ready; setReady(next); playSfx(next ? 'select' : 'back'); onReady(next); };
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
      {onExit && (
        <button style={backBtn} onClick={() => { playSfx('back'); onExit(); }} title="방을 나가고 목록으로">
          ←&nbsp;나가기
        </button>
      )}

      <div style={content} className="cb-gate-in">
        <span style={kicker}>대기실 · WAITING ROOM</span>
        <h1 style={title}>{ui.title || '심연의 투기장'}</h1>

        <div style={panel}>
          <div style={modeBadge} title={gm.desc}>
            <span style={modeBadgeIcon}><Icon name={MODE_ICON[gm.id]} size={18} color="#e6ad3e" /></span>
            <span style={modeBadgeName}>{gm.name}</span>
            <span style={modeBadgeTag}>{gm.tagline}</span>
          </div>

          {ui.code && (
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
            {n}/{MAX_PLAYERS} 플레이어 · 최소 {MIN_PLAYERS}명 필요
          </p>

          {/* The roster is the arena seating chart: every one of the MAX_PLAYERS chairs is shown, so an
              empty chair is a visible, clickable invitation to seat a bot — the bot-add lives IN the grid. */}
          <div style={seatGrid}>
            {Array.from({ length: MAX_PLAYERS }, (_, i) => ui.players.find((p) => p.seat === i) ?? null).map((p, i) => {
              if (!p) {
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

          <button onClick={toggle} style={{ ...btn, ...(ready ? btnReady : null) }}>
            {ready ? <>준비 완료&nbsp;<Icon name="check" size={16} /></> : '준비하기'}
          </button>
        </div>

        <p style={hint}>빈 자리를 눌러 봇을 채우면 혼자서도 플레이할 수 있습니다. 모두 준비되면 시작!</p>
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = {
  position: 'relative', minHeight: '100vh', width: '100%', overflow: 'hidden', boxSizing: 'border-box',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  fontFamily: sans, color: C.text,
  background: 'linear-gradient(180deg, #140b0e 0%, #0b070a 60%, #060305 100%)',
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
  textShadow: '0 2px 0 #1a0f10, 0 8px 24px rgba(0,0,0,0.6)',
};
// A framed slab holding the room details.
const panel: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
  width: 'min(400px, 92vw)', padding: '22px 22px 24px', borderRadius: 4,
  background: 'rgba(12,7,5,0.6)',
  border: `1px solid ${C.border}`,
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
  background: 'rgba(26,17,10,0.66)',
  border: `1px solid ${C.border}`,
};
const seatMe: React.CSSProperties = { borderColor: C.magic };
const seatThumb: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 4, display: 'grid', placeItems: 'center', flexShrink: 0, overflow: 'hidden',
  background: '#1a140d', border: '1px solid rgba(255,255,255,0.1)',
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
  fontSize: 13, color: '#f4ead1', width: '100%', justifyContent: 'center',
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
  borderRadius: 4, border: `1px solid ${C.border}`, background: 'rgba(20,14,16,0.8)', fontFamily: sans,
};
