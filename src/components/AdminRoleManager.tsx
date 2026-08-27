import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuditLog } from "@/hooks/useAuditLog";
import { toast } from "@/components/ui/sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldPlus, ShieldMinus, Crown, Shield, Users } from "lucide-react";
import { useRolePermissions, type AppRole } from "@/hooks/useRolePermissions";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  created_at: string;
}

const ASSIGNABLE_ROLES: { value: AppRole; label: string; icon: React.ReactNode }[] = [
  { value: "admin", label: "Pulse AI Admin", icon: <Crown className="h-3 w-3" /> },
  { value: "controller", label: "Controller", icon: <Shield className="h-3 w-3" /> },
  { value: "worker", label: "Worker", icon: <Users className="h-3 w-3" /> },
  { value: "moderator", label: "Moderator", icon: <Shield className="h-3 w-3" /> },
];

const ROLE_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  super_admin: "destructive",
  admin: "default",
  controller: "secondary",
  worker: "outline",
  moderator: "secondary",
  business_owner: "outline",
  partner: "outline",
  business_manager: "outline",
  agent: "secondary",
  freelancer: "outline",
  user: "outline",
};

export const AdminRoleManager = ({ profiles }: { profiles: Profile[] }) => {
  const queryClient = useQueryClient();
  const { log } = useAuditLog();
  const { isAdmin, isOwner, getRoleLabel } = useRolePermissions();
  const [selectedRole, setSelectedRole] = useState<AppRole>("admin");

  // Both Owner and Pulse AI Admin may manage operational roles, but only the
  // Owner can create/remove another platform-level Admin. Business Admin is a
  // workspace role and is intentionally not granted from this global screen.
  const canManageRoles = isAdmin;
  const canManageSelectedRole = selectedRole === "admin" ? isOwner : isAdmin;

  const rolesQuery = useQuery({
    queryKey: ["admin-all-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data || [];
    },
    enabled: canManageRoles,
  });

  const allRoles = rolesQuery.data ?? [];
  const getRolesForUser = (userId: string) => allRoles.filter((r) => r.user_id === userId).map((r) => r.role as AppRole);

  const assignRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const allowed = role === "admin" ? isOwner : isAdmin;
      if (!allowed) throw new Error(role === "admin" ? "Only the Owner can create a Pulse AI Admin" : "Only platform admins can assign this role");
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
      if (error) throw error;
    },
    onSuccess: async (_, { userId, role }) => {
      await log("role_assigned", "user", userId, { role, label: getRoleLabel(role) });
      queryClient.invalidateQueries({ queryKey: ["admin-all-user-roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] });
      toast.success(`${getRoleLabel(role)} assigned successfully`);
    },
    onError: (e: Error) => {
      if (e.message?.includes("duplicate")) toast.error("User already has this role");
      else toast.error(`Failed: ${e.message}`);
    },
  });

  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      if (role === "super_admin") throw new Error("The Owner role cannot be removed from this panel");
      const allowed = role === "admin" ? isOwner : isAdmin;
      if (!allowed) throw new Error(role === "admin" ? "Only the Owner can remove a Pulse AI Admin" : "Only platform admins can remove this role");
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
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldPlus className="h-4 w-4" />
          Platform Role Management
        </CardTitle>
        <CardDescription>
          Owner has full Pulse AI access. Pulse AI Admins manage platform operations. Business Admin is assigned inside a business workspace.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!canManageRoles ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Only the Owner or Pulse AI Admin can access platform role management.</p>
        ) : profiles.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No users found</p>
        ) : (
          <div className="space-y-2">
            {profiles.map((p) => {
              const userRoles = getRolesForUser(p.user_id);
              return (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-3 gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{p.full_name || "No name"}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.user_id}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {userRoles.map((role) => (
                        <Badge
                          key={role}
                          variant={ROLE_COLORS[role] || "outline"}
                          className="text-xs gap-1"
                          title={role === "super_admin" ? "Protected Owner role" : `Remove ${getRoleLabel(role)}`}
                          onClick={() => {
                            if (role === "user") {
                              toast.error("Cannot remove the base 'user' role");
                              return;
                            }
                            if (role === "super_admin") {
                              toast.error("The Owner role is protected");
                              return;
                            }
                            const allowed = role === "admin" ? isOwner : isAdmin;
                            if (!allowed) {
                              toast.error(role === "admin" ? "Only the Owner can remove a Pulse AI Admin" : "You do not have permission to remove this role");
                              return;
                            }
                            if (confirm(`Remove ${getRoleLabel(role)} from ${p.full_name || p.user_id}?`)) {
                              removeRole.mutate({ userId: p.user_id, role });
                            }
                          }}
                        >
                          {getRoleLabel(role)}
                          {role !== "user" && role !== "super_admin" && <ShieldMinus className="h-2.5 w-2.5" />}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                      <SelectTrigger className="w-40 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSIGNABLE_ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            <span className="flex items-center gap-1.5">{r.icon} {r.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="default"
                      disabled={!canManageSelectedRole || assignRole.isPending || userRoles.includes(selectedRole)}
                      onClick={() => assignRole.mutate({ userId: p.user_id, role: selectedRole })}
                    >
                      <ShieldPlus className="h-3 w-3 mr-1" />
                      Assign
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
