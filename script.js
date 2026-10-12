'use strict';

/* =========================================================
 * 설정
 * ========================================================= */

const CONFIG = {
  dogListUrl: 'https://weactkorea.org/base/adopt/dogs.php',
  profileUrl: (id) =>
    `https://weactkorea.org/base/adopt/adoptable.php?com_board_basic=read_form&com_board_idx=${id}&com_board_id=11`,
  photoBase: 'https://weactkorea.org/base/img/adopt/',
  typeImage: (gender, code) => `./images/types/${gender}/${code}.webp`,
  fallbackGender: 'male',
  utm: 'utm_source=adoption_party&utm_medium=dog_match',
  // 구글 앱스 스크립트 웹앱 주소를 넣으면 응답·클릭 기록이 전송됨
  logEndpoint: '',
  booth: {
    title: '결과 화면을 들고 매칭 부스로 오세요!',
    desc: '보호자 유형 스티커를 드리고, 운명 강아지의 이야기를 더 자세히 들려드려요.',
  },
  loadingMs: 1800,
  autoAdvanceMs: 280,
  storageKey: 'weact-match-v2',
};

/* =========================================================
 * 유형 · 문항
 * ========================================================= */

const AXIS_ORDER = ['activity', 'attach', 'care'];

const AXES = {
  activity: { label: '활동성', high: { letter: 'A', name: '산책러' }, low: { letter: 'S', name: '집콕러' } },
  attach: { label: '교감 방식', high: { letter: 'T', name: '껌딱지형' }, low: { letter: 'I', name: '독립형' } },
  care: { label: '돌봄 스타일', high: { letter: 'G', name: '코치형' }, low: { letter: 'W', name: '기다림형' } },
};

const WEIGHTS = { activity: 0.4, attach: 0.35, care: 0.25 };
const LEAN_BONUS = 4;

const LIKERT_OPTIONS = [
  { value: 1, label: '전혀 아니다' },
  { value: 2, label: '아니다' },
  { value: 3, label: '보통이다' },
  { value: 4, label: '그렇다' },
  { value: 5, label: '매우 그렇다' },
];

const QUESTIONS = [
  {
    id: 'gender',
    type: 'single',
    intro: true,
    label: '시작하기 전에',
    text: '성별을 선택해 주세요.',
    hint: '결과 화면의 캐릭터 이미지에만 사용돼요.',
    options: [
      { value: 'male', label: '남성' },
      { value: 'female', label: '여성' },
    ],
  },
  { id: 'q1', type: 'likert', axis: 'activity', text: '주말엔 집보다 밖에서 시간을 보내는 게 좋다.' },
  { id: 'q2', type: 'likert', axis: 'attach', text: '반려동물이 하루 종일 졸졸 따라다니면 행복할 것 같다.' },
  { id: 'q3', type: 'likert', axis: 'care', text: '무언가를 가르치고 함께 연습하는 과정이 즐겁다.' },
  { id: 'q4', type: 'likert', axis: 'activity', reverse: true, text: '나에게 최고의 휴식은 집에서 뒹굴거리는 것이다.' },
  { id: 'q5', type: 'likert', axis: 'attach', text: '평소 집에 누군가 있는 시간이 긴 편이다.' },
  { id: 'q6', type: 'likert', axis: 'care', text: '강아지가 낯선 것을 무서워하면, 조금씩 경험시키며 익숙해지게 돕고 싶다.' },
  { id: 'q7', type: 'likert', axis: 'activity', text: '새로운 공원이나 산책로를 찾아가 보는 걸 좋아한다.' },
  { id: 'q8', type: 'likert', axis: 'attach', reverse: true, text: '서로 각자의 시간과 공간이 있는 관계가 편하다.' },
  { id: 'q9', type: 'likert', axis: 'care', reverse: true, text: '마음을 열 때까지 억지로 다가가지 않고, 몇 달이라도 기다릴 수 있다.' },
  { id: 'q10', type: 'likert', axis: 'activity', text: '비 오는 날에도 30분 정도는 기꺼이 걸을 수 있다.' },
  { id: 'q11', type: 'likert', axis: 'attach', text: '쓰다듬고 안아 주는 스킨십으로 애정을 표현하는 게 자연스럽다.' },
  { id: 'q12', type: 'likert', axis: 'care', text: '문제가 생기면 방법을 찾아 공부하고 바로 시도해 보는 편이다.' },
  { id: 'q13', type: 'likert', axis: 'activity', reverse: true, text: '일과를 마치면 밖에 나가기보다 집에서 바로 쉬고 싶다.' },
  { id: 'q14', type: 'likert', axis: 'attach', reverse: true, text: '반려동물이 혼자서도 씩씩하게 잘 지내 주면 좋겠다.' },
  { id: 'q15', type: 'likert', axis: 'care', reverse: true, text: '상대가 스스로 준비될 때까지 지켜보는 편이 마음 편하다.' },
  {
    id: 'experience',
    type: 'single',
    label: '반려 생활',
    text: '반려동물을 키워 본 경험이 있나요?',
    options: [
      { value: 'none', label: '처음이에요' },
      { value: 'past', label: '예전에 키워 봤어요' },
      { value: 'current', label: '지금 함께 살고 있어요' },
    ],
  },
  {
    id: 'pets',
    type: 'multi',
    label: '반려 생활',
    text: '지금 어떤 동물과 함께 살고 있나요?',
    hint: '해당하는 것을 모두 골라 주세요.',
    when: (answers) => answers.experience === 'current',
    options: [
      { value: 'dog', label: '강아지' },
      { value: 'cat', label: '고양이' },
      { value: 'small', label: '소동물 (토끼·햄스터 등)' },
      { value: 'other', label: '기타' },
    ],
  },
];

