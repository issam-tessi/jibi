// Hand-written to match supabase/migrations. Once you have a Supabase project, regenerate with:
//   npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AccountKind = 'main' | 'savings';
export type TransactionKind = 'income' | 'expense' | 'transfer';

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          currency: string;
          kind: AccountKind;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          currency?: string;
          kind?: AccountKind;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['accounts']['Insert']>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string;
          color_slot: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          icon?: string;
          color_slot?: number | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          account_id: string;
          category_id: string | null;
          kind: TransactionKind;
          transfer_id: string | null;
          amount_cents: number;
          occurred_on: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          account_id: string;
          category_id?: string | null;
          kind: TransactionKind;
          transfer_id?: string | null;
          amount_cents: number;
          occurred_on?: string;
          note?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'transactions_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      account_balances: {
        Row: {
          id: string;
          kind: AccountKind;
          name: string;
          currency: string;
          balance_cents: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      list_app_users: {
        Args: never;
        Returns: {
          username: string;
          display_name: string;
          icon: string;
          has_password: boolean;
        }[];
      };
      move_money: {
        Args: { amount: number; to_savings: boolean; note?: string | null };
        Returns: string;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
