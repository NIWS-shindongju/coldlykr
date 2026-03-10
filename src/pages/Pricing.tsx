import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const plans = [
  {
    name: "스타터",
    price: "무료",
    features: ["월 100건 발송", "연락처 500명", "기본 템플릿"],
    cta: "현재 플랜",
    active: true,
  },
  {
    name: "프로",
    price: "₩49,000/월",
    features: ["월 5,000건 발송", "연락처 무제한", "A/B 테스트", "맞춤 템플릿"],
    cta: "업그레이드",
    active: false,
  },
  {
    name: "엔터프라이즈",
    price: "₩149,000/월",
    features: ["무제한 발송", "연락처 무제한", "전용 IP", "API 액세스", "전담 매니저"],
    cta: "문의하기",
    active: false,
  },
];

const Pricing = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">요금제</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`p-6 flex flex-col ${!plan.active ? "" : "border-primary ring-1 ring-primary"}`}
          >
            <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
            <p className="text-2xl font-bold mb-4">{plan.price}</p>
            <ul className="space-y-2 mb-6 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button variant={plan.active ? "outline" : "default"} className="w-full">
              {plan.cta}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Pricing;