const TYPES = {
  ATG: {
    name: '열정 트레이너',
    tagline: '같이 뛰고 같이 배우는 파트너',
    desc: '몸을 움직이며 함께 시간을 보내는 걸 좋아하고, 새로운 걸 가르치고 배우는 과정도 즐기는 당신. 강아지에게 세상을 넓혀 주는 든든한 파트너가 될 수 있어요.',
    fit: '에너지가 넘치고 배울 게 많은 청년견, 함께 뛰어놀 친구가 필요한 아이',
  },
  ATW: {
    name: '다정한 산책 메이트',
    tagline: '매일 함께 걷되 재촉하지 않는',
    desc: '매일 함께 걷는 시간을 소중히 여기면서도, 상대의 속도를 재촉하지 않는 당신. 산책길이 곧 교감의 시간이 되는 보호자예요.',
    fit: '활발하지만 사람 곁을 좋아하고, 천천히 마음을 여는 아이',
  },
  AIG: {
    name: '자유로운 탐험대장',
    tagline: '새로운 곳을 함께 개척하는',
    desc: '새로운 곳을 찾아 나서는 걸 좋아하고, 서로의 독립성을 존중하는 당신. 규칙은 분명하게, 모험은 신나게 함께하는 보호자예요.',
    fit: '호기심 많고 독립적인 활동견, 에너지를 건강하게 푸는 법을 배워야 하는 아이',
  },
  AIW: {
    name: '느긋한 모험가',
    tagline: '각자의 속도로 함께 떠나는',
    desc: '바깥 활동을 즐기지만 서두르지 않고, 각자의 시간도 소중히 여기는 당신. 강아지가 스스로 세상을 탐색할 여유를 주는 보호자예요.',
    fit: '활동적이지만 자기 공간이 필요하고, 자기 속도로 적응하는 아이',
  },
  STG: {
    name: '다정한 선생님',
    tagline: '집에서 차근차근 가르쳐 주는',
    desc: '집에서 함께하는 시간이 많고, 생활 습관을 차근차근 알려 주는 걸 좋아하는 당신. 일상 속에서 꾸준히 이끌어 주는 보호자예요.',
    fit: '차분하지만 기본 교육이 필요하고, 사람 곁에 있고 싶어 하는 아이',
  },
  STW: {
    name: '포근한 담요',
    tagline: '곁에 있는 것만으로 안심이 되는',
    desc: '곁에 있는 것만으로 안심이 되는 사람, 마음을 열 때까지 기다려 줄 줄 아는 당신. 상처받은 아이에게 가장 따뜻한 쉼터가 되어 줄 보호자예요.',
    fit: '겁이 많고 애착이 필요한 아이, 무릎 위가 제일 좋은 아이',
  },
  SIG: {
    name: '든든한 집사',
    tagline: '규칙과 루틴으로 안정감을 주는',
    desc: '규칙적인 루틴과 안정적인 생활을 중요하게 여기는 당신. 강아지에게 예측 가능한 하루를 선물해 안정감을 주는 보호자예요.',
    fit: '혼자서도 잘 지내고, 일정한 생활 리듬 속에서 습관을 배워 가는 아이',
  },
  SIW: {
    name: '조용한 쉼터',
    tagline: '서로의 공간을 존중하는',
    desc: '조용하고 평온한 일상을 사랑하고, 서로의 공간을 존중하는 당신. 세상에 지친 아이가 마음 편히 쉬어 갈 수 있는 보호자예요.',
    fit: '조용하고 혼자서도 잘 지내는 아이, 편안한 노후를 보내고 싶은 시니어견',
  },
};

/* =========================================================
 * 보호견 데이터
 * scores(1~5) — activity: 활동량 / attach: 애착도 / care: 1 기다림 필요 ~ 5 교육·발산 필요
 * dogFriendly · catFriendly: good | ok | hard | unknown
 * ========================================================= */

