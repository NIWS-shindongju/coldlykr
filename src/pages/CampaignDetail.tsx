import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, Play, Square, Send, Mail, MailOpen, AlertCircle, Clock, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "대기", color: "bg-muted text-muted-foreground" },
  sent: { label: "발송됨", color: "bg-primary/10 text-primary" },
  opened: { label: "열람됨", color: "bg-green-100 text-green-700" },
  bounced: { label: "실패", color: "bg-destructive/10 text-destructive" },
};

const campaignStatusLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  draft: { label: "대기", icon: <Clock className="h-4 w-4" /> },
  active: { label: "발송중", icon: <Send className="h-4 w-4 animate-pulse" /> },
  paused: { label: "일시정지", icon: <Square className="h-4 w-4" /> },
  completed: { label: "완료", icon: <CheckCircle2 className="h-4 w-4" /> },
};

const CampaignDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSending, setIsSending] = useState(false);

  // Campaign data
  const { data: campaign, refetch: refetchCampaign } = useQuery({
    queryKey: ["campaign", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  // Campaign contacts stats
  const { data: contactStats, refetch: refetchStats } = useQuery({
    queryKey: ["campaign-contact-stats", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_contacts")
        .select("status")
        .eq("campaign_id", id!);
      if (error) throw error;

      const stats = { total: data.length, pending: 0, sent: 0, opened: 0, bounced: 0 };
      data.forEach((c) => {
        if (c.status === "pending") stats.pending++;
        else if (c.status === "sent") stats.sent++;
        else if (c.status === "opened") stats.opened++;
        else if (c.status === "bounced") stats.bounced++;
      });
      return stats;
    },
    enabled: !!id && !!user,
  });

  // Recent contacts
  const { data: recentContacts = [], refetch: refetchContacts } = useQuery({
    queryKey: ["campaign-contacts-recent", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_contacts")
        .select("*, contacts(company_name, email, category, region)")
        .eq("campaign_id", id!)
        .order("sent_at", { ascending: false, nullsFirst: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  // Realtime subscription for live updates
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`campaign-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "campaign_contacts",
          filter: `campaign_id=eq.${id}`,
        },
        () => {
          refetchStats();
          refetchContacts();
          refetchCampaign();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, refetchStats, refetchContacts, refetchCampaign]);

  const handleStartSending = async () => {
    if (!id || !user) return;
    setIsSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await supabase.functions.invoke("send-campaign-emails", {
        body: { campaign_id: id },
      });

      if (res.error) throw new Error(res.error.message);

      const result = res.data;
      if (result.success) {
        toast.success(`${result.sent}건 발송 완료. ${result.remaining > 0 ? `${result.remaining}건 남음.` : "모든 발송이 완료되었습니다!"}`);
      } else {
        toast.error(result.error || "발송 중 오류가 발생했습니다.");
      }
    } catch (err: any) {
      toast.error(err.message || "발송 중 오류가 발생했습니다.");
    } finally {
      setIsSending(false);
      refetchCampaign();
      refetchStats();
      refetchContacts();
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    await supabase.from("campaigns").update({ status: "paused" }).eq("id", id);
    toast.info("캠페인 발송이 취소되었습니다.");
    refetchCampaign();
  };

  const stats = contactStats ?? { total: 0, pending: 0, sent: 0, opened: 0, bounced: 0 };
  const completedCount = stats.sent + stats.opened + stats.bounced;
  const progressPercent = stats.total > 0 ? (completedCount / stats.total) * 100 : 0;
  const campaignStatus = campaignStatusLabels[campaign?.status ?? "draft"];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/campaigns")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{campaign?.name ?? "캠페인"}</h1>
          <p className="text-sm text-muted-foreground">{campaign?.subject}</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1.5">
          {campaignStatus?.icon}
          {campaignStatus?.label}
        </Badge>
      </div>

      {/* Progress Section */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">발송 진행률</span>
            <span className="text-sm text-muted-foreground">
              {completedCount} / {stats.total}건
            </span>
          </div>
          <Progress value={progressPercent} className="h-3 mb-4" />

          <div className="grid grid-cols-4 gap-4">
            <StatBox icon={<Clock className="h-4 w-4 text-muted-foreground" />} label="대기" count={stats.pending} />
            <StatBox icon={<Send className="h-4 w-4 text-primary" />} label="발송됨" count={stats.sent} />
            <StatBox icon={<MailOpen className="h-4 w-4 text-green-600" />} label="열람됨" count={stats.opened} />
            <StatBox icon={<AlertCircle className="h-4 w-4 text-destructive" />} label="실패" count={stats.bounced} />
          </div>

          <div className="flex gap-3 mt-6">
            {(campaign?.status === "draft" || campaign?.status === "paused") && stats.pending > 0 && (
              <Button onClick={handleStartSending} disabled={isSending} className="gap-2">
                <Play className="h-4 w-4" />
                {isSending ? "발송 중..." : campaign?.status === "paused" ? "발송 재시작" : "발송 시작"}
              </Button>
            )}
            {campaign?.status === "active" && (
              <Button variant="destructive" onClick={handleCancel} className="gap-2">
                <Square className="h-4 w-4" />발송 취소
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contacts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">발송 내역</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>업체명</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>발송 시간</TableHead>
                  <TableHead>열람 시간</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentContacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      발송 내역이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentContacts.map((cc: any) => {
                    const contact = cc.contacts;
                    const st = statusLabels[cc.status] ?? statusLabels.pending;
                    return (
                      <TableRow key={cc.id}>
                        <TableCell className="font-medium">{contact?.company_name ?? "-"}</TableCell>
                        <TableCell className="text-muted-foreground">{contact?.email ?? "-"}</TableCell>
                        <TableCell>
                          <span className={cn("text-xs px-2 py-1 rounded-full font-medium", st.color)}>
                            {st.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {cc.sent_at ? format(new Date(cc.sent_at), "MM.dd HH:mm", { locale: ko }) : "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {cc.opened_at ? format(new Date(cc.opened_at), "MM.dd HH:mm", { locale: ko }) : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const StatBox = ({ icon, label, count }: { icon: React.ReactNode; label: string; count: number }) => (
  <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
    {icon}
    <div>
      <p className="text-lg font-bold">{count}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  </div>
);

export default CampaignDetail;
