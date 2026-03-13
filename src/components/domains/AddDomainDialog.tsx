import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

function cleanDomain(raw: string): string {
  let v = raw.toLowerCase().trim();
  v = v.replace(/^https?:\/\//, "");
  v = v.replace(/^www\./, "");
  v = v.replace(/\/.*$/, "");
  return v;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddDomainDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rawInput, setRawInput] = useState("");

  const cleaned = useMemo(() => cleanDomain(rawInput), [rawInput]);
  const isValid = cleaned.length > 0 && DOMAIN_REGEX.test(cleaned);
  const showError = rawInput.trim().length > 0 && !isValid;

  const addDomain = useMutation({
    mutationFn: async (domain: string) => {
      const { error } = await supabase.from("domains").insert({
        user_id: user!.id,
        domain,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["domains"] });
      toast.success("도메인이 추가되었습니다.");
      setRawInput("");
      onOpenChange(false);
    },
    onError: (err: Error) => {
      if (err.message.includes("duplicate")) toast.error("이미 등록된 도메인입니다.");
      else toast.error(err.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setRawInput(""); }}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" />도메인 추가</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>도메인 추가</DialogTitle>
          <DialogDescription>이메일 발송에 사용할 도메인을 입력해 주세요.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="domain-input">도메인 주소</Label>
          <Input
            id="domain-input"
            placeholder="company.com"
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            className={cn(showError && "border-destructive focus-visible:ring-destructive")}
          />
          {showError && (
            <p className="text-xs text-destructive">올바른 도메인 형식이 아닙니다 (예: company.com)</p>
          )}
          {rawInput !== cleaned && cleaned && isValid && (
            <p className="text-xs text-muted-foreground">자동 변환: {cleaned}</p>
          )}
        </div>
        <DialogFooter>
          <Button
            onClick={() => addDomain.mutate(cleaned)}
            disabled={!isValid || addDomain.isPending}
          >
            {addDomain.isPending ? "추가 중..." : "추가"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
