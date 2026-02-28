import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MessageCircle, BellOff, Ban, AtSign, Loader2, Image, FileText, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStartChat } from "@/hooks/useChat";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

const UserProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [loading, setLoading] = useState(true);
  const { startChat } = useStartChat();
  const [starting, setStarting] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activeTab, setActiveTab] = useState<"media" | "files" | "groups">("media");

  useEffect(() => {
    if (!id) return;
    supabase.from("profiles").select("*").eq("user_id", id).single().then(({ data }) => {
      setProfile(data);
      setLoading(false);
    });
    // Check block status
    if (user) {
      supabase.from("blocks").select("id").eq("blocker_id", user.id).eq("blocked_id", id).single().then(({ data }) => {
        setIsBlocked(!!data);
      });
    }
  }, [id, user]);

  const handleChat = async () => {
    if (!id) return;
    setStarting(true);
    const chatId = await startChat(id);
    if (chatId) navigate(`/chat/${chatId}`);
    else toast.error("Не удалось создать чат");
    setStarting(false);
  };

  const handleBlock = async () => {
    if (!user || !id) return;
    if (isBlocked) {
      await supabase.from("blocks").delete().eq("blocker_id", user.id).eq("blocked_id", id);
      setIsBlocked(false);
      toast.success("Пользователь разблокирован");
    } else {
      await supabase.from("blocks").insert({ blocker_id: user.id, blocked_id: id });
      setIsBlocked(true);
      toast.success("Пользователь заблокирован");
    }
  };

  const handleMute = () => {
    setIsMuted(!isMuted);
    toast.success(isMuted ? "Уведомления включены" : "Уведомления отключены");
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-primary animate-spin" />
    </div>
  );

  if (!profile) return null;

  const initials = (profile.display_name || profile.username)
    .split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const actions = [
    { icon: MessageCircle, label: "Написать", color: "text-primary", onClick: handleChat, isLoading: starting },
    { icon: BellOff, label: isMuted ? "Вкл. звук" : "Без звука", color: isMuted ? "text-primary" : "text-muted-foreground", onClick: handleMute, isLoading: false },
    { icon: Ban, label: isBlocked ? "Разблокировать" : "Заблокировать", color: isBlocked ? "text-primary" : "text-destructive", onClick: handleBlock, isLoading: false },
  ];

  const tabs = [
    { key: "media" as const, label: "Медиа", icon: Image },
    { key: "files" as const, label: "Файлы", icon: FileText },
    { key: "groups" as const, label: "Группы", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      <div className="relative">
        <div className="h-44 gradient-primary opacity-80" />
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="absolute top-10 left-4 z-10">
          <ArrowLeft className="w-5 h-5 text-primary-foreground" />
        </motion.button>

        <div className="absolute -bottom-14 left-1/2 -translate-x-1/2">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-28 h-28 rounded-full object-cover border-4 border-background shadow-xl" />
          ) : (
            <div className="w-28 h-28 rounded-full gradient-primary flex items-center justify-center text-3xl font-bold text-primary-foreground border-4 border-background shadow-xl">
              {initials}
            </div>
          )}
          {profile.is_online && (
            <div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 rounded-full border-3 border-background" />
          )}
        </div>
      </div>

      <div className="px-4 pt-2 mt-10">
        <div className="text-center mb-6 mt-8">
          <h2 className="text-xl font-bold text-foreground">{profile.display_name || profile.username}</h2>
          <p className="text-sm text-primary flex items-center justify-center gap-1 mt-1">
            <AtSign className="w-3.5 h-3.5" /> {profile.username}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {profile.is_online ? "онлайн" : "был(а) недавно"}
          </p>
          {profile.status && <p className="text-sm text-muted-foreground mt-2">{profile.status}</p>}
        </div>

        <div className="flex justify-center gap-6 mb-6">
          {actions.map((action) => (
            <motion.button key={action.label} whileTap={{ scale: 0.9 }} onClick={action.onClick}
              className="flex flex-col items-center gap-1.5">
              <div className="w-12 h-12 bg-card rounded-2xl flex items-center justify-center">
                {action.isLoading ? (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                ) : (
                  <action.icon className={`w-5 h-5 ${action.color}`} />
                )}
              </div>
              <span className="text-[11px] text-muted-foreground">{action.label}</span>
            </motion.button>
          ))}
        </div>

        {profile.bio && (
          <div className="bg-card rounded-2xl p-4 mb-4">
            <p className="text-sm text-muted-foreground">{profile.bio}</p>
          </div>
        )}

        {/* Media tabs */}
        <div className="flex bg-secondary rounded-xl p-1 mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-center gap-1.5 ${
                activeTab === tab.key
                  ? "gradient-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-card rounded-2xl p-8 text-center mb-8">
          <p className="text-sm text-muted-foreground">
            {activeTab === "media" ? "Нет медиафайлов" : activeTab === "files" ? "Нет файлов" : "Нет общих групп"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
