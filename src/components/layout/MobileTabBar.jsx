import { NavLink } from 'react-router-dom'
import { MOBILE_NAV_ITEMS } from './navItems'
import './MobileTabBar.css'

export default function MobileTabBar() {
  return (
    <nav className="mobile-tabbar">
      {MOBILE_NAV_ITEMS.map(({ to, label, icon: Icon, end, special }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `mobile-tab${special ? ' mobile-tab--special' : ''}${isActive ? ' mobile-tab--active' : ''}`
          }
        >
          {special ? (
            <span className="mobile-tab-fab">
              <Icon />
            </span>
          ) : (
            <Icon />
          )}
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
