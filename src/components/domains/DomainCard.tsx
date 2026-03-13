import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Globe, CheckCircle2, XCircle, Trash2, ShieldCheck, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const DNS_TOOLTIPS: Record<string, string> = {
  SPF: "발신 서버 인증 - 없으면 다른 서버에서 내 도메인을 도용 가능",
  DKIM: "이메일 서명 - 없으면 스팸으로 분류될 확률 높음",
  DMARC: "SPF/DKIM 실패 처리 정책 - 없으면 피싱 위험",
};

interface DomainCardProps {
  domain: any;
  onDelete: (id: string) => void;
  onOpenGuide: (domain: string) => void;
}

export function DomainCard({ domain: d, onDelete, onOpenGuide }: DomainCardProps) {
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    setVerifying(true);
    // Simulate DNS check (3 seconds) — real DNS lookup requires server-side
    await new Promise((r) => setTimeout(r, 3000));
    setVerifying(false);
    // After "check", open the guide modal for manual confirmation
    onOpenGuide(d.domain);
  };

  const StatusIcon = ({ ok }: { ok: boolean }) =>
    ok ? (
      <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
    ) : (
      <XCircle className="h-4 w-4 text-destructive" />
    );

  return (
    <Card className={cn(
      "border-l-4",
      d.verified ? "border-l-[hsl(var(--success))]" : "border-l-destructive"
    )}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <Globe className="h-5 w-5 text-muted-foreground shrink-0" />
              <span className="text-lg font-semibold">{d.domain}</span>
              <Badge variant={d.verified ? "default" : "destructive"}>
                {d.verified ? "인증 완료" : "인증 필요"}
              </Badge>
            </div>

            {/* DNS status row with tooltips */}
            <TooltipProvider>
              <div className="flex flex-wrap gap-4 text-sm">
                {(["SPF", "DKIM", "DMARC"] as const).map((label) => {
                  const key = label === "SPF" ? "spf_configured" : label === "DKIM" ? "dkim_configured" : "dmarc_configured";
                  const ok = d[key];
                  return (
                    <Tooltip key={label}>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5 cursor-help">
                          <StatusIcon ok={ok} />
                          <span className={cn(ok ? "text-foreground" : "text-muted-foreground")}>{label}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[240px]">
                        <p className="text-xs">{DNS_TOOLTIPS[label]}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleVerify}
              disabled={verifying}
            >
              {verifying ? (
                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />확인 중...</>
              ) : (
                <><RefreshCw className="h-4 w-4 mr-1.5" />DNS 인증 확인</>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenGuide(d.domain)}
            >
              <ShieldCheck className="h-4 w-4 mr-1.5" />DNS 설정 가이드
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(d.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
