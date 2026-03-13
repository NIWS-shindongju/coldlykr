import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PlanType = "free" | "starter" | "growth" | "scale";

export interface PlanLimits {
  dailySendLimit: number;
  campaignLimit: number;
}

const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: { dailySendLimit: 0, campaignLimit: 0 },
  starter: { dailySendLimit: 100, campaignLimit: 10 },
  growth: { dailySendLimit: 500, campaignLimit: 999 },
  scale: { dailySendLimit: 2000, campaignLimit: 999 },
};

export function useUserPlan() {
  const { user } = useAuth();

  const { data: plan = "free" as PlanType, isLoading } = useQuery({
    queryKey: ["user-plan", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return "free" as PlanType;
      const p = data.plan as PlanType;
      return PLAN_LIMITS[p] ? p : "free" as PlanType;
    },
    enabled: !!user,
  });

  return {
    plan,
    isLoading,
    planLimits: PLAN_LIMITS[plan],
    isFree: plan === "free",
  };
}