const DOGS = [
  {
    id: 767,
    name: '덕혜',
    sex: '여아',
    birth: '2026-02-27',
    size: '성장 중',
    weight: 7,
    keywords: ['에너자이저', '해맑은 퍼피', '민들레홀씨'],
    likes: '간식, 장난감, 터그놀이, 스킨십',
    dislikes: '강압적인 터치',
    intro: '지치는 법을 모르는 해맑은 아기 강아지예요. 처음엔 살짝 낯을 가리지만 간식 하나면 금세 꼬리를 흔들어요. 함께 산책하며 세상을 알려 줄 길잡이를 기다려요.',
    photos: ['DukHye_00.jpg', 'DukHye_01.jpg', 'DukHye_02.jpg', 'DukHye_03.jpg'],
    scores: { activity: 5, attach: 4, care: 5 },
    dogFriendly: 'ok',
    catFriendly: 'unknown',
    beginnerOk: false,
  },
  {
    id: 761,
    name: '마린',
    sex: '여아',
    birth: '2019-03-27',
    size: '대형견',
    weight: 29,
    keywords: ['에너자이저', '똑똑이', '사람 좋아'],
    likes: '사람, 터그·공놀이, 산책',
    dislikes: '혼자 남아 있는 것',
    intro: '낯선 사람에게도 먼저 다가가 꼬리치는 사교왕이에요. 하루 두 번 이상 신나게 뛰어야 하는 에너자이저라, 흥분을 다스리는 연습을 함께해 줄 든든한 리더가 필요해요.',
    photos: ['MARINE_05.jpg', 'MARINE_04.jpg', 'MARINE_08.jpg', 'MARINE_06.jpg'],
    scores: { activity: 5, attach: 5, care: 5 },
    dogFriendly: 'good',
    catFriendly: 'unknown',
    beginnerOk: false,
  },
  {
    id: 765,
    name: '레임',
    sex: '여아',
    birth: '2025-08-25',
    size: '소형견',
    weight: 9.66,
    keywords: ['놀이대장', '애교쟁이', '친구 좋아'],
    likes: '인형, 터그, 공 장난감, 친구',
    dislikes: '',
    intro: '처음 보는 사람에게도 쪼르르 다가가는 미소천사예요. 친구들과 뛰어노는 걸 정말 좋아해서, 산책과 놀이 시간을 넉넉히 함께해 줄 가족이면 좋겠어요.',
    photos: ['reim_00.jpg', 'reim_01.jpg', 'reim_02.jpg', 'reim_03.jpg'],
    scores: { activity: 5, attach: 4, care: 4 },
    dogFriendly: 'good',
    catFriendly: 'unknown',
    beginnerOk: true,
  },
  {
    id: 751,
    name: '빈시',
    sex: '여아',
    birth: '2024-05-09',
    size: '대형견',
    weight: 43,
    keywords: ['사랑둥이', '애교쟁이', '인싸'],
    likes: '간식, 산책, 친구들과 악어놀이, 예쁨 받기',
    dislikes: '확 다가오는 행동, 큰 소리',
    intro: '커다란 몸으로 기대 오는 왕큰 애교의 주인공이에요. 사람도 친구도 모두 좋아하고, 산책 후엔 느긋하게 쉴 줄 아는 균형 잡힌 아이예요.',
    photos: ['Vincie_00.jpg', 'Vincie_01.jpg', 'Vincie_02.jpg', 'Vincie_03.jpg'],
    scores: { activity: 3, attach: 5, care: 3 },
    dogFriendly: 'good',
    catFriendly: 'unknown',
    beginnerOk: false,
  },
  {
    id: 599,
    name: '에디',
    sex: '남아',
    birth: '2018-12-06',
    size: '소형견',
    weight: 6.62,
    keywords: ['외모천재', '눈치백단', '똑똑이'],
    likes: '던져 주는 간식, 삑삑이 장난감, 아늑한 곳',
    dislikes: '배 만지기, 큰 소리, 까부는 개',
    intro: '영리하고 관심받기를 좋아하지만, 자기만의 선이 분명한 아이예요. 에디의 신호를 읽어 주고 칭찬으로 차근차근 가르쳐 줄 섬세한 보호자를 기다려요.',
    photos: ['Eddie_0.jpg', 'Eddie_01.jpg', 'Eddie_1.jpg', 'Eddie_03.jpg'],
    scores: { activity: 4, attach: 4, care: 3 },
    dogFriendly: 'ok',
    catFriendly: 'unknown',
    beginnerOk: false,
  },
  {
    id: 616,
    name: '보름',
    sex: '여아',
    birth: '2022-10-01',
    size: '중형견',
    weight: 17.2,
    keywords: ['차분한 소녀', '집중력 좋음', '똑순이'],
    likes: '담요, 쿠션, 밥',
    dislikes: '그루밍',
    intro: '처음엔 낯설어하지만 천천히 내미는 손길을 차분히 받아 주는 아이예요. 한 걸음 다가가면 한 걸음 다가오는 보름이와 천천히 세상을 넓혀 갈 가족을 기다려요.',
    photos: ['Boreum_00.jpg', 'Boreum_01.jpg', 'Boreum_02.jpg', 'Boreum_03.jpg'],
    scores: { activity: 2, attach: 4, care: 2 },
    dogFriendly: 'good',
    catFriendly: 'unknown',
    beginnerOk: true,
  },
  {
    id: 682,
    name: '비아',
    sex: '여아',
    birth: '2014-02-01',
    size: '중형견',
    weight: 19.5,
    keywords: ['차분함', '해맑음', '간식 좋아'],
    likes: '맛있는 먹거리, 육류 간식',
    dislikes: '갑작스러운 행동과 소리, 갇힌 공간',
    intro: '평소엔 쉬는 걸 좋아하지만 산책을 나가면 깡충깡충 밝아지는 시니어 소녀예요. 차분한 분위기 속에서 천천히 걸음을 맞춰 줄 가족이면 좋겠어요.',
    photos: ['VEA_00.jpg', 'VEA_01.jpg', 'VEA_02.jpg', 'VEA_03.jpg'],
    scores: { activity: 2, attach: 3, care: 2 },
    dogFriendly: 'ok',
    catFriendly: 'unknown',
    beginnerOk: true,
  },
  {
    id: 732,
    name: '쏨땀',
    sex: '여아',
    birth: '2016-05-03',
    size: '소형견',
    weight: 2.4,
    keywords: ['솜사탕', '사랑둥이', '안정형'],
    likes: '육류 간식, 사람의 손길, 방석',
    dislikes: '큰 소리, 낯선 환경',
    intro: '처음엔 조심스럽지만, 익숙해지면 먼저 다가와 몸을 맡기는 솜사탕 같은 아이예요. 온순하고 무던해서 반려견을 처음 맞이하는 가정에도 잘 어울려요.',
    photos: ['SomTom_00.jpg', 'Somtom_1.jpg', 'Somtom_2.jpg', 'Somtom_3.jpg'],
    scores: { activity: 1, attach: 3, care: 2 },
    dogFriendly: 'ok',
    catFriendly: 'unknown',
    beginnerOk: true,
  },
  {
    id: 757,
    name: '다복',
    sex: '여아',
    birth: '2025-05-15',
    size: '소형견',
    weight: 2.6,
    keywords: ['요조숙녀', '무릎멍', '겁쟁이 공주'],
    likes: '무릎에 누워 있기',
    dislikes: '밥 먹을 때 다가오기',
    intro: '세상은 조금 두렵지만 손길은 좋아하는 겁쟁이 공주님이에요. 슬개골 재활 중이라 가벼운 코산책이 딱 좋고, 기꺼이 무릎을 내어 줄 가족을 기다려요.',
    photos: ['DA-BOK_00.jpg', 'DA-BOK_01.jpg', 'DA-BOK_02.jpg', 'DA-BOK_03.jpg'],
    scores: { activity: 1, attach: 5, care: 1 },
    dogFriendly: 'good',
    catFriendly: 'unknown',
    beginnerOk: true,
  },
  {
    id: 564,
    name: '제리',
    sex: '남아',
    birth: '2019-06-05',
    size: '중형견',
    weight: 22,
    keywords: ['순딩이', '마음을 여는 중', '발전 중'],
    likes: '혼자 쉬기, 운동장 돌아다니기',
    dislikes: '공간 침범, 잡으려고 쫓기',
    intro: '아픈 과거 때문에 아직 사람이 조금 무섭지만, 매일 용기를 내고 있는 아이예요. 혼자만의 안전한 공간을 마련해 주고 제리의 속도를 기다려 줄 가족을 찾아요.',
    photos: ['jerry_00.jpg', 'jerry_01.jpg', 'jerry_02.jpg', 'jerry_03.jpg'],
    scores: { activity: 2, attach: 2, care: 1 },
    dogFriendly: 'good',
    catFriendly: 'unknown',
    beginnerOk: false,
  },
];

