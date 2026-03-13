import { useState, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Upload, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Papa from "papaparse";
import type { Database } from "@/integrations/supabase/types";

type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];
type Category = Database["public"]["Enums"]["contact_category"];
type Region = Database["public"]["Enums"]["contact_region"];

const categories: { label: string; value: Category | "all" }[] = [
  { label: "전체", value: "all" },
  { label: "음식점·카페", value: "음식점·카페" },
  { label: "쇼핑·유통", value: "쇼핑·유통" },
  { label: "IT·소프트웨어", value: "IT·소프트웨어" },
  { label: "제조업", value: "제조업" },
  { label: "서비스업", value: "서비스업" },
  { label: "의료·헬스", value: "의료·헬스" },
  { label: "교육", value: "교육" },
  { label: "부동산·건설", value: "부동산·건설" },
];

const regions: { label: string; value: Region | "all" }[] = [
  { label: "전체", value: "all" },
  { label: "서울", value: "서울" },
  { label: "경기", value: "경기" },
  { label: "부산", value: "부산" },
  { label: "인천", value: "인천" },
  { label: "대구", value: "대구" },
  { label: "광주", value: "광주" },
  { label: "대전", value: "대전" },
];

const VALID_CATEGORIES = new Set<string>(categories.filter(c => c.value !== "all").map(c => c.value));
const VALID_REGIONS = new Set<string>(regions.filter(r => r.value !== "all").map(r => r.value));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const BATCH_SIZE = 100;

const PAGE_SIZE = 50;

