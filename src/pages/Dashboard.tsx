import { Card } from "@/components/ui/card";
import { Mail, Users, MousePointerClick, TrendingUp } from "lucide-react";

const stats = [
  { label: "발송된 이메일", value: "0", icon: Mail, change: "+0%" },
  { label: "총 연락처", value: "0", icon: Users, change: "+0%" },
  { label: "오픈율", value: "0%", icon: MousePointerClick, change: "+0%" },
  { label: "응답률", value: "0%", icon: TrendingUp, change: "+0%" },
];

const Dashboard = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">대시보드</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <stat.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <span className="text-xs text-muted-foreground">{stat.change} 지난달 대비</span>
          </Card>
        ))}
      </div>
      <Card className="p-8 flex items-center justify-center min-h-[200px]">
        <p className="text-muted-foreground">캠페인을 생성하여 콜드메일을 시작하세요.</p>
      </Card>
    </div>
  );
};

export default Dashboard;
