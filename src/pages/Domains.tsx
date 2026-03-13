import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Globe, Plus } from "lucide-react";
import { toast } from "sonner";
import { DomainCard } from "@/components/domains/DomainCard";
import { DnsGuideModal } from "@/components/domains/DnsGuideModal";
import { AddDomainDialog } from "@/components/domains/AddDomainDialog";

const Domains = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideDomain, setGuideDomain] = useState("");

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

  const openGuide = (domain: string) => {
    setGuideDomain(domain);
    setGuideOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">발송 도메인</h1>
        <AddDomainDialog open={addOpen} onOpenChange={setAddOpen} />
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
          <DomainCard
            key={d.id}
            domain={d}
            onDelete={(id) => deleteDomain.mutate(id)}
            onOpenGuide={openGuide}
          />
        ))}
      </div>

      {/* DNS Guide Modal */}
      <DnsGuideModal
        open={guideOpen}
        onOpenChange={setGuideOpen}
        domain={guideDomain}
      />
    </div>
  );
};

export default Domains;
