# Card Battle — S1 Core Game Loop Design

> Godfield에서 영감을 받은 실시간 온라인 턴제 카드 배틀 게임. 본 문서는 전체 게임의 **첫 번째 수직 슬라이스(S1: 코어 게임 루프)** 설계다. 카드 엔진(S2), 상태이상(S3), VFX/SFX(S4), UI(S5), 차별화 요소(S6), 관전/리플레이(S7)는 이 코어 위에 데이터·핸들러로 확장된다.

## 0. 컨텍스트와 범위 분해

전체 게임은 단일 스펙으로 담기엔 너무 크므로 수직 슬라이스로 분해한다:

| 단계 | 서브프로젝트 | 핵심 내용 |
|---|---|---|
| **S1 (본 문서)** | 서버 권한 게임 루프 | Colyseus 룸, 턴 순환, 뽑기→행동→종료, HP/데미지, 2~8인, 마지막 생존 승리 |
| S2 | 데이터 기반 카드 엔진 | 30종+ 카드, 효과 인터프리터, 손패/장비, 방어 응답 윈도우 |
| S3 | 상태이상 엔진 | 독·화상·빙결·감전·침묵·출혈·저주·혼란·수면, 중첩/지속턴 |
| S4 | 클라 연출 | PixiJS VFX, 투사체·셰이크·플래시·데미지숫자, SFX |
| S5 | 다크/네온 UI | 손패 hover/드래그, HP바, 버프표시, 타이머, 채팅, 로그 |
| S6 | 차별화 | 콤보·원소연계·궁극기·환경·진화 |
| S7 | 관전/리플레이 | 옵저버 + 이벤트 재생 |

각 서브프로젝트는 자체 spec → plan → 구현 사이클을 가진다. **본 문서는 S1만 다룬다.**

## 1. 목표와 성공 기준

**목표:** 2~8명이 한 방에 모여, 서버가 모든 계산을 권한적으로 수행하는, 끝까지 플레이 가능한 최소 카드 배틀 루프.

**성공 기준 (S1 완료 정의):**
- 2개 이상의 브라우저 탭으로 한 방에 입장 → 준비 → 게임 시작이 동작한다.
- 턴이 시계 방향으로 순환하며, 각 턴은 뽑기→행동→종료로 진행된다.
- 플레이어가 공격 카드로 타깃을 지정해 데미지를 입히고, 회복 카드로 자신을 회복할 수 있다.
- HP가 0이 된 플레이어는 탈락하고, 마지막 1인이 남으면 게임이 종료되며 승자가 표시된다.
- 모든 게임 상태 변화는 서버가 결정하며, 클라이언트는 입력만 전송한다.
- 본인 손패만 내용이 보이고, 타인 손패는 장수만 보인다(숨김 정보).
- 턴 타이머 만료 시 자동으로 턴이 종료된다.
- 핵심 게임 로직(리듀서)은 네트워크 없이 단위 테스트로 검증된다.

**비목표 (S1에서 다루지 않음):**
- 방어 응답 윈도우(수동 방어), 상태이상, 장비 효과, 콤보/원소연계/궁극기/환경/진화 → S2 이후.
- 화려한 VFX/SFX, 카메라 연출 → S4. (S1은 기능 검증용 최소 UI/플레이스홀더 연출만.)
- 매치메이킹, 채팅, 관전, 리플레이 → 이후 단계.
- 영속 저장(DB), 계정/인증, 랭킹.

## 2. 기술 스택

- **모노레포:** pnpm workspaces, TypeScript. `packages/shared`는 무빌드(소스 직접 import).
- **서버:** Node + Colyseus 0.16 (서버 권한형), `tsx`로 실행.
- **클라이언트:** React + Vite + PixiJS(VFX 레이어, S1은 스텁). 카드/HUD/로비 UI는 React DOM.
- **테스트:** vitest(단위), `@colyseus/testing`(통합).

> 참고: 원본 요구의 ScriptableObject/Addressables는 Unity 용어이나 플랫폼이 "PC 브라우저"이므로 웹으로 해석한다. 카드 데이터는 JSON형 TS 객체로 표현하여 "데이터 기반 추가"를 충족한다.

## 3. 아키텍처: 데이터 기반 이벤트 소싱 리듀서

게임 로직은 프레임워크 비종속 **순수 리듀서**로 구현한다:

