import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, addDays, isSameDay, isAfter, isBefore } from "date-fns";
import { ko } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Flame, Plus, Play, Pause, Trash2, Mail, CalendarDays, TrendingUp, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Warmup schedule milestones
const SCHEDULE = [
  { day: 1, count: 10 },
  { day: 3, count: 20 },
  { day: 7, count: 50 },
  { day: 14, count: 100 },
  { day: 21, count: 200 },
  { day: 28, count: 300 },
  { day: 42, count: 400 },
  { day: 56, count: 500 },
];

function getCountForDay(day: number): number {
  let count = 5;
  for (const s of SCHEDULE) {
    if (day >= s.day) count = s.count;
    else break;
  }
  return count;
}

function getDurationDays(weeks: number): number {
  return weeks * 7;
}

const DURATION_OPTIONS = [
  { value: "2", label: "2주 (14일)" },
  { value: "4", label: "4주 (28일)" },
  { value: "8", label: "8주 (56일)" },
];

const WarmupPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newDuration, setNewDuration] = useState("4");

  const { data: warmups = [], isLoading } = useQuery({
    queryKey: ["warmups", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_warmups")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      // Check for duplicate
      const existing = warmups.find((w: any) => w.email === newEmail.trim());
      if (existing) {
        throw new Error("DUPLICATE");
      }
      const { error } = await supabase.from("email_warmups").insert({
        user_id: user!.id,
        email: newEmail.trim(),
        duration_weeks: parseInt(newDuration),
        status: "idle",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warmups"] });
      setAddOpen(false);
      setNewEmail("");
      toast.success("워밍업 이메일이 추가되었습니다.");
    },
    onError: (err: Error) => {
      if (err.message === "DUPLICATE") {
        toast.error("이미 등록된 이메일입니다.");
      } else {
        toast.error("추가 실패");
      }
    },
  });

  const startMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("email_warmups")
        .update({ status: "active", started_at: new Date().toISOString(), current_day: 1 })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warmups"] });
      toast.success("워밍업이 시작되었습니다.");
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("email_warmups")
        .update({ status: "paused" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warmups"] });
      toast.info("워밍업이 일시정지되었습니다.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_warmups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warmups"] });
      toast.success("삭제되었습니다.");
    },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Flame className="h-6 w-6 text-primary" />
            이메일 워밍업
          </h1>
          <p className="text-muted-foreground mt-1 text-sm max-w-lg">
            새 이메일 계정으로 발송 시 스팸으로 분류되지 않도록 발송량을 점진적으로 늘리는 기능
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />이메일 추가</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>워밍업할 이메일 추가</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>이메일 주소</Label>
                <Input
                  type="email"
                  placeholder="sales@company.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>워밍업 기간</Label>
                <Select value={newDuration} onValueChange={setNewDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>취소</Button>
              <Button
                onClick={() => addMutation.mutate()}
                disabled={!newEmail.trim() || addMutation.isPending}
              >
                추가
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Warmup Schedule Reference */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            워밍업 스케줄
          </CardTitle>
          <CardDescription>일차별 발송량이 점진적으로 증가합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {SCHEDULE.map((s) => (
              <div key={s.day} className="text-center p-2 rounded-lg border bg-muted/30">
                <p className="text-xs text-muted-foreground">{s.day}일차</p>
                <p className="text-sm font-bold text-primary">{s.count}통</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Warmups */}
      {warmups.length === 0 && !isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">등록된 워밍업 이메일이 없습니다.</p>
            <Button variant="outline" className="mt-4 gap-2" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />첫 이메일 추가하기
            </Button>
          </CardContent>
        </Card>
      ) : (
        warmups.map((w: any) => <WarmupCard key={w.id} warmup={w} onStart={startMutation.mutate} onPause={pauseMutation.mutate} onDelete={deleteMutation.mutate} />)
      )}
    </div>
  );
};

interface WarmupCardProps {
  warmup: any;
  onStart: (id: string) => void;
  onPause: (id: string) => void;
  onDelete: (id: string) => void;
}

const WarmupCard = ({ warmup, onStart, onPause, onDelete }: WarmupCardProps) => {
  const totalDays = getDurationDays(warmup.duration_weeks);
  const currentDay = warmup.current_day || 0;
  const progress = totalDays > 0 ? Math.min((currentDay / totalDays) * 100, 100) : 0;
  const todayCount = getCountForDay(currentDay);

  const statusConfig: Record<string, { label: string; badgeClass: string }> = {
    idle: { label: "대기", badgeClass: "bg-muted text-muted-foreground" },
    active: { label: "진행중", badgeClass: "bg-primary/10 text-primary" },
    paused: { label: "일시정지", badgeClass: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]" },
    completed: { label: "완료", badgeClass: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" },
  };
  const cfg = statusConfig[warmup.status] ?? statusConfig.idle;

  // Generate calendar data
  const calendarData = useMemo(() => {
    if (!warmup.started_at) return [];
    const startDate = new Date(warmup.started_at);
    const days = [];
    for (let i = 0; i < totalDays; i++) {
      const date = addDays(startDate, i);
      const dayNum = i + 1;
      const count = getCountForDay(dayNum);
      const isPast = dayNum <= currentDay;
      const isToday = dayNum === currentDay;
      days.push({ date, dayNum, count, isPast, isToday });
    }
    return days;
  }, [warmup.started_at, totalDays, currentDay]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{warmup.email}</h3>
              <p className="text-xs text-muted-foreground">
                {warmup.duration_weeks}주 워밍업
                {warmup.started_at && ` · 시작: ${format(new Date(warmup.started_at), "M월 d일", { locale: ko })}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn("text-xs", cfg.badgeClass)}>{cfg.label}</Badge>
            {warmup.status === "idle" && (
              <Button size="sm" className="gap-1.5" onClick={() => onStart(warmup.id)}>
                <Play className="h-3.5 w-3.5" />시작
              </Button>
            )}
            {warmup.status === "active" && (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onPause(warmup.id)}>
                <Pause className="h-3.5 w-3.5" />일시정지
              </Button>
            )}
            {warmup.status === "paused" && (
              <Button size="sm" className="gap-1.5" onClick={() => onStart(warmup.id)}>
                <Play className="h-3.5 w-3.5" />재시작
              </Button>
            )}
            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => onDelete(warmup.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-muted-foreground">진행률</span>
            <span className="text-sm font-medium">{currentDay}일 / {totalDays}일</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Today's stats */}
        {warmup.status === "active" && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm">
              오늘 발송량: <span className="font-bold text-primary">{todayCount}통</span>
            </span>
          </div>
        )}

        {/* Calendar view */}
        {calendarData.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">발송 계획</span>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {["월", "화", "수", "목", "금", "토", "일"].map((d) => (
                <div key={d} className="text-center text-xs text-muted-foreground py-1">{d}</div>
              ))}
              {/* Offset for start day of week */}
              {calendarData.length > 0 && Array.from({ length: (calendarData[0].date.getDay() + 6) % 7 }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {calendarData.map((d) => (
                <div
                  key={d.dayNum}
                  className={cn(
                    "text-center p-1 rounded text-xs transition-colors",
                    d.isToday && "ring-2 ring-primary bg-primary/10 font-bold",
                    d.isPast && !d.isToday && "bg-primary/5 text-muted-foreground",
                    !d.isPast && !d.isToday && "bg-muted/50"
                  )}
                >
                  <p className="text-[10px] text-muted-foreground">{format(d.date, "d")}</p>
                  <p className={cn("font-medium", d.isToday ? "text-primary" : "")}>{d.count}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WarmupPage;
