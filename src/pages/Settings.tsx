import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import {
  User, Shield, Bell, Palette, MessageSquare, Lock,
  HardDrive, HelpCircle, LogOut, ChevronRight, ChevronLeft,
  Moon, Sun, Monitor, Type, Vibrate, Eye, UserX, Trash2,
  KeyRound, Mail, ChevronDown, ChevronUp, AlertTriangle,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ACCENT_COLORS = [
  { name: "Фиолетовый", hsl: "263 83% 58%", gradient: "239 84% 67%" },
  { name: "Синий", hsl: "217 91% 60%", gradient: "220 91% 54%" },
  { name: "Зелёный", hsl: "142 76% 36%", gradient: "160 84% 39%" },
  { name: "Розовый", hsl: "330 81% 60%", gradient: "340 82% 52%" },
  { name: "Оранжевый", hsl: "25 95% 53%", gradient: "15 90% 50%" },
  { name: "Красный", hsl: "0 84% 60%", gradient: "10 80% 55%" },
];

const FONT_SIZES = [
  { label: "Мелкий", value: "small", size: "13px" },
  { label: "Обычный", value: "medium", size: "14px" },
  { label: "Крупный", value: "large", size: "16px" },
  { label: "Очень крупный", value: "xlarge", size: "18px" },
];

const FAQ_ITEMS = [
  { q: "Как изменить аватар?", a: "Перейдите в свой профиль, нажмите на аватар и выберите фотографию из галереи." },
  { q: "Как заблокировать пользователя?", a: "Откройте профиль пользователя в чате и нажмите «Заблокировать». Вы также можете управлять блокировками в Настройки → Конфиденциальность." },
  { q: "Как удалить аккаунт?", a: "В данный момент удаление аккаунта доступно через обращение в поддержку. Мы работаем над автоматической функцией." },
  { q: "Как сменить пароль?", a: "Перейдите в Настройки → Безопасность → Сменить пароль. Введите новый пароль и подтвердите его." },
  { q: "Как очистить кэш?", a: "Перейдите в Настройки → Хранилище и нажмите «Очистить кэш»." },
];

const BUBBLE_STYLES = [
  { label: "Закруглённая", radius: "18px 18px 4px 18px" },
  { label: "Прямая", radius: "8px 8px 2px 8px" },
  { label: "Круглая", radius: "24px 24px 4px 24px" },
];

const BUBBLE_COLORS = [
  { label: "Градиент", value: "gradient" },
  { label: "Сплошной", value: "solid" },
  { label: "Прозрачный", value: "transparent" },
];

type SettingsScreen = "main" | "appearance" | "privacy" | "notifications" | "storage" | "security" | "help" | "account" | "chats";

// Helper to get/set settings from localStorage
const getSetting = <T,>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(`vortex_${key}`);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch { return defaultValue; }
};
const setSetting = (key: string, value: any) => {
  localStorage.setItem(`vortex_${key}`, JSON.stringify(value));
};

// Apply theme to DOM
const applyTheme = (theme: "dark" | "light" | "auto") => {
  const root = document.documentElement;
  if (theme === "light") {
    root.classList.add("light");
  } else if (theme === "dark") {
    root.classList.remove("light");
  } else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (prefersDark) root.classList.remove("light");
    else root.classList.add("light");
  }
};

// Apply accent color
const applyAccent = (index: number) => {
  const color = ACCENT_COLORS[index];
  if (!color) return;
  const root = document.documentElement;
  root.style.setProperty("--primary", color.hsl);
  root.style.setProperty("--accent", color.hsl);
  root.style.setProperty("--ring", color.hsl);
  root.style.setProperty("--gradient-end", color.hsl);
  root.style.setProperty("--gradient-start", color.gradient);
  root.style.setProperty("--sidebar-primary", color.hsl);
  root.style.setProperty("--sidebar-ring", color.hsl);
};

// Apply font size
const applyFontSize = (index: number) => {
  document.documentElement.style.fontSize = FONT_SIZES[index]?.size || "14px";
};