```
reduce(state: GameState, action: Action, ctx: ReduceCtx) => { state: GameState, events: GameEvent[] }
```

- `GameState`는 직렬화 가능한 평범한 객체(클래스/순환참조 없음) → 결정적·테스트 가능·리플레이 가능.
- `ctx`는 서버가 소유한 결정적 RNG(시드 기반)를 포함한다. 클라는 시드를 받지 못한다.
- 리듀서가 반환하는 `events[]`는 클라 연출(S4)·로그(S5)·리플레이(S7)의 **단일 소스**다.

**Colyseus와의 관계:** `BattleRoom`이 정본 `GameState`(평범한 객체)를 보유한다. 검증된 클라 액션마다 리듀서를 돌리고, 그 결과를:
1. Colyseus `@schema`(`BattleState`)에 미러링하여 영속 상태(hp·턴·손패·phase 등)를 효율적으로 델타 동기화한다.
2. 발생한 `events[]`를 Colyseus 메시지로 브로드캐스트하여 전이성 연출/로그를 전달한다.

이 이중 구조(상태=schema, 이벤트=메시지)는 의도적이다. 순수 엔진은 Colyseus에 의존하지 않아 단위 테스트와 리플레이가 쉽고, schema는 네트워크 효율을 담당한다. `syncToSchema(schema, gameState)` 매핑 함수가 둘을 잇는다.

### 3.1 효과 디스패처 (확장성 핵심)

각 `CardDef`는 효과 원자 배열 `effects[]`를 가진다. 리듀서는 `kind`별 핸들러 맵으로 디스패치한다:

```ts
type Effect =
  | { kind: 'damage'; amount: number; target: 'chosen' | 'all' | 'random' }
  | { kind: 'heal';   amount: number };
// S2+: applyStatus, steal, copy, negate, drawExtra, ...

const effectHandlers: Record<Effect['kind'], EffectHandler> = { damage, heal };
```

- **새 카드 = 데이터(`CardDef`)만 추가.** 새 클래스 금지.
- **새 효과 종류 = 핸들러 맵에 함수 1개 추가.** S2~S6 전체가 이 패턴으로 확장된다.

## 4. 데이터 모델 (`packages/shared/src/types.ts`)

```ts
type Phase = 'lobby' | 'playing' | 'ended';

interface GameState {
  phase: Phase;
  players: PlayerState[];        // 좌석 순서(원형) 고정
  turnOrder: string[];           // 생존 플레이어 id의 진행 순서
  currentTurnIndex: number;      // turnOrder 내 인덱스
  turnDeadline: number;          // epoch ms, 서버 기준
  rngSeed: number;               // 서버 비공개. 클라에 직렬화하지 않음
  log: GameEvent[];              // 누적 이벤트(리플레이/디버그)
  winnerId: string | null;
}

interface PlayerState {
  id: string;
  name: string;
  connected: boolean;
  seat: number;                  // 0..n-1 원형 배치 좌표
  hp: number;
  maxHp: number;
  defense: number;               // S1: 데미지에서 차감(>=0). 기본 0
  hand: CardInstance[];
  equipment: CardInstance[];     // S1 미사용(빈 배열). 스키마 안정용
  statuses: StatusInstance[];    // S1 미사용(빈 배열). 스키마 안정용
  buffs: BuffInstance[];         // S1 미사용(빈 배열). 스키마 안정용
  alive: boolean;
}

interface CardInstance { id: string; defId: string; }

interface CardDef {
  id: string;                    // defId
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  cost: number;                  // S1 미사용(자원 시스템 없음). 데이터 안정용
  element: 'physical' | 'fire' | 'ice' | 'lightning' | 'poison' | 'holy' | 'none';
  kind: 'weapon' | 'magic' | 'heal' | 'special' | 'equipment';
  effects: Effect[];
  cooldown: number;              // S1 미사용
  vfxKey: string;                // S4에서 사용
  sfxKey: string;                // S4에서 사용
  icon: string;
  desc: string;
  drawWeight: number;            // 가중 드로우 풀에서의 가중치
}

type Action =
  | { type: 'play_card'; cardInstanceId: string; targetId?: string }
  | { type: 'end_turn' };
// S2: { type: 'defend'; ... } 예약

type GameEvent =
  | { type: 'turn_started'; playerId: string; deadline: number }
  | { type: 'turn_ended'; playerId: string }
  | { type: 'card_drawn'; playerId: string; cardInstanceId: string; defId: string }
  | { type: 'card_played'; playerId: string; defId: string; targetId?: string }
  | { type: 'damage_dealt'; sourceId: string; targetId: string; amount: number; element: CardDef['element']; targetHpAfter: number }
  | { type: 'healed'; targetId: string; amount: number; targetHpAfter: number }
  | { type: 'player_eliminated'; playerId: string }
  | { type: 'game_over'; winnerId: string };
```

