import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Send, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface TestRecord {
  email: string;
  sentAt: Date;
  status: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: any;
}

const SAMPLE_VARS: Record<string, string> = {
  "업체명": "㈜샘플기업",
  "대표자명": "홍길동",
  "회사명": "㈜샘플기업",
  "이름": "홍길동",
};

function replaceVars(text: string): string {
  let result = text;
  for (const [key, val] of Object.entries(SAMPLE_VARS)) {
    result = result.replaceAll(`{${key}}`, val);
  }
  return result;
}

export function TestEmailDialog({ open, onOpenChange, campaign }: Props) {
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [history, setHistory] = useState<TestRecord[]>([]);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail);
  const showError = testEmail.trim().length > 0 && !isEmailValid;

  const previewSubject = replaceVars(campaign?.subject ?? "");
  const previewBody = replaceVars(campaign?.body ?? "");

  const handleSend = async () => {
    if (!isEmailValid) return;
    setSending(true);
    try {
      const res = await supabase.functions.invoke("send-test-email", {
        body: { campaign_id: campaign.id, test_email: testEmail },
      });
      if (res.error) {
        // Edge function doesn't exist
        if (res.error.message?.includes("not found") || res.error.message?.includes("404")) {
          toast.info("테스트 발송 기능은 Resend 연동 후 사용 가능합니다.");
        } else {
          throw new Error(res.error.message);
        }
      } else {
        toast.success("테스트 이메일을 발송했습니다. 받은편지함을 확인해주세요.");
        setHistory((prev) => [{ email: testEmail, sentAt: new Date(), status: "sent" }, ...prev]);
      }
    } catch (err: any) {
      toast.error(err.message || "테스트 발송 오류");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>테스트 이메일 발송</DialogTitle>
          <DialogDescription>
            실제 발송 전에 이메일이 올바르게 보이는지 확인해보세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Test email input */}
          <div className="space-y-2">
            <Label htmlFor="test-email">테스트 수신 이메일</Label>
            <Input
              id="test-email"
              type="email"
              placeholder="본인 이메일을 입력하세요"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className={cn(showError && "border-destructive focus-visible:ring-destructive")}
            />
            {showError && (
              <p className="text-xs text-destructive">올바른 이메일 형식이 아닙니다</p>
            )}
          </div>

          {/* Preview section */}
          <Collapsible open={previewOpen} onOpenChange={setPreviewOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between px-3">
                <span className="text-sm font-medium">미리보기</span>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", previewOpen && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="rounded-lg border p-4 space-y-3 mt-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">발신자: </span>
                  <span className="font-medium">{campaign?.sender_name ?? "-"} &lt;{campaign?.sender_email ?? "-"}&gt;</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">제목: </span>
                  <span className="font-medium">{previewSubject || "-"}</span>
                </div>
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground mb-2">본문</p>
                  {previewBody ? (
                    <div className="rounded border bg-background p-4 prose prose-sm max-w-none dark:prose-invert text-sm" dangerouslySetInnerHTML={{ __html: previewBody }} />
                  ) : (
                    <p className="text-sm text-muted-foreground">본문이 비어있습니다.</p>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Test send history */}
          {history.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">최근 테스트 발송 내역</p>
              <div className="space-y-1.5">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs rounded-md border px-3 py-2">
                    <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1">{h.email}</span>
                    <span className="text-muted-foreground shrink-0">{format(h.sentAt, "HH:mm:ss", { locale: ko })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>닫기</Button>
          <Button onClick={handleSend} disabled={!isEmailValid || sending} className="gap-1.5">
            <Send className="h-3.5 w-3.5" />
            {sending ? "발송 중..." : "테스트 발송"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
