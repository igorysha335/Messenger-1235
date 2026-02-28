import { useNavigate, useLocation } from "react-router-dom";
import { MessageCircle, Search, User, Settings } from "lucide-react";
import { motion } from "framer-motion";

const tabs = [
  { icon: MessageCircle, label: "Чаты", path: "/" },
  { icon: Search, label: "Поиск", path: "/search" },
  { icon: User, label: "Профиль", path: "/profile" },
  { icon: Settings, label: "Настройки", path: "/settings" },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 glass-nav safe-bottom">
      <div className="flex items-center justify-around max-w-lg mx-auto py-2">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <motion.button
              key={tab.path}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center gap-1 py-1 px-4 relative"
            >
              {isActive && (
                <motion.div
                  layoutId="navIndicator"
                  className="absolute -top-1 w-8 h-1 gradient-primary rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <tab.icon
                className={`w-5 h-5 transition-colors duration-200 ${
                  isActive ? "text-primary" : "text-inactive"
                }`}
              />
              <span
                className={`text-[10px] font-medium transition-colors duration-200 ${
                  isActive ? "text-primary" : "text-inactive"
                }`}
              >
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
