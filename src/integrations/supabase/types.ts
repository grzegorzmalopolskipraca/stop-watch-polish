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
      auto_traffic_settings: {
        Row: {
          created_at: string
          id: string
          interval_minutes: number
          is_enabled: boolean
          last_run_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          interval_minutes?: number
          is_enabled?: boolean
          last_run_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          interval_minutes?: number
          is_enabled?: boolean
          last_run_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
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
      commute_schedule: {
        Row: {
          created_at: string
          day_of_week: number
          from_work_end: string
          from_work_start: string
          id: string
          to_work_end: string
          to_work_start: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          from_work_end?: string
          from_work_start?: string
          id?: string
          to_work_end?: string
          to_work_start?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          from_work_end?: string
          from_work_start?: string
          id?: string
          to_work_end?: string
          to_work_start?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      commute_travel_times: {
        Row: {
          calculated_at: string
          created_at: string
          day_of_week: number
          departure_time: string
          destination_address: string | null
          direction: string
          id: string
          origin_address: string | null
          travel_date: string
          travel_duration_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          calculated_at?: string
          created_at?: string
          day_of_week: number
          departure_time: string
          destination_address?: string | null
          direction: string
          id?: string
          origin_address?: string | null
          travel_date: string
          travel_duration_minutes: number
          updated_at?: string
          user_id: string
        }
        Update: {
          calculated_at?: string
          created_at?: string
          day_of_week?: number
          departure_time?: string
          destination_address?: string | null
          direction?: string
          id?: string
          origin_address?: string | null
          travel_date?: string
          travel_duration_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          created_at: string
          discount: number
          id: string
          image_link: string | null
          local_id: string
          local_name: string
          show_on_streets: string | null
          status: string
          time_from: string
          time_to: string | null
        }
        Insert: {
          created_at?: string
          discount: number
          id?: string
          image_link?: string | null
          local_id: string
          local_name: string
          show_on_streets?: string | null
          status?: string
          time_from?: string
          time_to?: string | null
        }
        Update: {
          created_at?: string
          discount?: number
          id?: string
          image_link?: string | null
          local_id?: string
          local_name?: string
          show_on_streets?: string | null
          status?: string
          time_from?: string
          time_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_local_id_fkey"
            columns: ["local_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
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
      locations: {
        Row: {
          created_at: string
          id: string
          name: string
          street: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          street?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          street?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          home_address: string | null
          home_lat: number | null
          home_lng: number | null
          id: string
          traffic_api_preference: string | null
          updated_at: string
          user_id: string
          work_address: string | null
          work_lat: number | null
          work_lng: number | null
        }
        Insert: {
          created_at?: string
          home_address?: string | null
          home_lat?: number | null
          home_lng?: number | null
          id?: string
          traffic_api_preference?: string | null
          updated_at?: string
          user_id: string
          work_address?: string | null
          work_lat?: number | null
          work_lng?: number | null
        }
        Update: {
          created_at?: string
          home_address?: string | null
          home_lat?: number | null
          home_lng?: number | null
          id?: string
          traffic_api_preference?: string | null
          updated_at?: string
          user_id?: string
          work_address?: string | null
          work_lat?: number | null
          work_lng?: number | null
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
          id: string
          player_id: string
          street: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          player_id: string
          street: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          player_id?: string
          street?: string
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
      rss_items: {
        Row: {
          created_at: string
          id: string
          position: number
          text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          text?: string
          updated_at?: string
        }
        Relationships: []
      }
      rss_ticker_settings: {
        Row: {
          created_at: string
          id: string
          speed: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          speed?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          speed?: number
          updated_at?: string
        }
        Relationships: []
      }
      service_errors: {
        Row: {
          created_at: string
          error_details: Json | null
          error_message: string
          error_type: string
          id: string
          resolved: boolean
          resolved_at: string | null
          service_name: string
        }
        Insert: {
          created_at?: string
          error_details?: Json | null
          error_message: string
          error_type: string
          id?: string
          resolved?: boolean
          resolved_at?: string | null
          service_name: string
        }
        Update: {
          created_at?: string
          error_details?: Json | null
          error_message?: string
          error_type?: string
          id?: string
          resolved?: boolean
          resolved_at?: string | null
          service_name?: string
        }
        Relationships: []
      }
      service_execution_status: {
        Row: {
          consecutive_failures: number | null
          created_at: string
          current_interval_minutes: number | null
          id: string
          is_healthy: boolean | null
          last_attempt_at: string | null
          last_error_at: string | null
          last_success_at: string | null
          service_name: string
          updated_at: string
        }
        Insert: {
          consecutive_failures?: number | null
          created_at?: string
          current_interval_minutes?: number | null
          id?: string
          is_healthy?: boolean | null
          last_attempt_at?: string | null
          last_error_at?: string | null
          last_success_at?: string | null
          service_name: string
          updated_at?: string
        }
        Update: {
          consecutive_failures?: number | null
          created_at?: string
          current_interval_minutes?: number | null
          id?: string
          is_healthy?: boolean | null
          last_attempt_at?: string | null
          last_error_at?: string | null
          last_success_at?: string | null
          service_name?: string
          updated_at?: string
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
      street_distances: {
        Row: {
          created_at: string
          destination_lat: number
          destination_lng: number
          direction: string
          distance_meters: number
          id: string
          origin_lat: number
          origin_lng: number
          route_key: string
          street: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          destination_lat: number
          destination_lng: number
          direction: string
          distance_meters: number
          id?: string
          origin_lat: number
          origin_lng: number
          route_key: string
          street: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          destination_lat?: number
          destination_lng?: number
          direction?: string
          distance_meters?: number
          id?: string
          origin_lat?: number
          origin_lng?: number
          route_key?: string
          street?: string
          updated_at?: string
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
      traffic_cache: {
        Row: {
          cached_at: string
          created_at: string
          destination_lat: number
          destination_lng: number
          id: string
          origin_lat: number
          origin_lng: number
          route_key: string
          traffic_data: Json
        }
        Insert: {
          cached_at?: string
          created_at?: string
          destination_lat: number
          destination_lng: number
          id?: string
          origin_lat: number
          origin_lng: number
          route_key: string
          traffic_data: Json
        }
        Update: {
          cached_at?: string
          created_at?: string
          destination_lat?: number
          destination_lng?: number
          id?: string
          origin_lat?: number
          origin_lng?: number
          route_key?: string
          traffic_data?: Json
        }
        Relationships: []
      }
      traffic_reports: {
        Row: {
          created_at: string
          direction: string
          humidity: number | null
          id: string
          pressure: number | null
          reported_at: string
          speed: number | null
          status: string
          street: string
          temperature: number | null
          user_fingerprint: string | null
          visibility: number | null
          weather_cached_at: string | null
          weather_condition: string | null
          wind_speed: number | null
        }
        Insert: {
          created_at?: string
          direction?: string
          humidity?: number | null
          id?: string
          pressure?: number | null
          reported_at?: string
          speed?: number | null
          status: string
          street: string
          temperature?: number | null
          user_fingerprint?: string | null
          visibility?: number | null
          weather_cached_at?: string | null
          weather_condition?: string | null
          wind_speed?: number | null
        }
        Update: {
          created_at?: string
          direction?: string
          humidity?: number | null
          id?: string
          pressure?: number | null
          reported_at?: string
          speed?: number | null
          status?: string
          street?: string
          temperature?: number | null
          user_fingerprint?: string | null
          visibility?: number | null
          weather_cached_at?: string | null
          weather_condition?: string | null
          wind_speed?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
