import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

type Message = Tables<"messages">;
type Profile = Tables<"profiles">;

interface ChatWithDetails {
  id: string;
  otherUser: Profile;
  lastMessage: Message | null;
  membership: Tables<"chat_memberships">;
  unreadCount: number;
}

export function useChats() {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChats = useCallback(async () => {
    if (!user) return;
    
    // Get all chat memberships for current user
    const { data: memberships } = await supabase
      .from("chat_memberships")
      .select("*")
      .eq("user_id", user.id);

    if (!memberships || memberships.length === 0) {
      setChats([]);
      setLoading(false);
      return;
    }

    const chatIds = memberships.map((m) => m.chat_id);

    // Get other members' profiles
    const { data: otherMemberships } = await supabase
      .from("chat_memberships")
      .select("*")
      .in("chat_id", chatIds)
      .neq("user_id", user.id);

    const otherUserIds = [...new Set(otherMemberships?.map((m) => m.user_id) ?? [])];
    
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("user_id", otherUserIds);

    // Get last messages for each chat
    const chatDetails: ChatWithDetails[] = [];

    for (const membership of memberships) {
      const { data: lastMsgArr } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", membership.chat_id)
        .order("created_at", { ascending: false })
        .limit(1);

      const otherMembership = otherMemberships?.find(
        (m) => m.chat_id === membership.chat_id
      );
      const otherProfile = profiles?.find(
        (p) => p.user_id === otherMembership?.user_id
      );

      if (!otherProfile) continue;

      // Count unread
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("chat_id", membership.chat_id)
        .eq("is_read", false)
        .neq("sender_id", user.id);

      chatDetails.push({
        id: membership.chat_id,
        otherUser: otherProfile,
        lastMessage: lastMsgArr?.[0] ?? null,
        membership,
        unreadCount: count ?? 0,
      });
    }

    // Sort by last message time
    chatDetails.sort((a, b) => {
      const aTime = a.lastMessage?.created_at ?? a.membership.joined_at ?? "";
      const bTime = b.lastMessage?.created_at ?? b.membership.joined_at ?? "";
      return bTime.localeCompare(aTime);
    });

    setChats(chatDetails);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("chat-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        fetchChats();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchChats]);

  return { chats, loading, refetch: fetchChats };
}

export function useMessages(chatId: string | undefined) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<(Message & { senderProfile?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!chatId || !user) return;

    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (data) {
      // Get sender profiles
      const senderIds = [...new Set(data.map((m) => m.sender_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", senderIds);

      const enriched = data.map((msg) => ({
        ...msg,
        senderProfile: profiles?.find((p) => p.user_id === msg.sender_id),
      }));
      setMessages(enriched);
    }

    // Mark messages as read
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("chat_id", chatId)
      .neq("sender_id", user.id)
      .eq("is_read", false);

    setLoading(false);
  }, [chatId, user]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Realtime
  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`messages-${chatId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` }, async (payload) => {
        const newMsg = payload.new as Message;
        // Get sender profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", newMsg.sender_id)
          .single();
        
        setMessages((prev) => {
          if (prev.find((m) => m.id === newMsg.id)) return prev;
          return [...prev, { ...newMsg, senderProfile: profile ?? undefined }];
        });

        // Mark as read if not sender
        if (newMsg.sender_id !== user?.id) {
          await supabase.from("messages").update({ is_read: true }).eq("id", newMsg.id);
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` }, (payload) => {
        const updated = payload.new as Message;
        setMessages((prev) => prev.map((m) => m.id === updated.id ? { ...m, ...updated } : m));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` }, (payload) => {
        const deleted = payload.old as Message;
        setMessages((prev) => prev.filter((m) => m.id !== deleted.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chatId, user]);

  const sendMessage = async (content: string) => {
    if (!chatId || !user || !content.trim()) return;
    await supabase.from("messages").insert({
      chat_id: chatId,
      sender_id: user.id,
      content: content.trim(),
    });
  };

  const deleteMessage = async (messageId: string) => {
    await supabase.from("messages").delete().eq("id", messageId);
  };

  const editMessage = async (messageId: string, content: string) => {
    await supabase.from("messages").update({ content }).eq("id", messageId);
  };

  return { messages, loading, sendMessage, deleteMessage, editMessage, refetch: fetchMessages };
}

export function useStartChat() {
  const { user } = useAuth();

  const startChat = async (otherUserId: string): Promise<string | null> => {
    if (!user) return null;

    // Check if chat already exists between these two users
    const { data: myMemberships } = await supabase
      .from("chat_memberships")
      .select("chat_id")
      .eq("user_id", user.id);

    if (myMemberships) {
      for (const m of myMemberships) {
        const { data: otherMember } = await supabase
          .from("chat_memberships")
          .select("id")
          .eq("chat_id", m.chat_id)
          .eq("user_id", otherUserId)
          .single();
        
        if (otherMember) return m.chat_id;
      }
    }

    // Create new chat
    const { data: chat } = await supabase
      .from("chats")
      .insert({ created_by: user.id })
      .select()
      .single();

    if (!chat) return null;

    // Add both users as members
    await supabase.from("chat_memberships").insert([
      { chat_id: chat.id, user_id: user.id },
      { chat_id: chat.id, user_id: otherUserId },
    ]);

    return chat.id;
  };

  return { startChat };
}
