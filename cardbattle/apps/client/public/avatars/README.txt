플레이어 아바타 AI 사진 드롭인 폴더

여기에 `<id>.png` 파일을 넣으면 해당 캐릭터의 코드 SVG 초상화 대신
그 사진이 프레임에 맞춰 렌더링됩니다. 파일이 없으면 자동으로 기존 SVG로 폴백됩니다.
(코드 수정 불필요 — 파일만 넣으면 됨. CardArt의 public/cards/<id>.png 방식과 동일)

지원되는 id (8종):
  hero.png     기사
  mage.png     마법사
  goblin.png   고블린
  dragon.png   드래곤
  ogre.png     오우거
  vampire.png  뱀파이어
  bat.png      박쥐
  ghost.png    유령

권장: 512x512 정사각형, 정면 상반신 초상화. 사진은 xMidYMid slice(cover)로
둥근 창에 꽉 차게 잘려 들어가고, 가장자리 비네트로 어두운 테이블에 녹아듭니다.
