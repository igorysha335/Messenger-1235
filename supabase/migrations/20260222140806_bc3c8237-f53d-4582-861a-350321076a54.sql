
-- Fix overly permissive chat_memberships INSERT policy
-- Only allow inserting if the user is the chat creator or is inserting themselves
DROP POLICY "Authenticated users can insert memberships" ON public.chat_memberships;

CREATE POLICY "Chat creators can add members" ON public.chat_memberships
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chats WHERE id = chat_id AND created_by = auth.uid()
    )
    OR user_id = auth.uid()
  );