빈 배열로 두는 `equipment/statuses/buffs`와 미사용 `CardDef` 필드(cost·cooldown·vfxKey 등)는 **데이터 스키마를 S2 이후에도 바꾸지 않기 위해 지금 포함**한다.

## 5. 턴 루프 (`packages/shared/src/engine/loop.ts`)

게임 시작 시: 좌석 순서로 `turnOrder` 구성, `currentTurnIndex=0`, 각 플레이어 손패 0장으로 시작(또는 시작 손패 N장 — §10 결정사항).

각 턴 진행:
1. **draw 페이즈:** 현재 플레이어가 가중 풀에서 시드 RNG로 카드 1장을 뽑아 손패에 추가 → `card_drawn` 이벤트. 손패 상한(기본 8) 초과 시에도 뽑되 상한은 너그럽게 둔다(Godfield는 다수 보유 허용).
2. **action 페이즈:** 플레이어가 `play_card` 0..n회 후 `end_turn`. 각 `play_card`는 검증→리듀서 적용→이벤트 방출. (S1엔 자원/쿨타임 제약 없음.)
3. **end 페이즈:** `turn_ended` 방출, 다음 생존 플레이어로 `currentTurnIndex` 이동, 새 `turnDeadline` 설정, `turn_started` 방출.

**타이머:** 서버가 `turnDeadline = now + TURN_SECONDS(기본 30)`. 서버 타이머가 만료 시 자동으로 `end_turn` 액션을 주입한다. 클라는 deadline까지 남은 시간을 렌더.

**승리 판정:** 매 탈락(`player_eliminated`)마다 생존자 수를 검사. 1명 남으면 `phase='ended'`, `winnerId` 설정, `game_over` 방출.

## 6. 네트워크 프로토콜 (서버 권한)

**클라 → 서버 (Colyseus 메시지):**
- `setReady { ready: boolean }` — 로비에서 준비 토글.
- `action { type, cardInstanceId?, targetId? }` — 게임 중 행동.

**서버 → 클라:**
- **`@schema BattleState`** (자동 델타 동기화): phase, players(hp·maxHp·defense·alive·seat·name·connected·손패장수), turnOrder, currentTurnIndex, turnDeadline, winnerId.
- **숨김 정보:** 본인 손패는 `CardInstance` 전체, 타인 손패는 **장수만**. Colyseus `@filter`로 클라별 필터링하여 서버가 타인 카드 내용을 절대 보내지 않는다.
- **`events` 메시지**: 각 액션 해소 후 `GameEvent[]` 브로드캐스트(연출/로그용).
- **`error` 메시지**: `{ code, message }` — 무효 액션 거부 사유.

## 7. 서버 권한과 검증 (`apps/server/src/rooms/BattleRoom.ts`)

모든 클라 액션을 적용 전 검증한다:
- 게임이 `playing` 상태인가.
- 액션 송신자가 현재 턴 플레이어인가.
- `play_card`: 해당 `cardInstanceId`가 그 플레이어 손패에 실제 존재하는가.
- 타깃이 필요한 효과면 `targetId`가 생존 플레이어인가(자기 자신 허용 여부는 효과별).

검증 실패 시 상태 변경 없이 `error` 메시지 반환. RNG 시드는 서버만 보유 → 클라가 드로우를 예측·조작 불가. 리듀서는 (state, action, seed)에 대해 결정적.

## 8. 연결/재연결/끊김

- Colyseus `allowReconnection(client, 30)` (30초 유예).
- 게임 중 끊김: 해당 플레이어 `connected=false`. 자기 턴이 되면 자동 `end_turn`(자동 패스).
- 유예 내 재연결: `connected=true`, schema 재동기화로 상태 복원.
- 남은 연결 플레이어가 1명뿐이면 그 플레이어 승리로 게임 종료.