const REASONS = {
  activity: {
    high: (n) => `함께 걷고 뛰는 걸 좋아하는 당신과 에너지 넘치는 ${n}, 산책 궁합이 최고예요.`,
    mid: (n) => `적당히 걷고 적당히 쉬는 생활 리듬이 ${n}${josa(n, '과', '와')} 잘 맞아요.`,
    low: (n) => `느긋한 집 시간을 좋아하는 당신처럼, ${n}도 차분한 일상을 좋아해요.`,
  },
  attach: {
    high: (n) => `곁에 꼭 붙어 있고 싶은 ${n}에게, 함께하는 시간을 소중히 여기는 당신이 딱이에요.`,
    mid: (n) => `함께하는 시간과 혼자만의 시간을 균형 있게 즐기는 ${n}${josa(n, '과', '와')} 잘 어울려요.`,
    low: (n) => `자기만의 공간이 필요한 ${n}에게, 서로의 시간을 존중하는 당신은 편안한 가족이에요.`,
  },
  care: {
    high: (n) => `배울 게 많은 ${n}에게, 차근차근 이끌어 줄 당신은 최고의 선생님이에요.`,
    mid: (n) => `${n}의 속도를 살피며 함께 성장해 갈 수 있는 궁합이에요.`,
    low: (n) => `천천히 마음을 여는 ${n}에게, 기다려 줄 줄 아는 당신이 꼭 필요해요.`,
  },
};

