import { useSearchParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

const PaymentFail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const message = searchParams.get("message") || "결제가 취소되었거나 실패했습니다.";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="p-8 max-w-md w-full text-center">
        <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">결제 실패</h2>
        <p className="text-muted-foreground mb-6">{message}</p>
        <Button onClick={() => navigate("/pricing")} className="w-full">
          요금제 페이지로 돌아가기
        </Button>
      </Card>
    </div>
  );
};

export default PaymentFail;
