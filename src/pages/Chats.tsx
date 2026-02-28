import { useState } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Edit2, Plus, Loader2, Pin, Archive, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useChats } from "@/hooks/useChat";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { toast } from "sonner";

const Chats = () => {
  const [filter, setFilter] = useState<"all" | "unread" | "pinned" | "archived">("all");
  const { chats, loading, refetch } = useChats();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [swipedChat, setSwipedChat] = useState<string | null>(null);

  const filtered = chats.filter((c) => {
    if (filter === "unread") return c.unreadCount > 0;
    if (filter === "pinned") return c.membership.is_pinned;
    if (filter === "archived") return c.membership.is_archived;
    return !c.membership.is_archived;
  });

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: false, locale: ru });
    } catch { return ""; }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  };

  const handlePin = async (membershipId: string, currentPinned: boolean | null) => {
    await supabase.from("chat_memberships").update({ is_pinned: !currentPinned }).eq("id", membershipId);
    toast.success(currentPinned ? "Чат откреплён" : "Чат закреплён");
    refetch();
    setSwipedChat(null);
  };

  const handleArchive = async (membershipId: string, currentArchived: boolean | null) => {
    await supabase.from("chat_memberships").update({ is_archived: !currentArchived }).eq("id", membershipId);
    toast.success(currentArchived ? "Чат разархивирован" : "Чат в архиве");
    refetch();
    setSwipedChat(null);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-40 glass px-4 pt-12 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-foreground">Чаты</h1>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/search")}
            className="w-9 h-9 gradient-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/25">
            <Edit2 className="w-4 h-4 text-primary-foreground" />
          </motion.button>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {(["all", "unread", "pinned", "archived"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                filter === f ? "gradient-primary text-primary-foreground shadow-md" : "bg-secondary text-muted-foreground"
              }`}>
              {f === "all" ? "Все" : f === "unread" ? "Непрочитанные" : f === "pinned" ? "Закреплённые" : "Архив"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 px-4">
          <p className="text-muted-foreground text-sm">Нет чатов</p>
          <p className="text-muted-foreground text-xs mt-1">Найдите пользователя в поиске, чтобы начать общение</p>
        </div>
      ) : (
        <div className="divide-y divide-border/30">
          {filtered.map((chat, index) => (
            <div key={chat.id} className="relative overflow-hidden">
              {/* Swipe actions background */}
              <div className="absolute inset-y-0 right-0 flex items-stretch">
                <button onClick={() => handlePin(chat.membership.id, chat.membership.is_pinned)}
                  className="w-16 gradient-primary flex items-center justify-center">
                  <Pin className="w-5 h-5 text-primary-foreground" />
                </button>
                <button onClick={() => handleArchive(chat.membership.id, chat.membership.is_archived)}
                  className="w-16 bg-secondary flex items-center justify-center">
                  <Archive className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.25 }}
                drag="x"
                dragConstraints={{ left: -130, right: 0 }}
                dragElastic={0.1}
                onDragEnd={(_, info: PanInfo) => {
                  if (info.offset.x < -80) setSwipedChat(chat.id);
                  else setSwipedChat(null);
                }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/chat/${chat.id}`)}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer ripple bg-background relative z-10"
              >
                <div className="relative flex-shrink-0">
                  {chat.otherUser.avatar_url ? (
                    <img src={chat.otherUser.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-sm font-semibold text-primary-foreground">
                      {getInitials(chat.otherUser.display_name || chat.otherUser.username)}
                    </div>
                  )}
                  {chat.otherUser.is_online && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {chat.membership.is_pinned && <Pin className="w-3 h-3 text-primary rotate-45" />}
                      <span className="font-semibold text-sm text-foreground truncate">
                        {chat.otherUser.display_name || chat.otherUser.username}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatTime(chat.lastMessage?.created_at ?? null)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-sm text-muted-foreground truncate pr-2">
                      {chat.lastMessage?.content || "Нет сообщений"}
                    </p>
                    {chat.unreadCount > 0 && (
                      <span className="flex-shrink-0 min-w-[20px] h-5 gradient-primary rounded-full flex items-center justify-center text-[11px] font-semibold text-primary-foreground px-1.5">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      )}

      <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/search")}
        className="fixed bottom-24 right-4 w-14 h-14 gradient-primary rounded-full flex items-center justify-center shadow-xl shadow-primary/30 z-40">
        <Plus className="w-6 h-6 text-primary-foreground" />
      </motion.button>

      <BottomNav />
    </div>
  );
};

export default Chats;
