import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const SettingsPage = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">설정</h1>
      <Card className="p-6 max-w-2xl">
        <h2 className="text-lg font-semibold mb-4">프로필</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">이름</Label>
            <Input id="name" placeholder="이름을 입력하세요" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="email">이메일</Label>
            <Input id="email" type="email" placeholder="이메일을 입력하세요" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="company">회사명</Label>
            <Input id="company" placeholder="회사명을 입력하세요" className="mt-1" />
          </div>
        </div>
        <Separator className="my-6" />
        <Button>저장</Button>
      </Card>
    </div>
  );
};

export default SettingsPage;
