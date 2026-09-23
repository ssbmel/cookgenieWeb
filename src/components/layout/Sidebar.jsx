import { useEffect, useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { LogOut, Settings } from 'lucide-react';
import { SIDEBAR_NAV_ITEMS } from './navItems';
import { useAuth } from '../../context/AuthContext';
import { useFridge } from '../../context/FridgeContext';
import * as fridgeApi from '../../api/fridge';
import * as shoppingApi from '../../api/shopping';
import { getDday } from '../../utils/expiry';
import './Sidebar.css';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { selectedFridge } = useFridge();
  const fridgeId = selectedFridge?.id;
  const [fridgeItems, setFridgeItems] = useState([]);
  const [shoppingCount, setShoppingCount] = useState(0);

  useEffect(() => {
    if (!fridgeId) {
      setFridgeItems([]);
      setShoppingCount(0);
      return;
    }
    let cancelled = false;
    fridgeApi.getFridgeItems(fridgeId).then((data) => {
      if (!cancelled) setFridgeItems(data);
    });
    shoppingApi.getShoppingItems(fridgeId).then((data) => {
      if (!cancelled) setShoppingCount(data.length);
    });
    return () => {
      cancelled = true;
    };
  }, [fridgeId]);

  const urgentCount = fridgeItems.filter((item) => {
    const dday = getDday(item.expiryDate);
    return dday !== null && dday <= 7;
  }).length;
  const freshnessScore = fridgeItems.length
    ? Math.round(
        ((fridgeItems.length - urgentCount) / fridgeItems.length) * 100,
      )
    : null;

  const counts = {
    fridgeItems: fridgeItems.length,
    shoppingItems: shoppingCount,
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark">CG</span>
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name">CookGenie</span>
          <span className="sidebar-brand-tagline">
            스마트 자취 1인가구 키친
          </span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {SIDEBAR_NAV_ITEMS.map(
          ({ to, label, desktopLabel, icon: Icon, end, soon, countKey }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `sidebar-link${isActive ? ' sidebar-link--active' : ''}`
              }
            >
              <Icon />
              <span>{desktopLabel ?? label}</span>
              {soon && <span className="sidebar-soon">준비중</span>}
              {countKey && fridgeId && counts[countKey] > 0 && (
                <span className="sidebar-badge">{counts[countKey]}</span>
              )}
            </NavLink>
          ),
        )}
      </nav>

      {fridgeId && freshnessScore !== null && (
        <div className="sidebar-freshness">
          <div className="sidebar-freshness-row">
            <span>신선도 상태</span>
            <strong>{freshnessScore}% 쾌적</strong>
          </div>
          <div className="sidebar-freshness-track">
            <span
              className="sidebar-freshness-fill"
              style={{ width: `${freshnessScore}%` }}
            />
          </div>
          {urgentCount > 0 && (
            <Link to="/fridge" className="sidebar-freshness-alert">
              <span className="sidebar-freshness-alert-label">
                <span className="sidebar-freshness-dot" />
                유통기한 임박 {urgentCount}개
              </span>
              <span className="sidebar-freshness-alert-cta">확인하기</span>
            </Link>
          )}
        </div>
      )}

      <div className="sidebar-profile">
        <span className="sidebar-profile-avatar">
          {(user?.nickname ?? '?').slice(0, 1)}
        </span>
        <div className="sidebar-profile-text">
          <span className="sidebar-profile-name">
            {user?.nickname ?? '게스트'}님
          </span>
          <span className="sidebar-profile-sub">자취 1인가구</span>
        </div>
        <Link
          to="/settings"
          className="sidebar-profile-btn"
          aria-label="설정"
          title="설정"
        >
          <Settings size={15} aria-hidden="true" />
        </Link>
        <button
          type="button"
          className="sidebar-profile-btn"
          onClick={logout}
          aria-label="로그아웃"
          title="로그아웃"
        >
          <LogOut size={15} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
