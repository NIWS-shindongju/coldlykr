import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { z } from "zod";

const signupSchema = z.object({
  fullName: z.string().trim().min(1, "이름을 입력해주세요").max(100),
  email: z.string().trim().email("올바른 이메일을 입력해주세요"),
  password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다"),
  companyName: z.string().trim().min(1, "회사명을 입력해주세요").max(100),
});

const SignupPage = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      toast.error("이용약관에 동의해주세요.");
      return;
    }

    const result = signupSchema.safeParse({ fullName, email, password, companyName });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, company_name: companyName },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("가입이 완료되었습니다!");
      navigate("/dashboard");
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) toast.error("구글 로그인에 실패했습니다.");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <Link to="/" className="text-2xl font-bold text-primary">MailPro</Link>
          <p className="mt-2 text-muted-foreground">무료로 시작하세요</p>
        </div>

        <Button
          variant="outline"
          className="w-full mb-4"
          onClick={handleGoogleLogin}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google로 시작하기
        </Button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">또는</span>
          </div>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <Label htmlFor="fullName">이름</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="홍길동" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="email">이메일</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="password">비밀번호</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6자 이상" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="companyName">회사명</Label>
            <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="회사명을 입력하세요" className="mt-1" />
          </div>

          <div className="flex items-start gap-2">
            <Checkbox id="terms" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
            <Label htmlFor="terms" className="text-sm leading-snug cursor-pointer">
              <Link to="/terms" className="text-primary underline">이용약관</Link> 및{" "}
              <Link to="/privacy" className="text-primary underline">개인정보처리방침</Link>에 동의합니다
            </Label>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "가입 중..." : "회원가입"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          이미 계정이 있으신가요?{" "}
          <Link to="/login" className="text-primary underline">로그인</Link>
        </p>
      </Card>
    </div>
  );
};

export default SignupPage;
