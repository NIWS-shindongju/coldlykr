import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Crown, Zap, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const TOSS_CLIENT_KEY = "test_ck_P9BRQmyarYBlDDEzGbML8J07KzLN";

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: 29000,
    priceLabel: "₩29,000/월",
    icon: Zap,
    features: ["하루 최대 100통 발송", "캠페인 10개", "연락처 10,000명", "기본 템플릿 5개", "이메일 지원"],
  },
  {
    id: "growth",
    name: "Growth",
    price: 69000,
    priceLabel: "₩69,000/월",
    icon: Rocket,
    popular: true,
    features: ["하루 최대 500통 발송", "캠페인 무제한", "연락처 100,000명", "AI 이메일 작성 지원", "자동 시퀀스 발송 (2차·3차 메일)", "발송 결과 상세 분석", "카카오 알림 연동", "우선 이메일 지원"],
  },
  {
    id: "scale",
    name: "Scale",
    price: 149000,
    priceLabel: "₩149,000/월",
    icon: Crown,
    features: ["하루 최대 2,000통 발송", "캠페인 무제한", "연락처 무제한", "팀원 5명", "전용 CS 담당자", "세금계산서 발행", "API 연동", "모든 Growth 기능 포함"],
  },
];

const Pricing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data && data.status === "active") setCurrentPlan(data.plan);
      });
  }, [user]);

  const handleSubscribe = async (planId: string) => {
    if (!user) return;
    setLoading(planId);

    try {
      const customerKey = `cust_${user.id.replace(/-/g, "").slice(0, 20)}`;
      
      // Load TossPayments SDK
      const { loadTossPayments } = await import("@tosspayments/tosspayments-sdk");
      const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
      const billing = await (tossPayments as any).billing();

      await billing.requestBillingAuth({
        method: "CARD",
        successUrl: `${window.location.origin}/payment/success?plan=${planId}&customerKey=${customerKey}`,
        failUrl: `${window.location.origin}/payment/fail`,
        customerEmail: user.email || "",
        customerKey,
      });
    } catch (err: any) {
      if (err?.code !== "USER_CANCEL") {
        toast.error("결제 요청 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">요금제</h1>
      <p className="text-muted-foreground mb-8">비즈니스 성장에 맞는 요금제를 선택하세요.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const Icon = plan.icon;
          return (
            <Card
              key={plan.id}
              className={`p-6 flex flex-col relative ${
                plan.popular ? "border-primary ring-2 ring-primary" : ""
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                  인기
                </span>
              )}
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">{plan.name}</h3>
              </div>
              <p className="text-3xl font-bold mb-1">{plan.priceLabel}</p>
              <p className="text-xs text-muted-foreground mb-6">VAT 별도</p>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                variant={isCurrent ? "outline" : "default"}
                className="w-full"
                disabled={isCurrent || loading !== null}
                onClick={() => handleSubscribe(plan.id)}
              >
                {loading === plan.id
                  ? "처리중..."
                  : isCurrent
                  ? "현재 플랜"
                  : "구독하기"}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Pricing;
