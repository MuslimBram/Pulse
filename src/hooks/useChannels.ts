import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";

export interface ChannelData {
  channel_type: string;
  channel_name: string;
  settings?: Record<string, unknown>;
  workspace_id?: string;
  connection_mode?: string;
  account_type?: string;
  capabilities?: string[];
}

export const useChannels = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["channels", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("channels")
        // Never expose provider credentials/settings to the browser. Secrets are
        // stored in credentials_encrypted and are only read by server functions.
        .select("id,workspace_id,user_id,channel_type,channel_name,is_enabled,connection_status,connection_mode,account_type,capabilities,provider_metadata,created_at,updated_at,last_error")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const addChannel = useMutation({
    mutationFn: async (channel: ChannelData) => {
      const { data: limitCheck, error: limitError } = await supabase.functions.invoke("enforce-limits", {
        body: { action: "add", resource: "channels" },
      });
      if (limitError) throw new Error(limitError.message || "Failed to check limits");
      if (limitCheck && !limitCheck.allowed) {
        throw new Error(limitCheck.error || "Channel limit reached. Please upgrade your plan.");
      }

      // Resolve the workspace server-side. We send only the credential payload
      // to save-channel-credentials; it encrypts sensitive values before storage.
      let workspaceId = channel.workspace_id;
      if (!workspaceId) {
        const { data: membership, error: membershipError } = await supabase
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (membershipError) throw membershipError;
        workspaceId = membership?.workspace_id || user!.id;
      }

      const { data, error } = await supabase.functions.invoke("save-channel-credentials", {
        body: {
          action: "save_generic",
          workspace_id: workspaceId,
          channel_type: channel.channel_type,
          channel_name: channel.channel_name,
          settings: channel.settings ?? {},
          connection_mode: channel.connection_mode ?? "professional",
          account_type: channel.account_type ?? "unknown",
          capabilities: channel.capabilities ?? [],
          provider_metadata: {},
        },
      });
      if (error) throw new Error(error.message || "Failed to save channel securely");
      if (!data?.ok) throw new Error(data?.error || "Failed to save channel securely");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
      toast.success("Channel added securely");
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleChannel = useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await supabase.from("channels").update({ is_enabled }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["channels"] }),
  });

  const deleteChannel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("channels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
      toast.success("Channel removed");
    },
    onError: (e) => toast.error(e.message),
  });

  return { channels: query.data ?? [], isLoading: query.isLoading, addChannel, toggleChannel, deleteChannel };
};
