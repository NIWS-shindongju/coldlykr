import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CreditCard, FileText, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Subscription {
  plan: string;
  status: string;
  current_period_end: string | null;
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

const planNames: Record<string, string> = {
  free: "무료",
  starter: "Starter",
  growth: "Growth",
  scale: "Scale",
};

const SettingsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ full_name: "", company_name: "" });
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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
      .select("plan, status, current_period_end")
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
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: profile.full_name, company_name: profile.company_name })
      .eq("user_id", user.id);
    setSaving(false);
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
    setCancelOpen(false);
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

  return (
    <div className="space-y-8 max-w-3xl">
      <h1 className="text-2xl font-bold">설정</h1>

      {/* Profile */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">프로필</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">이름</Label>
            <Input
              id="name"
              value={profile.full_name}
              onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="email">이메일</Label>
            <Input id="email" type="email" value={user?.email || ""} disabled className="mt-1" />
          </div>
          <div>
            <Label htmlFor="company">회사명</Label>
            <Input
              id="company"
              value={profile.company_name}
              onChange={(e) => setProfile((p) => ({ ...p, company_name: e.target.value }))}
              className="mt-1"
            />
          </div>
        </div>
        <Separator className="my-6" />
        <Button onClick={handleSaveProfile} disabled={saving}>
          {saving ? "저장 중..." : "저장"}
        </Button>
      </Card>

      {/* Subscription */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">구독 관리</h2>
        </div>

        {subscription && subscription.status === "active" ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">현재 요금제</span>
              <Badge>{planNames[subscription.plan] || subscription.plan}</Badge>
            </div>
            {subscription.current_period_end && (
              <p className="text-sm text-muted-foreground">
                다음 결제일: {format(new Date(subscription.current_period_end), "yyyy년 M월 d일", { locale: ko })}
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/pricing")}>
                플랜 변경
              </Button>
              <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive">구독 취소</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      구독을 취소하시겠습니까?
                    </DialogTitle>
                    <DialogDescription>
                      구독을 취소하면 현재 결제 기간이 끝난 후 서비스 이용이 제한됩니다.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCancelOpen(false)}>
                      돌아가기
                    </Button>
                    <Button variant="destructive" onClick={handleCancel}>
                      구독 취소
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              {subscription?.status === "cancelled" ? "구독이 취소되었습니다." : "구독 중인 요금제가 없습니다."}
            </p>
            <Button onClick={() => navigate("/pricing")}>요금제 선택</Button>
          </div>
        )}
      </Card>

      {/* Payment History */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">결제 내역</h2>
        </div>

        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">결제 내역이 없습니다.</p>
        ) : (
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
                  <TableCell>
                    {format(new Date(p.paid_at), "yyyy.MM.dd", { locale: ko })}
                  </TableCell>
                  <TableCell>{planNames[p.plan] || p.plan}</TableCell>
                  <TableCell className="text-right">
                    ₩{p.amount.toLocaleString()}
                  </TableCell>
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
        )}
      </Card>
    </div>
  );
};

export default SettingsPage;
