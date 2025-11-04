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
      campaign_recipients: {
        Row: {
          campaign_id: string
          created_at: string | null
          customer_id: string
          delivered_at: string | null
          error_message: string | null
          id: string
          message_status: string
          read_at: string | null
          sent_at: string | null
          whatsapp_number: string
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          customer_id: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_status?: string
          read_at?: string | null
          sent_at?: string | null
          whatsapp_number: string
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          customer_id?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_status?: string
          read_at?: string | null
          sent_at?: string | null
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "promotion_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_register: {
        Row: {
          amount: number
          closing_balance: number | null
          created_at: string
          difference: number | null
          expected_balance: number | null
          id: string
          notes: string | null
          opening_balance: number | null
          operation_type: string
          operator_id: string
        }
        Insert: {
          amount: number
          closing_balance?: number | null
          created_at?: string
          difference?: number | null
          expected_balance?: number | null
          id?: string
          notes?: string | null
          opening_balance?: number | null
          operation_type: string
          operator_id: string
        }
        Update: {
          amount?: number
          closing_balance?: number | null
          created_at?: string
          difference?: number | null
          expected_balance?: number | null
          id?: string
          notes?: string | null
          opening_balance?: number | null
          operation_type?: string
          operator_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_register_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_points_transactions: {
        Row: {
          created_at: string | null
          customer_id: string
          description: string | null
          expires_at: string | null
          id: string
          order_id: string | null
          points: number
          referral_customer_id: string | null
          transaction_type: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          description?: string | null
          expires_at?: string | null
          id?: string
          order_id?: string | null
          points: number
          referral_customer_id?: string | null
          transaction_type: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          order_id?: string | null
          points?: number
          referral_customer_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_points_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_points_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_points_transactions_referral_customer_id_fkey"
            columns: ["referral_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_referrals: {
        Row: {
          completed_at: string | null
          created_at: string | null
          first_order_id: string | null
          id: string
          referred_id: string
          referred_points_earned: number | null
          referrer_id: string
          referrer_points_earned: number | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          first_order_id?: string | null
          id?: string
          referred_id: string
          referred_points_earned?: number | null
          referrer_id: string
          referrer_points_earned?: number | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          first_order_id?: string | null
          id?: string
          referred_id?: string
          referred_points_earned?: number | null
          referrer_id?: string
          referrer_points_earned?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_referrals_first_order_id_fkey"
            columns: ["first_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          birth_date: string | null
          city: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          phone: string | null
          points: number | null
          referral_code: string | null
          referred_by: string | null
          state: string | null
          tier: string
          total_orders: number | null
          total_points_earned: number | null
          total_points_redeemed: number | null
          total_spent: number | null
          updated_at: string | null
          whatsapp_number: string | null
          whatsapp_verified: boolean | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          points?: number | null
          referral_code?: string | null
          referred_by?: string | null
          state?: string | null
          tier?: string
          total_orders?: number | null
          total_points_earned?: number | null
          total_points_redeemed?: number | null
          total_spent?: number | null
          updated_at?: string | null
          whatsapp_number?: string | null
          whatsapp_verified?: boolean | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          points?: number | null
          referral_code?: string | null
          referred_by?: string | null
          state?: string | null
          tier?: string
          total_orders?: number | null
          total_points_earned?: number | null
          total_points_redeemed?: number | null
          total_spent?: number | null
          updated_at?: string | null
          whatsapp_number?: string | null
          whatsapp_verified?: boolean | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      extra_items: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          created_at: string | null
          id: string
          moved_by: string | null
          movement_type: string
          notes: string | null
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          total_cost: number | null
          unit_cost: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          moved_by?: string | null
          movement_type: string
          notes?: string | null
          product_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          total_cost?: number | null
          unit_cost?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          moved_by?: string | null
          movement_type?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          total_cost?: number | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_moved_by_fkey"
            columns: ["moved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          description: string
          id: string
          item_type: string
          order_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          item_type: string
          order_id: string
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          item_type?: string
          order_id?: string
          quantity?: number
          total_price?: number
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
      orders: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          customer_name: string | null
          extras_total: number
          food_total: number
          id: string
          notes: string | null
          opened_at: string
          opened_by: string | null
          order_number: number
          status: Database["public"]["Enums"]["order_status"]
          table_number: number | null
          total_amount: number
          total_weight: number
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          customer_name?: string | null
          extras_total?: number
          food_total?: number
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          order_number?: number
          status?: Database["public"]["Enums"]["order_status"]
          table_number?: number | null
          total_amount?: number
          total_weight?: number
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          customer_name?: string | null
          extras_total?: number
          food_total?: number
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          order_number?: number
          status?: Database["public"]["Enums"]["order_status"]
          table_number?: number | null
          total_amount?: number
          total_weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          change_amount: number | null
          id: string
          notes: string | null
          order_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          processed_at: string
          processed_by: string | null
        }
        Insert: {
          amount: number
          change_amount?: number | null
          id?: string
          notes?: string | null
          order_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          processed_at?: string
          processed_by?: string | null
        }
        Update: {
          amount?: number
          change_amount?: number | null
          id?: string
          notes?: string | null
          order_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          processed_at?: string
          processed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          barcode: string | null
          category_id: string | null
          cost: number | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          max_stock_level: number | null
          min_stock_level: number | null
          name: string
          price: number
          sku: string | null
          stock_quantity: number | null
          tags: string[] | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          barcode?: string | null
          category_id?: string | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          name: string
          price: number
          sku?: string | null
          stock_quantity?: number | null
          tags?: string[] | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          barcode?: string | null
          category_id?: string | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          name?: string
          price?: number
          sku?: string | null
          stock_quantity?: number | null
          tags?: string[] | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      promotion_campaigns: {
        Row: {
          campaign_name: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          delivered_count: number | null
          failed_count: number | null
          id: string
          promotion_id: string
          read_count: number | null
          scheduled_at: string | null
          sent_count: number | null
          started_at: string | null
          status: string
          target_criteria: Json | null
          total_recipients: number | null
          updated_at: string | null
        }
        Insert: {
          campaign_name: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          delivered_count?: number | null
          failed_count?: number | null
          id?: string
          promotion_id: string
          read_count?: number | null
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string
          target_criteria?: Json | null
          total_recipients?: number | null
          updated_at?: string | null
        }
        Update: {
          campaign_name?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          delivered_count?: number | null
          failed_count?: number | null
          id?: string
          promotion_id?: string
          read_count?: number | null
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string
          target_criteria?: Json | null
          total_recipients?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_campaigns_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string
          discount_amount: number | null
          discount_percentage: number | null
          id: string
          is_active: boolean | null
          message_content: string
          points_bonus: number | null
          promotion_type: string
          title: string
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description: string
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          is_active?: boolean | null
          message_content: string
          points_bonus?: number | null
          promotion_type: string
          title: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          is_active?: boolean | null
          message_content?: string
          points_bonus?: number | null
          promotion_type?: string
          title?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          current_stock: number
          id: string
          is_resolved: boolean | null
          message: string | null
          product_id: string
          resolved_at: string | null
          threshold: number
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          current_stock: number
          id?: string
          is_resolved?: boolean | null
          message?: string | null
          product_id: string
          resolved_at?: string | null
          threshold: number
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          current_stock?: number
          id?: string
          is_resolved?: boolean | null
          message?: string | null
          product_id?: string
          resolved_at?: string | null
          threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          id: string
          maximum_weight: number
          minimum_charge: number
          price_per_kg: number
          tax_rate: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          maximum_weight?: number
          minimum_charge?: number
          price_per_kg?: number
          tax_rate?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          maximum_weight?: number
          minimum_charge?: number
          price_per_kg?: number
          tax_rate?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_connections: {
        Row: {
          api_key: string | null
          api_url: string | null
          created_at: string | null
          created_by: string | null
          error_message: string | null
          id: string
          instance_id: string
          instance_name: string | null
          last_connected_at: string | null
          phone_name: string | null
          phone_number: string | null
          provider: string
          qr_code: string | null
          qr_code_expires_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          api_url?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          instance_id: string
          instance_name?: string | null
          last_connected_at?: string | null
          phone_name?: string | null
          phone_number?: string | null
          provider?: string
          qr_code?: string | null
          qr_code_expires_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          api_url?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          instance_id?: string
          instance_name?: string | null
          last_connected_at?: string | null
          phone_name?: string | null
          phone_number?: string | null
          provider?: string
          qr_code?: string | null
          qr_code_expires_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_connections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      order_status: "open" | "closed" | "cancelled"
      payment_method: "cash" | "debit" | "credit" | "pix"
      user_role: "admin" | "manager" | "operator"
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
      order_status: ["open", "closed", "cancelled"],
      payment_method: ["cash", "debit", "credit", "pix"],
      user_role: ["admin", "manager", "operator"],
    },
  },
} as const
