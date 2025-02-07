/*
  # Set up authentication schema
  
  1. Enable auth schema and policies
  2. Create test user
*/

-- Enable RLS
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own data
CREATE POLICY "Users can read own data"
  ON auth.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Create test user (password: test123)
SELECT supabase_auth.create_user(
  '{
    "email": "test@transnet.co.za",
    "password": "test123",
    "email_confirmed_at": "now()",
    "user_metadata": {
      "name": "Test User",
      "role": "operator"
    }
  }'::jsonb
);