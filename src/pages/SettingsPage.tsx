import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { User, CreditCard, Bell, FileText, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const planNames: Record<string, string> = {
  free: "무료",
  starter: "Starter",
  growth: "Growth",
  scale: "Scale",
};

interface Subscription {
  plan: string;
  status: string;
  current_period_end: string | null;
  current_period_start: string | null;
}

interface Payment {
  id: string;
  plan: string;
  amount: number;
  status: string;
  paid_at: string;
  receipt_url: string | null;
  tax_invoice_requested: boolean;
}

interface NotifSettings {
  notify_campaign_complete: boolean;
  notify_reply_received: boolean;
  notify_bounce: boolean;
}

const SettingsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Profile
  const [profile, setProfile] = useState({ full_name: "", company_name: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  // Subscription
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);

  // Notifications
  const [notif, setNotif] = useState<NotifSettings>({
    notify_campaign_complete: true,
    notify_reply_received: true,
    notify_bounce: true,
  });
  const [savingNotif, setSavingNotif] = useState(false);
  const [notifLoaded, setNotifLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;

    supabase
      .from("profiles")
      .select("full_name, company_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setProfile({ full_name: data.full_name || "", company_name: data.company_name || "" });
      });

    supabase
      .from("subscriptions")
      .select("plan, status, current_period_end, current_period_start")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSubscription(data);
      });

    supabase
      .from("payment_history")
      .select("*")
      .eq("user_id", user.id)
      .order("paid_at", { ascending: false })
      .then(({ data }) => {
        if (data) setPayments(data as Payment[]);
      });

    supabase
      .from("user_settings")
      .select("notify_campaign_complete, notify_reply_received, notify_bounce")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setNotif({
            notify_campaign_complete: data.notify_campaign_complete,
            notify_reply_received: data.notify_reply_received,
            notify_bounce: data.notify_bounce,
          });
        }
        setNotifLoaded(true);
      });
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: profile.full_name, company_name: profile.company_name })
      .eq("user_id", user.id);
    setSavingProfile(false);
    if (error) toast.error("저장 실패");
    else toast.success("프로필이 저장되었습니다.");
  };

  const handleCancel = async () => {
    const { error } = await supabase.functions.invoke("toss-payments", {
      body: { action: "cancel" },
    });
    if (error) {
      toast.error("구독 취소 실패");
    } else {
      toast.success("구독이 취소되었습니다.");
      setSubscription((s) => s ? { ...s, status: "cancelled" } : null);
    }
  };

  const handleTaxInvoice = async (paymentId: string) => {
    const { error } = await supabase.functions.invoke("toss-payments", {
      body: { action: "request-tax-invoice", paymentId },
    });
    if (error) {
      toast.error("세금계산서 신청 실패");
    } else {
      toast.success("세금계산서가 신청되었습니다.");
      setPayments((prev) =>
        prev.map((p) => (p.id === paymentId ? { ...p, tax_invoice_requested: true } : p))
      );
    }
  };

  const handleSaveNotif = async () => {
    if (!user) return;
    setSavingNotif(true);
    const { error } = await supabase
      .from("user_settings")
      .upsert(
        { user_id: user.id, ...notif },
        { onConflict: "user_id" }
      );
    setSavingNotif(false);
    if (error) toast.error("저장 실패");
    else toast.success("알림 설정이 저장되었습니다.");
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">설정</h1>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="h-4 w-4" />프로필
          </TabsTrigger>
          <TabsTrigger value="subscription" className="gap-1.5">
            <CreditCard className="h-4 w-4" />구독
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="h-4 w-4" />알림
          </TabsTrigger>
        </TabsList>

        {/* ── 탭 1: 프로필 설정 ── */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">프로필 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">이메일</Label>
                <Input id="email" type="email" value={user?.email || ""} disabled className="mt-1" />
                <p className="text-xs text-muted-foreground mt-1">이메일은 변경할 수 없습니다.</p>
              </div>
              <div>
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  value={profile.full_name}
                  onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
                  placeholder="이름을 입력해 주세요"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="company">회사명</Label>
                <Input
                  id="company"
                  value={profile.company_name}
                  onChange={(e) => setProfile((p) => ({ ...p, company_name: e.target.value }))}
                  placeholder="회사명을 입력해 주세요"
                  className="mt-1"
                />
              </div>
              <Separator />
              <Button onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? "저장 중..." : "저장"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 탭 2: 구독 관리 ── */}
        <TabsContent value="subscription" className="space-y-6">
          {/* Current plan card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />현재 구독
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subscription && subscription.status === "active" ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">현재 플랜</p>
                      <p className="text-xl font-bold">{planNames[subscription.plan] || subscription.plan}</p>
                    </div>
                    <Badge variant="default">활성</Badge>
                  </div>
                  {subscription.current_period_end && (
                    <p className="text-sm text-muted-foreground">
                      만료일: {format(new Date(subscription.current_period_end), "yyyy년 M월 d일", { locale: ko })}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate("/pricing")}>
                      플랜 업그레이드
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">구독 취소</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            구독을 취소하시겠습니까?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            구독을 취소하면 현재 결제 기간이 끝난 후 서비스 이용이 제한됩니다. 이 작업은 되돌릴 수 없습니다.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>돌아가기</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={handleCancel}
                          >
                            구독 취소
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">현재 플랜</p>
                    <p className="text-xl font-bold">{planNames[subscription?.plan ?? "free"]}</p>
                  </div>
                  <Badge variant="secondary">
                    {subscription?.status === "cancelled" ? "취소됨" : "만료"}
                  </Badge>
                </div>
              )}
              {(!subscription || subscription.status !== "active") && (
                <Button className="mt-4" onClick={() => navigate("/pricing")}>
                  플랜 업그레이드
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Payment history */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />결제 내역
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">결제 내역이 없습니다.</p>
              ) : (
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>날짜</TableHead>
                        <TableHead>요금제</TableHead>
                        <TableHead className="text-right">금액</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>세금계산서</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{format(new Date(p.paid_at), "yyyy.MM.dd", { locale: ko })}</TableCell>
                          <TableCell>{planNames[p.plan] || p.plan}</TableCell>
                          <TableCell className="text-right">₩{p.amount.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={p.status === "paid" ? "default" : "secondary"}>
                              {p.status === "paid" ? "결제완료" : p.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {p.tax_invoice_requested ? (
                              <Badge variant="outline">신청완료</Badge>
                            ) : (
                              <Button size="sm" variant="ghost" onClick={() => handleTaxInvoice(p.id)}>
                                신청
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 탭 3: 알림 설정 ── */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">이메일 알림 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">캠페인 완료 알림</p>
                  <p className="text-xs text-muted-foreground">캠페인 발송이 모두 완료되면 이메일로 알려드립니다.</p>
                </div>
                <Switch
                  checked={notif.notify_campaign_complete}
                  onCheckedChange={(v) => setNotif((n) => ({ ...n, notify_campaign_complete: v }))}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">답장 수신 알림</p>
                  <p className="text-xs text-muted-foreground">수신자로부터 답장이 오면 이메일로 알려드립니다.</p>
                </div>
                <Switch
                  checked={notif.notify_reply_received}
                  onCheckedChange={(v) => setNotif((n) => ({ ...n, notify_reply_received: v }))}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">반송 발생 알림</p>
                  <p className="text-xs text-muted-foreground">이메일이 반송(바운스)되면 이메일로 알려드립니다.</p>
                </div>
                <Switch
                  checked={notif.notify_bounce}
                  onCheckedChange={(v) => setNotif((n) => ({ ...n, notify_bounce: v }))}
                />
              </div>
              <Separator />
              <Button onClick={handleSaveNotif} disabled={savingNotif}>
                {savingNotif ? "저장 중..." : "저장"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
