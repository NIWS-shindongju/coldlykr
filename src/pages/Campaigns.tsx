import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPlan } from "@/hooks/useUserPlan";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Send, Pause, Play, Trash2, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";

type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];
type CampaignStatus = Database["public"]["Enums"]["campaign_status"];

const STATUS_TABS: { label: string; value: CampaignStatus | "all" }[] = [
  { label: "전체", value: "all" },
  { label: "진행중", value: "active" },
  { label: "초안", value: "draft" },
  { label: "일시정지", value: "paused" },
  { label: "완료", value: "completed" },
];

const statusBadge = (status: CampaignStatus) => {
  const map: Record<CampaignStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    active: { label: "진행중", variant: "default" },
    draft: { label: "초안", variant: "secondary" },
    paused: { label: "일시정지", variant: "outline" },
    completed: { label: "완료", variant: "secondary" },
  };
  return map[status];
};

const Campaigns = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { plan, isFree, planLimits } = useUserPlan();
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | "all">("all");

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CampaignRow[];
    },
    enabled: !!user,
  });

  // Fetch contact counts per campaign for progress
  const campaignIds = campaigns.map((c) => c.id);
  const { data: contactCounts = {} } = useQuery({
    queryKey: ["campaign-contact-counts", campaignIds],
    queryFn: async () => {
      if (campaignIds.length === 0) return {};
      const { data, error } = await supabase
        .from("campaign_contacts")
        .select("campaign_id, status");
      if (error) throw error;
      const counts: Record<string, { total: number; sent: number }> = {};
      for (const row of data) {
        if (!counts[row.campaign_id]) counts[row.campaign_id] = { total: 0, sent: 0 };
        counts[row.campaign_id].total++;
        if (row.status === "sent" || row.status === "opened") counts[row.campaign_id].sent++;
      }
      return counts;
    },
    enabled: campaignIds.length > 0,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CampaignStatus }) => {
      const { error } = await supabase.from("campaigns").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("캠페인 상태가 변경되었습니다.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      // Delete related contacts first
      await supabase.from("campaign_contacts").delete().eq("campaign_id", id);
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("캠페인이 삭제되었습니다.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = statusFilter === "all"
    ? campaigns
    : campaigns.filter((c) => c.status === statusFilter);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">캠페인</h1>
        <Button onClick={() => navigate("/campaigns/new")}>
          <Plus className="h-4 w-4 mr-2" />새 캠페인
        </Button>
      </div>

      {/* Plan usage badge */}
      <div className="flex items-center gap-2 mb-6">
        {isFree ? (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
            <span className="text-sm font-medium text-destructive">무료 플랜 · 구독 필요</span>
            <Button size="sm" variant="default" onClick={() => navigate("/pricing")}>
              <Crown className="h-3.5 w-3.5 mr-1" />업그레이드
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
            <Badge variant="secondary" className="capitalize">{plan}</Badge>
            <span className="text-sm text-muted-foreground">
              캠페인 {campaigns.length}/{planLimits.campaignLimit === 999 ? "∞" : planLimits.campaignLimit}개 사용 중
            </span>
          </div>
        )}
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-4">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.value}
            size="sm"
            variant={statusFilter === tab.value ? "default" : "ghost"}
            className="shrink-0"
            onClick={() => setStatusFilter(tab.value)}
          >
            {tab.label}
            {tab.value !== "all" && (
              <span className="ml-1 text-xs opacity-70">
                {campaigns.filter((c) => c.status === tab.value).length}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Empty state */}
      {!isLoading && campaigns.length === 0 ? (
        <div className="rounded-lg border bg-card p-16 flex flex-col items-center justify-center text-center">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Send className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-lg font-semibold mb-1">아직 캠페인이 없습니다</h2>
          <p className="text-sm text-muted-foreground mb-6">
            첫 번째 콜드메일 캠페인을 만들어 보세요.
          </p>
          <Button onClick={() => navigate("/campaigns/new")}>
            <Plus className="h-4 w-4 mr-2" />새 캠페인 만들기
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>캠페인명</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>발송</TableHead>
                <TableHead>열람</TableHead>
                <TableHead>진행률</TableHead>
                <TableHead>생성일</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    로딩 중...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    해당 상태의 캠페인이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => {
                  const badge = statusBadge(c.status);
                  const cc = contactCounts[c.id];
                  const progress = cc && cc.total > 0 ? Math.round((cc.sent / cc.total) * 100) : 0;

                  return (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/campaigns/${c.id}`)}
                    >
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell>{c.total_sent}</TableCell>
                      <TableCell>{c.total_opened}</TableCell>
                      <TableCell className="min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <Progress value={progress} className="h-2 flex-1" />
                          <span className="text-xs text-muted-foreground w-8 text-right">{progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(c.created_at), "yyyy.MM.dd", { locale: ko })}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {c.status === "active" ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="일시정지"
                              onClick={() => updateStatus.mutate({ id: c.id, status: "paused" })}
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          ) : (c.status === "paused" || c.status === "draft") ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="시작"
                              onClick={() => updateStatus.mutate({ id: c.id, status: "active" })}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          ) : null}

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" title="삭제">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>캠페인 삭제</AlertDialogTitle>
                                <AlertDialogDescription>
                                  "{c.name}" 캠페인을 삭제하시겠습니까? 관련된 발송 기록도 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>취소</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => deleteCampaign.mutate(c.id)}
                                >
                                  삭제
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default Campaigns;
