import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { AnimatePresence, motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Loader2, Pin, Reply } from "lucide-react";
import { useMessages } from "@/hooks/useChat";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatInput from "@/components/chat/ChatInput";
import MessageBubble from "@/components/chat/MessageBubble";

const ChatView = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { messages, loading, sendMessage, deleteMessage, editMessage } = useMessages(id);
  const [inputText, setInputText] = useState("");
  const [otherUser, setOtherUser] = useState<Tables<"profiles"> | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [contextMenu, setContextMenu] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; content: string; senderName: string } | null>(null);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [isTyping] = useState(false);
  const [editingMsg, setEditingMsg] = useState<{ id: string; content: string } | null>(null);
  const isInitialScroll = useRef(true);

  /* ─── Scroll helpers ─────────────────────────────────────── */

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // Scroll to bottom on initial load + every new message
  useEffect(() => {
    if (!loading && messages.length > 0) {
      requestAnimationFrame(() => {
        scrollToBottom(!isInitialScroll.current);
        isInitialScroll.current = false;
      });
    }
  }, [messages.length, loading, scrollToBottom]);

  /* ─── Scroll when keyboard opens (resizes-content mode) ─── */
  /*
   * With interactive-widget=resizes-content the layout viewport shrinks
   * when the keyboard opens.  The .chat-messages div loses height so the
   * last messages may be hidden.  We detect that via ResizeObserver and
   * scroll to the bottom again.
   */
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      scrollToBottom(false);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [scrollToBottom]);

  /* ─── Fetch other user ───────────────────────────────────── */

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const { data: members } = await supabase
        .from("chat_memberships")
        .select("user_id")
        .eq("chat_id", id)
        .neq("user_id", user.id);
      if (members?.[0]) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", members[0].user_id)
          .single();
        if (profile) setOtherUser(profile);
      }
    })();
  }, [id, user]);

  /* ─── Message actions ────────────────────────────────────── */

  const handleSend = async () => {
    if (editingMsg) {
      if (!inputText.trim()) return;
      await editMessage(editingMsg.id, inputText);
      setEditingMsg(null);
      setInputText("");
      return;
    }
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText("");
    setReplyTo(null);
    await sendMessage(text);
    requestAnimationFrame(() => scrollToBottom(true));
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    await supabase.from("messages").update({ reaction: emoji }).eq("id", messageId);
    setShowReactions(null);
  };

  const handlePin = async (messageId: string, currentPinned: boolean) => {
    await supabase.from("messages").update({ is_pinned: !currentPinned }).eq("id", messageId);
    setContextMenu(null);
  };

  const handleEdit = (msg: typeof messages[0]) => {
    setEditingMsg({ id: msg.id, content: msg.content });
    setInputText(msg.content);
    setContextMenu(null);
    inputRef.current?.focus();
  };

  const handleReply = (msg: typeof messages[0]) => {
    setReplyTo({
      id: msg.id,
      content: msg.content,
      senderName: msg.senderProfile?.display_name || msg.senderProfile?.username || "",
    });
    inputRef.current?.focus();
  };

  const getReplyMessage = (replyToId: string | null) => {
    if (!replyToId) return null;
    return messages.find((m) => m.id === replyToId) ?? null;
  };

  /* ─── Pinned banner height (used as scroll padding) ─────── */
  const hasPinned = messages.some((m) => m.is_pinned);

  return (
    /*
     * .chat-screen  →  flex column, height: 100%, overflow: hidden
     * (defined in index.css).
     *
     * With  interactive-widget=resizes-content  in <meta viewport>
     * the ENTIRE column shrinks when the Android soft keyboard opens.
     * – ChatHeader (flex: 0 0 auto) stays pinned at the top — never moves.
     * – ChatInput  (flex: 0 0 auto) stays pinned at the bottom — rides
     *   up with the keyboard.
     * – .chat-messages (flex: 1 1 auto) takes the remaining space and
     *   scrolls normally.
     *
     * No position:fixed, no 100dvh, no JS resize hacks needed.
     */
    <div className="chat-screen bg-background">
      {/* ── AppBar ──────────────────────────────────────────── */}
      <ChatHeader otherUser={otherUser} isTyping={isTyping} />

      {/* ── Pinned message banner ────────────────────────────── */}
      {hasPinned && (
        <div className="flex-shrink-0 px-3 py-2 bg-card/80 border-b border-border/30 z-40">
          <div className="flex items-center gap-2">
            <Pin className="w-3.5 h-3.5 text-primary rotate-45 flex-shrink-0" />
            <p className="text-xs text-muted-foreground truncate">
              {messages.filter((m) => m.is_pinned).slice(-1)[0]?.content}
            </p>
          </div>
        </div>
      )}

      {/* ── Scrollable message list ──────────────────────────── */}
      <div
        ref={scrollContainerRef}
        className="chat-messages"
        onClick={() => { setContextMenu(null); setShowReactions(null); }}
      >
        {/* Inner wrapper pushes messages to the bottom when there are few */}
        <div className="flex flex-col min-h-full justify-end px-3 py-3 space-y-1.5">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-sm">Начните общение!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isSent = msg.sender_id === user?.id;
              const replyMsg = getReplyMessage(msg.reply_to ?? null);
              return (
                <SwipeableMessage
                  key={msg.id}
                  isSent={isSent}
                  onSwipeReply={() => handleReply(msg)}
                >
                  <MessageBubble
                    msg={msg}
                    isSent={isSent}
                    replyMsg={replyMsg}
                    userId={user?.id || ""}
                    otherUser={otherUser}
                    contextMenu={contextMenu}
                    showReactions={showReactions}
                    onContextMenu={setContextMenu}
                    onShowReactions={setShowReactions}
                    onReply={handleReply}
                    onPin={handlePin}
                    onEdit={handleEdit}
                    onDelete={(msgId) => { deleteMessage(msgId); setContextMenu(null); }}
                    onReaction={handleReaction}
                  />
                </SwipeableMessage>
              );
            })
          )}

          {/* Typing indicator */}
          <AnimatePresence>
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="flex justify-start"
              >
                <div className="bubble-received px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-foreground/40 rounded-full" style={{ animation: "pulse-dot 1.4s infinite 0s" }} />
                    <span className="w-2 h-2 bg-foreground/40 rounded-full" style={{ animation: "pulse-dot 1.4s infinite 0.2s" }} />
                    <span className="w-2 h-2 bg-foreground/40 rounded-full" style={{ animation: "pulse-dot 1.4s infinite 0.4s" }} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Input bar ────────────────────────────────────────── */}
      <ChatInput
        ref={inputRef}
        inputText={inputText}
        onInputChange={setInputText}
        onSend={handleSend}
        replyTo={replyTo}
        editingMsg={editingMsg}
        onCancelReply={() => { setReplyTo(null); setEditingMsg(null); setInputText(""); }}
      />
    </div>
  );
};

/* ─── SwipeableMessage ──────────────────────────────────────── */

const SwipeableMessage = ({
  children,
  isSent,
  onSwipeReply,
}: {
  children: React.ReactNode;
  isSent: boolean;
  onSwipeReply: () => void;
}) => {
  const x = useMotionValue(0);
  const replyIconOpacity = useTransform(x, isSent ? [-80, -40] : [40, 80], [1, 0]);
  const replyIconScale  = useTransform(x, isSent ? [-80, -30] : [30, 80], [1, 0.5]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 60;
    const triggered =
      (isSent && info.offset.x < -threshold) ||
      (!isSent && info.offset.x > threshold);
    x.set(0);
    if (triggered) onSwipeReply();
  };

  return (
    <div className="relative overflow-hidden">
      <motion.div
        className={`absolute top-1/2 -translate-y-1/2 ${isSent ? "left-2" : "right-2"}`}
        style={{ opacity: replyIconOpacity, scale: replyIconScale }}
      >
        <Reply className="w-5 h-5 text-primary" />
      </motion.div>
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.3}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative"
      >
        {children}
      </motion.div>
    </div>
  );
};

export default ChatView;