// Initialize settings on app load
export const initializeSettings = () => {
  const theme = getSetting<"dark" | "light" | "auto">("theme", "dark");
  const accent = getSetting<number>("accent", 0);
  const fontSize = getSetting<number>("fontSize", 1);
  applyTheme(theme);
  applyAccent(accent);
  applyFontSize(fontSize);
};

const Settings = () => {
  const navigate = useNavigate();
  const { profile, signOut, user } = useAuth();
  const [screen, setScreen] = useState<SettingsScreen>("main");

  // Persisted settings
  const [theme, setThemeState] = useState<"dark" | "light" | "auto">(() => getSetting("theme", "dark"));
  const [accentIndex, setAccentIndex] = useState(() => getSetting("accent", 0));
  const [fontSizeIndex, setFontSizeIndex] = useState(() => getSetting("fontSize", 1));

  // Notification settings
  const [notifPush, setNotifPush] = useState(() => getSetting("notif_push", true));
  const [notifVibration, setNotifVibration] = useState(() => getSetting("notif_vibration", true));
  const [notifSound, setNotifSound] = useState(() => getSetting("notif_sound", true));

  // Privacy settings
  const [privacyOnline, setPrivacyOnline] = useState(() => getSetting("privacy_online", "all"));
  const [privacyLastSeen, setPrivacyLastSeen] = useState(() => getSetting("privacy_lastseen", "all"));
  const [privacyAvatar, setPrivacyAvatar] = useState(() => getSetting("privacy_avatar", "all"));

  // Chat customization
  const [bubbleStyleIndex, setBubbleStyleIndex] = useState(() => getSetting("bubble_style", 0));
  const [bubbleColorIndex, setBubbleColorIndex] = useState(() => getSetting("bubble_color", 0));

  // Blocked users
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  // Security
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // FAQ
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Storage
  const [cacheSize, setCacheSize] = useState<string>("...");
  const [clearingCache, setClearingCache] = useState(false);

  // Privacy cycle options
  const privacyOptions = ["all", "contacts", "nobody"] as const;
  const privacyLabels: Record<string, string> = { all: "Все", contacts: "Контакты", nobody: "Никто" };

  // Load blocked users
  useEffect(() => {
    if (screen === "privacy" && user) {
      setLoadingBlocked(true);
      // Query blocks separately then fetch profiles
      supabase.from("blocks").select("*").eq("blocker_id", user.id)
        .then(async ({ data: blocks }) => {
          if (!blocks || blocks.length === 0) {
            setBlockedUsers([]);
            setLoadingBlocked(false);
            return;
          }
          const blockedIds = blocks.map(b => b.blocked_id);
          const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", blockedIds);
          const merged = blocks.map(b => ({
            ...b,
            blocked_profile: profiles?.find(p => p.user_id === b.blocked_id)
          }));
          setBlockedUsers(merged);
          setLoadingBlocked(false);
        });
    }
  }, [screen, user]);

  // Calculate cache size
  useEffect(() => {
    if (screen === "storage") {
      calculateCacheSize();
    }
  }, [screen]);

  const calculateCacheSize = () => {
    try {
      let totalSize = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          totalSize += (localStorage.getItem(key)?.length || 0) * 2; // UTF-16
        }
      }
      // Also estimate session storage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          totalSize += (sessionStorage.getItem(key)?.length || 0) * 2;
        }
      }
      if (totalSize < 1024) setCacheSize(`${totalSize} Б`);
      else if (totalSize < 1024 * 1024) setCacheSize(`${(totalSize / 1024).toFixed(1)} КБ`);
      else setCacheSize(`${(totalSize / (1024 * 1024)).toFixed(1)} МБ`);
    } catch {
      setCacheSize("Неизвестно");
    }
  };

  // Theme
  const handleTheme = (t: "dark" | "light" | "auto") => {
    setThemeState(t);
    setSetting("theme", t);
    applyTheme(t);
  };

  // Accent
  const handleAccentChange = (index: number) => {
    setAccentIndex(index);
    setSetting("accent", index);
    applyAccent(index);
  };

  // Font
  const handleFontSize = (index: number) => {
    setFontSizeIndex(index);
    setSetting("fontSize", index);
    applyFontSize(index);
  };

  // Notifications
  const toggleNotif = (key: string, value: boolean, setter: (v: boolean) => void, _label: string) => {
    setter(!value);
    setSetting(key, !value);
  };

  // Privacy
  const cyclePrivacy = (key: string, current: string, setter: (v: string) => void, _label: string) => {
    const idx = privacyOptions.indexOf(current as any);
    const next = privacyOptions[(idx + 1) % privacyOptions.length];
    setter(next);
    setSetting(key, next);
  };

  // Unblock
  const handleUnblock = async (blockId: string) => {
    await supabase.from("blocks").delete().eq("id", blockId);
    setBlockedUsers((prev) => prev.filter((b) => b.id !== blockId));
  };

  // Password change
  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("Пароль должен быть минимум 6 символов");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Пароли не совпадают");
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      // keep error toasts for critical actions
    } else {
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPassword(false);
  };

  // Clear cache
  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      // Clear non-essential localStorage items (keep auth & settings)
      const keysToKeep = new Set<string>();
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("vortex_") || key.startsWith("sb-"))) {
          keysToKeep.add(key);
        }
      }
      const allKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !keysToKeep.has(key)) allKeys.push(key);
      }
      allKeys.forEach(k => localStorage.removeItem(k));

      // Clear session storage
      sessionStorage.clear();

      // Clear caches API
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map(name => caches.delete(name)));
      }

      await new Promise(r => setTimeout(r, 500));
      calculateCacheSize();
    } catch {
      // silent
    }
    setClearingCache(false);
  };

  // Chat customization
  const handleBubbleStyle = (index: number) => {
    setBubbleStyleIndex(index);
    setSetting("bubble_style", index);
  };

  const handleBubbleColor = (index: number) => {
    setBubbleColorIndex(index);
    setSetting("bubble_color", index);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const initials = profile
    ? (profile.display_name || profile.username).split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const settingsGroups = [
    {
      title: "Общие",
      items: [
        { icon: User, label: "Аккаунт", desc: "Данные профиля", color: "text-primary", screen: "account" as const },
        { icon: Shield, label: "Конфиденциальность", desc: "Кто видит, кто пишет", color: "text-primary", screen: "privacy" as const },
        { icon: Bell, label: "Уведомления", desc: "Звуки и вибрация", color: "text-primary", screen: "notifications" as const },
      ],
    },
    {
      title: "Приложение",
      items: [
        { icon: Palette, label: "Внешний вид", desc: "Тема, цвет, шрифт", color: "text-primary", screen: "appearance" as const },
        { icon: MessageSquare, label: "Чаты", desc: "Фон, пузыри, архив", color: "text-primary", screen: "chats" as const },
        { icon: Lock, label: "Безопасность", desc: "Пароль и код", color: "text-primary", screen: "security" as const },
      ],
    },
    {
      title: "Данные",
      items: [
        { icon: HardDrive, label: "Хранилище", desc: "Кэш и медиа", color: "text-primary", screen: "storage" as const },
        { icon: HelpCircle, label: "Помощь", desc: "FAQ и поддержка", color: "text-primary", screen: "help" as const },
      ],
    },
  ];

  const ToggleSwitch = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} className={`w-11 h-6 rounded-full p-0.5 transition-colors ${enabled ? "bg-primary" : "bg-secondary"}`}>
      <motion.div
        className="w-5 h-5 bg-foreground rounded-full"
        animate={{ x: enabled ? 20 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  );

  const renderSubScreen = () => {
    switch (screen) {
      case "appearance":
        return (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Тема</p>
              <div className="bg-card rounded-2xl overflow-hidden divide-y divide-border/30">
                {([
                  { key: "dark" as const, icon: Moon, label: "Тёмная" },
                  { key: "light" as const, icon: Sun, label: "Светлая" },
                  { key: "auto" as const, icon: Monitor, label: "Автоматическая" },
                ]).map((t) => (
                  <button key={t.key} onClick={() => handleTheme(t.key)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 ripple">
                    <div className="w-9 h-9 bg-secondary rounded-xl flex items-center justify-center">
                      <t.icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="flex-1 text-left text-sm text-foreground">{t.label}</span>
                    {theme === t.key && <div className="w-3 h-3 gradient-primary rounded-full" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Акцент</p>
              <div className="bg-card rounded-2xl p-4">
                <div className="flex flex-wrap gap-3">
                  {ACCENT_COLORS.map((color, i) => (
                    <button key={i} onClick={() => handleAccentChange(i)}
                      className={`w-10 h-10 rounded-full border-2 transition-all ${accentIndex === i ? "border-foreground scale-110" : "border-transparent"}`}
                      style={{ background: `hsl(${color.hsl})` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Размер текста</p>
              <div className="bg-card rounded-2xl p-4">
                <div className="flex justify-between gap-1">
                  {FONT_SIZES.map((fs, i) => (
                    <button key={i} onClick={() => handleFontSize(i)}
                      className={`flex-1 px-2 py-2 rounded-xl text-xs font-medium transition-all ${fontSizeIndex === i ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                      {fs.label}
                    </button>
                  ))}
                </div>
                <p className="text-muted-foreground mt-3" style={{ fontSize: FONT_SIZES[fontSizeIndex].size }}>
                  Пример текста сообщения
                </p>
              </div>
            </div>
          </div>
        );

      case "privacy":
        return (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Видимость</p>
              <div className="bg-card rounded-2xl overflow-hidden divide-y divide-border/30">
                {[
                  { icon: Eye, label: "Статус онлайн", value: privacyOnline, setter: setPrivacyOnline, key: "privacy_online" },
                  { icon: Eye, label: "Последний визит", value: privacyLastSeen, setter: setPrivacyLastSeen, key: "privacy_lastseen" },
                  { icon: Eye, label: "Фото профиля", value: privacyAvatar, setter: setPrivacyAvatar, key: "privacy_avatar" },
                ].map((item) => (
                  <button key={item.label} onClick={() => cyclePrivacy(item.key, item.value, item.setter, item.label)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 ripple">
                    <div className="w-9 h-9 bg-secondary rounded-xl flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm text-foreground">{item.label}</p>
                    </div>
                    <span className="text-xs text-primary font-medium">{privacyLabels[item.value]}</span>
                    <ChevronRight className="w-4 h-4 text-inactive" />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                Заблокированные ({blockedUsers.length})
              </p>
              <div className="bg-card rounded-2xl overflow-hidden divide-y divide-border/30">
                {loadingBlocked ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  </div>
                ) : blockedUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-4 py-4">Нет заблокированных</p>
                ) : (
                  blockedUsers.map((block) => (
                    <div key={block.id} className="flex items-center gap-3 px-4 py-3">
                      <UserX className="w-4 h-4 text-destructive" />
                      <span className="flex-1 text-sm text-foreground">
                        {block.blocked_profile?.display_name || block.blocked_profile?.username || "Пользователь"}
                      </span>
                      <button onClick={() => handleUnblock(block.id)} className="text-xs text-primary font-medium">
                        Разблокировать
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-6">
            <div className="bg-card rounded-2xl overflow-hidden divide-y divide-border/30">
              {[
                { icon: Bell, label: "Push-уведомления", enabled: notifPush, toggle: () => toggleNotif("notif_push", notifPush, setNotifPush, "Push-уведомления") },
                { icon: Vibrate, label: "Вибрация", enabled: notifVibration, toggle: () => toggleNotif("notif_vibration", notifVibration, setNotifVibration, "Вибрация") },
                { icon: Bell, label: "Звук сообщения", enabled: notifSound, toggle: () => toggleNotif("notif_sound", notifSound, setNotifSound, "Звук сообщения") },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="w-9 h-9 bg-secondary rounded-xl flex items-center justify-center">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="flex-1 text-sm text-foreground">{item.label}</span>
                  <ToggleSwitch enabled={item.enabled} onToggle={item.toggle} />
                </div>
              ))}
            </div>
          </div>
        );

      case "storage":
        return (
          <div className="space-y-6">
            <div className="bg-card rounded-2xl p-4">
              <div className="flex justify-between mb-3">
                <span className="text-sm text-foreground">Использовано</span>
                <span className="text-sm text-primary font-medium">{cacheSize}</span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full gradient-primary rounded-full transition-all" style={{ width: "15%" }} />
              </div>
            </div>
            <motion.button whileTap={{ scale: 0.98 }}
              onClick={handleClearCache}
              disabled={clearingCache}
              className="w-full bg-card rounded-2xl px-4 py-3.5 flex items-center gap-3 ripple disabled:opacity-50">
              <div className="w-9 h-9 bg-destructive/10 rounded-xl flex items-center justify-center">
                {clearingCache ? <Loader2 className="w-4 h-4 text-destructive animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}
              </div>
              <p className="text-sm font-medium text-destructive">{clearingCache ? "Очистка..." : "Очистить кэш"}</p>
            </motion.button>
          </div>
        );

      case "account":
        return (
          <div className="space-y-4">
            <div className="bg-card rounded-2xl p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Имя</p>
                <p className="text-sm text-foreground">{profile?.display_name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Username</p>
                <p className="text-sm text-foreground">@{profile?.username || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm text-foreground">{user?.email || "—"}</p>
              </div>
            </div>
            <motion.button whileTap={{ scale: 0.98 }} onClick={() => navigate("/profile")}
              className="w-full gradient-primary text-primary-foreground rounded-2xl px-4 py-3.5 text-sm font-semibold shadow-lg shadow-primary/25">
              Редактировать профиль
            </motion.button>
          </div>
        );

      case "security":
        return (
          <div className="space-y-6">
            {/* Change password */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Сменить пароль</p>
              <div className="bg-card rounded-2xl p-4 space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Новый пароль</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Минимум 6 символов"
                    className="w-full bg-secondary rounded-xl py-3 px-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Подтвердите пароль</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Повторите пароль"
                    className="w-full bg-secondary rounded-xl py-3 px-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 mt-1"
                  />
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleChangePassword}
                  disabled={changingPassword || !newPassword}
                  className="w-full gradient-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/25 disabled:opacity-50"
                >
                  {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  {changingPassword ? "Сохранение..." : "Сменить пароль"}
                </motion.button>
              </div>
            </div>

            {/* Reset password via email */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Восстановление</p>
              <motion.button whileTap={{ scale: 0.98 }}
                onClick={async () => {
                  if (!user?.email) return;
                  const { error } = await supabase.auth.resetPasswordForEmail(user.email);
                  if (error) { /* silent */ }
                  // silently sent
                }}
                className="w-full bg-card rounded-2xl px-4 py-3.5 flex items-center gap-3 ripple">
                <div className="w-9 h-9 bg-secondary rounded-xl flex items-center justify-center">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm text-foreground">Сбросить по email</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </motion.button>
            </div>
          </div>
        );

      case "chats":
        return (
          <div className="space-y-6">
            {/* Bubble shape */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Форма пузырей</p>
              <div className="bg-card rounded-2xl p-4">
                <div className="flex gap-2">
                  {BUBBLE_STYLES.map((style, i) => (
                    <button key={i} onClick={() => handleBubbleStyle(i)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all ${bubbleStyleIndex === i ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                      {style.label}
                    </button>
                  ))}
                </div>
                {/* Preview */}
                <div className="mt-4 space-y-2">
                  <div className="flex justify-end">
                    <div className="gradient-primary px-4 py-2 max-w-[70%] text-sm text-primary-foreground"
                      style={{ borderRadius: BUBBLE_STYLES[bubbleStyleIndex].radius }}>
                      Привет! 👋
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-secondary px-4 py-2 max-w-[70%] text-sm text-foreground"
                      style={{ borderRadius: BUBBLE_STYLES[bubbleStyleIndex].radius.split(" ").reverse().join(" ") }}>
                      Здарова!
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bubble color */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Цвет пузырей</p>
              <div className="bg-card rounded-2xl p-4">
                <div className="flex gap-2">
                  {BUBBLE_COLORS.map((color, i) => (
                    <button key={i} onClick={() => handleBubbleColor(i)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all ${bubbleColorIndex === i ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                      {color.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case "help":
        return (
          <div className="space-y-4">
            <div className="bg-card rounded-2xl overflow-hidden divide-y divide-border/30">
              {FAQ_ITEMS.map((item, i) => (
                <div key={i}>
                  <button
                    onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 ripple"
                  >
                    <HelpCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="flex-1 text-sm text-foreground text-left">{item.q}</span>
                    {openFaqIndex === i ? (
                      <ChevronUp className="w-4 h-4 text-inactive" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-inactive" />
                    )}
                  </button>
                  <AnimatePresence>
                    {openFaqIndex === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <p className="text-sm text-muted-foreground px-4 pb-3 pl-11">{item.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
            <div className="bg-card rounded-2xl p-4 text-center">
              <p className="text-sm text-foreground mb-1">Vortex v1.0</p>
              <p className="text-xs text-muted-foreground">Премиальный мессенджер</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-40 glass px-4 pt-12 pb-3">
        <div className="flex items-center gap-3">
          {screen !== "main" && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setScreen("main")}>
              <ChevronLeft className="w-5 h-5 text-primary" />
            </motion.button>
          )}
          <h1 className="text-2xl font-bold text-foreground">
            {screen === "main" ? "Настройки" :
              screen === "appearance" ? "Внешний вид" :
              screen === "privacy" ? "Конфиденциальность" :
              screen === "notifications" ? "Уведомления" :
              screen === "storage" ? "Хранилище" :
              screen === "security" ? "Безопасность" :
              screen === "account" ? "Аккаунт" :
              screen === "chats" ? "Чаты" :
              "Помощь"
            }
          </h1>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0, x: screen === "main" ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: screen === "main" ? 20 : -20 }}
          transition={{ duration: 0.2 }}
        >
          {screen === "main" ? (
            <>
              <div className="px-4 mt-2 mb-4">
                <motion.div whileTap={{ scale: 0.98 }} onClick={() => navigate("/profile")}
                  className="bg-card rounded-2xl p-4 flex items-center gap-3 cursor-pointer">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center text-lg font-bold text-primary-foreground">
                      {initials}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{profile?.display_name || profile?.username || "Загрузка"}</p>
                    <p className="text-sm text-muted-foreground">@{profile?.username || "..."}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-inactive" />
                </motion.div>
              </div>

              <div className="px-4 space-y-6">
                {settingsGroups.map((group) => (
                  <div key={group.title}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                      {group.title}
                    </p>
                    <div className="bg-card rounded-2xl overflow-hidden divide-y divide-border/30">
                      {group.items.map((item) => (
                        <motion.button key={item.label} whileTap={{ scale: 0.98 }}
                          onClick={() => setScreen(item.screen)}
                          className="w-full flex items-center gap-3 px-4 py-3.5 ripple">
                          <div className="w-9 h-9 bg-secondary rounded-xl flex items-center justify-center">
                            <item.icon className={`w-4 h-4 ${item.color}`} />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-foreground">{item.label}</p>
                            <p className="text-xs text-muted-foreground">{item.desc}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-inactive" />
                        </motion.button>
                      ))}
                    </div>
                  </div>
                ))}

                <motion.button whileTap={{ scale: 0.98 }} onClick={handleSignOut}
                  className="w-full bg-card rounded-2xl px-4 py-3.5 flex items-center gap-3 ripple">
                  <div className="w-9 h-9 bg-destructive/10 rounded-xl flex items-center justify-center">
                    <LogOut className="w-4 h-4 text-destructive" />
                  </div>
                  <p className="text-sm font-medium text-destructive">Выйти из аккаунта</p>
                </motion.button>
              </div>
            </>
          ) : (
            <div className="px-4 mt-4">
              {renderSubScreen()}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default Settings;
