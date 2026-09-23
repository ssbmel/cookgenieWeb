import {
  CalendarIcon,
  CartIcon,
  FridgeIcon,
  HomeIcon,
  RecipeIcon,
  SettingsIcon,
} from './icons';

export const NAV_ITEMS = [
  { to: '/', label: '홈', desktopLabel: '홈 대시보드', icon: HomeIcon, end: true },
  {
    to: '/fridge',
    label: '냉장고',
    desktopLabel: '냉장고 재료관리',
    icon: FridgeIcon,
    countKey: 'fridgeItems',
  },
  {
    to: '/recipes',
    label: 'AI 레시피',
    desktopLabel: 'AI 레시피',
    icon: RecipeIcon,
    special: true,
  },
  {
    to: '/shopping',
    label: '장보기',
    desktopLabel: '스마트 장보기',
    icon: CartIcon,
    countKey: 'shoppingItems',
  },
  { to: '/calendar', label: '식단관리', desktopLabel: '식단관리 캘린더', icon: CalendarIcon },
  {
    to: '/settings',
    label: '설정',
    desktopLabel: '설정',
    icon: SettingsIcon,
    hideOnMobile: true,
    hideOnSidebar: true,
  },
];

/** 하단 탭바는 실제 동작하는 핵심 기능만 보여준다 - 준비중인 항목과 설정(TopBar 아이콘으로 접근)은 뺀다. */
export const MOBILE_NAV_ITEMS = NAV_ITEMS.filter(
  (item) => !item.soon && !item.hideOnMobile,
);

/** 사이드바 메인 목록에는 설정을 넣지 않는다 - 프로필 카드의 톱니바퀴 아이콘으로 접근한다. */
export const SIDEBAR_NAV_ITEMS = NAV_ITEMS.filter(
  (item) => !item.soon && !item.hideOnSidebar,
);
