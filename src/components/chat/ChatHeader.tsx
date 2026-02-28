import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Phone, Video } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

interface ChatHeaderProps {
  otherUser: Tables<"profiles"> | null;
  isTyping: boolean;
}

const getInitials = (name: string | null) => {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
};

const ChatHeader = ({ otherUser, isTyping }: ChatHeaderProps) => {
  const navigate = useNavigate();

  return (
    /*
     * .chat-appbar  →  defined in index.css
     * flex: 0 0 auto  inside the .chat-screen flex column.
     * NOT position:fixed — the flex column itself is fixed to the
     * viewport, so the header stays at the top without any JS tricks.
     */
    <div className="chat-appbar">
      <div className="flex items-center gap-3">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/")}>
          <ArrowLeft className="w-5 h-5 text-primary" />
        </motion.button>

        <div
          className="flex items-center gap-3 flex-1 cursor-pointer min-w-0"
          onClick={() => otherUser && navigate(`/user/${otherUser.user_id}`)}
        >
          <div className="relative flex-shrink-0">
            {otherUser?.avatar_url ? (
              <img src={otherUser.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-xs font-semibold text-primary-foreground flex-shrink-0">
                {getInitials(otherUser?.display_name || otherUser?.username || null)}
              </div>
            )}
            {otherUser?.is_online && (
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-background" />
            )}
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {otherUser?.display_name || otherUser?.username || "Загрузка..."}
            </p>
            <p className="text-xs text-primary">
              {isTyping ? (
                <span className="flex items-center gap-1">
                  печатает
                  <span className="flex gap-0.5">
                    <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                </span>
              ) : otherUser?.is_online ? "онлайн" : "был(а) недавно"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <motion.button whileTap={{ scale: 0.9 }} className="p-2">
            <Phone className="w-5 h-5 text-primary" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} className="p-2">
            <Video className="w-5 h-5 text-primary" />
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