/* =========================================================
 * 상태
 * ========================================================= */

const state = loadState();

function loadState() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(CONFIG.storageKey));
    if (saved && saved.sessionId) return saved;
  } catch (e) {
    /* 저장된 값이 없거나 손상된 경우 새로 시작 */
  }
  return { sessionId: createId(), answers: {}, result: null };
}

function saveState() {
  try {
    sessionStorage.setItem(CONFIG.storageKey, JSON.stringify(state));
  } catch (e) {
    /* 사파리 사생활 보호 모드 등에서는 저장 불가 */
  }
}

function createId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/* =========================================================
 * 점수 계산 · 매칭
 * ========================================================= */

function visibleQuestions() {
  return QUESTIONS.filter((q) => !q.when || q.when(state.answers));
}

function computeAxisScores(answers) {
  const scores = {};
  AXIS_ORDER.forEach((axis) => {
    const items = QUESTIONS.filter((q) => q.type === 'likert' && q.axis === axis);
    const sum = items.reduce((acc, q) => acc + likertValue(q, answers[q.id]), 0);
    scores[axis] = ((sum / items.length - 1) / 4) * 100;
  });
  return scores;
}

function likertValue(question, raw) {
  return question.reverse ? 6 - raw : raw;
}

function computeTypeCode(scores, answers) {
  return AXIS_ORDER.map((axis) => {
    let isHigh = scores[axis] > 50;
    if (scores[axis] === 50) {
      const first = QUESTIONS.find((q) => q.axis === axis);
      isHigh = likertValue(first, answers[first.id]) >= 3;
    }
    return isHigh ? AXES[axis].high.letter : AXES[axis].low.letter;
  }).join('');
}

// 사람 점수는 세 문항의 평균이라 양 끝에 잘 닿지 않으므로, 강아지 점수도 10~90 범위로 맞춤
function dogAxisScore(dog, axis) {
  return 50 + (dog.scores[axis] - 3) * 20;
}

function dogLean(dog, axis) {
  if (dog.scores[axis] >= 4) return 1;
  if (dog.scores[axis] <= 2) return -1;
  return 0;
}

function currentPets(answers) {
  return answers.experience === 'current' ? answers.pets || [] : [];
}

function rankDogs(scores, code, answers) {
  const pets = currentPets(answers);

  const ranked = DOGS.map((dog) => {
    let fit = 100;
    AXIS_ORDER.forEach((axis, i) => {
      fit -= WEIGHTS[axis] * Math.abs(scores[axis] - dogAxisScore(dog, axis));
      const userLean = code[i] === AXES[axis].high.letter ? 1 : -1;
      fit += LEAN_BONUS * userLean * dogLean(dog, axis);
    });

    let excluded = false;
    [['dog', 'dogFriendly'], ['cat', 'catFriendly']].forEach(([pet, key]) => {
      if (!pets.includes(pet)) return;
      if (dog[key] === 'hard') excluded = true;
      else if (dog[key] === 'unknown') fit -= 5;
      else if (dog[key] === 'good') fit += 5;
    });

    if (answers.experience === 'none' && !dog.beginnerOk) fit -= 10;

    fit = Math.max(0, fit);
    // 점수가 3점 이내로 비슷한 아이들끼리는 순서를 섞어 여러 아이가 고르게 소개되도록 함
    return { id: dog.id, fit, excluded, sortKey: fit + Math.random() * 3 };
  });

  const bySortKey = (a, b) => b.sortKey - a.sortKey;
  const pool = ranked.filter((r) => !r.excluded).sort(bySortKey);
  const backup = ranked.filter((r) => r.excluded).sort(bySortKey);

  const top = pool.slice(0, 3);
  while (top.length < 3 && backup.length) top.push({ ...backup.shift(), consult: true });

  return top
    .sort((a, b) => b.fit - a.fit)
    .map((r) => ({ id: r.id, percent: displayPercent(r.fit), consult: Boolean(r.consult) }));
}

// 가산점을 모두 받으면 약 120점까지 올라가므로 0~120점을 60~99%로 환산
function displayPercent(fit) {
  return Math.round(60 + (Math.min(fit, 120) / 120) * 39);
}

function matchReasons(dog, scores, answers) {
  const reasons = AXIS_ORDER
    .map((axis) => ({ axis, diff: Math.abs(scores[axis] - dogAxisScore(dog, axis)) }))
    .filter((r) => r.diff <= 35)
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 2)
    .map(({ axis }) => {
      const level = dog.scores[axis] >= 4 ? 'high' : dog.scores[axis] <= 2 ? 'low' : 'mid';
      return REASONS[axis][level](dog.name);
    });

  if (!reasons.length) {
    reasons.push(`${dog.name}의 이야기를 읽어 보고, 직접 만나 보면 더 잘 알 수 있어요.`);
  }

  const pets = currentPets(answers);
  if (pets.includes('dog')) {
    if (dog.dogFriendly === 'good') reasons.push('다른 강아지 친구와도 잘 지내는 아이예요.');
    else if (dog.dogFriendly === 'ok') reasons.push('동거견과는 천천히 인사하는 시간이 필요해요.');
  }
  if (pets.includes('cat') && dog.catFriendly === 'unknown') {
    reasons.push('고양이와 지내 본 경험은 아직 확인되지 않았어요. 상담 때 함께 이야기해 보세요.');
  }
  if (answers.experience === 'none' && !dog.beginnerOk) {
    reasons.push('반려 생활이 처음이라면, 위액트와 충분히 상담한 뒤 만나 보세요.');
  }
  return reasons;
}