const Contacts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | "all">("all");
  const [selectedRegion, setSelectedRegion] = useState<Region | "all">("all");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts", user?.id, selectedCategory, selectedRegion, search],
    queryFn: async () => {
      let query = supabase.from("contacts").select("*").order("created_at", { ascending: false });

      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory);
      }
      if (selectedRegion !== "all") {
        query = query.eq("region", selectedRegion);
      }
      if (search.trim()) {
        query = query.or(`company_name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ContactRow[];
    },
    enabled: !!user,
  });

  const totalCount = contacts.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pagedContacts = useMemo(
    () => contacts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [contacts, page]
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === pagedContacts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pagedContacts.map((c) => c.id)));
    }
  };

  const mapColumnName = (col: string): string => {
    const c = col.trim().toLowerCase();
    const map: Record<string, string> = {
      "업체명": "company_name", "company_name": "company_name",
      "대표자": "representative", "representative": "representative",
      "이메일": "email", "email": "email",
      "전화번호": "phone", "phone": "phone",
      "업종": "category", "category": "category",
      "지역": "region", "region": "region",
    };
    return map[c] ?? c;
  };

  const handleExcelUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,.xlsx,.xls";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !user) return;

      setUploadProgress(0);

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const rows = results.data as Record<string, string>[];
          const allMapped = rows.map((row) => {
            const obj: Record<string, string> = {};
            for (const [key, val] of Object.entries(row)) {
              obj[mapColumnName(key)] = val?.trim() ?? "";
            }
            return obj;
          });

          const withEmail = allMapped
            .filter((r) => r.email && EMAIL_RE.test(r.email))
            .filter((r) => r.company_name);

          const mapped = withEmail
            .filter((r) => VALID_CATEGORIES.has(r.category))
            .filter((r) => VALID_REGIONS.has(r.region));

          const skippedCount = withEmail.length - mapped.length;

          if (mapped.length === 0) {
            toast.error("유효한 데이터가 없습니다. 컬럼명과 데이터를 확인해 주세요.");
            setUploadProgress(null);
            return;
          }

          let inserted = 0;
          const totalBatches = Math.ceil(mapped.length / BATCH_SIZE);

          for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
            const batch = mapped.slice(i, i + BATCH_SIZE).map((r) => ({
              user_id: user.id,
              company_name: r.company_name,
              representative: r.representative || null,
              email: r.email,
              category: r.category as Category,
              region: r.region as Region,
            }));

            const { error } = await supabase
              .from("contacts")
              .upsert(batch, { onConflict: "user_id,email", ignoreDuplicates: false });

            if (error) {
              console.error("Batch insert error:", error);
              toast.error(`업로드 중 오류: ${error.message}`);
              setUploadProgress(null);
              return;
            }

            inserted += batch.length;
            const batchIndex = Math.floor(i / BATCH_SIZE) + 1;
            setUploadProgress(Math.round((batchIndex / totalBatches) * 100));
          }

          setUploadProgress(100);
          toast.success(`총 ${inserted}개 연락처가 추가되었습니다.`);
          queryClient.invalidateQueries({ queryKey: ["contacts"] });
          setTimeout(() => setUploadProgress(null), 1500);
        },
        error: (err) => {
          toast.error(`파일 파싱 오류: ${err.message}`);
          setUploadProgress(null);
        },
      });
    };
    input.click();
  };

  return (
    <div className="relative pb-20">
      {/* 큐디비 Banner */}
      <div className="mb-6 rounded-lg border bg-primary/5 p-4 flex items-center justify-between">
        <div>
          <p className="font-medium text-sm">더 많은 DB가 필요하신가요?</p>
          <p className="text-xs text-muted-foreground mt-0.5">큐디비에서 1,000만건+ 한국 기업 데이터를 직접 구독하세요.</p>
        </div>
        <Button size="sm" variant="outline" asChild>
          <a href="https://qdb.kr" target="_blank" rel="noopener noreferrer">
            큐디비 직접 구독하기 →
          </a>
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">연락처 DB</h1>
          <Badge variant="secondary" className="text-sm">{totalCount.toLocaleString()}개</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExcelUpload} disabled={uploadProgress !== null}>
            <Upload className="h-4 w-4 mr-2" />
            {uploadProgress !== null ? "업로드 중..." : "엑셀 업로드"}
          </Button>
        </div>
      </div>

      {uploadProgress !== null && (
        <div className="mb-4 space-y-1">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">{uploadProgress}%</p>
        </div>
      )}

      {/* Search + Region Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="업체명, 이메일 검색"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
        <Select
          value={selectedRegion}
          onValueChange={(v) => { setSelectedRegion(v as Region | "all"); setPage(0); }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="지역" />
          </SelectTrigger>
          <SelectContent>
            {regions.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-4">
        {categories.map((cat) => (
          <Button
            key={cat.value}
            size="sm"
            variant={selectedCategory === cat.value ? "default" : "ghost"}
            className="shrink-0"
            onClick={() => { setSelectedCategory(cat.value); setPage(0); }}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={pagedContacts.length > 0 && selected.size === pagedContacts.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>업체명</TableHead>
              <TableHead>대표자</TableHead>
              <TableHead>이메일</TableHead>
              <TableHead>업종</TableHead>
              <TableHead>지역</TableHead>
              <TableHead>등록일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  로딩 중...
                </TableCell>
              </TableRow>
            ) : pagedContacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  연락처가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              pagedContacts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(c.id)}
                      onCheckedChange={() => toggleSelect(c.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{c.company_name}</TableCell>
                  <TableCell>{c.representative ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.email}</TableCell>
                  <TableCell><Badge variant="outline">{c.category}</Badge></TableCell>
                  <TableCell>{c.region}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(c.created_at), "yyyy.MM.dd", { locale: ko })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card List */}
      <div className="sm:hidden space-y-2">
        {isLoading ? (
          <p className="text-center py-12 text-muted-foreground">로딩 중...</p>
        ) : pagedContacts.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">연락처가 없습니다.</p>
        ) : (
          pagedContacts.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border bg-card p-4 flex items-start gap-3"
              onClick={() => toggleSelect(c.id)}
            >
              <Checkbox
                checked={selected.has(c.id)}
                onCheckedChange={() => toggleSelect(c.id)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{c.company_name}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{c.email}</p>
                <Badge variant="outline" className="mt-1.5 text-xs">{c.category}</Badge>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button variant="ghost" size="icon" disabled={page === 0} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <Button variant="ghost" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Selection Bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card shadow-lg">
          <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
            <span className="text-sm font-medium">
              선택된 <span className="text-primary">{selected.size}개</span>
            </span>
            <Button onClick={() => navigate("/campaigns/new", { state: { selectedContactIds: Array.from(selected) } })}>
              선택한 연락처로 캠페인 만들기
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contacts;
