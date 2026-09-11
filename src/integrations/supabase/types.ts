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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      farmer_certificates: {
        Row: {
          certificate_type: string | null
          farmer_id: string
          file_name: string
          file_url: string
          id: string
          uploaded_at: string
        }
        Insert: {
          certificate_type?: string | null
          farmer_id: string
          file_name: string
          file_url: string
          id?: string
          uploaded_at?: string
        }
        Update: {
          certificate_type?: string | null
          farmer_id?: string
          file_name?: string
          file_url?: string
          id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "farmer_certificates_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmer_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_certificates_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmer_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_certificates_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "public_farmer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_change_requests: {
        Row: {
          created_at: string
          document_urls: string[]
          farmer_id: string
          id: string
          justification: string
          requested_changes: Json
          review_deadline: string
          reviewed_at: string | null
          reviewer_notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_urls?: string[]
          farmer_id: string
          id?: string
          justification: string
          requested_changes: Json
          review_deadline?: string
          reviewed_at?: string | null
          reviewer_notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_urls?: string[]
          farmer_id?: string
          id?: string
          justification?: string
          requested_changes?: Json
          review_deadline?: string
          reviewed_at?: string | null
          reviewer_notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "farmer_change_requests_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmer_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_change_requests_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmer_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_change_requests_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "public_farmer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_details: {
        Row: {
          address: string | null
          cae_code: string | null
          company_name: string | null
          company_nif: string | null
          created_at: string
          delivery_hours: Json
          delivery_note: string | null
          delivery_radius_km: number | null
          description: string | null
          exploration_id: string | null
          exploration_number: string | null
          id: string
          initial_score: number | null
          phone: string | null
          pickup_address: string | null
          pickup_days: number
          pickup_hours: Json
          pickup_hours_note: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          registration_step: number
          updated_at: string
          user_id: string
          verification_status: string
          website: string | null
        }
        Insert: {
          address?: string | null
          cae_code?: string | null
          company_name?: string | null
          company_nif?: string | null
          created_at?: string
          delivery_hours?: Json
          delivery_note?: string | null
          delivery_radius_km?: number | null
          description?: string | null
          exploration_id?: string | null
          exploration_number?: string | null
          id?: string
          initial_score?: number | null
          phone?: string | null
          pickup_address?: string | null
          pickup_days?: number
          pickup_hours?: Json
          pickup_hours_note?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          registration_step?: number
          updated_at?: string
          user_id: string
          verification_status?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          cae_code?: string | null
          company_name?: string | null
          company_nif?: string | null
          created_at?: string
          delivery_hours?: Json
          delivery_note?: string | null
          delivery_radius_km?: number | null
          description?: string | null
          exploration_id?: string | null
          exploration_number?: string | null
          id?: string
          initial_score?: number | null
          phone?: string | null
          pickup_address?: string | null
          pickup_days?: number
          pickup_hours?: Json
          pickup_hours_note?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          registration_step?: number
          updated_at?: string
          user_id?: string
          verification_status?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "farmer_details_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          farmer_slug: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          farmer_slug: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          farmer_slug?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      market_prices: {
        Row: {
          avg_price: number
          category: string | null
          collected_at: string
          created_at: string
          display_name: string
          id: string
          product_key: string
          sample_size: number
          sources: Json
          unit: string
          updated_at: string
        }
        Insert: {
          avg_price: number
          category?: string | null
          collected_at?: string
          created_at?: string
          display_name: string
          id?: string
          product_key: string
          sample_size?: number
          sources?: Json
          unit?: string
          updated_at?: string
        }
        Update: {
          avg_price?: number
          category?: string | null
          collected_at?: string
          created_at?: string
          display_name?: string
          id?: string
          product_key?: string
          sample_size?: number
          sources?: Json
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          order_id: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          order_id?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          order_id?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_chat_messages: {
        Row: {
          attachment_mime: string | null
          attachment_url: string | null
          content: string | null
          created_at: string
          id: string
          order_id: string
          sender_id: string | null
          sender_role: string
        }
        Insert: {
          attachment_mime?: string | null
          attachment_url?: string | null
          content?: string | null
          created_at?: string
          id?: string
          order_id: string
          sender_id?: string | null
          sender_role: string
        }
        Update: {
          attachment_mime?: string | null
          attachment_url?: string | null
          content?: string | null
          created_at?: string
          id?: string
          order_id?: string
          sender_id?: string | null
          sender_role?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_image: string | null
          product_name: string
          quantity: number
          subtotal: number
          unit: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_image?: string | null
          product_name: string
          quantity: number
          subtotal: number
          unit?: string | null
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_image?: string | null
          product_name?: string
          quantity?: number
          subtotal?: number
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_reports: {
        Row: {
          created_at: string
          id: string
          order_id: string
          proof_mime: string | null
          proof_url: string
          reason: string
          reporter_id: string
          reporter_role: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          proof_mime?: string | null
          proof_url: string
          reason: string
          reporter_id: string
          reporter_role: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          proof_mime?: string | null
          proof_url?: string
          reason?: string
          reporter_id?: string
          reporter_role?: string
          status?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          accepted_at: string | null
          client_id: string
          commission_amount: number
          created_at: string
          delivered_at: string | null
          expired_at: string | null
          farmer_amount: number
          farmer_id: string
          id: string
          paid_at: string | null
          pickup_code: string
          pickup_deadline: string
          scheduled_pickup_at: string | null
          status: Database["public"]["Enums"]["order_status"]
          total: number
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          client_id: string
          commission_amount: number
          created_at?: string
          delivered_at?: string | null
          expired_at?: string | null
          farmer_amount: number
          farmer_id: string
          id?: string
          paid_at?: string | null
          pickup_code: string
          pickup_deadline: string
          scheduled_pickup_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total: number
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          client_id?: string
          commission_amount?: number
          created_at?: string
          delivered_at?: string | null
          expired_at?: string | null
          farmer_amount?: number
          farmer_id?: string
          id?: string
          paid_at?: string | null
          pickup_code?: string
          pickup_deadline?: string
          scheduled_pickup_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmer_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmer_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "public_farmer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          availability_end: string | null
          availability_start: string | null
          category: string | null
          client_price: number
          created_at: string
          delivery_mode: Database["public"]["Enums"]["delivery_mode"]
          description: string | null
          discount_percent: number
          farmer_id: string
          farmer_price: number
          has_modifications: boolean
          id: string
          is_lactose_free: boolean
          is_organic: boolean
          local_delivery: boolean
          low_stock_threshold: number
          media_urls: string[]
          modifications_description: string | null
          name: string
          shipping_days: number | null
          stock_quantity: number | null
          unit: string
          updated_at: string
          vat_rate: number
        }
        Insert: {
          active?: boolean
          availability_end?: string | null
          availability_start?: string | null
          category?: string | null
          client_price: number
          created_at?: string
          delivery_mode?: Database["public"]["Enums"]["delivery_mode"]
          description?: string | null
          discount_percent?: number
          farmer_id: string
          farmer_price: number
          has_modifications?: boolean
          id?: string
          is_lactose_free?: boolean
          is_organic?: boolean
          local_delivery?: boolean
          low_stock_threshold?: number
          media_urls?: string[]
          modifications_description?: string | null
          name: string
          shipping_days?: number | null
          stock_quantity?: number | null
          unit?: string
          updated_at?: string
          vat_rate?: number
        }
        Update: {
          active?: boolean
          availability_end?: string | null
          availability_start?: string | null
          category?: string | null
          client_price?: number
          created_at?: string
          delivery_mode?: Database["public"]["Enums"]["delivery_mode"]
          description?: string | null
          discount_percent?: number
          farmer_id?: string
          farmer_price?: number
          has_modifications?: boolean
          id?: string
          is_lactose_free?: boolean
          is_organic?: boolean
          local_delivery?: boolean
          low_stock_threshold?: number
          media_urls?: string[]
          modifications_description?: string | null
          name?: string
          shipping_days?: number | null
          stock_quantity?: number | null
          unit?: string
          updated_at?: string
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmer_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmer_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "public_farmer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_mode: string
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          profile_type: string
          updated_at: string
        }
        Insert: {
          active_mode?: string
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          profile_type?: string
          updated_at?: string
        }
        Update: {
          active_mode?: string
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          profile_type?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      farmer_public: {
        Row: {
          address: string | null
          cae_code: string | null
          company_name: string | null
          created_at: string | null
          description: string | null
          id: string | null
          initial_score: number | null
          pickup_days: number | null
          pickup_hours: Json | null
          pickup_hours_note: string | null
          registration_step: number | null
          updated_at: string | null
          user_id: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          cae_code?: string | null
          company_name?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          initial_score?: number | null
          pickup_days?: number | null
          pickup_hours?: Json | null
          pickup_hours_note?: string | null
          registration_step?: number | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          cae_code?: string | null
          company_name?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          initial_score?: number | null
          pickup_days?: number | null
          pickup_hours?: Json | null
          pickup_hours_note?: string | null
          registration_step?: number | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "farmer_details_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_farmer_profiles: {
        Row: {
          address: string | null
          cae_code: string | null
          company_name: string | null
          created_at: string | null
          delivery_hours: Json | null
          delivery_note: string | null
          delivery_radius_km: number | null
          description: string | null
          id: string | null
          initial_score: number | null
          pickup_address: string | null
          pickup_hours: Json | null
          pickup_hours_note: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          registration_step: number | null
          updated_at: string | null
          user_id: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          cae_code?: string | null
          company_name?: string | null
          created_at?: string | null
          delivery_hours?: Json | null
          delivery_note?: string | null
          delivery_radius_km?: number | null
          description?: string | null
          id?: string | null
          initial_score?: number | null
          pickup_address?: string | null
          pickup_hours?: Json | null
          pickup_hours_note?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          registration_step?: number | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          cae_code?: string | null
          company_name?: string | null
          created_at?: string | null
          delivery_hours?: Json | null
          delivery_note?: string | null
          delivery_radius_km?: number | null
          description?: string | null
          id?: string | null
          initial_score?: number | null
          pickup_address?: string | null
          pickup_hours?: Json | null
          pickup_hours_note?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          registration_step?: number | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "farmer_details_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      category_slug: { Args: { _name: string }; Returns: string }
      company_nif_taken: {
        Args: { p_company_nif: string; p_exclude_id?: string }
        Returns: boolean
      }
      delete_old_order_chats: { Args: never; Returns: number }
      exploration_number_taken: {
        Args: { p_exclude_id?: string; p_exploration_number: string }
        Returns: boolean
      }
      farmer_is_verified: { Args: { _farmer_id: string }; Returns: boolean }
      user_in_order: { Args: { _order_id: string }; Returns: boolean }
      user_is_order_client: { Args: { _order_id: string }; Returns: boolean }
      user_owns_farmer: { Args: { _farmer_id: string }; Returns: boolean }
    }
    Enums: {
      delivery_mode: "pickup" | "shipping" | "both"
      order_status:
        | "pending_payment"
        | "awaiting_pickup"
        | "delivered"
        | "expired"
        | "refunded"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      delivery_mode: ["pickup", "shipping", "both"],
      order_status: [
        "pending_payment",
        "awaiting_pickup",
        "delivered",
        "expired",
        "refunded",
      ],
    },
  },
} as const
