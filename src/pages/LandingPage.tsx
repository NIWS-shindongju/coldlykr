import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Database, Send, BarChart3, Mail, Eye, MessageSquare, Megaphone } from "lucide-react";
import { useNavigate } from "react-router-dom";

const features = [
  {
    icon: Database,
    title: "1,000만+ 기업 DB 내장",
    desc: "업종, 지역, 규모별로 정확하게 필터링된 한국 기업 데이터베이스를 바로 활용하세요.",
  },
  {
    icon: Send,
    title: "클릭 한 번 자동 발송",
    desc: "템플릿 선택부터 발송 스케줄링까지, 복잡한 설정 없이 자동으로 처리됩니다.",
  },
  {
    icon: BarChart3,
    title: "실시간 성과 추적",
    desc: "오픈율, 클릭율, 응답률을 실시간으로 확인하고 캠페인을 최적화하세요.",
  },
];

const plans = [
  {
    name: "Starter",
    price: "29,000",
    features: ["하루 최대 100통 발송", "캠페인 10개", "연락처 10,000명", "기본 템플릿 5개", "이메일 지원"],
    recommended: false,
  },
  {
    name: "Growth",
    price: "69,000",
    features: ["하루 최대 500통 발송", "캠페인 무제한", "연락처 100,000명", "AI 이메일 작성 지원", "자동 시퀀스 발송 (2차·3차 메일)", "발송 결과 상세 분석", "카카오 알림 연동", "우선 이메일 지원"],
    recommended: true,
  },
  {
    name: "Scale",
    price: "149,000",
    features: ["하루 최대 2,000통 발송", "캠페인 무제한", "연락처 무제한", "팀원 5명", "전용 CS 담당자", "세금계산서 발행", "API 연동", "모든 Growth 기능 포함"],
    recommended: false,
  },
];

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-primary tracking-tight">MailPro</span>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/login")}>
              로그인
            </Button>
            <Button onClick={() => navigate("/signup")}>무료 시작</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-6">
              한국 기업 1,000만곳에
              <br />
              콜드메일을 자동으로
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              업종별 기업 DB 내장,
              <br />
              자동 발송, 성과 추적까지
              <br />
              한 번에 해결하세요
            </p>
            <Button size="lg" className="text-base px-8 h-12" onClick={() => navigate("/signup")}>
              무료로 시작하기
            </Button>
          </div>
          <div className="relative">
            <div className="rounded-xl overflow-hidden shadow-2xl border bg-[#1a1a2e] p-5">
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { label: "총 발송", value: "1,250통", icon: Mail, color: "text-blue-400" },
                  { label: "열람률", value: "38.4%", icon: Eye, color: "text-emerald-400" },
                  { label: "답장률", value: "7.2%", icon: MessageSquare, color: "text-amber-400" },
                  { label: "활성 캠페인", value: "5개", icon: Megaphone, color: "text-purple-400" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-[#16213e] rounded-lg p-3 border border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
                      <span className="text-[11px] text-gray-400">{stat.label}</span>
                    </div>
                    <p className="text-xl font-bold text-white">{stat.value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-[#16213e] rounded-lg p-4 border border-white/5">
                <p className="text-[11px] text-gray-400 mb-3">주간 발송 현황</p>
                <div className="flex items-end gap-2 h-24">
                  {[40, 65, 55, 80, 70, 90, 60].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full rounded-sm bg-gradient-to-t from-blue-600 to-blue-400"
                        style={{ height: `${h}%` }}
                      />
                      <span className="text-[9px] text-gray-500">
                        {["월", "화", "수", "목", "금", "토", "일"][i]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-card">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">왜 MailPro인가요?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f) => (
              <Card key={f.title} className="p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4">심플한 요금제</h2>
          <p className="text-center text-muted-foreground mb-12">
            비즈니스 규모에 맞는 플랜을 선택하세요
          </p>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`p-6 flex flex-col relative ${
                  plan.recommended ? "border-primary ring-2 ring-primary" : ""
                }`}
              >
                {plan.recommended && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                    추천
                  </span>
                )}
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <div className="mt-2 mb-4">
                  <span className="text-3xl font-bold">₩{plan.price}</span>
                  <span className="text-muted-foreground text-sm">/월</span>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.recommended ? "default" : "outline"}
                  className="w-full"
                  onClick={() => navigate("/pricing")}
                >
                  시작하기
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Partnership Section */}
      <section className="py-12 bg-card border-t">
        <div className="max-w-6xl mx-auto px-6 flex flex-col items-center text-center gap-4">
          <Badge variant="outline" className="text-xs font-medium px-3 py-1">큐디비 공식 파트너 서비스</Badge>
          <div className="flex items-center gap-3">
            <span className="bg-[#2563EB] text-white font-bold text-sm px-2.5 py-1.5 rounded-lg">큐DB</span>
            <span className="text-lg font-semibold">데이터 제공 파트너: 큐디비</span>
            <span className="text-sm text-muted-foreground">공식 데이터 파트너</span>
          </div>
          <p className="text-sm text-muted-foreground max-w-md">
            큐디비의 1,000만건 이상 한국 기업 데이터베이스를 기반으로 정확한 타겟 마케팅이 가능합니다.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="bg-[#2563EB] text-white font-bold text-[10px] px-1.5 py-1 rounded">큐DB</span>
            <span>공식 데이터 파트너</span>
          </div>
          <div className="flex gap-6">
            <a href="/terms" className="hover:text-foreground transition-colors">
              이용약관
            </a>
            <a href="/privacy" className="hover:text-foreground transition-colors">
              개인정보처리방침
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
