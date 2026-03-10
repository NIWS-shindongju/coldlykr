import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Mail, Eye, MessageSquare, Megaphone, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, subDays } from "date-fns";
import { ko } from "date-fns/locale";
import { SendsChart } from "@/components/dashboard/SendsChart";
import { OpensChart } from "@/components/dashboard/OpensChart";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "초안", variant: "secondary" },
  active: { label: "진행중", variant: "default" },
  paused: { label: "일시정지", variant: "outline" },
  completed: { label: "완료", variant: "secondary" },
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: dailyStats = [] } = useQuery({
    queryKey: ["daily_stats", user?.id],
    queryFn: async () => {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("daily_stats")
        .select("*")
        .gte("date", sevenDaysAgo)
        .order("date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const totalSent = campaigns.reduce((s, c) => s + c.total_sent, 0);
  const totalOpened = campaigns.reduce((s, c) => s + c.total_opened, 0);
  const totalReplied = campaigns.reduce((s, c) => s + c.total_replied, 0);
  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
  const avgOpenRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : "0";
  const avgReplyRate = totalSent > 0 ? ((totalReplied / totalSent) * 100).toFixed(1) : "0";

  // Build chart data for last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const dateStr = d.toISOString().split("T")[0];
    const stat = dailyStats.find((s) => s.date === dateStr);
    return {
      date: format(d, "M/d", { locale: ko }),
      sends: stat?.sends ?? 0,
      opens: stat?.opens ?? 0,
    };
  });

  const stats = [
    { label: "이번달 총 발송", value: totalSent.toLocaleString(), icon: Mail },
    { label: "평균 열람률", value: `${avgOpenRate}%`, icon: Eye },
    { label: "평균 답장률", value: `${avgReplyRate}%`, icon: MessageSquare },
    { label: "활성 캠페인", value: activeCampaigns.toString(), icon: Megaphone },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">대시보드</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="text-3xl font-bold">{s.value}</div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">최근 7일 발송량</h3>
          <SendsChart data={last7Days} />
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">열람률 추이</h3>
          <OpensChart data={last7Days} />
        </Card>
      </div>

      {/* Recent Campaigns */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">최근 캠페인</h3>
          <Button size="sm" onClick={() => navigate("/campaigns")}>
            <Plus className="h-4 w-4 mr-1" />새 캠페인 만들기
          </Button>
        </div>

        {campaigns.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            아직 캠페인이 없습니다. 첫 캠페인을 만들어보세요!
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>캠페인명</TableHead>
                <TableHead className="text-right">발송수</TableHead>
                <TableHead className="text-right">열람률</TableHead>
                <TableHead className="text-right">답장수</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>날짜</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => {
                const openRate = c.total_sent > 0
                  ? ((c.total_opened / c.total_sent) * 100).toFixed(1)
                  : "0";
                const st = statusMap[c.status] ?? statusMap.draft;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-right">{c.total_sent.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{openRate}%</TableCell>
                    <TableCell className="text-right">{c.total_replied}</TableCell>
                    <TableCell>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(c.created_at), "yyyy.MM.dd", { locale: ko })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
