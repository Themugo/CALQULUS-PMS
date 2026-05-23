/**
 * useActivityLog — writes to activity_logs table (migration 013).
 * Column names match: actor_id, actor_role, actor_email, action, entity_type, entity_id, entity_label, property_id, manager_id, metadata
 */
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';

interface LogParams {
  action: string;
  entityType?: string;
  entityId?: string;
  entityLabel?: string;
  propertyId?: string;
  managerId?: string;
  metadata?: Record<string, unknown>;
}

export function useActivityLog() {
  const { user, userRole } = useAuth();

  const logActivity = useCallback(async (params: LogParams) => {
    if (!user?.id) return;
    try {
      await supabase.from('activity_logs').insert({
        actor_id:     user.id,
        actor_role:   userRole?.role ?? 'system',
        actor_email:  user.email ?? null,
        action:       params.action,
        entity_type:  params.entityType ?? null,
        entity_id:    params.entityId ? params.entityId : null,
        entity_label: params.entityLabel ?? null,
        property_id:  params.propertyId ?? null,
        manager_id:   params.managerId ?? null,
        metadata:     params.metadata ?? null,
      });
    } catch (err) {
      // Non-blocking — audit failures must never break the main action
    }
  }, [user?.id, user?.email, userRole?.role]);

  return { logActivity };
}
