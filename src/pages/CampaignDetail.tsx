import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft, Play, Pause, Trash2, Send, MailOpen, AlertCircle, CheckCircle2,
  MessageSquare, Download, BarChart3, ChevronDown, Mail, Settings2, Rocket,
  AlertTriangle, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SendChecklistModal } from "@/components/campaign/SendChecklistModal";

const STATUS_CONFIG: Record<string, { label: string; dotClass: string; badgeClass: string }> = {
  pending: { label: "대기", dotClass: "bg-muted-foreground", badgeClass: "bg-muted text-muted-foreground" },
  sent: { label: "발송완료", dotClass: "bg-muted-foreground", badgeClass: "bg-secondary text-secondary-foreground" },
  opened: { label: "열람", dotClass: "bg-primary", badgeClass: "bg-primary/10 text-primary" },
  clicked: { label: "클릭", dotClass: "bg-[hsl(var(--success))]", badgeClass: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" },
  replied: { label: "답장", dotClass: "bg-[hsl(var(--warning))]", badgeClass: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]" },
  bounced: { label: "반송", dotClass: "bg-destructive", badgeClass: "bg-destructive/10 text-destructive" },
};

const CAMPAIGN_STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "초안", variant: "secondary" },
  active: { label: "진행중", variant: "default" },
  paused: { label: "일시정지", variant: "outline" },
  completed: { label: "완료", variant: "secondary" },
};

const RECIPIENT_TABS: { label: string; value: string }[] = [
  { label: "전체", value: "all" },
  { label: "대기", value: "pending" },
  { label: "발송완료", value: "sent" },
  { label: "열람", value: "opened" },
  { label: "답장", value: "replied" },
  { label: "반송", value: "bounced" },
];

const CampaignDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSending, setIsSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [bodyOpen, setBodyOpen] = useState(false);
  const [errorLogOpen, setErrorLogOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const autoPausedRef = useRef(false);
  const autoCompletedRef = useRef(false);

  // Campaign data
  const { data: campaign, refetch: refetchCampaign } = useQuery({
    queryKey: ["campaign", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  // All campaign contacts
  const { data: allContacts = [], refetch: refetchContacts } = useQuery({
    queryKey: ["campaign-contacts-all", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_contacts")
        .select("*, contacts(company_name, email, category, region, representative)")
        .eq("campaign_id", id!)
        .order("sent_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  // Realtime
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`campaign-results-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "campaign_contacts", filter: `campaign_id=eq.${id}` }, () => {
        refetchContacts();
        refetchCampaign();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, refetchContacts, refetchCampaign]);

  // Stats
  const stats = useMemo(() => {
    const s = { total: allContacts.length, pending: 0, sent: 0, opened: 0, clicked: 0, replied: 0, bounced: 0 };
    allContacts.forEach((c: any) => {
      const status = c.status as string;
      if (status in s && status !== "total") (s as any)[status]++;
    });
    return s;
  }, [allContacts]);

  const totalSent = stats.sent + stats.opened + stats.clicked + stats.replied;
  const pct = (n: number) => totalSent > 0 ? ((n / totalSent) * 100).toFixed(1) : "0.0";
  const completedCount = stats.sent + stats.opened + stats.clicked + stats.replied + stats.bounced;
  const progressPercent = stats.total > 0 ? (completedCount / stats.total) * 100 : 0;

  // Bounce rate
  const bounceRate = totalSent > 0 ? (stats.bounced / (totalSent + stats.bounced)) * 100 : 0;

  // [개선 2] Auto-pause on >10% bounce rate
  useEffect(() => {
    if (!id || !campaign || campaign.status !== "active" || autoPausedRef.current) return;
    if (bounceRate > 10) {
      autoPausedRef.current = true;
      supabase.from("campaigns").update({ status: "paused" as any }).eq("id", id).then(() => {
        refetchCampaign();
        toast.error("🚨 반송률이 10%를 초과하여 캠페인이 자동 일시정지됐습니다.");
      });
    }
  }, [bounceRate, campaign?.status, id]);

  // [개선 4] Auto-complete when pending=0
  useEffect(() => {
    if (!id || !campaign || autoCompletedRef.current) return;
    if (campaign.status !== "active") return;
    if (stats.total > 0 && stats.pending === 0) {
      autoCompletedRef.current = true;
      supabase.from("campaigns").update({ status: "completed" as any }).eq("id", id).then(() => {
        refetchCampaign();
        toast.success("모든 발송이 완료되었습니다! 🎉");
      });
    }
  }, [stats.pending, stats.total, campaign?.status, id]);

  // Estimated time remaining
  const estimatedMinutes = useMemo(() => {
    const interval = campaign?.send_interval ?? 60;
    return Math.ceil((stats.pending * interval) / 60);
  }, [stats.pending, campaign?.send_interval]);

  const estimatedTimeText = useMemo(() => {
    if (estimatedMinutes < 60) return `약 ${estimatedMinutes}분 후`;
    const h = Math.floor(estimatedMinutes / 60);
    const m = estimatedMinutes % 60;
    return m > 0 ? `약 ${h}시간 ${m}분 후` : `약 ${h}시간 후`;
  }, [estimatedMinutes]);

  // Error logs
  const errorLogs = useMemo(() => {
    return allContacts.filter((c: any) => c.status === "bounced" && c.error_message);
  }, [allContacts]);

  // Chart data
  const chartData = useMemo(() => {
    const map: Record<string, { date: string; sent: number; opened: number }> = {};
    allContacts.forEach((c: any) => {
      if (!c.sent_at) return;
      const d = format(new Date(c.sent_at), "MM/dd");
      if (!map[d]) map[d] = { date: d, sent: 0, opened: 0 };
      map[d].sent++;
      if (c.status === "opened" || c.status === "clicked" || c.status === "replied") map[d].opened++;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [allContacts]);

  const openRateData = useMemo(() => {
    return chartData.map((d) => ({
      date: d.date,
      rate: d.sent > 0 ? Math.round((d.opened / d.sent) * 100) : 0,
    }));
  }, [chartData]);

  // Filtered contacts
  const filteredContacts = useMemo(() => {
    return allContacts.filter((c: any) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      return true;
    });
  }, [allContacts, statusFilter]);

  // CSV Export
  const handleExport = () => {
    const header = "업체명,이메일,상태,발송시간,열람시간\n";
    const rows = filteredContacts.map((c: any) => {
      const contact = c.contacts;
      return [
        contact?.company_name ?? "",
        contact?.email ?? "",
        STATUS_CONFIG[c.status]?.label ?? c.status,
        c.sent_at ? format(new Date(c.sent_at), "yyyy-MM-dd HH:mm") : "",
        c.opened_at ? format(new Date(c.opened_at), "yyyy-MM-dd HH:mm") : "",
      ].join(",");
    }).join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campaign-results-${campaign?.name ?? id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV 파일이 다운로드되었습니다.");
  };

  // Status mutations
  const updateStatus = async (status: "active" | "paused") => {
    if (!id) return;
    if (status === "active") {
      setIsSending(true);
      try {
        const res = await supabase.functions.invoke("send-campaign-emails", {
          body: { campaign_id: id },
        });
        if (res.error) throw new Error(res.error.message);
        const result = res.data;
        if (result.success) {
          toast.success(`${result.sent}건 발송 완료. ${result.remaining > 0 ? `${result.remaining}건 남음.` : "모든 발송 완료!"}`);
        } else {
          toast.error(result.error || "발송 오류");
        }
      } catch (err: any) {
        toast.error(err.message || "발송 오류");
      } finally {
        setIsSending(false);
      }
    } else {
      await supabase.from("campaigns").update({ status }).eq("id", id);
      toast.info("캠페인이 일시정지되었습니다.");
    }
    refetchCampaign();
    refetchContacts();
  };

  const deleteCampaign = async () => {
    if (!id) return;
    await supabase.from("campaign_contacts").delete().eq("campaign_id", id);
    const { error } = await supabase.from("campaigns").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("캠페인이 삭제되었습니다.");
    navigate("/campaigns");
  };

  const cStatus = CAMPAIGN_STATUS_MAP[campaign?.status ?? "draft"];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="mt-1" onClick={() => navigate("/campaigns")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold truncate">{campaign?.name ?? "캠페인"}</h1>
            <Badge variant={cStatus?.variant}>{cStatus?.label}</Badge>
          </div>
          {campaign?.subject && (
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{campaign.subject}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {campaign?.status === "active" ? (
            <Button variant="outline" size="sm" onClick={() => updateStatus("paused")} className="gap-1.5">
              <Pause className="h-3.5 w-3.5" />일시정지
            </Button>
          ) : (campaign?.status === "draft" || campaign?.status === "paused") ? (
            <Button size="sm" onClick={() => setChecklistOpen(true)} disabled={isSending} className="gap-1.5">
              <Play className="h-3.5 w-3.5" />{isSending ? "발송 중..." : "시작"}
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
                  "{campaign?.name}" 캠페인과 모든 발송 기록을 삭제합니다. 이 작업은 되돌릴 수 없습니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={deleteCampaign}
                >
                  삭제
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* ── [개선 4] 발송 완료 배너 ── */}
      {campaign?.status === "completed" && (
        <Alert className="border-[hsl(var(--success))] bg-[hsl(var(--success))]/10">
          <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
          <AlertDescription className="text-sm">
            <span className="font-semibold">✅ 발송 완료</span>
            <span className="ml-3 text-muted-foreground">
              총 {totalSent}건 발송 · 열람률 {pct(stats.opened + stats.clicked + stats.replied)}% · 답장률 {pct(stats.replied)}%
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* ── [개선 1] 발송 진행 중 실시간 카드 ── */}
      {campaign?.status === "active" && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-primary" />
                <span className="font-semibold">🚀 발송 진행 중</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => updateStatus("paused")} className="gap-1.5">
                <Pause className="h-3.5 w-3.5" />일시정지
              </Button>
            </div>
            <Progress value={progressPercent} className="h-2.5 mb-3" />
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
              <span>진행률: <span className="font-medium text-foreground">{progressPercent.toFixed(1)}%</span></span>
              <span>오늘 발송: <span className="font-medium text-foreground">{campaign.daily_sent_count ?? 0}건</span> / 하루 최대: <span className="font-medium text-foreground">{campaign.max_per_day ?? 100}건</span></span>
              <span>대기: <span className="font-medium text-foreground">{stats.pending}건</span></span>
              <span>예상 완료: <span className="font-medium text-foreground">{estimatedTimeText}</span></span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── [개선 2] 반송률 경고 배너 ── */}
      {bounceRate > 5 && bounceRate <= 10 && campaign?.status === "active" && (
        <Alert className="border-[hsl(var(--warning))] bg-[hsl(var(--warning))]/10">
          <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))]" />
          <AlertDescription className="flex items-center justify-between gap-2">
            <span className="text-sm">
              ⚠️ 반송률이 5%를 초과했습니다 ({bounceRate.toFixed(1)}%). 캠페인을 일시정지하고 수신자 목록을 확인하세요.
            </span>
            <Button variant="outline" size="sm" onClick={() => updateStatus("paused")} className="shrink-0 gap-1.5">
              <Pause className="h-3.5 w-3.5" />일시정지
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {bounceRate > 10 && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            🚨 반송률이 10%를 초과하여 캠페인이 자동 일시정지됐습니다. 수신자 목록을 확인하세요.
          </AlertDescription>
        </Alert>
      )}

      {/* ── 핵심 지표 카드 4개 ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard icon={<Send className="h-5 w-5 text-muted-foreground" />} label="총 발송" value={totalSent} sub={`/ ${stats.total}건`} />
        <MetricCard icon={<MailOpen className="h-5 w-5 text-primary" />} label="열람률" value={`${pct(stats.opened + stats.clicked + stats.replied)}%`} sub={`${stats.opened + stats.clicked + stats.replied}건`} />
        <MetricCard icon={<MessageSquare className="h-5 w-5 text-[hsl(var(--warning))]" />} label="답장률" value={`${pct(stats.replied)}%`} sub={`${stats.replied}건`} />
        <MetricCard icon={<AlertCircle className="h-5 w-5 text-destructive" />} label="반송률" value={`${pct(stats.bounced)}%`} sub={`${stats.bounced}건`} />
      </div>

      {/* ── 발송 진행률 ── */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">발송 진행률</span>
            <span className="text-sm text-muted-foreground">{completedCount} / {stats.total}건</span>
          </div>
          <Progress value={progressPercent} className="h-2.5" />
        </CardContent>
      </Card>

      {/* ── 발송 설정 정보 ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />발송 설정
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <InfoRow label="발송자 이름" value={campaign?.sender_name} />
            <InfoRow label="발송자 이메일" value={campaign?.sender_email} />
            <InfoRow label="이메일 제목" value={campaign?.subject} />
            <InfoRow label="회신 이메일" value={campaign?.reply_email} />
            <InfoRow label="하루 최대 발송" value={campaign?.max_per_day ? `${campaign.max_per_day}건` : undefined} />
            <InfoRow label="발송 간격" value={campaign?.send_interval ? `${campaign.send_interval}초` : undefined} />
            <InfoRow label="시퀀스 사용" value={campaign?.use_sequence ? "예" : "아니오"} />
            {campaign?.use_sequence && (
              <>
                <InfoRow label="2차 메일" value={campaign.sequence_2_subject ? `${campaign.sequence_2_days}일 후 · ${campaign.sequence_2_subject}` : undefined} />
                <InfoRow label="3차 메일" value={campaign.sequence_3_subject ? `${campaign.sequence_3_days}일 후 · ${campaign.sequence_3_subject}` : undefined} />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── 이메일 본문 미리보기 ── */}
      {campaign?.body && (
        <Collapsible open={bodyOpen} onOpenChange={setBodyOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />이메일 본문 미리보기
                  </CardTitle>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", bodyOpen && "rotate-180")} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="rounded-lg border bg-background p-6">
                  <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: campaign.body }} />
                </div>
                {campaign.use_sequence && campaign.sequence_2_body && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">2차 메일</p>
                    <div className="rounded-lg border bg-background p-6">
                      <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: campaign.sequence_2_body }} />
                    </div>
                  </div>
                )}
                {campaign.use_sequence && campaign.sequence_3_body && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">3차 메일</p>
                    <div className="rounded-lg border bg-background p-6">
                      <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: campaign.sequence_3_body }} />
                    </div>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-muted-foreground" />날짜별 발송량</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="sent" name="발송" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="flex items-center justify-center h-full text-muted-foreground text-sm">데이터 없음</div>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><MailOpen className="h-4 w-4 text-muted-foreground" />열람률 추이</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56">
              {openRateData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={openRateData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} unit="%" />
                    <Tooltip formatter={(v: number) => [`${v}%`, "열람률"]} />
                    <Line type="monotone" dataKey="rate" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <div className="flex items-center justify-center h-full text-muted-foreground text-sm">데이터 없음</div>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 수신자 목록 ── */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-lg">수신자 목록</CardTitle>
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />CSV 내보내기
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Status filter tabs */}
          <div className="flex gap-1 overflow-x-auto pb-3 mb-3">
            {RECIPIENT_TABS.map((tab) => {
              const count = tab.value === "all"
                ? allContacts.length
                : allContacts.filter((c: any) => c.status === tab.value).length;
              return (
                <Button
                  key={tab.value}
                  size="sm"
                  variant={statusFilter === tab.value ? "default" : "ghost"}
                  className="shrink-0"
                  onClick={() => setStatusFilter(tab.value)}
                >
                  {tab.label}
                  <span className="ml-1 text-xs opacity-70">{count}</span>
                </Button>
              );
            })}
          </div>

          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>업체명</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>발송일시</TableHead>
                  <TableHead>열람일시</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      결과가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContacts.map((cc: any) => {
                    const contact = cc.contacts;
                    const cfg = STATUS_CONFIG[cc.status] ?? STATUS_CONFIG.pending;
                    return (
                      <TableRow key={cc.id}>
                        <TableCell className="font-medium">{contact?.company_name ?? "-"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{contact?.email ?? "-"}</TableCell>
                        <TableCell>
                          <span className={cn("inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium", cfg.badgeClass)}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dotClass)} />
                            {cfg.label}
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
          <p className="text-xs text-muted-foreground mt-2">{filteredContacts.length}건 표시</p>
        </CardContent>
      </Card>

      {/* ── [개선 3] 오류 로그 ── */}
      <Collapsible open={errorLogOpen} onOpenChange={setErrorLogOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  오류 로그
                  {errorLogs.length > 0 && (
                    <Badge variant="destructive" className="ml-1">{errorLogs.length}</Badge>
                  )}
                </CardTitle>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", errorLogOpen && "rotate-180")} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {errorLogs.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                  <CheckCircle2 className="h-4 w-4 mr-2 text-[hsl(var(--success))]" />
                  발송 오류가 없습니다 ✅
                </div>
              ) : (
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>이메일</TableHead>
                        <TableHead>오류 내용</TableHead>
                        <TableHead>발생 시각</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {errorLogs.map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">{log.contacts?.email ?? "-"}</TableCell>
                          <TableCell className="text-sm text-destructive">{log.error_message}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.sent_at ? format(new Date(log.sent_at), "MM.dd HH:mm", { locale: ko }) : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ── 발송 전 체크리스트 모달 ── */}
      {campaign && (
        <SendChecklistModal
          open={checklistOpen}
          onOpenChange={setChecklistOpen}
          campaign={campaign}
          pendingCount={stats.pending}
          onConfirm={() => { setChecklistOpen(false); updateStatus("active"); }}
          isSending={isSending}
        />
      )}
    </div>
  );
};

/* ── Sub-components ── */

const MetricCard = ({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub: string }) => (
  <Card>
    <CardContent className="pt-5 pb-4 px-4">
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-muted-foreground">{label}</span></div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</span>
        <span className="text-sm text-muted-foreground">{sub}</span>
      </div>
    </CardContent>
  </Card>
);

const InfoRow = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="flex items-start gap-2">
    <span className="text-muted-foreground shrink-0 w-28">{label}</span>
    <span className="font-medium">{value || "-"}</span>
  </div>
);

export default CampaignDetail;
