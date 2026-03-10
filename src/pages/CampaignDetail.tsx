import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, subDays, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { ko } from "date-fns/locale";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, Play, Square, Send, MailOpen, AlertCircle, Clock, CheckCircle2,
  MousePointerClick, MessageSquare, Download, CalendarIcon, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Status config with semantic colors
const STATUS_CONFIG: Record<string, { label: string; dotClass: string; badgeClass: string }> = {
  pending: { label: "대기", dotClass: "bg-muted-foreground", badgeClass: "bg-muted text-muted-foreground" },
  sent: { label: "발송완료", dotClass: "bg-muted-foreground", badgeClass: "bg-secondary text-secondary-foreground" },
  opened: { label: "열람", dotClass: "bg-primary", badgeClass: "bg-primary/10 text-primary" },
  clicked: { label: "클릭", dotClass: "bg-[hsl(var(--success))]", badgeClass: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" },
  replied: { label: "답장", dotClass: "bg-[hsl(var(--warning))]", badgeClass: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]" },
  bounced: { label: "반송", dotClass: "bg-destructive", badgeClass: "bg-destructive/10 text-destructive" },
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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date());

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

  // Stats (including sequence breakdown)
  const stats = useMemo(() => {
    const s = { total: allContacts.length, pending: 0, sent: 0, opened: 0, clicked: 0, replied: 0, bounced: 0 };
    const seq = { step1: 0, step2: 0, step3: 0 };
    allContacts.forEach((c: any) => {
      const status = c.status as string;
      if (status in s && status !== "total") (s as any)[status]++;
      const step = c.sequence_step ?? 1;
      if (step === 1) seq.step1++;
      else if (step === 2) seq.step2++;
      else if (step === 3) seq.step3++;
    });
    return { ...s, seq };
  }, [allContacts]);

  const pct = (n: number) => stats.total > 0 ? ((n / stats.total) * 100).toFixed(1) : "0.0";

  // Chart data: group by date
  const chartData = useMemo(() => {
    const map: Record<string, { date: string; sent: number; opened: number }> = {};
    allContacts.forEach((c: any) => {
      if (!c.sent_at) return;
      const d = format(new Date(c.sent_at), "MM/dd");
      if (!map[d]) map[d] = { date: d, sent: 0, opened: 0 };
      map[d].sent++;
      if (c.status === "opened" || c.status === "clicked" || c.status === "replied") {
        map[d].opened++;
      }
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [allContacts]);

  // Open rate trend
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
      if (dateFrom && c.sent_at && isBefore(new Date(c.sent_at), startOfDay(dateFrom))) return false;
      if (dateTo && c.sent_at && isAfter(new Date(c.sent_at), endOfDay(dateTo))) return false;
      return true;
    });
  }, [allContacts, statusFilter, dateFrom, dateTo]);

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

  // Send actions
  const handleStartSending = async () => {
    if (!id || !user) return;
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
      refetchCampaign();
      refetchContacts();
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    await supabase.from("campaigns").update({ status: "paused" }).eq("id", id);
    toast.info("캠페인 발송이 취소되었습니다.");
    refetchCampaign();
  };

  const completedCount = stats.sent + stats.opened + stats.clicked + stats.replied + stats.bounced;
  const progressPercent = stats.total > 0 ? (completedCount / stats.total) * 100 : 0;
  const campaignStatus = campaignStatusLabels[campaign?.status ?? "draft"];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
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

      {/* Progress + Send Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">발송 진행률</span>
            <span className="text-sm text-muted-foreground">{completedCount} / {stats.total}건</span>
          </div>
          <Progress value={progressPercent} className="h-2.5 mb-4" />
          <div className="flex gap-3">
            {(campaign?.status === "draft" || campaign?.status === "paused") && stats.pending > 0 && (
              <Button onClick={handleStartSending} disabled={isSending} size="sm" className="gap-2">
                <Play className="h-3.5 w-3.5" />
                {isSending ? "발송 중..." : campaign?.status === "paused" ? "재시작" : "발송 시작"}
              </Button>
            )}
            {campaign?.status === "active" && (
              <Button variant="destructive" onClick={handleCancel} size="sm" className="gap-2">
                <Square className="h-3.5 w-3.5" />취소
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <SummaryCard icon={<Send className="h-5 w-5 text-muted-foreground" />} label="총 발송" count={stats.sent + stats.opened + stats.clicked + stats.replied} pct={pct(stats.sent + stats.opened + stats.clicked + stats.replied)} />
        <SummaryCard icon={<MailOpen className="h-5 w-5 text-primary" />} label="열람" count={stats.opened + stats.clicked + stats.replied} pct={pct(stats.opened + stats.clicked + stats.replied)} />
        <SummaryCard icon={<MousePointerClick className="h-5 w-5 text-[hsl(var(--success))]" />} label="클릭" count={stats.clicked} pct={pct(stats.clicked)} />
        <SummaryCard icon={<MessageSquare className="h-5 w-5 text-[hsl(var(--warning))]" />} label="답장" count={stats.replied} pct={pct(stats.replied)} />
        <SummaryCard icon={<AlertCircle className="h-5 w-5 text-destructive" />} label="반송" count={stats.bounced} pct={pct(stats.bounced)} />
      </div>

      {/* Sequence Stats */}
      {campaign?.use_sequence && (
        <Card>
          <CardContent className="pt-5 pb-4 px-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Send className="h-4 w-4 text-muted-foreground" />시퀀스 현황
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <Badge variant="outline" className="mb-1">1차</Badge>
                <p className="text-xl font-bold">{stats.seq.step1}</p>
                <p className="text-xs text-muted-foreground">발송</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <Badge variant="outline" className="mb-1">2차</Badge>
                <p className="text-xl font-bold">{stats.seq.step2}</p>
                <p className="text-xs text-muted-foreground">발송</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <Badge variant="outline" className="mb-1">3차</Badge>
                <p className="text-xl font-bold">{stats.seq.step3}</p>
                <p className="text-xs text-muted-foreground">발송</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />날짜별 발송량
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                    <Tooltip />
                    <Bar dataKey="sent" name="발송" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">데이터 없음</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MailOpen className="h-4 w-4 text-muted-foreground" />열람률 추이
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              {openRateData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={openRateData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 12 }} unit="%" className="text-muted-foreground" />
                    <Tooltip formatter={(v: number) => [`${v}%`, "열람률"]} />
                    <Line type="monotone" dataKey="rate" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">데이터 없음</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Export */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-lg">수신자 상세</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {/* Status filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date from */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("gap-1.5 text-xs", !dateFrom && "text-muted-foreground")}>
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {dateFrom ? format(dateFrom, "MM.dd", { locale: ko }) : "시작일"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>

              <span className="text-xs text-muted-foreground">~</span>

              {/* Date to */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("gap-1.5 text-xs", !dateTo && "text-muted-foreground")}>
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {dateTo ? format(dateTo, "MM.dd", { locale: ko }) : "종료일"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>

              <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
                <Download className="h-3.5 w-3.5" />CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>업체명</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>발송시간</TableHead>
                  <TableHead>단계</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>열람</TableHead>
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
                        <TableCell className="text-muted-foreground text-sm">
                          {cc.sent_at ? format(new Date(cc.sent_at), "MM.dd HH:mm", { locale: ko }) : "-"}
                        </TableCell>
                        <TableCell>
                          <span className={cn("inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium", cfg.badgeClass)}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dotClass)} />
                            {cfg.label}
                          </span>
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
    </div>
  );
};

const SummaryCard = ({ icon, label, count, pct }: { icon: React.ReactNode; label: string; count: number; pct: string }) => (
  <Card>
    <CardContent className="pt-5 pb-4 px-4">
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-muted-foreground">{label}</span></div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold">{count.toLocaleString()}</span>
        <span className="text-sm text-muted-foreground">{pct}%</span>
      </div>
    </CardContent>
  </Card>
);

export default CampaignDetail;
