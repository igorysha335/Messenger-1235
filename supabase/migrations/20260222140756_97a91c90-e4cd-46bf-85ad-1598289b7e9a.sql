
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  status TEXT DEFAULT 'Hey, I am using Vortex!',
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Chats table
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Chat memberships
CREATE TABLE public.chat_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_pinned BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  is_muted BOOLEAN DEFAULT FALSE,
  UNIQUE(chat_id, user_id)
);

ALTER TABLE public.chat_memberships ENABLE ROW LEVEL SECURITY;

-- Messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  message_type TEXT DEFAULT 'text',
  is_read BOOLEAN DEFAULT FALSE,
  is_delivered BOOLEAN DEFAULT TRUE,
  is_pinned BOOLEAN DEFAULT FALSE,
  reply_to UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  reaction TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Blocks table
CREATE TABLE public.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  blocked_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- Helper function: check chat membership
CREATE OR REPLACE FUNCTION public.is_chat_member(_chat_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_memberships
    WHERE chat_id = _chat_id AND user_id = auth.uid()
  )
$$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON public.chats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', 'User')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- RLS Policies for chats
CREATE POLICY "Users can view their chats" ON public.chats
  FOR SELECT TO authenticated USING (public.is_chat_member(id));

CREATE POLICY "Users can create chats" ON public.chats
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

-- RLS Policies for chat_memberships
CREATE POLICY "Users can view memberships of their chats" ON public.chat_memberships
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_chat_member(chat_id));

CREATE POLICY "Authenticated users can insert memberships" ON public.chat_memberships
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update own membership" ON public.chat_memberships
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can delete own membership" ON public.chat_memberships
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their chats" ON public.messages
  FOR SELECT TO authenticated USING (public.is_chat_member(chat_id));

CREATE POLICY "Users can send messages to their chats" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND public.is_chat_member(chat_id));

CREATE POLICY "Users can update own messages" ON public.messages
  FOR UPDATE TO authenticated USING (sender_id = auth.uid());

CREATE POLICY "Users can delete own messages" ON public.messages
  FOR DELETE TO authenticated USING (sender_id = auth.uid());

-- RLS Policies for blocks
CREATE POLICY "Users can view own blocks" ON public.blocks
  FOR SELECT TO authenticated USING (blocker_id = auth.uid());

CREATE POLICY "Users can create blocks" ON public.blocks
  FOR INSERT TO authenticated WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users can delete own blocks" ON public.blocks
  FOR DELETE TO authenticated USING (blocker_id = auth.uid());

-- Enable realtime for messages and chat_memberships
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
