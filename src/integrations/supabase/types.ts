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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          achievement_key: string
          id: string
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          achievement_key: string
          id?: string
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          achievement_key?: string
          id?: string
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      application_timeline: {
        Row: {
          application_id: string
          created_at: string
          description: string | null
          event_type: string
          id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          application_id: string
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_timeline_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_timeline_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications_candidate_view"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          ai_candidate_summary: Json | null
          apply_method: string | null
          blind_mode: boolean | null
          candidate_id: string
          created_at: string
          current_stage: string | null
          id: string
          internal_notes: string | null
          job_id: string
          last_interaction: string | null
          last_stage_change_at: string | null
          match_score: number | null
          notes: string | null
          retention_risk_score: number | null
          stagnation_snoozed_until: string | null
          status: string | null
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          ai_candidate_summary?: Json | null
          apply_method?: string | null
          blind_mode?: boolean | null
          candidate_id: string
          created_at?: string
          current_stage?: string | null
          id?: string
          internal_notes?: string | null
          job_id: string
          last_interaction?: string | null
          last_stage_change_at?: string | null
          match_score?: number | null
          notes?: string | null
          retention_risk_score?: number | null
          stagnation_snoozed_until?: string | null
          status?: string | null
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          ai_candidate_summary?: Json | null
          apply_method?: string | null
          blind_mode?: boolean | null
          candidate_id?: string
          created_at?: string
          current_stage?: string | null
          id?: string
          internal_notes?: string | null
          job_id?: string
          last_interaction?: string | null
          last_stage_change_at?: string | null
          match_score?: number | null
          notes?: string | null
          retention_risk_score?: number | null
          stagnation_snoozed_until?: string | null
          status?: string | null
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          approver_id: string
          created_at: string | null
          decided_at: string | null
          id: string
          notes: string | null
          reference_id: string | null
          request_type: string | null
          requester_id: string
          status: string | null
        }
        Insert: {
          approver_id: string
          created_at?: string | null
          decided_at?: string | null
          id?: string
          notes?: string | null
          reference_id?: string | null
          request_type?: string | null
          requester_id: string
          status?: string | null
        }
        Update: {
          approver_id?: string
          created_at?: string | null
          decided_at?: string | null
          id?: string
          notes?: string | null
          reference_id?: string | null
          request_type?: string | null
          requester_id?: string
          status?: string | null
        }
        Relationships: []
      }
      assessment_submissions: {
        Row: {
          ai_feedback: string | null
          answers: Json
          assessment_id: string | null
          candidate_id: string
          id: string
          submitted_at: string | null
          total_score: number | null
        }
        Insert: {
          ai_feedback?: string | null
          answers?: Json
          assessment_id?: string | null
          candidate_id: string
          id?: string
          submitted_at?: string | null
          total_score?: number | null
        }
        Update: {
          ai_feedback?: string | null
          answers?: Json
          assessment_id?: string | null
          candidate_id?: string
          id?: string
          submitted_at?: string | null
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_submissions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          assessment_type: string | null
          created_at: string | null
          created_by: string
          id: string
          job_id: string | null
          questions: Json
          time_limit_minutes: number | null
          title: string
        }
        Insert: {
          assessment_type?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          job_id?: string | null
          questions?: Json
          time_limit_minutes?: number | null
          title: string
        }
        Update: {
          assessment_type?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          job_id?: string | null
          questions?: Json
          time_limit_minutes?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      calendar_event_mappings: {
        Row: {
          created_at: string
          id: string
          last_synced_at: string | null
          local_activity_id: string | null
          provider: string
          provider_calendar_id: string
          provider_event_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_synced_at?: string | null
          local_activity_id?: string | null
          provider: string
          provider_calendar_id?: string
          provider_event_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_synced_at?: string | null
          local_activity_id?: string | null
          provider?: string
          provider_calendar_id?: string
          provider_event_id?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_tokens: {
        Row: {
          access_token: string
          calendar_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          last_synced_at: string | null
          provider: string
          refresh_token: string | null
          scope: string | null
          updated_at: string
          user_id: string
          webhook_channel_id: string | null
          webhook_expiration: string | null
          webhook_resource_id: string | null
        }
        Insert: {
          access_token: string
          calendar_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          last_synced_at?: string | null
          provider: string
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string
          user_id: string
          webhook_channel_id?: string | null
          webhook_expiration?: string | null
          webhook_resource_id?: string | null
        }
        Update: {
          access_token?: string
          calendar_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          last_synced_at?: string | null
          provider?: string
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string
          user_id?: string
          webhook_channel_id?: string | null
          webhook_expiration?: string | null
          webhook_resource_id?: string | null
        }
        Relationships: []
      }
      candidate_surveys: {
        Row: {
          candidate_id: string
          communication_rating: number | null
          feedback_text: string | null
          id: string
          job_id: string | null
          overall_rating: number | null
          process_rating: number | null
          submitted_at: string | null
          trigger_event: string | null
          would_recommend: boolean | null
        }
        Insert: {
          candidate_id: string
          communication_rating?: number | null
          feedback_text?: string | null
          id?: string
          job_id?: string | null
          overall_rating?: number | null
          process_rating?: number | null
          submitted_at?: string | null
          trigger_event?: string | null
          would_recommend?: boolean | null
        }
        Update: {
          candidate_id?: string
          communication_rating?: number | null
          feedback_text?: string | null
          id?: string
          job_id?: string | null
          overall_rating?: number | null
          process_rating?: number | null
          submitted_at?: string | null
          trigger_event?: string | null
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_surveys_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      career_site_analytics: {
        Row: {
          career_site_id: string
          created_at: string
          event_type: string
          id: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          career_site_id: string
          created_at?: string
          event_type: string
          id?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          career_site_id?: string
          created_at?: string
          event_type?: string
          id?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "career_site_analytics_career_site_id_fkey"
            columns: ["career_site_id"]
            isOneToOne: false
            referencedRelation: "career_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      career_site_blocks: {
        Row: {
          block_type: string
          career_site_id: string
          config: Json
          created_at: string
          id: string
          is_visible: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          block_type: string
          career_site_id: string
          config?: Json
          created_at?: string
          id?: string
          is_visible?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          block_type?: string
          career_site_id?: string
          config?: Json
          created_at?: string
          id?: string
          is_visible?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_site_blocks_career_site_id_fkey"
            columns: ["career_site_id"]
            isOneToOne: false
            referencedRelation: "career_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      career_site_stats: {
        Row: {
          applications: number | null
          career_site_id: string | null
          date: string
          id: string
          page_views: number | null
          source: string | null
          unique_visitors: number | null
        }
        Insert: {
          applications?: number | null
          career_site_id?: string | null
          date?: string
          id?: string
          page_views?: number | null
          source?: string | null
          unique_visitors?: number | null
        }
        Update: {
          applications?: number | null
          career_site_id?: string | null
          date?: string
          id?: string
          page_views?: number | null
          source?: string | null
          unique_visitors?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "career_site_stats_career_site_id_fkey"
            columns: ["career_site_id"]
            isOneToOne: false
            referencedRelation: "career_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      career_site_team_stories: {
        Row: {
          career_site_id: string
          created_at: string
          employee_avatar_url: string | null
          employee_name: string
          employee_title: string | null
          id: string
          quote: string
          sort_order: number
        }
        Insert: {
          career_site_id: string
          created_at?: string
          employee_avatar_url?: string | null
          employee_name: string
          employee_title?: string | null
          id?: string
          quote: string
          sort_order?: number
        }
        Update: {
          career_site_id?: string
          created_at?: string
          employee_avatar_url?: string | null
          employee_name?: string
          employee_title?: string | null
          id?: string
          quote?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "career_site_team_stories_career_site_id_fkey"
            columns: ["career_site_id"]
            isOneToOne: false
            referencedRelation: "career_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      career_sites: {
        Row: {
          benefits: Json | null
          company_id: string
          company_name: string
          cover_image_url: string | null
          created_at: string | null
          culture_text: string | null
          custom_css: string | null
          custom_domain: string | null
          custom_font: string | null
          description: string | null
          hide_plug_branding: boolean | null
          id: string
          is_published: boolean | null
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          slug: string
          social_links: Json | null
          tagline: string | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          benefits?: Json | null
          company_id: string
          company_name: string
          cover_image_url?: string | null
          created_at?: string | null
          culture_text?: string | null
          custom_css?: string | null
          custom_domain?: string | null
          custom_font?: string | null
          description?: string | null
          hide_plug_branding?: boolean | null
          id?: string
          is_published?: boolean | null
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug: string
          social_links?: Json | null
          tagline?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          benefits?: Json | null
          company_id?: string
          company_name?: string
          cover_image_url?: string | null
          created_at?: string | null
          culture_text?: string | null
          custom_css?: string | null
          custom_domain?: string | null
          custom_font?: string | null
          description?: string | null
          hide_plug_branding?: boolean | null
          id?: string
          is_published?: boolean | null
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string
          social_links?: Json | null
          tagline?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      chat_history: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          message: string
          sender: string
          session_id: string | null
          session_title: string | null
          user_id: string
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          message: string
          sender: string
          session_id?: string | null
          session_title?: string | null
          user_id: string
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          message?: string
          sender?: string
          session_id?: string | null
          session_title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      client_contact_projects: {
        Row: {
          company_id: string
          contact_id: string
          created_at: string
          id: string
          job_id: string
          notes: string | null
          recruiter_id: string
          role_in_project: string | null
        }
        Insert: {
          company_id: string
          contact_id: string
          created_at?: string
          id?: string
          job_id: string
          notes?: string | null
          recruiter_id: string
          role_in_project?: string | null
        }
        Update: {
          company_id?: string
          contact_id?: string
          created_at?: string
          id?: string
          job_id?: string
          notes?: string | null
          recruiter_id?: string
          role_in_project?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contact_projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contact_projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contact_projects_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "client_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contact_projects_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          company_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_primary: boolean | null
          linkedin_url: string | null
          notes: string | null
          phone: string | null
          recruiter_id: string
          role_title: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_primary?: boolean | null
          linkedin_url?: string | null
          notes?: string | null
          phone?: string | null
          recruiter_id: string
          role_title?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_primary?: boolean | null
          linkedin_url?: string | null
          notes?: string | null
          phone?: string | null
          recruiter_id?: string
          role_title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      client_reminders: {
        Row: {
          company_id: string
          contact_id: string
          created_at: string
          description: string | null
          id: string
          recruiter_id: string
          remind_at: string
          reminder_type: string
          sent_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          contact_id: string
          created_at?: string
          description?: string | null
          id?: string
          recruiter_id: string
          remind_at: string
          reminder_type?: string
          sent_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          contact_id?: string
          created_at?: string
          description?: string | null
          id?: string
          recruiter_id?: string
          remind_at?: string
          reminder_type?: string
          sent_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_reminders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_reminders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_reminders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "client_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      client_tasks: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          recruiter_id: string
          source: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          recruiter_id: string
          source?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          recruiter_id?: string
          source?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      client_timeline: {
        Row: {
          company_id: string
          contact_id: string | null
          created_at: string
          description: string | null
          event_date: string
          event_type: string
          id: string
          linked_task_id: string | null
          metadata: Json | null
          recruiter_id: string
          title: string
        }
        Insert: {
          company_id: string
          contact_id?: string | null
          created_at?: string
          description?: string | null
          event_date?: string
          event_type: string
          id?: string
          linked_task_id?: string | null
          metadata?: Json | null
          recruiter_id: string
          title: string
        }
        Update: {
          company_id?: string
          contact_id?: string | null
          created_at?: string
          description?: string | null
          event_date?: string
          event_type?: string
          id?: string
          linked_task_id?: string | null
          metadata?: Json | null
          recruiter_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_timeline_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_timeline_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_timeline_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "client_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_timeline_linked_task_id_fkey"
            columns: ["linked_task_id"]
            isOneToOne: false
            referencedRelation: "schedule_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      client_vault: {
        Row: {
          category: string | null
          company_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          recruiter_id: string
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          recruiter_id: string
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          recruiter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_vault_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_vault_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      community_channels: {
        Row: {
          access_mode: string
          created_at: string
          description_en: string | null
          description_he: string | null
          hub_id: string
          id: string
          name_en: string
          name_he: string
          private_code: string | null
          sort_order: number
        }
        Insert: {
          access_mode?: string
          created_at?: string
          description_en?: string | null
          description_he?: string | null
          hub_id: string
          id?: string
          name_en: string
          name_he?: string
          private_code?: string | null
          sort_order?: number
        }
        Update: {
          access_mode?: string
          created_at?: string
          description_en?: string | null
          description_he?: string | null
          hub_id?: string
          id?: string
          name_en?: string
          name_he?: string
          private_code?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "community_channels_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "community_hubs"
            referencedColumns: ["id"]
          },
        ]
      }
      community_hubs: {
        Row: {
          allow_comments: boolean
          allow_images: boolean
          allow_member_invite: boolean
          allow_polls: boolean
          allow_posts: boolean
          allow_video: boolean
          avatar_url: string | null
          company_id: string | null
          created_at: string
          creator_id: string
          description_en: string | null
          description_he: string | null
          id: string
          is_public: boolean
          member_count: number
          name_en: string
          name_he: string
          template: string
        }
        Insert: {
          allow_comments?: boolean
          allow_images?: boolean
          allow_member_invite?: boolean
          allow_polls?: boolean
          allow_posts?: boolean
          allow_video?: boolean
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          creator_id: string
          description_en?: string | null
          description_he?: string | null
          id?: string
          is_public?: boolean
          member_count?: number
          name_en: string
          name_he?: string
          template?: string
        }
        Update: {
          allow_comments?: boolean
          allow_images?: boolean
          allow_member_invite?: boolean
          allow_polls?: boolean
          allow_posts?: boolean
          allow_video?: boolean
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          creator_id?: string
          description_en?: string | null
          description_he?: string | null
          id?: string
          is_public?: boolean
          member_count?: number
          name_en?: string
          name_he?: string
          template?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_hubs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_hubs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      community_join_requests: {
        Row: {
          channel_id: string
          created_at: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_join_requests_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "community_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      community_members: {
        Row: {
          hub_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          hub_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          hub_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "community_hubs"
            referencedColumns: ["id"]
          },
        ]
      }
      community_messages: {
        Row: {
          attachment_url: string | null
          author_id: string
          channel_id: string
          content: string
          created_at: string
          id: string
          likes_count: number
          message_type: string
          parent_message_id: string | null
        }
        Insert: {
          attachment_url?: string | null
          author_id: string
          channel_id: string
          content: string
          created_at?: string
          id?: string
          likes_count?: number
          message_type?: string
          parent_message_id?: string | null
        }
        Update: {
          attachment_url?: string | null
          author_id?: string
          channel_id?: string
          content?: string
          created_at?: string
          id?: string
          likes_count?: number
          message_type?: string
          parent_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "community_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "community_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          ai_summary: string | null
          avg_hiring_speed_days: number | null
          created_at: string
          created_by: string | null
          description: string | null
          estimated_revenue: number | null
          historical_value: number | null
          id: string
          industry: string | null
          last_contact_at: string | null
          last_metrics_update: string | null
          lead_status: string | null
          logo_scraped_url: string | null
          logo_url: string | null
          metadata: Json | null
          name: string
          response_rate: number | null
          size: string | null
          tech_stack: string[] | null
          total_hires: number | null
          updated_at: string
          website: string | null
        }
        Insert: {
          ai_summary?: string | null
          avg_hiring_speed_days?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_revenue?: number | null
          historical_value?: number | null
          id?: string
          industry?: string | null
          last_contact_at?: string | null
          last_metrics_update?: string | null
          lead_status?: string | null
          logo_scraped_url?: string | null
          logo_url?: string | null
          metadata?: Json | null
          name: string
          response_rate?: number | null
          size?: string | null
          tech_stack?: string[] | null
          total_hires?: number | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          ai_summary?: string | null
          avg_hiring_speed_days?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_revenue?: number | null
          historical_value?: number | null
          id?: string
          industry?: string | null
          last_contact_at?: string | null
          last_metrics_update?: string | null
          lead_status?: string | null
          logo_scraped_url?: string | null
          logo_url?: string | null
          metadata?: Json | null
          name?: string
          response_rate?: number | null
          size?: string | null
          tech_stack?: string[] | null
          total_hires?: number | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      company_reviews: {
        Row: {
          advice: string | null
          company_name: string
          cons: string | null
          created_at: string | null
          culture_rating: number | null
          growth_rating: number | null
          id: string
          is_anonymous: boolean | null
          is_approved: boolean | null
          management_rating: number | null
          overall_rating: number | null
          pros: string | null
          relationship: string | null
          reviewer_id: string
          salary_rating: number | null
          worklife_rating: number | null
        }
        Insert: {
          advice?: string | null
          company_name: string
          cons?: string | null
          created_at?: string | null
          culture_rating?: number | null
          growth_rating?: number | null
          id?: string
          is_anonymous?: boolean | null
          is_approved?: boolean | null
          management_rating?: number | null
          overall_rating?: number | null
          pros?: string | null
          relationship?: string | null
          reviewer_id: string
          salary_rating?: number | null
          worklife_rating?: number | null
        }
        Update: {
          advice?: string | null
          company_name?: string
          cons?: string | null
          created_at?: string | null
          culture_rating?: number | null
          growth_rating?: number | null
          id?: string
          is_anonymous?: boolean | null
          is_approved?: boolean | null
          management_rating?: number | null
          overall_rating?: number | null
          pros?: string | null
          relationship?: string | null
          reviewer_id?: string
          salary_rating?: number | null
          worklife_rating?: number | null
        }
        Relationships: []
      }
      company_vouch_prompts: {
        Row: {
          application_id: string
          company_id: string | null
          created_at: string
          credits_awarded: number | null
          dismissed: boolean | null
          id: string
          prompted_at: string
          trigger_stage: string | null
          trigger_type: string
          user_id: string
          vouch_completed: boolean | null
          vouch_completed_at: string | null
        }
        Insert: {
          application_id: string
          company_id?: string | null
          created_at?: string
          credits_awarded?: number | null
          dismissed?: boolean | null
          id?: string
          prompted_at?: string
          trigger_stage?: string | null
          trigger_type: string
          user_id: string
          vouch_completed?: boolean | null
          vouch_completed_at?: string | null
        }
        Update: {
          application_id?: string
          company_id?: string | null
          created_at?: string
          credits_awarded?: number | null
          dismissed?: boolean | null
          id?: string
          prompted_at?: string
          trigger_stage?: string | null
          trigger_type?: string
          user_id?: string
          vouch_completed?: boolean | null
          vouch_completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_vouch_prompts_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_vouch_prompts_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications_candidate_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_vouch_prompts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_vouch_prompts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      company_vouches: {
        Row: {
          application_id: string | null
          communication_rating: number | null
          company_id: string
          created_at: string
          feedback_text: string | null
          id: string
          overall_rating: number | null
          process_outcome: string | null
          process_speed_rating: number | null
          transparency_rating: number | null
          updated_at: string
          user_id: string
          would_recommend: boolean | null
        }
        Insert: {
          application_id?: string | null
          communication_rating?: number | null
          company_id: string
          created_at?: string
          feedback_text?: string | null
          id?: string
          overall_rating?: number | null
          process_outcome?: string | null
          process_speed_rating?: number | null
          transparency_rating?: number | null
          updated_at?: string
          user_id: string
          would_recommend?: boolean | null
        }
        Update: {
          application_id?: string | null
          communication_rating?: number | null
          company_id?: string
          created_at?: string
          feedback_text?: string | null
          id?: string
          overall_rating?: number | null
          process_outcome?: string | null
          process_speed_rating?: number | null
          transparency_rating?: number | null
          updated_at?: string
          user_id?: string
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "company_vouches_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_vouches_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications_candidate_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_vouches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_vouches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_records: {
        Row: {
          consent_type: string | null
          granted: boolean
          granted_at: string | null
          id: string
          ip_address: string | null
          user_id: string
        }
        Insert: {
          consent_type?: string | null
          granted: boolean
          granted_at?: string | null
          id?: string
          ip_address?: string | null
          user_id: string
        }
        Update: {
          consent_type?: string | null
          granted?: boolean
          granted_at?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          participant_1: string
          participant_2: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_1: string
          participant_2: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_1?: string
          participant_2?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      crawler_discovered_jobs: {
        Row: {
          company_name: string | null
          discovered_at: string
          id: string
          job_id: string | null
          platform: string
          processed_at: string | null
          source_url: string
          status: string | null
          title: string | null
        }
        Insert: {
          company_name?: string | null
          discovered_at?: string
          id?: string
          job_id?: string | null
          platform: string
          processed_at?: string | null
          source_url: string
          status?: string | null
          title?: string | null
        }
        Update: {
          company_name?: string | null
          discovered_at?: string
          id?: string
          job_id?: string | null
          platform?: string
          processed_at?: string | null
          source_url?: string
          status?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crawler_discovered_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      crawler_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          jobs_added: number | null
          jobs_found: number | null
          platform: string
          search_query: string
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          jobs_added?: number | null
          jobs_found?: number | null
          platform: string
          search_query: string
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          jobs_added?: number | null
          jobs_found?: number | null
          platform?: string
          search_query?: string
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      crawler_settings: {
        Row: {
          created_at: string
          frequency_hours: number | null
          id: string
          is_enabled: boolean | null
          last_run_at: string | null
          locations: string[] | null
          platforms: string[] | null
          search_queries: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          frequency_hours?: number | null
          id?: string
          is_enabled?: boolean | null
          last_run_at?: string | null
          locations?: string[] | null
          platforms?: string[] | null
          search_queries?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          frequency_hours?: number | null
          id?: string
          is_enabled?: boolean | null
          last_run_at?: string | null
          locations?: string[] | null
          platforms?: string[] | null
          search_queries?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          action_type: string
          amount: number
          created_at: string
          credit_type: string
          description: string | null
          id: string
          user_id: string
        }
        Insert: {
          action_type: string
          amount: number
          created_at?: string
          credit_type: string
          description?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action_type?: string
          amount?: number
          created_at?: string
          credit_type?: string
          description?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_action_counts: {
        Row: {
          action_date: string
          community_shares: number
          created_at: string
          id: string
          job_shares: number
          user_id: string
        }
        Insert: {
          action_date?: string
          community_shares?: number
          created_at?: string
          id?: string
          job_shares?: number
          user_id: string
        }
        Update: {
          action_date?: string
          community_shares?: number
          created_at?: string
          id?: string
          job_shares?: number
          user_id?: string
        }
        Relationships: []
      }
      data_deletion_requests: {
        Row: {
          completed_at: string | null
          id: string
          reason: string | null
          requested_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          reason?: string | null
          requested_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          reason?: string | null
          requested_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      document_templates: {
        Row: {
          category: string
          content_html: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category?: string
          content_html: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          content_html?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          ai_summary: Json | null
          created_at: string
          doc_type: string | null
          file_name: string
          file_path: string
          file_type: string | null
          id: string
          is_signed: boolean | null
          owner_id: string
          related_application_id: string | null
          related_job_id: string | null
          signature_data: string | null
          updated_at: string
        }
        Insert: {
          ai_summary?: Json | null
          created_at?: string
          doc_type?: string | null
          file_name: string
          file_path: string
          file_type?: string | null
          id?: string
          is_signed?: boolean | null
          owner_id: string
          related_application_id?: string | null
          related_job_id?: string | null
          signature_data?: string | null
          updated_at?: string
        }
        Update: {
          ai_summary?: Json | null
          created_at?: string
          doc_type?: string | null
          file_name?: string
          file_path?: string
          file_type?: string | null
          id?: string
          is_signed?: boolean | null
          owner_id?: string
          related_application_id?: string | null
          related_job_id?: string | null
          signature_data?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_related_application_id_fkey"
            columns: ["related_application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_related_application_id_fkey"
            columns: ["related_application_id"]
            isOneToOne: false
            referencedRelation: "applications_candidate_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_related_job_id_fkey"
            columns: ["related_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          candidate_id: string | null
          id: string
          sent_at: string | null
          status: string | null
          template_id: string | null
        }
        Insert: {
          candidate_id?: string | null
          id?: string
          sent_at?: string | null
          status?: string | null
          template_id?: string | null
        }
        Update: {
          candidate_id?: string | null
          id?: string
          sent_at?: string | null
          status?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          created_at: string | null
          created_by: string
          delay_hours: number | null
          id: string
          is_active: boolean | null
          name: string
          subject: string
          trigger_stage: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          created_by: string
          delay_hours?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          trigger_stage?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          created_by?: string
          delay_hours?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          trigger_stage?: string | null
        }
        Relationships: []
      }
      experience_levels: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name_en: string
          name_he: string
          slug: string
          years_max: number | null
          years_min: number
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name_en: string
          name_he: string
          slug: string
          years_max?: number | null
          years_min?: number
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name_en?: string
          name_he?: string
          slug?: string
          years_max?: number | null
          years_min?: number
        }
        Relationships: []
      }
      feed_poll_options: {
        Row: {
          created_at: string
          id: string
          post_id: string
          text_en: string
          text_he: string
          votes_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          text_en: string
          text_he: string
          votes_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          text_en?: string
          text_he?: string
          votes_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "feed_poll_options_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_posts: {
        Row: {
          allow_comments: boolean
          author_id: string
          comment_permission: string
          comments_count: number
          company_id: string | null
          content_en: string | null
          content_he: string | null
          content_language: string
          created_at: string
          id: string
          is_published: boolean
          likes_count: number
          post_type: string
          shares_count: number | null
          target_channel_id: string | null
          target_hub_id: string | null
          unique_viewers: number | null
          updated_at: string
          video_url: string | null
          views_count: number | null
        }
        Insert: {
          allow_comments?: boolean
          author_id: string
          comment_permission?: string
          comments_count?: number
          company_id?: string | null
          content_en?: string | null
          content_he?: string | null
          content_language?: string
          created_at?: string
          id?: string
          is_published?: boolean
          likes_count?: number
          post_type: string
          shares_count?: number | null
          target_channel_id?: string | null
          target_hub_id?: string | null
          unique_viewers?: number | null
          updated_at?: string
          video_url?: string | null
          views_count?: number | null
        }
        Update: {
          allow_comments?: boolean
          author_id?: string
          comment_permission?: string
          comments_count?: number
          company_id?: string | null
          content_en?: string | null
          content_he?: string | null
          content_language?: string
          created_at?: string
          id?: string
          is_published?: boolean
          likes_count?: number
          post_type?: string
          shares_count?: number | null
          target_channel_id?: string | null
          target_hub_id?: string | null
          unique_viewers?: number | null
          updated_at?: string
          video_url?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_posts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_posts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_posts_target_channel_id_fkey"
            columns: ["target_channel_id"]
            isOneToOne: false
            referencedRelation: "community_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_posts_target_hub_id_fkey"
            columns: ["target_hub_id"]
            isOneToOne: false
            referencedRelation: "community_hubs"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          followed_company_id: string | null
          followed_user_id: string | null
          follower_id: string
          id: string
        }
        Insert: {
          created_at?: string
          followed_company_id?: string | null
          followed_user_id?: string | null
          follower_id: string
          id?: string
        }
        Update: {
          created_at?: string
          followed_company_id?: string | null
          followed_user_id?: string | null
          follower_id?: string
          id?: string
        }
        Relationships: []
      }
      gdpr_requests: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          processed_at: string | null
          request_type: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          request_type: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          request_type?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      home_assignments: {
        Row: {
          application_id: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          notes: string | null
          uploaded_at: string
        }
        Insert: {
          application_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          notes?: string | null
          uploaded_at?: string
        }
        Update: {
          application_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          notes?: string | null
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_assignments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_assignments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications_candidate_view"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_reminders: {
        Row: {
          application_id: string
          created_at: string
          id: string
          interview_date: string
          interview_type: string | null
          location: string | null
          notes: string | null
          reminder_sent: boolean | null
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          interview_date: string
          interview_type?: string | null
          location?: string | null
          notes?: string | null
          reminder_sent?: boolean | null
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          interview_date?: string
          interview_type?: string | null
          location?: string | null
          notes?: string | null
          reminder_sent?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_reminders_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_reminders_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications_candidate_view"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_slots: {
        Row: {
          created_at: string | null
          end_time: string
          id: string
          interview_id: string | null
          is_selected: boolean | null
          start_time: string
        }
        Insert: {
          created_at?: string | null
          end_time: string
          id?: string
          interview_id?: string | null
          is_selected?: boolean | null
          start_time: string
        }
        Update: {
          created_at?: string | null
          end_time?: string
          id?: string
          interview_id?: string | null
          is_selected?: boolean | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_slots_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          application_id: string | null
          candidate_id: string
          created_at: string | null
          created_by: string
          duration_minutes: number | null
          id: string
          interview_type: string | null
          job_id: string | null
          location: string | null
          meeting_link: string | null
          notes: string | null
          scheduled_at: string | null
          scheduling_mode: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          application_id?: string | null
          candidate_id: string
          created_at?: string | null
          created_by: string
          duration_minutes?: number | null
          id?: string
          interview_type?: string | null
          job_id?: string | null
          location?: string | null
          meeting_link?: string | null
          notes?: string | null
          scheduled_at?: string | null
          scheduling_mode?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string | null
          candidate_id?: string
          created_at?: string | null
          created_by?: string
          duration_minutes?: number | null
          id?: string
          interview_type?: string | null
          job_id?: string | null
          location?: string | null
          meeting_link?: string | null
          notes?: string | null
          scheduled_at?: string | null
          scheduling_mode?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications_candidate_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_alerts: {
        Row: {
          created_at: string | null
          experience_level_ids: string[] | null
          field_ids: string[] | null
          id: string
          is_active: boolean | null
          last_sent_at: string | null
          location: string | null
          role_ids: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          experience_level_ids?: string[] | null
          field_ids?: string[] | null
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          location?: string | null
          role_ids?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          experience_level_ids?: string[] | null
          field_ids?: string[] | null
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          location?: string | null
          role_ids?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      job_fields: {
        Row: {
          created_at: string
          display_order: number
          icon: string | null
          id: string
          name_en: string
          name_he: string
          slug: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          name_en: string
          name_he: string
          slug: string
        }
        Update: {
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          name_en?: string
          name_he?: string
          slug?: string
        }
        Relationships: []
      }
      job_publications: {
        Row: {
          channel: string
          created_at: string | null
          error_message: string | null
          external_id: string | null
          id: string
          job_id: string | null
          published_at: string | null
          status: string | null
        }
        Insert: {
          channel: string
          created_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          job_id?: string | null
          published_at?: string | null
          status?: string | null
        }
        Update: {
          channel?: string
          created_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          job_id?: string | null
          published_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_publications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_roles: {
        Row: {
          created_at: string
          display_order: number
          field_id: string
          id: string
          name_en: string
          name_he: string
          slug: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          field_id: string
          id?: string
          name_en: string
          name_he: string
          slug: string
        }
        Update: {
          created_at?: string
          display_order?: number
          field_id?: string
          id?: string
          name_en?: string
          name_he?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_roles_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "job_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          ai_summary: Json | null
          category: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          experience_level_id: string | null
          field_id: string | null
          hybrid_office_days: number | null
          id: string
          is_community_shared: boolean | null
          job_type: string | null
          latitude: number | null
          location: string | null
          longitude: number | null
          requirements: string | null
          role_id: string | null
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          salary_period: string | null
          salary_range: string | null
          shared_by_user_id: string | null
          source_url: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          ai_summary?: Json | null
          category?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          experience_level_id?: string | null
          field_id?: string | null
          hybrid_office_days?: number | null
          id?: string
          is_community_shared?: boolean | null
          job_type?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          requirements?: string | null
          role_id?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: string | null
          salary_range?: string | null
          shared_by_user_id?: string | null
          source_url?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          ai_summary?: Json | null
          category?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          experience_level_id?: string | null
          field_id?: string | null
          hybrid_office_days?: number | null
          id?: string
          is_community_shared?: boolean | null
          job_type?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          requirements?: string | null
          role_id?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: string | null
          salary_range?: string | null
          shared_by_user_id?: string | null
          source_url?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_experience_level_id_fkey"
            columns: ["experience_level_id"]
            isOneToOne: false
            referencedRelation: "experience_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "job_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "job_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_shared_by_user_id_fkey"
            columns: ["shared_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "jobs_shared_by_user_id_fkey"
            columns: ["shared_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["user_id"]
          },
        ]
      }
      knockout_answers: {
        Row: {
          answer: boolean
          answered_at: string | null
          candidate_id: string
          id: string
          passed: boolean
          question_id: string | null
        }
        Insert: {
          answer: boolean
          answered_at?: string | null
          candidate_id: string
          id?: string
          passed: boolean
          question_id?: string | null
        }
        Update: {
          answer?: boolean
          answered_at?: string | null
          candidate_id?: string
          id?: string
          passed?: boolean
          question_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knockout_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "knockout_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      knockout_questions: {
        Row: {
          correct_answer: boolean
          created_at: string | null
          id: string
          is_required: boolean | null
          job_id: string | null
          question_order: number
          question_text: string
        }
        Insert: {
          correct_answer: boolean
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          job_id?: string | null
          question_order: number
          question_text: string
        }
        Update: {
          correct_answer?: boolean
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          job_id?: string | null
          question_order?: number
          question_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "knockout_questions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      master_skills: {
        Row: {
          category_en: string
          category_he: string
          created_at: string
          created_by: string | null
          id: string
          is_custom: boolean
          name_en: string
          name_he: string
          skill_type: string
        }
        Insert: {
          category_en: string
          category_he: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_custom?: boolean
          name_en: string
          name_he: string
          skill_type?: string
        }
        Update: {
          category_en?: string
          category_he?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_custom?: boolean
          name_en?: string
          name_he?: string
          skill_type?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_size: number | null
          attachment_type: string | null
          attachment_url: string | null
          content: string
          conversation_id: string
          created_at: string | null
          from_user_id: string
          id: string
          is_read: boolean | null
          related_application_id: string | null
          related_job_id: string | null
          to_user_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          conversation_id: string
          created_at?: string | null
          from_user_id: string
          id?: string
          is_read?: boolean | null
          related_application_id?: string | null
          related_job_id?: string | null
          to_user_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string | null
          from_user_id?: string
          id?: string
          is_read?: boolean | null
          related_application_id?: string | null
          related_job_id?: string | null
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_related_application_id_fkey"
            columns: ["related_application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_related_application_id_fkey"
            columns: ["related_application_id"]
            isOneToOne: false
            referencedRelation: "applications_candidate_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_related_job_id_fkey"
            columns: ["related_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_bids: {
        Row: {
          created_at: string
          hunter_id: string
          id: string
          is_anonymous: boolean
          mission_id: string
          pitch: string
          status: string
          updated_at: string
          verified_candidates_count: number | null
          vouched_candidates_count: number | null
        }
        Insert: {
          created_at?: string
          hunter_id: string
          id?: string
          is_anonymous?: boolean
          mission_id: string
          pitch: string
          status?: string
          updated_at?: string
          verified_candidates_count?: number | null
          vouched_candidates_count?: number | null
        }
        Update: {
          created_at?: string
          hunter_id?: string
          id?: string
          is_anonymous?: boolean
          mission_id?: string
          pitch?: string
          status?: string
          updated_at?: string
          verified_candidates_count?: number | null
          vouched_candidates_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mission_bids_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          commission_model: string
          commission_value: number
          company_id: string | null
          company_website: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          job_id: string | null
          min_reliability_score: number | null
          required_specializations: string[] | null
          scope: string
          status: string
          title: string
          updated_at: string
          urgency: string
        }
        Insert: {
          commission_model?: string
          commission_value?: number
          company_id?: string | null
          company_website?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          job_id?: string | null
          min_reliability_score?: number | null
          required_specializations?: string[] | null
          scope?: string
          status?: string
          title: string
          updated_at?: string
          urgency?: string
        }
        Update: {
          commission_model?: string
          commission_value?: number
          company_id?: string | null
          company_website?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          job_id?: string | null
          min_reliability_score?: number | null
          required_specializations?: string[] | null
          scope?: string
          status?: string
          title?: string
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "missions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          additional_terms: string | null
          benefits: Json | null
          candidate_id: string
          candidate_response: string | null
          created_at: string | null
          created_by: string
          expiry_date: string | null
          id: string
          job_id: string | null
          salary_currency: string | null
          salary_gross: number
          sent_at: string | null
          signature_url: string | null
          signed_at: string | null
          start_date: string | null
          status: string | null
        }
        Insert: {
          additional_terms?: string | null
          benefits?: Json | null
          candidate_id: string
          candidate_response?: string | null
          created_at?: string | null
          created_by: string
          expiry_date?: string | null
          id?: string
          job_id?: string | null
          salary_currency?: string | null
          salary_gross: number
          sent_at?: string | null
          signature_url?: string | null
          signed_at?: string | null
          start_date?: string | null
          status?: string | null
        }
        Update: {
          additional_terms?: string | null
          benefits?: Json | null
          candidate_id?: string
          candidate_response?: string | null
          created_at?: string | null
          created_by?: string
          expiry_date?: string | null
          id?: string
          job_id?: string | null
          salary_currency?: string | null
          salary_gross?: number
          sent_at?: string | null
          signature_url?: string | null
          signed_at?: string | null
          start_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_instances: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          new_hire_id: string
          start_date: string
          status: string | null
          template_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          new_hire_id: string
          start_date?: string
          status?: string | null
          template_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          new_hire_id?: string
          start_date?: string
          status?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_instances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "onboarding_instances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "onboarding_instances_new_hire_id_fkey"
            columns: ["new_hire_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "onboarding_instances_new_hire_id_fkey"
            columns: ["new_hire_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "onboarding_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "onboarding_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_task_progress: {
        Row: {
          completed_at: string | null
          id: string
          instance_id: string | null
          is_completed: boolean | null
          notes: string | null
          task_index: number
        }
        Insert: {
          completed_at?: string | null
          id?: string
          instance_id?: string | null
          is_completed?: boolean | null
          notes?: string | null
          task_index: number
        }
        Update: {
          completed_at?: string | null
          id?: string
          instance_id?: string | null
          is_completed?: boolean | null
          notes?: string | null
          task_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_task_progress_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "onboarding_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_templates: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          name: string
          tasks: Json
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          name?: string
          tasks?: Json
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          name?: string
          tasks?: Json
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "onboarding_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          about_me: string | null
          active_company_id: string | null
          allow_recruiter_contact: boolean | null
          avatar_url: string | null
          avg_response_time_hours: number | null
          bio: string | null
          completed_actions: number | null
          created_at: string
          cv_data: Json | null
          email: string
          email_notifications: boolean | null
          experience_years: number | null
          full_name: string
          github_url: string | null
          id: string
          intro_video_url: string | null
          linkedin_url: string | null
          onboarding_stage: string | null
          personal_tagline: string | null
          phone: string | null
          portfolio_summary: Json | null
          portfolio_url: string | null
          preferred_experience_level_id: string | null
          preferred_fields: string[] | null
          preferred_language: string | null
          preferred_roles: string[] | null
          profile_visibility: string | null
          recruiter_background: string | null
          recruiter_companies: string[] | null
          recruiter_education: string | null
          recruiter_industries: string[] | null
          recruiter_philosophy: string | null
          recruiter_tip: string | null
          recruiter_video_url: string | null
          response_rate: number | null
          theme: string | null
          total_applications: number | null
          updated_at: string
          user_id: string
          visible_to_hr: boolean | null
        }
        Insert: {
          about_me?: string | null
          active_company_id?: string | null
          allow_recruiter_contact?: boolean | null
          avatar_url?: string | null
          avg_response_time_hours?: number | null
          bio?: string | null
          completed_actions?: number | null
          created_at?: string
          cv_data?: Json | null
          email: string
          email_notifications?: boolean | null
          experience_years?: number | null
          full_name: string
          github_url?: string | null
          id?: string
          intro_video_url?: string | null
          linkedin_url?: string | null
          onboarding_stage?: string | null
          personal_tagline?: string | null
          phone?: string | null
          portfolio_summary?: Json | null
          portfolio_url?: string | null
          preferred_experience_level_id?: string | null
          preferred_fields?: string[] | null
          preferred_language?: string | null
          preferred_roles?: string[] | null
          profile_visibility?: string | null
          recruiter_background?: string | null
          recruiter_companies?: string[] | null
          recruiter_education?: string | null
          recruiter_industries?: string[] | null
          recruiter_philosophy?: string | null
          recruiter_tip?: string | null
          recruiter_video_url?: string | null
          response_rate?: number | null
          theme?: string | null
          total_applications?: number | null
          updated_at?: string
          user_id: string
          visible_to_hr?: boolean | null
        }
        Update: {
          about_me?: string | null
          active_company_id?: string | null
          allow_recruiter_contact?: boolean | null
          avatar_url?: string | null
          avg_response_time_hours?: number | null
          bio?: string | null
          completed_actions?: number | null
          created_at?: string
          cv_data?: Json | null
          email?: string
          email_notifications?: boolean | null
          experience_years?: number | null
          full_name?: string
          github_url?: string | null
          id?: string
          intro_video_url?: string | null
          linkedin_url?: string | null
          onboarding_stage?: string | null
          personal_tagline?: string | null
          phone?: string | null
          portfolio_summary?: Json | null
          portfolio_url?: string | null
          preferred_experience_level_id?: string | null
          preferred_fields?: string[] | null
          preferred_language?: string | null
          preferred_roles?: string[] | null
          profile_visibility?: string | null
          recruiter_background?: string | null
          recruiter_companies?: string[] | null
          recruiter_education?: string | null
          recruiter_industries?: string[] | null
          recruiter_philosophy?: string | null
          recruiter_tip?: string | null
          recruiter_video_url?: string | null
          response_rate?: number | null
          theme?: string | null
          total_applications?: number | null
          updated_at?: string
          user_id?: string
          visible_to_hr?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_company_id_fkey"
            columns: ["active_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_active_company_id_fkey"
            columns: ["active_company_id"]
            isOneToOne: false
            referencedRelation: "companies_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_preferred_experience_level_id_fkey"
            columns: ["preferred_experience_level_id"]
            isOneToOne: false
            referencedRelation: "experience_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_code_redemptions: {
        Row: {
          code: string
          credits_awarded: number
          id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          code: string
          credits_awarded?: number
          id?: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          code?: string
          credits_awarded?: number
          id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          amount: number | null
          code_hash: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          type: string
          uses_count: number
        }
        Insert: {
          amount?: number | null
          code_hash: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          type?: string
          uses_count?: number
        }
        Update: {
          amount?: number | null
          code_hash?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          type?: string
          uses_count?: number
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          p256dh_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recruiter_candidate_notes: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          note: string
          recruiter_id: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          note: string
          recruiter_id: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          note?: string
          recruiter_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_credits_awarded: boolean
          referred_id: string
          referrer_credits_awarded: boolean
          referrer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          referred_credits_awarded?: boolean
          referred_id: string
          referrer_credits_awarded?: boolean
          referrer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          referred_credits_awarded?: boolean
          referred_id?: string
          referrer_credits_awarded?: boolean
          referrer_id?: string
        }
        Relationships: []
      }
      salary_data: {
        Row: {
          currency: string | null
          experience_years: number | null
          id: string
          job_role: string
          location: string | null
          salary_max: number | null
          salary_median: number | null
          salary_min: number | null
          sample_size: number | null
          updated_at: string | null
        }
        Insert: {
          currency?: string | null
          experience_years?: number | null
          id?: string
          job_role: string
          location?: string | null
          salary_max?: number | null
          salary_median?: number | null
          salary_min?: number | null
          sample_size?: number | null
          updated_at?: string | null
        }
        Update: {
          currency?: string | null
          experience_years?: number | null
          id?: string
          job_role?: string
          location?: string | null
          salary_max?: number | null
          salary_median?: number | null
          salary_min?: number | null
          sample_size?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      saved_jobs: {
        Row: {
          created_at: string | null
          id: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_tasks: {
        Row: {
          assigned_to: string[] | null
          created_at: string
          description: string | null
          due_date: string | null
          due_time: string | null
          external_attendees: Json | null
          id: string
          is_completed: boolean
          location: string | null
          meeting_link: string | null
          priority: string
          related_candidate: string | null
          related_job: string | null
          source: string | null
          source_id: string | null
          source_table: string | null
          task_type: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string[] | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          external_attendees?: Json | null
          id?: string
          is_completed?: boolean
          location?: string | null
          meeting_link?: string | null
          priority?: string
          related_candidate?: string | null
          related_job?: string | null
          source?: string | null
          source_id?: string | null
          source_table?: string | null
          task_type?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string[] | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          external_attendees?: Json | null
          id?: string
          is_completed?: boolean
          location?: string | null
          meeting_link?: string | null
          priority?: string
          related_candidate?: string | null
          related_job?: string | null
          source?: string | null
          source_id?: string | null
          source_table?: string | null
          task_type?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scorecard_templates: {
        Row: {
          created_at: string | null
          created_by: string
          criteria: Json
          id: string
          job_id: string | null
          name: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          criteria?: Json
          id?: string
          job_id?: string | null
          name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          criteria?: Json
          id?: string
          job_id?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "scorecard_templates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      scorecards: {
        Row: {
          candidate_id: string
          general_notes: string | null
          id: string
          interview_type: string | null
          interviewer_id: string
          overall_recommendation: string | null
          overall_score: number | null
          scores: Json
          submitted_at: string | null
          template_id: string | null
        }
        Insert: {
          candidate_id: string
          general_notes?: string | null
          id?: string
          interview_type?: string | null
          interviewer_id: string
          overall_recommendation?: string | null
          overall_score?: number | null
          scores?: Json
          submitted_at?: string | null
          template_id?: string | null
        }
        Update: {
          candidate_id?: string
          general_notes?: string | null
          id?: string
          interview_type?: string | null
          interviewer_id?: string
          overall_recommendation?: string | null
          overall_score?: number | null
          scores?: Json
          submitted_at?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scorecards_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "scorecard_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      signing_document_audit: {
        Row: {
          actor_id: string | null
          actor_name: string | null
          created_at: string
          document_id: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          document_id: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
        }
        Update: {
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          document_id?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "signing_document_audit_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "signing_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      signing_documents: {
        Row: {
          application_id: string | null
          candidate_id: string | null
          content_html: string
          created_at: string
          created_by: string
          decline_reason: string | null
          declined_at: string | null
          document_number: string
          expires_at: string | null
          id: string
          last_viewed_at: string | null
          original_file_name: string | null
          original_file_type: string | null
          original_file_url: string | null
          recipient_email: string | null
          recipient_name: string | null
          recipient_phone: string | null
          reminder_sent_at: string | null
          send_channel: string | null
          sent_at: string | null
          signature_data: string | null
          signed_at: string | null
          signed_document_url: string | null
          signing_token: string | null
          status: string
          template_id: string | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          application_id?: string | null
          candidate_id?: string | null
          content_html: string
          created_at?: string
          created_by: string
          decline_reason?: string | null
          declined_at?: string | null
          document_number: string
          expires_at?: string | null
          id?: string
          last_viewed_at?: string | null
          original_file_name?: string | null
          original_file_type?: string | null
          original_file_url?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          reminder_sent_at?: string | null
          send_channel?: string | null
          sent_at?: string | null
          signature_data?: string | null
          signed_at?: string | null
          signed_document_url?: string | null
          signing_token?: string | null
          status?: string
          template_id?: string | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          application_id?: string | null
          candidate_id?: string | null
          content_html?: string
          created_at?: string
          created_by?: string
          decline_reason?: string | null
          declined_at?: string | null
          document_number?: string
          expires_at?: string | null
          id?: string
          last_viewed_at?: string | null
          original_file_name?: string | null
          original_file_type?: string | null
          original_file_url?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          reminder_sent_at?: string | null
          send_channel?: string | null
          sent_at?: string | null
          signature_data?: string | null
          signed_at?: string | null
          signed_document_url?: string | null
          signing_token?: string | null
          status?: string
          template_id?: string | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "signing_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signing_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications_candidate_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signing_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_notifications: {
        Row: {
          created_at: string | null
          cta_link: string | null
          cta_text: string | null
          id: string
          message: string
          seen: boolean | null
          trigger_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          cta_link?: string | null
          cta_text?: string | null
          id?: string
          message: string
          seen?: boolean | null
          trigger_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          cta_link?: string | null
          cta_text?: string | null
          id?: string
          message?: string
          seen?: boolean | null
          trigger_type?: string
          user_id?: string
        }
        Relationships: []
      }
      social_task_completions: {
        Row: {
          completed_at: string
          credits_awarded: number
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          credits_awarded?: number
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          credits_awarded?: number
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: []
      }
      talent_pool_members: {
        Row: {
          added_at: string | null
          added_by: string
          candidate_id: string
          id: string
          notes: string | null
          pool_id: string | null
        }
        Insert: {
          added_at?: string | null
          added_by: string
          candidate_id: string
          id?: string
          notes?: string | null
          pool_id?: string | null
        }
        Update: {
          added_at?: string | null
          added_by?: string
          candidate_id?: string
          id?: string
          notes?: string | null
          pool_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "talent_pool_members_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "talent_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_pools: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      team_notes: {
        Row: {
          application_id: string
          author_id: string
          content: string
          created_at: string
          id: string
          mentioned_user_ids: string[] | null
          updated_at: string
        }
        Insert: {
          application_id: string
          author_id: string
          content: string
          created_at?: string
          id?: string
          mentioned_user_ids?: string[] | null
          updated_at?: string
        }
        Update: {
          application_id?: string
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          mentioned_user_ids?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_notes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_notes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications_candidate_view"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credits: {
        Row: {
          created_at: string
          daily_fuel: number
          id: string
          is_onboarded: boolean
          last_refill_date: string
          last_vouch_reset_month: string
          permanent_fuel: number
          pings_today: number
          referral_code: string | null
          updated_at: string
          user_id: string
          vouches_given_this_month: number
          vouches_received_this_month: number
        }
        Insert: {
          created_at?: string
          daily_fuel?: number
          id?: string
          is_onboarded?: boolean
          last_refill_date?: string
          last_vouch_reset_month?: string
          permanent_fuel?: number
          pings_today?: number
          referral_code?: string | null
          updated_at?: string
          user_id: string
          vouches_given_this_month?: number
          vouches_received_this_month?: number
        }
        Update: {
          created_at?: string
          daily_fuel?: number
          id?: string
          is_onboarded?: boolean
          last_refill_date?: string
          last_vouch_reset_month?: string
          permanent_fuel?: number
          pings_today?: number
          referral_code?: string | null
          updated_at?: string
          user_id?: string
          vouches_given_this_month?: number
          vouches_received_this_month?: number
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
      video_interview_questions: {
        Row: {
          created_at: string | null
          id: string
          interview_id: string | null
          question_order: number
          question_text: string
          question_type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          interview_id?: string | null
          question_order: number
          question_text: string
          question_type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          interview_id?: string | null
          question_order?: number
          question_text?: string
          question_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_interview_questions_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "video_interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      video_interview_ratings: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          rated_by: string
          rating: number | null
          response_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          rated_by: string
          rating?: number | null
          response_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          rated_by?: string
          rating?: number | null
          response_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_interview_ratings_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "video_interview_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      video_interview_responses: {
        Row: {
          candidate_id: string
          duration_seconds: number | null
          id: string
          interview_id: string | null
          question_id: string | null
          retake_number: number | null
          submitted_at: string | null
          video_url: string
        }
        Insert: {
          candidate_id: string
          duration_seconds?: number | null
          id?: string
          interview_id?: string | null
          question_id?: string | null
          retake_number?: number | null
          submitted_at?: string | null
          video_url: string
        }
        Update: {
          candidate_id?: string
          duration_seconds?: number | null
          id?: string
          interview_id?: string | null
          question_id?: string | null
          retake_number?: number | null
          submitted_at?: string | null
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_interview_responses_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "video_interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_interview_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "video_interview_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      video_interviews: {
        Row: {
          answer_time_seconds: number | null
          created_at: string | null
          created_by: string
          deadline: string | null
          id: string
          instructions: string | null
          job_id: string | null
          max_retakes: number | null
          status: string | null
          think_time_seconds: number | null
          title: string
        }
        Insert: {
          answer_time_seconds?: number | null
          created_at?: string | null
          created_by: string
          deadline?: string | null
          id?: string
          instructions?: string | null
          job_id?: string | null
          max_retakes?: number | null
          status?: string | null
          think_time_seconds?: number | null
          title: string
        }
        Update: {
          answer_time_seconds?: number | null
          created_at?: string | null
          created_by?: string
          deadline?: string | null
          id?: string
          instructions?: string | null
          job_id?: string | null
          max_retakes?: number | null
          status?: string | null
          think_time_seconds?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_interviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      vouches: {
        Row: {
          created_at: string | null
          from_user_id: string
          id: string
          is_public: boolean | null
          message: string
          relationship: string | null
          skill_ids: string[] | null
          skills: string[] | null
          to_user_id: string
          updated_at: string | null
          vouch_type: Database["public"]["Enums"]["vouch_type"]
          weight: number
        }
        Insert: {
          created_at?: string | null
          from_user_id: string
          id?: string
          is_public?: boolean | null
          message: string
          relationship?: string | null
          skill_ids?: string[] | null
          skills?: string[] | null
          to_user_id: string
          updated_at?: string | null
          vouch_type: Database["public"]["Enums"]["vouch_type"]
          weight?: number
        }
        Update: {
          created_at?: string | null
          from_user_id?: string
          id?: string
          is_public?: boolean | null
          message?: string
          relationship?: string | null
          skill_ids?: string[] | null
          skills?: string[] | null
          to_user_id?: string
          updated_at?: string | null
          vouch_type?: Database["public"]["Enums"]["vouch_type"]
          weight?: number
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          event: string
          id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          sent_at: string | null
          subscription_id: string | null
        }
        Insert: {
          event: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          sent_at?: string | null
          subscription_id?: string | null
        }
        Update: {
          event?: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          sent_at?: string | null
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "webhook_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_subscriptions: {
        Row: {
          created_at: string | null
          events: string[]
          fail_count: number | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          secret: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          events?: string[]
          fail_count?: number | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          secret?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          events?: string[]
          fail_count?: number | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          secret?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "webhook_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["user_id"]
          },
        ]
      }
      webinar_registrations: {
        Row: {
          created_at: string
          id: string
          user_id: string
          webinar_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          webinar_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          webinar_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webinar_registrations_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: false
            referencedRelation: "webinars"
            referencedColumns: ["id"]
          },
        ]
      }
      webinars: {
        Row: {
          company_id: string | null
          created_at: string
          creator_id: string
          description_en: string | null
          description_he: string | null
          id: string
          internal_stream_url: string | null
          is_internal: boolean
          link_url: string | null
          reminder_1_minutes: number
          reminder_2_minutes: number
          scheduled_at: string
          title_en: string
          title_he: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          creator_id: string
          description_en?: string | null
          description_he?: string | null
          id?: string
          internal_stream_url?: string | null
          is_internal?: boolean
          link_url?: string | null
          reminder_1_minutes?: number
          reminder_2_minutes?: number
          scheduled_at: string
          title_en?: string
          title_he?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          creator_id?: string
          description_en?: string | null
          description_he?: string | null
          id?: string
          internal_stream_url?: string | null
          is_internal?: boolean
          link_url?: string | null
          reminder_1_minutes?: number
          reminder_2_minutes?: number
          scheduled_at?: string
          title_en?: string
          title_he?: string
        }
        Relationships: [
          {
            foreignKeyName: "webinars_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webinars_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_quests: {
        Row: {
          completed: boolean | null
          created_at: string | null
          fuel_reward: number
          id: string
          progress: number | null
          quest_key: string
          target: number
          user_id: string
          week_start: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          fuel_reward: number
          id?: string
          progress?: number | null
          quest_key: string
          target: number
          user_id: string
          week_start: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          fuel_reward?: number
          id?: string
          progress?: number | null
          quest_key?: string
          target?: number
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      applications_candidate_view: {
        Row: {
          candidate_id: string | null
          created_at: string | null
          current_stage: string | null
          id: string | null
          job_id: string | null
          last_interaction: string | null
          match_score: number | null
          notes: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          candidate_id?: string | null
          created_at?: string | null
          current_stage?: string | null
          id?: string | null
          job_id?: string | null
          last_interaction?: string | null
          match_score?: number | null
          notes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          candidate_id?: string | null
          created_at?: string | null
          current_stage?: string | null
          id?: string | null
          job_id?: string | null
          last_interaction?: string | null
          match_score?: number | null
          notes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log_user_view: {
        Row: {
          action: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string | null
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string | null
          ip_address?: never
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string | null
          ip_address?: never
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      companies_secure: {
        Row: {
          avg_hiring_speed_days: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string | null
          industry: string | null
          last_metrics_update: string | null
          logo_url: string | null
          metadata: Json | null
          name: string | null
          size: string | null
          total_hires: number | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          avg_hiring_speed_days?: never
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string | null
          industry?: string | null
          last_metrics_update?: never
          logo_url?: string | null
          metadata?: never
          name?: string | null
          size?: string | null
          total_hires?: never
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          avg_hiring_speed_days?: never
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string | null
          industry?: string | null
          last_metrics_update?: never
          logo_url?: string | null
          metadata?: never
          name?: string | null
          size?: string | null
          total_hires?: never
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      company_ratings: {
        Row: {
          avg_communication: number | null
          avg_overall: number | null
          avg_process_speed: number | null
          avg_transparency: number | null
          company_id: string | null
          ghosted_count: number | null
          hired_count: number | null
          recommend_count: number | null
          total_reviews: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_vouches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_vouches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles_secure: {
        Row: {
          about_me: string | null
          active_company_id: string | null
          allow_recruiter_contact: boolean | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string | null
          email_notifications: boolean | null
          experience_years: number | null
          full_name: string | null
          github_url: string | null
          id: string | null
          intro_video_url: string | null
          linkedin_url: string | null
          personal_tagline: string | null
          phone: string | null
          portfolio_url: string | null
          preferred_experience_level_id: string | null
          preferred_fields: string[] | null
          preferred_language: string | null
          preferred_roles: string[] | null
          profile_visibility: string | null
          theme: string | null
          updated_at: string | null
          user_id: string | null
          visible_to_hr: boolean | null
        }
        Insert: {
          about_me?: string | null
          active_company_id?: string | null
          allow_recruiter_contact?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: never
          email_notifications?: boolean | null
          experience_years?: number | null
          full_name?: string | null
          github_url?: string | null
          id?: string | null
          intro_video_url?: string | null
          linkedin_url?: string | null
          personal_tagline?: string | null
          phone?: never
          portfolio_url?: string | null
          preferred_experience_level_id?: string | null
          preferred_fields?: string[] | null
          preferred_language?: string | null
          preferred_roles?: string[] | null
          profile_visibility?: string | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string | null
          visible_to_hr?: boolean | null
        }
        Update: {
          about_me?: string | null
          active_company_id?: string | null
          allow_recruiter_contact?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: never
          email_notifications?: boolean | null
          experience_years?: number | null
          full_name?: string | null
          github_url?: string | null
          id?: string | null
          intro_video_url?: string | null
          linkedin_url?: string | null
          personal_tagline?: string | null
          phone?: never
          portfolio_url?: string | null
          preferred_experience_level_id?: string | null
          preferred_fields?: string[] | null
          preferred_language?: string | null
          preferred_roles?: string[] | null
          profile_visibility?: string | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string | null
          visible_to_hr?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_company_id_fkey"
            columns: ["active_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_active_company_id_fkey"
            columns: ["active_company_id"]
            isOneToOne: false
            referencedRelation: "companies_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_preferred_experience_level_id_fkey"
            columns: ["preferred_experience_level_id"]
            isOneToOne: false
            referencedRelation: "experience_levels"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_vouch_weight: {
        Args: { giver_id: string; skill_ids: string[] }
        Returns: number
      }
      can_view_company_review: {
        Args: { review_company_name: string }
        Returns: boolean
      }
      can_view_contact_details: {
        Args: { profile_user_id: string }
        Returns: boolean
      }
      create_audit_log_entry: {
        Args: {
          p_action: string
          p_entity_id?: string
          p_entity_type: string
          p_new_values?: Json
          p_old_values?: Json
        }
        Returns: string
      }
      generate_referral_code: { Args: never; Returns: string }
      get_active_company_id: { Args: never; Returns: string }
      get_total_credits: { Args: { p_user_id: string }; Returns: number }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role:
        | "job_seeker"
        | "freelance_hr"
        | "inhouse_hr"
        | "company_employee"
      vouch_type: "colleague" | "manager" | "recruiter" | "friend" | "mentor"
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
      app_role: [
        "job_seeker",
        "freelance_hr",
        "inhouse_hr",
        "company_employee",
      ],
      vouch_type: ["colleague", "manager", "recruiter", "friend", "mentor"],
    },
  },
} as const
