
 -- Create profiles table
 CREATE TABLE IF NOT EXISTS public.profiles (
   id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
-  name text,
+  name text NOT NULL,
   role text DEFAULT 'user' CHECK (role IN ('admin', 'user')),
   created_at timestamptz DEFAULT now(),
   updated_at timestamptz DEFAULT now()
 );
 
 -- Enable RLS
 ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
 
 -- Create policies
-CREATE POLICY "Users can view own profile"
+CREATE POLICY "Public profiles are viewable by everyone"
   ON public.profiles
   FOR SELECT
-  TO authenticated
-  USING (auth.uid() = id);
+  USING (true);
 
 CREATE POLICY "Users can update own profile"
   ON public.profiles
   FOR UPDATE
   TO authenticated
   USING (auth.uid() = id);
 
+CREATE POLICY "Service role can create profiles"
+  ON public.profiles
+  FOR INSERT
+  TO service_role
+  WITH CHECK (true);
+
 -- Create function to handle new user profiles
 CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger AS $$
 BEGIN
   INSERT INTO public.profiles (id, name)
-  VALUES (new.id, new.raw_user_meta_data->>'name');
+  VALUES (
+    new.id,
+    COALESCE(new.raw_user_meta_data->>'name', 'Anonymous')
+  );
   RETURN new;
 END;
 $$ LANGUAGE plpgsql SECURITY DEFINER;