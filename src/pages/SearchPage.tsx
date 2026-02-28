import { useState } from "react";
import { motion } from "framer-motion";
import { Search as SearchIcon, X, Loader2, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStartChat } from "@/hooks/useChat";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

const SearchPage = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Tables<"profiles">[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);
  const { user } = useAuth();
  const { startChat } = useStartChat();
  const navigate = useNavigate();

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .neq("user_id", user?.id ?? "")
      .limit(20);
    setResults(data ?? []);
    setLoading(false);
  };

  const handleStartChat = async (otherUserId: string) => {
    setStarting(otherUserId);
    const chatId = await startChat(otherUserId);
    if (chatId) {
      navigate(`/chat/${chatId}`);
    } else {
      toast.error("Не удалось создать чат");
    }
    setStarting(null);
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-40 glass px-4 pt-12 pb-3">
        <h1 className="text-2xl font-bold text-foreground mb-3">Поиск</h1>
        <div className="relative">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-inactive" />
          <input type="text" placeholder="Поиск по username или имени" value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-secondary rounded-xl py-3 pl-11 pr-10 text-sm text-foreground placeholder:text-inactive outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
          {query && (
            <button onClick={() => { setQuery(""); setResults([]); }} className="absolute right-3.5 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-inactive" />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 mt-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : query.trim().length >= 2 && results.length === 0 ? (
          <p className="text-center text-muted-foreground py-12 text-sm">Ничего не найдено</p>
        ) : (
          <div className="space-y-1">
            {results.map((profile, i) => (
              <motion.div key={profile.id}
                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 py-3 px-2 rounded-xl">
                <div className="relative">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover" />
                  ) : (
                    <div className="w-11 h-11 rounded-full gradient-primary flex items-center justify-center text-xs font-semibold text-primary-foreground">
                      {getInitials(profile.display_name || profile.username)}
                    </div>
                  )}
                  {profile.is_online && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-background" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{profile.display_name || profile.username}</p>
                  <p className="text-xs text-muted-foreground">@{profile.username}</p>
                </div>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleStartChat(profile.user_id)}
                  disabled={starting === profile.user_id}
                  className="w-9 h-9 gradient-primary rounded-full flex items-center justify-center shadow-md shadow-primary/20">
                  {starting === profile.user_id ? (
                    <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
                  ) : (
                    <MessageCircle className="w-4 h-4 text-primary-foreground" />
                  )}
                </motion.button>
              </motion.div>
            ))}
          </div>
        )}

        {!query.trim() && (
          <div className="text-center py-16">
            <SearchIcon className="w-12 h-12 text-muted mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Найдите пользователей по username или имени</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default SearchPage;
