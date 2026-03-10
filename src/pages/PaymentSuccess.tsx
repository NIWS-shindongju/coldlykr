import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(true);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const process = async () => {
      const authKey = searchParams.get("authKey");
      const customerKey = searchParams.get("customerKey");
      const plan = searchParams.get("plan");

      if (!authKey || !customerKey || !plan) {
        toast.error("결제 정보가 올바르지 않습니다.");
        navigate("/pricing");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase.functions.invoke("toss-payments", {
        body: { action: "issue-billing-key", authKey, customerKey, plan },
      });

      if (error || data?.error) {
        toast.error(data?.error || "결제 처리 중 오류가 발생했습니다.");
        navigate("/pricing");
        return;
      }

      setProcessing(false);
      setDone(true);
    };
    process();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="p-8 max-w-md w-full text-center">
        {processing && !done && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">결제 처리 중...</h2>
            <p className="text-muted-foreground">잠시만 기다려주세요.</p>
          </>
        )}
        {done && (
          <>
            <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">구독이 완료되었습니다!</h2>
            <p className="text-muted-foreground mb-6">
              {searchParams.get("plan")?.toUpperCase()} 플랜이 활성화되었습니다.
            </p>
            <Button onClick={() => navigate("/dashboard")} className="w-full">
              대시보드로 이동
            </Button>
          </>
        )}
      </Card>
    </div>
  );
};

export default PaymentSuccess;
