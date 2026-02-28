import { forwardRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smile, Paperclip, Mic, Send, X } from "lucide-react";

interface ChatInputProps {
  inputText: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  replyTo: { id: string; content: string; senderName: string } | null;
  editingMsg: { id: string; content: string } | null;
  onCancelReply: () => void;
}

const ChatInput = forwardRef<HTMLInputElement, ChatInputProps>(
  ({ inputText, onInputChange, onSend, replyTo, editingMsg, onCancelReply }, ref) => {

    /*
     * On Android WebView tapping a button blurs the input, which closes
     * the keyboard.  We prevent that by calling preventDefault() on the
     * pointerdown event of the send button — the input never loses focus
     * so the keyboard stays open.
     */
    const handleSendPointerDown = useCallback((e: React.PointerEvent) => {
      e.preventDefault(); // keeps input focused → keyboard stays open
    }, []);

    const handleSendClick = useCallback(() => {
      if (inputText.trim()) {
        onSend();
        // Re-focus after React re-render so the keyboard never hides
        requestAnimationFrame(() => {
          (ref as React.RefObject<HTMLInputElement>)?.current?.focus();
        });
      }
    }, [inputText, onSend, ref]);

    return (
      /*
       * .chat-inputbar  →  defined in index.css
       * flex: 0 0 auto at the bottom of the .chat-screen flex column.
       * NOT position:fixed — the keyboard shrinks the flex column so
       * this bar rides up with the keyboard naturally.
       */
      <div className="chat-inputbar">
        {/* Reply / Edit bar */}
        <AnimatePresence>
          {(replyTo || editingMsg) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-3 bg-card border-b border-border/30 overflow-hidden"
            >
              <div className="flex items-center gap-2 py-2">
                <div className="w-1 h-8 bg-primary rounded-full flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-primary">
                    {editingMsg ? "Редактирование" : replyTo?.senderName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {editingMsg ? editingMsg.content : replyTo?.content}
                  </p>
                </div>
                <button
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={onCancelReply}
                  className="flex-shrink-0 p-1"
                >
                  <X className="w-4 h-4 text-inactive" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input row */}
        <div className="px-3 py-2.5 safe-bottom">
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="p-1.5 flex-shrink-0"
              onPointerDown={(e) => e.preventDefault()}
            >
              <Paperclip className="w-5 h-5 text-inactive" />
            </motion.button>

            <div className="flex-1 flex items-center bg-secondary rounded-full px-4 py-2.5 min-w-0">
              <Smile className="w-5 h-5 text-inactive mr-2 flex-shrink-0 cursor-pointer" />
              <input
                ref={ref}
                type="text"
                inputMode="text"
                placeholder="Сообщение..."
                value={inputText}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-inactive outline-none min-w-0"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="sentences"
                spellCheck="false"
              />
            </div>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onPointerDown={handleSendPointerDown}
              onClick={handleSendClick}
              className="p-1.5 flex-shrink-0"
            >
              {inputText.trim() ? (
                <div className="w-9 h-9 gradient-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
                  <Send className="w-4 h-4 text-primary-foreground" />
                </div>
              ) : (
                <Mic className="w-5 h-5 text-primary" />
              )}
            </motion.button>
          </div>
        </div>
      </div>
    );
  }
);

ChatInput.displayName = "ChatInput";
export default ChatInput;
