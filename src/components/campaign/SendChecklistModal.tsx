import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ShieldCheck, Mail, Users, FileText, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: any;
  pendingCount: number;
  onConfirm: () => void;
  isSending: boolean;
}

interface CheckItem {
  key: string;
  ok: boolean;
  label: string;
  failLabel: string;
  icon: React.ReactNode;
  link?: string;
  critical: boolean; // true = blocks send entirely
}

export function SendChecklistModal({ open, onOpenChange, campaign, pendingCount, onConfirm, isSending }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const senderDomain = campaign?.sender_email?.split("@")[1] ?? "";

  const { data: domainRecord } = useQuery({
    queryKey: ["checklist-domain", senderDomain, user?.id],
    queryFn: async () => {
      if (!senderDomain) return null;
      const { data } = await supabase
        .from("domains")
        .select("*")
        .eq("domain", senderDomain)
        .maybeSingle();
      return data;
    },
    enabled: open && !!user && !!senderDomain,
  });

  const hasSubject = !!campaign?.subject?.trim();
  const hasBody = !!campaign?.body?.trim();

  const items: CheckItem[] = [
    {
      key: "domain",
      ok: !!domainRecord?.verified,
      label: `발송 도메인 (${senderDomain}) 인증됨`,
      failLabel: "발송 도메인 미인증 - 스팸 위험",
      icon: <ShieldCheck className="h-4 w-4" />,
      link: "/domains",
      critical: false,
    },
    {
      key: "spf",
      ok: !!domainRecord?.spf_configured,
      label: "SPF 레코드 설정됨",
      failLabel: "SPF 미설정 - 발송 실패 위험",
      icon: <ShieldCheck className="h-4 w-4" />,
      critical: false,
    },
    {
      key: "dkim",
      ok: !!domainRecord?.dkim_configured,
      label: "DKIM 서명 설정됨",
      failLabel: "DKIM 미설정 - 스팸 분류 위험",
      icon: <Mail className="h-4 w-4" />,
      critical: false,
    },
    {
      key: "recipients",
      ok: pendingCount > 0,
      label: `수신자 ${pendingCount}명 준비됨`,
      failLabel: "발송할 수신자가 없습니다",
      icon: <Users className="h-4 w-4" />,
      critical: true,
    },
    {
      key: "content",
      ok: hasSubject && hasBody,
      label: "이메일 제목 및 본문 확인됨",
      failLabel: "이메일 제목 또는 본문이 비어있습니다",
      icon: <FileText className="h-4 w-4" />,
      critical: true,
    },
  ];

  const warningItems = items.filter((i) => !i.ok && !i.critical);
  const criticalFails = items.filter((i) => !i.ok && i.critical);
  const allPass = items.every((i) => i.ok);
  const hasWarning = warningItems.length > 0 && criticalFails.length === 0;
  const blocked = criticalFails.length > 0;

  const summaryText = blocked
    ? "❌ 발송 불가 항목이 있습니다. 확인 후 다시 시도해주세요."
    : hasWarning
      ? "⚠️ 일부 항목이 미설정 상태입니다. 스팸 분류 위험이 있습니다."
      : "✅ 모든 검사를 통과했습니다. 발송할 준비가 됐습니다.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>발송 전 체크리스트</DialogTitle>
          <DialogDescription>
            <span className={cn(
              "inline-block mt-1 text-sm font-medium",
              blocked ? "text-destructive" : hasWarning ? "text-[hsl(var(--warning))]" : "text-[hsl(var(--success))]"
            )}>
              {summaryText}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {items.map((item) => (
            <div key={item.key} className="flex items-start gap-3 rounded-lg border p-3">
              <div className={cn("mt-0.5", item.ok ? "text-[hsl(var(--success))]" : "text-destructive")}>
                {item.ok ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", !item.ok && "text-destructive")}>
                  {item.ok ? item.label : item.failLabel}
                </p>
                {!item.ok && item.link && (
                  <button
                    onClick={() => { onOpenChange(false); navigate(item.link!); }}
                    className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1"
                  >
                    도메인 설정하기 <ExternalLink className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          {blocked ? (
            <Button disabled>발송 시작</Button>
          ) : hasWarning ? (
            <Button
              variant="outline"
              className="border-[hsl(var(--warning))] text-[hsl(var(--warning))] hover:bg-[hsl(var(--warning))]/10"
              onClick={onConfirm}
              disabled={isSending}
            >
              {isSending ? "발송 중..." : "경고 무시하고 발송"}
            </Button>
          ) : (
            <Button onClick={onConfirm} disabled={isSending}>
              {isSending ? "발송 중..." : "발송 시작"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
