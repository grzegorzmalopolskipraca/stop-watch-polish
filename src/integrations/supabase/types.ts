export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      carpooling_votes: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          vote_count: number
          voter_fingerprints: string[]
        }
        Insert: {
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          vote_count?: number
          voter_fingerprints?: string[]
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          vote_count?: number
          voter_fingerprints?: string[]
        }
        Relationships: []
      }
      city_votes: {
        Row: {
          city_name: string
          created_at: string | null
          id: string
          updated_at: string | null
          voter_ips: Json | null
          votes: number | null
        }
        Insert: {
          city_name: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          voter_ips?: Json | null
          votes?: number | null
        }
        Update: {
          city_name?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          voter_ips?: Json | null
          votes?: number | null
        }
        Relationships: []
      }
      daily_speed_stats: {
        Row: {
          created_at: string | null
          direction: string
          id: string
          max_speed: number
          min_speed: number
          speed_date: string
          street: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          direction: string
          id?: string
          max_speed: number
          min_speed: number
          speed_date?: string
          street: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          direction?: string
          id?: string
          max_speed?: number
          min_speed?: number
          speed_date?: string
          street?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      daily_visit_stats: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          visit_count: number
          visit_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          visit_count?: number
          visit_date: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          visit_count?: number
          visit_date?: string
        }
        Relationships: []
      }
      incident_reports: {
        Row: {
          created_at: string
          direction: string
          id: string
          incident_type: string
          reported_at: string
          street: string
          user_fingerprint: string | null
        }
        Insert: {
          created_at?: string
          direction?: string
          id?: string
          incident_type: string
          reported_at?: string
          street: string
          user_fingerprint?: string | null
        }
        Update: {
          created_at?: string
          direction?: string
          id?: string
          incident_type?: string
          reported_at?: string
          street?: string
          user_fingerprint?: string | null
        }
        Relationships: []
      }
      prohibited_words: {
        Row: {
          created_at: string
          id: string
          word: string
        }
        Insert: {
          created_at?: string
          id?: string
          word: string
        }
        Update: {
          created_at?: string
          id?: string
          word?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          street: string
          subscription: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          street: string
          subscription: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          street?: string
          subscription?: Json
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action_count: number
          action_type: string
          created_at: string
          id: string
          identifier: string
          last_action_at: string
        }
        Insert: {
          action_count?: number
          action_type: string
          created_at?: string
          id?: string
          identifier: string
          last_action_at?: string
        }
        Update: {
          action_count?: number
          action_type?: string
          created_at?: string
          id?: string
          identifier?: string
          last_action_at?: string
        }
        Relationships: []
      }
      sms_subscriptions: {
        Row: {
          back_to_home_hour: string | null
          consent_data_processing: boolean
          consent_marketing: boolean
          consent_timestamp: string | null
          created_at: string
          email: string | null
          go_to_work_hour: string | null
          id: string
          phone_number: string | null
          street: string
          updated_at: string
        }
        Insert: {
          back_to_home_hour?: string | null
          consent_data_processing?: boolean
          consent_marketing?: boolean
          consent_timestamp?: string | null
          created_at?: string
          email?: string | null
          go_to_work_hour?: string | null
          id?: string
          phone_number?: string | null
          street: string
          updated_at?: string
        }
        Update: {
          back_to_home_hour?: string | null
          consent_data_processing?: boolean
          consent_marketing?: boolean
          consent_timestamp?: string | null
          created_at?: string
          email?: string | null
          go_to_work_hour?: string | null
          id?: string
          phone_number?: string | null
          street?: string
          updated_at?: string
        }
        Relationships: []
      }
      street_chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          street: string
          user_fingerprint: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          street: string
          user_fingerprint?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          street?: string
          user_fingerprint?: string | null
        }
        Relationships: []
      }
      street_votes: {
        Row: {
          created_at: string | null
          id: string
          street_name: string
          updated_at: string | null
          voter_ips: Json | null
          votes: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          street_name: string
          updated_at?: string | null
          voter_ips?: Json | null
          votes?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          street_name?: string
          updated_at?: string | null
          voter_ips?: Json | null
          votes?: number | null
        }
        Relationships: []
      }
      total_visit_counter: {
        Row: {
          id: string
          total_visits: number
          updated_at: string
        }
        Insert: {
          id?: string
          total_visits?: number
          updated_at?: string
        }
        Update: {
          id?: string
          total_visits?: number
          updated_at?: string
        }
        Relationships: []
      }
      traffic_reports: {
        Row: {
          created_at: string
          direction: string
          id: string
          reported_at: string
          status: string
          street: string
          user_fingerprint: string | null
        }
        Insert: {
          created_at?: string
          direction?: string
          id?: string
          reported_at?: string
          status: string
          street: string
          user_fingerprint?: string | null
        }
        Update: {
          created_at?: string
          direction?: string
          id?: string
          reported_at?: string
          status?: string
          street?: string
          user_fingerprint?: string | null
        }
        Relationships: []
      }
      weather_cache: {
        Row: {
          cached_at: string
          id: string
          latitude: number
          longitude: number
          street: string
          updated_at: string
          weather_data: Json
        }
        Insert: {
          cached_at?: string
          id?: string
          latitude: number
          longitude: number
          street: string
          updated_at?: string
          weather_data: Json
        }
        Update: {
          cached_at?: string
          id?: string
          latitude?: number
          longitude?: number
          street?: string
          updated_at?: string
          weather_data?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
