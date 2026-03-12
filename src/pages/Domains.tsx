import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Globe, CheckCircle2, XCircle, Copy, ExternalLink, Trash2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

const Domains = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideDomain, setGuideDomain] = useState("");
  const [newDomain, setNewDomain] = useState("");

  const { data: domains = [], isLoading } = useQuery({
    queryKey: ["domains", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("domains")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const addDomain = useMutation({
    mutationFn: async (domain: string) => {
      const { error } = await supabase.from("domains").insert({
        user_id: user!.id,
        domain: domain.toLowerCase().trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["domains"] });
      toast.success("도메인이 추가되었습니다.");
      setNewDomain("");
      setAddOpen(false);
    },
    onError: (err: Error) => {
      if (err.message.includes("duplicate")) toast.error("이미 등록된 도메인입니다.");
      else toast.error(err.message);
    },
  });

  const deleteDomain = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("domains").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["domains"] });
      toast.success("도메인이 삭제되었습니다.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("클립보드에 복사되었습니다.");
  };

  const StatusIcon = ({ ok }: { ok: boolean }) =>
    ok ? (
      <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
    ) : (
      <XCircle className="h-4 w-4 text-destructive" />
    );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">발송 도메인</h1>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />도메인 추가</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>도메인 추가</DialogTitle>
              <DialogDescription>이메일 발송에 사용할 도메인을 입력해 주세요.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label htmlFor="domain-input">도메인 주소</Label>
              <Input
                id="domain-input"
                placeholder="company.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                onClick={() => addDomain.mutate(newDomain)}
                disabled={!newDomain.trim() || addDomain.isPending}
              >
                {addDomain.isPending ? "추가 중..." : "추가"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Empty state */}
      {!isLoading && domains.length === 0 && (
        <Card className="p-16 flex flex-col items-center justify-center text-center">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Globe className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-lg font-semibold mb-1">등록된 도메인이 없습니다</h2>
          <p className="text-sm text-muted-foreground mb-6">
            이메일 발송에 사용할 도메인을 등록하고 DNS를 설정하세요.
          </p>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />도메인 추가하기
          </Button>
        </Card>
      )}

      {/* Domain cards */}
      <div className="grid gap-4">
        {domains.map((d: any) => (
          <Card key={d.id}>
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

                  {/* DNS status row */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <StatusIcon ok={d.spf_configured} />
                      <span className={cn(d.spf_configured ? "text-foreground" : "text-muted-foreground")}>SPF</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StatusIcon ok={d.dkim_configured} />
                      <span className={cn(d.dkim_configured ? "text-foreground" : "text-muted-foreground")}>DKIM</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StatusIcon ok={d.dmarc_configured} />
                      <span className={cn(d.dmarc_configured ? "text-foreground" : "text-muted-foreground")}>DMARC</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setGuideDomain(d.domain); setGuideOpen(true); }}
                  >
                    <ShieldCheck className="h-4 w-4 mr-1.5" />DNS 설정 가이드
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteDomain.mutate(d.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* DNS Guide Modal */}
      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              DNS 설정 가이드
            </DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{guideDomain}</span> 도메인에 아래 DNS 레코드를 추가해 주세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {DNS_RECORDS(guideDomain).map((rec) => (
              <div key={rec.label} className="rounded-lg border p-4 space-y-2">
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
              </div>
            ))}
          </div>

          <div className="border-t pt-4">
            <a
              href="https://customer.gabia.com/manuals/domain/dns"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              가비아 DNS 설정하는 방법
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Domains;
