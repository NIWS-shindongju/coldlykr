import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
      toast.success("비밀번호 재설정 이메일을 보냈습니다.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <Link to="/" className="text-2xl font-bold text-primary">Coldly</Link>
          <p className="mt-2 text-muted-foreground">비밀번호 재설정</p>
        </div>

        {sent ? (
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              입력하신 이메일로 비밀번호 재설정 링크를 보냈습니다. 이메일을 확인해주세요.
            </p>
            <Link to="/login" className="text-primary underline text-sm">로그인으로 돌아가기</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">이메일</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="mt-1" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "전송 중..." : "재설정 링크 보내기"}
            </Button>
            <p className="text-center text-sm">
              <Link to="/login" className="text-primary underline">로그인으로 돌아가기</Link>
            </p>
          </form>
        )}
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;
