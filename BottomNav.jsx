import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Search, Phone, User } from "lucide-react";
import { useChatStore } from "../../store/chatStore";

const NAV_ITEMS = [
  { path: "/home",    icon: Home,   label: "Home"    },
  { path: "/search",  icon: Search, label: "Search"  },
  { path: "/calls",   icon: Phone,  label: "Calls"   },
  { path: "/account", icon: User,   label: "Account" },
];

export default function BottomNav() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { conversations } = useChatStore();

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
        const active = location.pathname === path;
        const isCalls = path === "/calls";
        return (
          <button
            key={path}
            className={`nav-item ${active ? "active" : ""}`}
            onClick={() => navigate(path)}
          >
            <div className="relative">
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              {path === "/home" && totalUnread > 0 && (
                <span className="badge absolute -top-2 -right-2" style={{ fontSize: 9, minWidth: 16, height: 16 }}>
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
            </div>
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