/* =========================================================
 * 유틸
 * ========================================================= */

function josa(word, withBatchim, withoutBatchim) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return withoutBatchim;
  return code % 28 ? withBatchim : withoutBatchim;
}

function ageLabel(birth) {
  const [y, m, d] = birth.split('-').map(Number);
  const now = new Date();
  let months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
  if (now.getDate() < d) months -= 1;
  if (months < 12) return `${Math.max(months, 1)}개월`;
  return `${Math.floor(months / 12)}살`;
}

function dogMeta(dog) {
  return `${dog.sex} · ${ageLabel(dog.birth)} · ${dog.size} ${dog.weight}kg`;
}

function photoUrl(file) {
  return CONFIG.photoBase + file;
}

function withUtm(url) {
  return url + (url.includes('?') ? '&' : '?') + CONFIG.utm;
}

function findDog(id) {
  return DOGS.find((dog) => dog.id === Number(id));
}

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([key, value]) => {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  });
  [].concat(children).forEach((child) => {
    if (child != null) node.append(child);
  });
  return node;
}

function track(event, data = {}) {
  if (!CONFIG.logEndpoint) return;
  const payload = JSON.stringify({ event, sessionId: state.sessionId, at: new Date().toISOString(), ...data });
  if (navigator.sendBeacon) {
    navigator.sendBeacon(CONFIG.logEndpoint, payload);
  } else {
    fetch(CONFIG.logEndpoint, { method: 'POST', body: payload, mode: 'no-cors', keepalive: true });
  }
}

/* =========================================================
 * 화면 전환 (#start, #survey/q1, #result, #dog/767)
 * ========================================================= */

const $ = (selector, root = document) => root.querySelector(selector);
const screens = {};
let advanceTimer = null;
let loadingTimer = null;

function navigate(route, { replace = false } = {}) {
  const url = `#${route}`;
  if (replace) history.replaceState({ inApp: true }, '', url);
  else history.pushState({ inApp: true }, '', url);
  render();
}

function render() {
  clearTimeout(advanceTimer);
  clearTimeout(loadingTimer);

  const [screen, param] = location.hash.slice(1).split('/');

  if (screen === 'survey') return renderSurvey(param);
  if (screen === 'result' || screen === 'dog') {
    if (!state.result) return navigate('start', { replace: true });
    renderResult();
    if (screen === 'dog' && findDog(param)) openModal(findDog(param));
    else closeModal();
    return;
  }
  showScreen('start');
}

function showScreen(name) {
  Object.entries(screens).forEach(([key, node]) => {
    node.hidden = key !== name;
  });
  if (name !== 'result') closeModal();
  window.scrollTo(0, 0);
}

/* ---------- 설문 ---------- */

function firstUnansweredIndex(list) {
  const index = list.findIndex((q) => !isAnswered(q));
  return index === -1 ? list.length - 1 : index;
}

function isAnswered(question) {
  const value = state.answers[question.id];
  return question.type === 'multi' ? Array.isArray(value) && value.length > 0 : value != null;
}

function renderSurvey(id) {
  const list = visibleQuestions();
  let index = list.findIndex((q) => q.id === id);
  const limit = firstUnansweredIndex(list);

  if (index === -1 || index > limit) {
    return navigate(`survey/${list[limit].id}`, { replace: true });
  }

  const question = list[index];
  const node = screens.survey;
  showScreen('survey');

  const counted = QUESTIONS.filter(
    (q) => !q.intro && (!q.when || q.when(state.answers) || state.answers.experience == null)
  );
  const step = counted.indexOf(question) + 1;
  $('.progress', node).hidden = Boolean(question.intro);
  $('.progress__fill', node).style.width = `${(step / counted.length) * 100}%`;
  $('.progress__count', node).textContent = `${step} / ${counted.length}`;
  $('.question__label', node).textContent = question.label || '나의 성향';
  $('.question__text', node).textContent = question.text;
  $('.question__hint', node).textContent = question.hint || '';

  const options = $('.options', node);
  const isMulti = question.type === 'multi';
  options.classList.toggle('options--multi', isMulti);
  options.replaceChildren(
    ...(question.options || LIKERT_OPTIONS).map((option) =>
      el(
        'button',
        {
          type: 'button',
          class: 'option',
          'aria-pressed': 'false',
          'data-value': option.value,
          onclick: () => selectOption(question, option.value),
        },
        [el('span', { class: 'option__dot', 'aria-hidden': 'true' }), el('span', { text: option.label })]
      )
    )
  );
  syncSelected(question);

  $('[data-action="next"]', node).hidden = !isMulti;
}

