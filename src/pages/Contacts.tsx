import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Upload } from "lucide-react";

const Contacts = () => {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">연락처 DB</h1>
        <div className="flex gap-2">
          <Button variant="outline"><Upload className="h-4 w-4 mr-2" />CSV 업로드</Button>
          <Button><Plus className="h-4 w-4 mr-2" />연락처 추가</Button>
        </div>
      </div>
      <Card className="p-12 flex flex-col items-center justify-center text-center">
        <p className="text-muted-foreground mb-4">연락처를 추가하거나 CSV 파일을 업로드하세요.</p>
        <Button variant="outline">연락처 가져오기</Button>
      </Card>
    </div>
  );
};

export default Contacts;
