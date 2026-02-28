import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, CheckCheck, Trash2, Reply, Pin, MoreVertical, X
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Message = Tables<"messages">;
type Profile = Tables<"profiles">;

const REACTIONS = ["❤️", "👍", "😂", "😮", "😢", "🔥"];

interface MessageBubbleProps {
  msg: Message & { senderProfile?: Profile };
  isSent: boolean;
  replyMsg: (Message & { senderProfile?: Profile }) | null;
  userId: string;
  otherUser: Profile | null;
  contextMenu: string | null;
  showReactions: string | null;
  onContextMenu: (id: string | null) => void;
  onShowReactions: (id: string | null) => void;
  onReply: (msg: Message & { senderProfile?: Profile }) => void;
  onPin: (id: string, pinned: boolean) => void;
  onEdit: (msg: Message & { senderProfile?: Profile }) => void;
  onDelete: (id: string) => void;
  onReaction: (id: string, emoji: string) => void;
}

const MessageBubble = memo(({
  msg, isSent, replyMsg, userId, otherUser,
  contextMenu, showReactions,
  onContextMenu, onShowReactions,
  onReply, onPin, onEdit, onDelete, onReaction,
}: MessageBubbleProps) => {
  return (
    <div
      className={`flex ${isSent ? "justify-end" : "justify-start"} relative`}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(contextMenu === msg.id ? null : msg.id);
        onShowReactions(null);
      }}
      onDoubleClick={() => onShowReactions(showReactions === msg.id ? null : msg.id)}
    >
      <div className="max-w-[80%] relative">
        {/* Reply preview */}
        {replyMsg && (
          <div className={`px-3 pt-2 pb-0.5 mb-0 rounded-t-2xl text-xs ${isSent ? "bubble-sent" : "bubble-received"} border-l-2 border-primary/50`}>
            <p className="text-primary font-medium text-[11px]">
              {replyMsg.sender_id === userId ? "Вы" : otherUser?.display_name || otherUser?.username}
            </p>
            <p className="text-foreground/60 truncate">{replyMsg.content}</p>
          </div>
        )}

        <div className={`px-3.5 py-2.5 ${isSent ? "bubble-sent" : "bubble-received"} ${replyMsg ? "rounded-t-none" : ""}`}>
          {msg.is_pinned && <Pin className="w-3 h-3 text-primary/60 rotate-45 mb-1" />}
          <p className="text-sm text-foreground leading-relaxed">{msg.content}</p>
          <div className={`flex items-center gap-1 mt-1 ${isSent ? "justify-end" : "justify-start"}`}>
            <span className="text-[10px] text-foreground/50">
              {new Date(msg.created_at!).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
            </span>
            {msg.updated_at && msg.updated_at !== msg.created_at && (
              <span className="text-[10px] text-foreground/40">ред.</span>
            )}
            {isSent && (
              msg.is_read
                ? <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                : msg.is_delivered
                  ? <CheckCheck className="w-3.5 h-3.5 text-foreground/40" />
                  : <Check className="w-3.5 h-3.5 text-foreground/40" />
            )}
          </div>
        </div>

        {/* Reaction badge */}
        {msg.reaction && (
          <div
            className={`absolute -bottom-2 ${isSent ? "left-2" : "right-2"} bg-card rounded-full px-1.5 py-0.5 text-sm shadow-md border border-border/30 cursor-pointer`}
            onClick={(e) => { e.stopPropagation(); onShowReactions(msg.id); }}
          >
            {msg.reaction}
          </div>
        )}
      </div>

      {/* Reaction picker */}
      <AnimatePresence>
        {showReactions === msg.id && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 8 }}
            className={`absolute bottom-full mb-2 ${isSent ? "right-0" : "left-0"} bg-card rounded-2xl shadow-xl border border-border/50 px-2 py-1.5 flex gap-1 z-50`}
            onClick={(e) => e.stopPropagation()}
          >
            {REACTIONS.map((emoji) => (
              <motion.button
                key={emoji}
                whileTap={{ scale: 0.8 }}
                whileHover={{ scale: 1.3 }}
                onClick={() => onReaction(msg.id, emoji)}
                className="text-xl p-1 hover:bg-secondary rounded-lg transition-colors"
              >
                {emoji}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context menu */}
      <AnimatePresence>
        {contextMenu === msg.id && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`absolute top-full ${isSent ? "right-0" : "left-0"} mt-1 bg-card rounded-xl shadow-xl border border-border p-1 z-50 min-w-[160px]`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { onReply(msg); onContextMenu(null); }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary rounded-lg w-full"
            >
              <Reply className="w-4 h-4" /> Ответить
            </button>
            <button
              onClick={() => onPin(msg.id, !!msg.is_pinned)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary rounded-lg w-full"
            >
              <Pin className="w-4 h-4" /> {msg.is_pinned ? "Открепить" : "Закрепить"}
            </button>
            {isSent && (
              <>
                <button
                  onClick={() => onEdit(msg)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary rounded-lg w-full"
                >
                  <MoreVertical className="w-4 h-4" /> Редактировать
                </button>
                <button
                  onClick={() => { onDelete(msg.id); onContextMenu(null); }}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-secondary rounded-lg w-full"
                >
                  <Trash2 className="w-4 h-4" /> Удалить
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

MessageBubble.displayName = "MessageBubble";
export default MessageBubble;