function syncSelected(question) {
  const value = state.answers[question.id];
  const selected = question.type === 'multi' ? value || [] : [value];
  screens.survey.querySelectorAll('.option').forEach((button) => {
    const raw = button.dataset.value;
    const optionValue = question.type === 'likert' ? Number(raw) : raw;
    const isOn = selected.includes(optionValue);
    button.classList.toggle('is-selected', isOn);
    button.setAttribute('aria-pressed', String(isOn));
  });
  if (question.type === 'multi') {
    $('[data-action="next"]', screens.survey).disabled = !isAnswered(question);
  }
}

function selectOption(question, value) {
  if (question.type === 'multi') {
    const current = new Set(state.answers[question.id] || []);
    current.has(value) ? current.delete(value) : current.add(value);
    state.answers[question.id] = [...current];
    saveState();
    syncSelected(question);
    return;
  }

  state.answers[question.id] = value;
  if (question.id === 'experience' && value !== 'current') delete state.answers.pets;
  saveState();
  syncSelected(question);

  clearTimeout(advanceTimer);
  advanceTimer = setTimeout(() => goNext(question.id), CONFIG.autoAdvanceMs);
}

function goNext(fromId) {
  const list = visibleQuestions();
  const index = list.findIndex((q) => q.id === fromId);
  if (index < list.length - 1) navigate(`survey/${list[index + 1].id}`);
  else finishSurvey();
}

function goPrev() {
  const list = visibleQuestions();
  const id = location.hash.split('/')[1];
  const index = list.findIndex((q) => q.id === id);
  if (history.state && history.state.inApp) return history.back();
  navigate(index > 0 ? `survey/${list[index - 1].id}` : 'start', { replace: true });
}

function finishSurvey() {
  const scores = computeAxisScores(state.answers);
  const code = computeTypeCode(scores, state.answers);
  const matches = rankDogs(scores, code, state.answers);
  state.result = { scores, code, matches };
  saveState();

  track('complete', {
    type: code,
    gender: state.answers.gender,
    scores,
    experience: state.answers.experience,
    pets: currentPets(state.answers),
    matches: matches.map((m) => m.id),
  });

  showScreen('loading');
  loadingTimer = setTimeout(() => navigate('result'), CONFIG.loadingMs);
}

/* ---------- 결과 ---------- */

let renderedResult = null;

function renderResult() {
  if (renderedResult === state.result && !screens.result.hidden) return;
  renderedResult = state.result;

  const { scores, code, matches } = state.result;
  const type = TYPES[code];
  const node = screens.result;
  showScreen('result');

  const image = $('.type-card__image', node);
  const gender = state.answers.gender || CONFIG.fallbackGender;
  image.hidden = false;
  image.alt = `${type.name} 캐릭터`;
  image.onerror = () => {
    const fallback = CONFIG.typeImage(CONFIG.fallbackGender, code);
    if (image.getAttribute('src') !== fallback) image.src = fallback;
    else image.hidden = true;
  };
  image.src = CONFIG.typeImage(gender, code);

  $('.type-card__badge', node).replaceChildren(...code.split('').map((letter) => el('span', { text: letter })));
  $('.type-card__name', node).textContent = type.name;
  $('.type-card__tagline', node).textContent = type.tagline;
  $('.type-card__desc', node).textContent = type.desc;
  $('.type-card__fit p', node).textContent = type.fit;

  $('.axes', node).replaceChildren(
    ...AXIS_ORDER.map((axis) => {
      const info = AXES[axis];
      const isHigh = code.includes(info.high.letter);
      const marker = el('span', { class: 'axis__marker' });
      marker.style.left = `${Math.min(96, Math.max(4, scores[axis]))}%`;
      return el('div', { class: 'axis' }, [
        el('div', { class: 'axis__labels' }, [
          el('span', { class: isHigh ? '' : 'is-active', text: `${info.low.letter} ${info.low.name}` }),
          el('span', { text: info.label }),
          el('span', { class: isHigh ? 'is-active' : '', text: `${info.high.name} ${info.high.letter}` }),
        ]),
        el('div', { class: 'axis__track' }, marker),
      ]);
    })
  );

  $('.match-list', node).replaceChildren(
    ...matches.map((match, i) => {
      const dog = findDog(match.id);
      return el('li', {}, [
        el(
          'button',
          { type: 'button', class: 'match-card', onclick: () => navigate(`dog/${dog.id}`) },
          [
            el('div', { class: 'match-card__photo' }, [
              el('img', { src: photoUrl(dog.photos[0]), alt: dog.name, loading: 'lazy', decoding: 'async' }),
              el('span', { class: 'match-card__rank', text: `${i + 1}위` }),
            ]),
            el('div', { class: 'match-card__body' }, [
              el('div', { class: 'match-card__head' }, [
                el('strong', { class: 'match-card__name', text: dog.name }),
                el('span', { class: 'match-card__score' }, [el('small', { text: '궁합 ' }), `${match.percent}%`]),
              ]),
              el('p', { class: 'match-card__meta', text: dogMeta(dog) }),
              el('ul', { class: 'chips' }, dog.keywords.slice(0, 3).map((k) => el('li', { text: k }))),
              match.consult ? el('p', { class: 'match-card__consult', text: '상담 후 만남을 권해요' }) : null,
            ]),
          ]
        ),
      ]);
    })
  );

  $('.booth__title', node).textContent = CONFIG.booth.title;
  $('.booth__desc', node).textContent = CONFIG.booth.desc;
}

