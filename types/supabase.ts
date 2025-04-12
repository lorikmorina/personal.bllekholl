export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          subscription_plan: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          subscription_plan?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          subscription_plan?: string
          created_at?: string
          updated_at?: string
        }
      }
      // Add other tables here as needed
    }
  }
} 