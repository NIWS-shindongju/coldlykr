import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";

const Campaigns = () => {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">캠페인</h1>
        <Button><Plus className="h-4 w-4 mr-2" />새 캠페인</Button>
      </div>
      <Card className="p-12 flex flex-col items-center justify-center text-center">
        <p className="text-muted-foreground mb-4">아직 생성된 캠페인이 없습니다.</p>
        <Button variant="outline">첫 캠페인 만들기</Button>
      </Card>
    </div>
  );
};

export default Campaigns;
