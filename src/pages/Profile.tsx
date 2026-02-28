import { useState, useRef, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Camera, AtSign, Info, Image, FileText, Users, ArrowLeft, Loader2, Save, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [status, setStatus] = useState(profile?.status ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<"media" | "files" | "groups">("media");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { scrollY } = useScroll({ container: scrollRef });
  const headerHeight = useTransform(scrollY, [0, 120], [160, 80]);
  const avatarScale = useTransform(scrollY, [0, 120], [1, 0.6]);
  const avatarY = useTransform(scrollY, [0, 120], [0, -20]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setBio(profile.bio ?? "");
      setStatus(profile.status ?? "");
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim(), bio: bio.trim(), status: status.trim() })
      .eq("user_id", profile.user_id);
    if (error) toast.error("Ошибка сохранения");
    else {
      toast.success("Профиль обновлён");
      await refreshProfile();
      setEditing(false);
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);

    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error("Ошибка загрузки аватара");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);

    await supabase
      .from("profiles")
      .update({ avatar_url: urlData.publicUrl })
      .eq("user_id", user.id);

    await refreshProfile();
    toast.success("Аватар обновлён");
    setUploading(false);
  };

  if (!profile) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-primary animate-spin" />
    </div>
  );

  const initials = (profile.display_name || profile.username)
    .split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const tabs = [
    { key: "media" as const, label: "Медиа", icon: Image },
    { key: "files" as const, label: "Файлы", icon: FileText },
    { key: "groups" as const, label: "Группы", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div ref={scrollRef} className="overflow-y-auto" style={{ height: "calc(100vh - 80px)" }}>
        {/* Collapsible header */}
        <div className="relative">
          <motion.div className="gradient-primary opacity-80" style={{ height: headerHeight }} />
          <div className="absolute top-10 left-4 z-10">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5 text-primary-foreground" />
            </motion.button>
          </div>
          {!editing && (
            <div className="absolute top-10 right-4 z-10">
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setEditing(true)}
                className="px-3 py-1.5 bg-background/20 rounded-full text-xs text-primary-foreground backdrop-blur-sm">
                Изменить
              </motion.button>
            </div>
          )}
          <div className="absolute -bottom-12 left-0 right-0 flex justify-center z-10">
            <motion.div style={{ scale: avatarScale, y: avatarY }}>
            <div className="relative">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-background shadow-xl" />
              ) : (
                <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground border-4 border-background shadow-xl">
                  {initials}
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 w-8 h-8 gradient-primary rounded-full flex items-center justify-center border-2 border-background"
              >
                {uploading ? (
                  <Loader2 className="w-3.5 h-3.5 text-primary-foreground animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5 text-primary-foreground" />
                )}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
            </motion.div>
          </div>
        </div>

        <div className="mt-16 px-4">
          {editing ? (
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-xs text-muted-foreground">Имя</label>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-secondary rounded-xl py-3 px-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Статус</label>
                <input value={status} onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-secondary rounded-xl py-3 px-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Био</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
                  className="w-full bg-secondary rounded-xl py-3 px-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 mt-1 resize-none" />
              </div>
              <div className="flex gap-3">
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving}
                  className="flex-1 gradient-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/25 disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Сохранить</>}
                </motion.button>
                <button onClick={() => setEditing(false)} className="px-4 py-3 bg-secondary rounded-xl text-sm text-muted-foreground">
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-foreground">{profile.display_name || profile.username}</h2>
                <p className="text-sm text-primary flex items-center justify-center gap-1 mt-1">
                  <AtSign className="w-3.5 h-3.5" /> {profile.username}
                </p>
                {profile.status && <p className="text-sm text-muted-foreground mt-1">{profile.status}</p>}
              </div>

              {profile.bio && (
                <div className="bg-card rounded-2xl p-4 mb-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4 text-primary" /> Био
                  </h3>
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

              <div className="bg-card rounded-2xl p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {activeTab === "media" ? "Нет медиафайлов" : activeTab === "files" ? "Нет файлов" : "Нет групп"}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Profile;