## 9. 테스트 전략

- **단위 (vitest, `packages/shared`):** 순수 리듀서·loop·rng를 네트워크 없이 검증.
  - 공격 카드가 타깃 hp를 정확히 감소(defense 차감 포함)시킨다.
  - hp 0 → `alive=false`, `player_eliminated` 방출.
  - 생존 1명 → `game_over`, `winnerId` 정확.
  - 무효 액션(남의 턴, 없는 카드, 죽은 타깃)은 상태 불변 + 거부.
  - 고정 시드 드로우의 결정성(같은 시드 → 같은 카드 시퀀스).
  - 가중 풀 분포가 `drawWeight`에 비례(통계적 단언).
- **통합 (`@colyseus/testing`):** 2개 가상 클라이언트로 입장→준비→시작→공격→탈락→종료 흐름. 숨김 정보(타인 손패 내용 미수신) 검증.
- **수동:** 브라우저 2탭으로 풀 매치 1회.

## 10. S1 카드 데이터 (`packages/shared/src/cards/defs.ts`)

루프 검증용 최소 세트(약 6종, S2에서 30종+로 확장):

| id | name | kind | element | effect | drawWeight |
|---|---|---|---|---|---|
| sword | 검 | weapon | physical | damage 10, chosen | 20 |
| bow | 활 | weapon | physical | damage 7, chosen | 20 |
| spear | 창 | weapon | physical | damage 13, chosen | 10 |
| bomb | 폭탄 | magic | fire | damage 12, all(타인 전체) | 8 |
| potion | 회복약 | heal | holy | heal 12 (자신) | 18 |
| greatheal | 대회복 | heal | holy | heal 20 (자신) | 6 |

시작 HP `maxHp=40`, `defense=0`. 시작 손패: 각 플레이어 3장(시드 드로우). 턴당 1장 추가 드로우.

## 11. S2 대비 인터페이스 선반영

- **효과 디스패처 맵**: S2/S3가 `applyStatus`·`steal`·`copy`·`negate` 핸들러 추가.
- **`GameEvent` 유니언**: S4 VFX가 event.type → 연출 매핑.
- **`CardDef` 풀필드**(vfxKey·sfxKey·rarity·cost·cooldown·element): 데이터 형태 안정.
- **`resolveAttack` 훅 슬롯**: 공격 해소부를 분리 함수로 두어, S2가 그 앞에 "방어 응답 서브 페이즈"를 삽입할 수 있게 한다. S1은 즉시 해소(방어 윈도우 없음).
- **`Action` 유니언**에 `defend` 타입 예약(S1 미구현).

## 12. 디렉토리 구조

```
cardbattle/                       # 프로젝트 루트(claudeeee 내)
├─ pnpm-workspace.yaml
├─ package.json                   # 워크스페이스 루트, dev 스크립트
├─ tsconfig.base.json
├─ packages/shared/
│  ├─ package.json                # @cardbattle/shared, 무빌드
│  └─ src/
│     ├─ index.ts
│     ├─ types.ts
│     ├─ cards/{defs.ts, effects.ts}
│     └─ engine/{rng.ts, reducer.ts, loop.ts}
│     └─ __tests__/*.test.ts
├─ apps/server/
│  ├─ package.json
│  └─ src/
│     ├─ index.ts                 # Colyseus 부트스트랩
│     ├─ rooms/BattleRoom.ts
│     └─ schema/BattleState.ts
└─ apps/client/
   ├─ package.json
   ├─ vite.config.ts · index.html
   └─ src/
      ├─ main.tsx
      ├─ net/client.ts            # colyseus.js 연결
      ├─ state/useRoom.ts         # room ↔ React 브리지
      ├─ ui/                      # Lobby, Hud, Hand, PlayerRing, Log (DOM)
      └─ vfx/                     # Pixi 스텁(S4)
```

## 13. 결정된 상수 (조정 가능)

- 최소 시작 인원: 2, 최대 8.
- `maxHp`: 40, 시작 `defense`: 0.
- 시작 손패: 3장, 턴당 드로우: 1장, 손패 상한: 8(초과 허용).
- 턴 제한 시간: 30초.
- 재연결 유예: 30초.
