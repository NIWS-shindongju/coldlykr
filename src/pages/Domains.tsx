import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";

const Domains = () => {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">발송 도메인</h1>
        <Button><Plus className="h-4 w-4 mr-2" />도메인 추가</Button>
      </div>
      <Card className="p-12 flex flex-col items-center justify-center text-center">
        <p className="text-muted-foreground mb-4">이메일 발송에 사용할 도메인을 등록하세요.</p>
        <Button variant="outline">도메인 연결하기</Button>
      </Card>
    </div>
  );
};

export default Domains;
