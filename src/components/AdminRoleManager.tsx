import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuditLog } from "@/hooks/useAuditLog";
import { toast } from "@/components/ui/sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldPlus, ShieldMinus, Crown, Shield, Users, Brain, CheckCircle2, Clock3, XCircle } from "lucide-react";
import { useRolePermissions, type AppRole } from "@/hooks/useRolePermissions";

interface Profile { id: string; user_id: string; full_name: string | null; created_at: string; }
const ASSIGNABLE_ROLES: { value: AppRole; label: string; icon: React.ReactNode }[] = [
  { value: "controller", label: "Controller", icon: <Shield className="h-3 w-3" /> },
  { value: "worker", label: "Worker", icon: <Users className="h-3 w-3" /> },
  { value: "moderator", label: "Moderator", icon: <Shield className="h-3 w-3" /> },
];
const ROLE_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  super_admin: "destructive", admin: "default", controller: "secondary", worker: "outline", moderator: "secondary",
  business_owner: "outline", partner: "outline", business_manager: "outline", agent: "secondary", freelancer: "outline", user: "outline",
};

export const AdminRoleManager = ({ profiles }: { profiles: Profile[] }) => {
  const queryClient = useQueryClient();
  const { log } = useAuditLog();
  const { isAdmin, isOwner, getRoleLabel } = useRolePermissions();
  const [selectedRole, setSelectedRole] = useState<AppRole>("controller");
  const canManageRoles = isAdmin;

  const rolesQuery = useQuery({
    queryKey: ["admin-all-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data || [];
    },
    enabled: canManageRoles,
  });
  const requestsQuery = useQuery({
    queryKey: ["admin-role-requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("admin_role_requests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: canManageRoles,
  });
  const allRoles = rolesQuery.data ?? [];
  const requests = requestsQuery.data ?? [];
  const getRolesForUser = (userId: string) => allRoles.filter((r) => r.user_id === userId).map((r) => r.role as AppRole);

  const requestAdmin = useMutation({
    mutationFn: async (targetUserId: string) => {
      const { data: requestId, error } = await supabase.rpc("request_admin_role", { _target_user_id: targetUserId });
      if (error) throw error;
      const { data: aiResult, error: aiError } = await supabase.functions.invoke("ai-review-admin-role", { body: { request_id: requestId } });
      if (aiError) throw aiError;
      if (!aiResult?.approved) throw new Error(`AI rejected this admin request${aiResult?.reason ? `: ${aiResult.reason}` : "."}`);
      return { requestId, aiResult };
    },
    onSuccess: async ({ requestId }, userId) => {
      await log("admin_role_requested", "user", userId, { request_id: requestId, approval: "ai_plus_second_admin_or_owner" });
      queryClient.invalidateQueries({ queryKey: ["admin-role-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-user-roles"] });
      toast.success("AI approved. Waiting for a different Pulse AI Admin or Owner to approve.");
    },
    onError: (e: Error) => toast.error(e.message || "Admin request failed"),
  });

  const approveAdmin = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc("approve_admin_role", { _request_id: requestId, _reason: "Approved by authorized second administrator." });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-role-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-user-roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] });
      toast.success("Pulse AI Admin activated.");
    },
    onError: (e: Error) => toast.error(e.message || "Approval failed"),
  });

  const rejectAdmin = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc("reject_admin_role", { _request_id: requestId, _reason: "Rejected by authorized platform administrator." });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-role-requests"] });
      toast.success("Admin request rejected.");
    },
    onError: (e: Error) => toast.error(e.message || "Rejection failed"),
  });

  const assignRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      if (role === "admin") throw new Error("Pulse AI Admin must use the AI + second-admin approval workflow.");
      if (!isAdmin) throw new Error("Only platform admins can assign this role");
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
      if (error) throw error;
    },
    onSuccess: async (_, { userId, role }) => {
      await log("role_assigned", "user", userId, { role, label: getRoleLabel(role) });
      queryClient.invalidateQueries({ queryKey: ["admin-all-user-roles"] });
      toast.success(`${getRoleLabel(role)} assigned successfully`);
    },
    onError: (e: Error) => toast.error(`Failed: ${e.message}`),
  });

  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      if (role === "super_admin") throw new Error("The Owner role cannot be removed from this panel");
      if (role === "admin" && !isOwner) throw new Error("Only the Owner can remove a Pulse AI Admin");
      if (!isAdmin) throw new Error("Only platform admins can remove this role");
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);
      if (error) throw error;
    },
    onSuccess: async (_, { userId, role }) => {
      await log("role_removed", "user", userId, { role, label: getRoleLabel(role) });
      queryClient.invalidateQueries({ queryKey: ["admin-all-user-roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] });
      toast.success(`${getRoleLabel(role)} removed`);
    },
    onError: (e: Error) => toast.error(`Failed: ${e.message}`),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><ShieldPlus className="h-4 w-4" />Platform Role Management</CardTitle>
        <CardDescription>Owner has full Pulse AI access. A new Pulse AI Admin is activated only after AI approval and approval by a different Pulse AI Admin or the Owner.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!canManageRoles ? <p className="py-6 text-center text-sm text-muted-foreground">Only the Owner or Pulse AI Admin can access platform role management.</p> : <>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
            <div className="flex items-center gap-2 font-medium"><Brain className="h-4 w-4 text-primary" />Create Pulse AI Admin</div>
            <p className="text-xs text-muted-foreground">The user must already be registered. Your request goes through AI review first; activation then requires a different platform Admin or the Owner. The requester cannot approve their own request.</p>
          </div>

          {requests.filter((r: any) => r.status === "pending").length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Pending Admin Approvals</h3>
              {requests.filter((r: any) => r.status === "pending").map((r: any) => {
                const target = profiles.find((p) => p.user_id === r.target_user_id);
                return <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div><p className="text-sm font-medium">{target?.full_name || r.target_user_id}</p><div className="flex gap-2 mt-1"><Badge variant={r.ai_status === "approved" ? "default" : "secondary"} className="gap-1"><Brain className="h-3 w-3" />AI: {r.ai_status}</Badge><Badge variant="secondary" className="gap-1"><Clock3 className="h-3 w-3" />Human: pending</Badge></div></div>
                  <div className="flex gap-2"><Button size="sm" variant="outline" disabled={r.ai_status !== "approved" || approveAdmin.isPending} onClick={() => approveAdmin.mutate(r.id)}><CheckCircle2 className="h-3 w-3 mr-1" />Approve</Button><Button size="sm" variant="ghost" disabled={rejectAdmin.isPending} onClick={() => rejectAdmin.mutate(r.id)}><XCircle className="h-3 w-3 mr-1" />Reject</Button></div>
                </div>;
              })}
            </div>
          )}

          {profiles.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No registered users found</p> : <div className="space-y-2">
            {profiles.map((p) => {
              const userRoles = getRolesForUser(p.user_id);
              const hasAdmin = userRoles.includes("admin") || userRoles.includes("super_admin");
              const pending = requests.some((r: any) => r.target_user_id === p.user_id && r.status === "pending");
              return <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-3 gap-3">
                <div className="min-w-0 flex-1"><p className="text-sm font-medium">{p.full_name || "No name"}</p><p className="text-xs text-muted-foreground truncate">{p.user_id}</p><div className="flex flex-wrap gap-1 mt-1.5">{userRoles.map((role) => <Badge key={role} variant={ROLE_COLORS[role] || "outline"} className="text-xs gap-1" onClick={() => { if (role !== "user" && role !== "super_admin" && (role !== "admin" || isOwner) && confirm(`Remove ${getRoleLabel(role)} from ${p.full_name || p.user_id}?`)) removeRole.mutate({ userId: p.user_id, role }); }}>{getRoleLabel(role)}{role !== "user" && role !== "super_admin" && <ShieldMinus className="h-2.5 w-2.5" />}</Badge>)}</div></div>
                <div className="flex items-center gap-2 shrink-0">
                  {!hasAdmin && !pending && <Button size="sm" variant="default" disabled={!isAdmin || requestAdmin.isPending} onClick={() => requestAdmin.mutate(p.user_id)}><Crown className="h-3 w-3 mr-1" />Request Admin</Button>}
                  {pending && <Badge variant="secondary" className="gap-1"><Clock3 className="h-3 w-3" />Pending</Badge>}
                  <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}><SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{ASSIGNABLE_ROLES.map((r) => <SelectItem key={r.value} value={r.value}><span className="flex items-center gap-1.5">{r.icon}{r.label}</span></SelectItem>)}</SelectContent></Select>
                  <Button size="sm" variant="outline" disabled={!isAdmin || assignRole.isPending || userRoles.includes(selectedRole)} onClick={() => assignRole.mutate({ userId: p.user_id, role: selectedRole })}><ShieldPlus className="h-3 w-3 mr-1" />Assign</Button>
                </div>
              </div>;
            })}
          </div>}
        </>}
      </CardContent>
    </Card>
  );
};
