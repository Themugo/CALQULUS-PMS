import { supabase } from "@/integrations/supabase/client";

/**
 * Creating an invitation only inserts a row. This asks the backend to email the
 * accept link. Returns false (never throws) when delivery fails so the caller
 * can tell the manager the truth instead of claiming the invitation was sent.
 */
export async function deliverLandlordInvitation(invitation: unknown): Promise<boolean> {
  const id = (invitation as { id?: string } | null)?.id;
  if (!id) return false;
  try {
    const { data, error } = await supabase.functions.invoke("send-landlord-invitation", {
      body: { invitationId: id },
    });
    return !error && (data as { sent?: boolean } | null)?.sent === true;
  } catch {
    return false;
  }
}
