import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Copy, ExternalLink, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const DNS_RECORDS = (domain: string) => [
  {
    label: "SPF",
    type: "TXT",
    name: "@",
    value: `v=spf1 include:amazonses.com ~all`,
  },
  {
    label: "DKIM",
    type: "TXT",
    name: "mail._domainkey",
    value: `(Resend에서 발급받은 DKIM 키를 입력하세요)`,
  },
  {
    label: "DMARC",
    type: "TXT",
    name: "_dmarc",
    value: `v=DMARC1; p=none; rua=mailto:dmarc@${domain}`,
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: string;
}

export function DnsGuideModal({ open, onOpenChange, domain }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [checks, setChecks] = useState({ spf: false, dkim: false, dmarc: false });

  // Reset checks when domain changes or modal opens
  useEffect(() => {
    if (open) setChecks({ spf: false, dkim: false, dmarc: false });
  }, [open, domain]);

  const allChecked = checks.spf && checks.dkim && checks.dmarc;

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("domains")
        .update({
          spf_configured: true,
          dkim_configured: true,
          dmarc_configured: true,
          verified: true,
        })
        .eq("domain", domain)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["domains"] });
      toast.success("도메인 인증이 완료되었습니다.");
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("클립보드에 복사되었습니다.");
  };

  const records = DNS_RECORDS(domain);
  const checkKeys: ("spf" | "dkim" | "dmarc")[] = ["spf", "dkim", "dmarc"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            DNS 설정 가이드
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{domain}</span> 도메인에 아래 DNS 레코드를 추가한 뒤, 설정 완료 체크박스를 눌러주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {records.map((rec, idx) => (
            <div key={rec.label} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono">{rec.label}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => copyToClipboard(rec.value)}
                >
                  <Copy className="h-3.5 w-3.5" />복사
                </Button>
              </div>
              <div className="grid grid-cols-[60px_1fr] gap-2 text-sm">
                <span className="text-muted-foreground">타입</span>
                <span className="font-mono">{rec.type}</span>
                <span className="text-muted-foreground">이름</span>
                <span className="font-mono">{rec.name}</span>
                <span className="text-muted-foreground">값</span>
                <span className="font-mono text-xs break-all bg-muted/50 rounded p-1.5">{rec.value}</span>
              </div>
              {/* Confirmation checkbox */}
              <div className="flex items-center gap-2 pt-1 border-t">
                <Checkbox
                  id={`check-${rec.label}`}
                  checked={checks[checkKeys[idx]]}
                  onCheckedChange={(v) =>
                    setChecks((prev) => ({ ...prev, [checkKeys[idx]]: !!v }))
                  }
                />
                <Label htmlFor={`check-${rec.label}`} className="text-sm cursor-pointer">
                  {rec.label} 레코드 추가 완료
                </Label>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <a
            href="https://customer.gabia.com/manuals/domain/dns"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            가비아 DNS 설정하는 방법
          </a>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>닫기</Button>
            <Button
              disabled={!allChecked || confirmMutation.isPending}
              onClick={() => confirmMutation.mutate()}
            >
              {confirmMutation.isPending ? "저장 중..." : "인증 완료로 저장"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
