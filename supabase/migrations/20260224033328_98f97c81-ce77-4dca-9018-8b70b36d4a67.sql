DROP POLICY IF EXISTS "Users can view their chats" ON public.chats;

CREATE POLICY "Users can view their chats" 
ON public.chats
FOR SELECT
TO authenticated
USING (
  is_chat_member(id)
  OR created_by = auth.uid()
);