/* ---------- 강아지 상세 ---------- */

const modal = { node: null, openId: null };

function openModal(dog) {
  if (modal.openId === dog.id) return;
  modal.openId = dog.id;

  const node = modal.node;
  const { scores, matches } = state.result;
  const rank = matches.findIndex((m) => m.id === dog.id);
  const match = matches[rank];

  const gallery = $('.gallery__track', node);
  gallery.replaceChildren(
    ...dog.photos.map((file, i) =>
      el('img', { src: photoUrl(file), alt: `${dog.name} 사진 ${i + 1}`, loading: i ? 'lazy' : 'eager', decoding: 'async' })
    )
  );
  gallery.scrollLeft = 0;
  updateGalleryCount();

  $('.dog__rank', node).textContent = match ? `운명 강아지 ${rank + 1}위 · 궁합 ${match.percent}%` : '';
  $('.dog__name', node).textContent = dog.name;
  $('.dog__meta', node).textContent = dogMeta(dog);
  $('.dog__keywords', node).replaceChildren(...dog.keywords.map((k) => el('li', { text: k })));
  $('.dog__intro', node).textContent = dog.intro;
  $('.dog__why ul', node).replaceChildren(
    ...matchReasons(dog, scores, state.answers).map((text) => el('li', { text }))
  );

  const likes = [];
  if (dog.likes) likes.push(el('dt', { text: '좋아해요' }), el('dd', { text: dog.likes }));
  if (dog.dislikes) likes.push(el('dt', { text: '싫어해요' }), el('dd', { text: dog.dislikes }));
  $('.dog__likes', node).replaceChildren(...likes);

  const apply = $('[data-link="apply"]', node);
  apply.href = withUtm(CONFIG.profileUrl(dog.id));
  apply.dataset.dogId = dog.id;

  node.hidden = false;
  document.body.classList.add('is-locked');
  $('.modal__sheet', node).scrollTop = 0;
  $('.modal__close', node).focus({ preventScroll: true });

  track('dog_open', { dogId: dog.id, rank: rank + 1 });
}

function closeModal() {
  if (!modal.node || modal.node.hidden) return;
  modal.node.hidden = true;
  modal.openId = null;
  document.body.classList.remove('is-locked');
}

function requestCloseModal() {
  if (history.state && history.state.inApp) history.back();
  else navigate('result', { replace: true });
}

function updateGalleryCount() {
  const gallery = $('.gallery__track', modal.node);
  const total = gallery.children.length;
  const index = Math.round(gallery.scrollLeft / (gallery.clientWidth || 1)) + 1;
  $('.gallery__count', modal.node).textContent = `${Math.min(index, total)} / ${total}`;
}

/* =========================================================
 * 시작
 * ========================================================= */

function init() {
  document.querySelectorAll('[data-screen]').forEach((node) => {
    screens[node.dataset.screen] = node;
  });
  modal.node = $('#dog-modal');

  document.querySelectorAll('[data-link="more"]').forEach((link) => {
    link.href = withUtm(CONFIG.dogListUrl);
  });

  document.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]');
    if (action) {
      const name = action.dataset.action;
      if (name === 'start') {
        state.answers = {};
        state.result = null;
        saveState();
        track('start');
        navigate(`survey/${QUESTIONS[0].id}`);
      } else if (name === 'prev') {
        goPrev();
      } else if (name === 'next') {
        const id = location.hash.split('/')[1];
        if (isAnswered(QUESTIONS.find((q) => q.id === id))) goNext(id);
      } else if (name === 'restart') {
        state.answers = {};
        state.result = null;
        saveState();
        track('restart');
        navigate('start');
      } else if (name === 'close-modal') {
        requestCloseModal();
      }
      return;
    }

    const link = event.target.closest('[data-link]');
    if (link) {
      if (link.dataset.link === 'apply') track('apply_click', { dogId: Number(link.dataset.dogId) });
      else track('more_click', { from: modal.node.hidden ? 'result' : 'dog' });
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.node.hidden) requestCloseModal();
  });

  $('.gallery__track', modal.node).addEventListener('scroll', updateGalleryCount, { passive: true });
  window.addEventListener('popstate', render);

  if (!location.hash) history.replaceState(null, '', '#start');
  render();
}

document.addEventListener('DOMContentLoaded', init);
