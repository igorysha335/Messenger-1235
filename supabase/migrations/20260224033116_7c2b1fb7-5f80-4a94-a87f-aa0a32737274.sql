
-- Drop all restrictive policies and recreate as permissive

-- CHATS
DROP POLICY IF EXISTS "Users can create chats" ON public.chats;
DROP POLICY IF EXISTS "Users can view their chats" ON public.chats;

CREATE POLICY "Users can create chats" ON public.chats FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can view their chats" ON public.chats FOR SELECT TO authenticated USING (is_chat_member(id));

-- CHAT_MEMBERSHIPS
DROP POLICY IF EXISTS "Chat creators can add members" ON public.chat_memberships;
DROP POLICY IF EXISTS "Users can delete own membership" ON public.chat_memberships;
DROP POLICY IF EXISTS "Users can update own membership" ON public.chat_memberships;
DROP POLICY IF EXISTS "Users can view memberships of their chats" ON public.chat_memberships;

CREATE POLICY "Chat creators can add members" ON public.chat_memberships FOR INSERT TO authenticated WITH CHECK ((EXISTS (SELECT 1 FROM chats WHERE chats.id = chat_memberships.chat_id AND chats.created_by = auth.uid())) OR (user_id = auth.uid()));
CREATE POLICY "Users can delete own membership" ON public.chat_memberships FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own membership" ON public.chat_memberships FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can view memberships of their chats" ON public.chat_memberships FOR SELECT TO authenticated USING ((user_id = auth.uid()) OR is_chat_member(chat_id));

-- MESSAGES
DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their chats" ON public.messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages in their chats" ON public.messages;

CREATE POLICY "Users can send messages to their chats" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND is_chat_member(chat_id));
CREATE POLICY "Users can delete own messages" ON public.messages FOR DELETE TO authenticated USING (sender_id = auth.uid());
CREATE POLICY "Users can update own messages" ON public.messages FOR UPDATE TO authenticated USING (sender_id = auth.uid());
CREATE POLICY "Users can view messages in their chats" ON public.messages FOR SELECT TO authenticated USING (is_chat_member(chat_id));

-- BLOCKS
DROP POLICY IF EXISTS "Users can create blocks" ON public.blocks;
DROP POLICY IF EXISTS "Users can delete own blocks" ON public.blocks;
DROP POLICY IF EXISTS "Users can view own blocks" ON public.blocks;

CREATE POLICY "Users can create blocks" ON public.blocks FOR INSERT TO authenticated WITH CHECK (blocker_id = auth.uid());
CREATE POLICY "Users can delete own blocks" ON public.blocks FOR DELETE TO authenticated USING (blocker_id = auth.uid());
CREATE POLICY "Users can view own blocks" ON public.blocks FOR SELECT TO authenticated USING (blocker_id = auth.uid());

-- PROFILES
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
