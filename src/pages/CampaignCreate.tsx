import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, ArrowRight, Check, CalendarIcon, Send, Mail, Megaphone,
  User, AtSign, Reply, Bold, Italic, Link2, WrapText, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Category = Database["public"]["Enums"]["contact_category"];
type Region = Database["public"]["Enums"]["contact_region"];

const ALL_CATEGORIES: Category[] = [
  "음식점·카페", "쇼핑·유통", "IT·소프트웨어", "제조업", "서비스업", "의료·헬스", "교육", "부동산·건설",
];
const ALL_REGIONS: Region[] = ["서울", "경기", "부산", "인천", "대구", "광주", "대전"];

const SEND_COUNTS = [100, 300, 500] as const;
const INTERVALS = [
  { label: "30초", value: 30 },
  { label: "1분", value: 60 },
  { label: "3분", value: 180 },
  { label: "5분", value: 300 },
];

const steps = ["기본 설정", "수신자 선택", "이메일 작성", "발송 설정"];

interface SequenceEmail {
  daysAfter: number;
  subject: string;
  body: string;
}

const CampaignCreate = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedContactIds: string[] | null = (location.state as any)?.selectedContactIds ?? null;
  const [currentStep, setCurrentStep] = useState(preselectedContactIds ? 2 : 0);

  // Step 1
  const [campaignName, setCampaignName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [replyEmail, setReplyEmail] = useState("");

  // Step 2
  const [selectedCategories, setSelectedCategories] = useState<Set<Category>>(new Set());
  const [selectedRegions, setSelectedRegions] = useState<Set<Region>>(new Set());
  const [sendCountOption, setSendCountOption] = useState<number | "custom">(100);
  const [customSendCount, setCustomSendCount] = useState(100);

  // Step 3
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // Step 4
  const [sendNow, setSendNow] = useState(true);
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [maxPerDay, setMaxPerDay] = useState([100]);
  const [interval, setInterval] = useState(60);
  const [useSequence, setUseSequence] = useState(false);
  const [sequences, setSequences] = useState<SequenceEmail[]>([
    { daysAfter: 3, subject: "", body: "" },
    { daysAfter: 7, subject: "", body: "" },
  ]);

  const actualSendCount = sendCountOption === "custom" ? customSendCount : sendCountOption;

  // Fetch matching contacts for preview
  const { data: previewContacts = [] } = useQuery({
    queryKey: ["campaign-contacts-preview", user?.id, Array.from(selectedCategories), Array.from(selectedRegions)],
    queryFn: async () => {
      let query = supabase.from("contacts").select("*").order("created_at", { ascending: false }).limit(actualSendCount);
      if (selectedCategories.size > 0) {
        query = query.in("category", Array.from(selectedCategories));
      }
      if (selectedRegions.size > 0) {
        query = query.in("region", Array.from(selectedRegions));
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user && currentStep >= 1,
  });

  const toggleCategory = (cat: Category) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const toggleRegion = (region: Region) => {
    setSelectedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(region)) next.delete(region); else next.add(region);
      return next;
    });
  };

  const insertVariable = (variable: string) => {
    setBody((prev) => prev + variable);
  };

  const updateSequence = (index: number, field: keyof SequenceEmail, value: string | number) => {
    setSequences((prev) => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const renderPreviewBody = (text: string) => {
    return text
      .replace(/\{업체명\}/g, "㈜샘플기업")
      .replace(/\{대표자명\}/g, "홍길동")
      .replace(/\{업종\}/g, "IT·소프트웨어")
      .replace(/\{지역\}/g, "서울")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br/>");
  };

  const handleSubmit = async () => {
    if (!user) return;

    // 1. Create campaign with all settings
    const campaignInsert: any = {
      user_id: user.id,
      name: campaignName,
      subject,
      body,
      sender_name: senderName,
      sender_email: senderEmail,
      reply_email: replyEmail || senderEmail,
      send_interval: interval,
      max_per_day: maxPerDay[0],
      status: "draft",
      total_sent: 0,
      use_sequence: useSequence,
    };

    if (useSequence && sequences.length >= 1) {
      campaignInsert.sequence_2_days = sequences[0].daysAfter;
      campaignInsert.sequence_2_subject = sequences[0].subject;
      campaignInsert.sequence_2_body = sequences[0].body;
    }
    if (useSequence && sequences.length >= 2) {
      campaignInsert.sequence_3_days = sequences[1].daysAfter;
      campaignInsert.sequence_3_subject = sequences[1].subject;
      campaignInsert.sequence_3_body = sequences[1].body;
    }

    const { data: campaign, error } = await supabase.from("campaigns").insert(campaignInsert).select().single();

    if (error || !campaign) {
      toast.error("캠페인 생성에 실패했습니다.");
      return;
    }

    // 2. Fetch matching contacts and create campaign_contacts
    let contactQuery = supabase.from("contacts").select("id").limit(actualSendCount);
    if (selectedCategories.size > 0) {
      contactQuery = contactQuery.in("category", Array.from(selectedCategories));
    }
    if (selectedRegions.size > 0) {
      contactQuery = contactQuery.in("region", Array.from(selectedRegions));
    }
    const { data: contactIds } = await contactQuery;

    if (contactIds && contactIds.length > 0) {
      const rows = contactIds.map((c) => ({
        campaign_id: campaign.id,
        contact_id: c.id,
        user_id: user.id,
        status: "pending",
      }));
      await supabase.from("campaign_contacts").insert(rows);
    }

    toast.success("캠페인이 생성되었습니다!");
    navigate(`/campaigns/${campaign.id}`);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return campaignName.trim() && senderName.trim() && senderEmail.trim();
      case 1: return true;
      case 2: return subject.trim() && body.trim();
      case 3: return sendNow || !!scheduledDate;
      default: return true;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate("/campaigns")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">새 캠페인 만들기</h1>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 mb-8">
        {steps.map((label, i) => (
          <div key={label} className="flex items-center flex-1">
            <div className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 transition-colors",
                  i < currentStep
                    ? "bg-primary text-primary-foreground"
                    : i === currentStep
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {i < currentStep ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn(
                "text-sm hidden sm:block",
                i <= currentStep ? "text-foreground font-medium" : "text-muted-foreground"
              )}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn(
                "h-px flex-1 mx-2",
                i < currentStep ? "bg-primary" : "bg-border"
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="space-y-6">
        {/* Step 1: Basic Settings */}
        {currentStep === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">기본 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="campaign-name" className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-muted-foreground" />캠페인 이름
                </Label>
                <Input id="campaign-name" placeholder="예: 3월 신규 고객 발굴" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sender-name" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />발송자 이름
                </Label>
                <Input id="sender-name" placeholder="예: 김철수" value={senderName} onChange={(e) => setSenderName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sender-email" className="flex items-center gap-2">
                  <AtSign className="h-4 w-4 text-muted-foreground" />발송자 이메일
                </Label>
                <Input id="sender-email" type="email" placeholder="예: sales@company.com" value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reply-email" className="flex items-center gap-2">
                  <Reply className="h-4 w-4 text-muted-foreground" />회신 이메일
                </Label>
                <Input id="reply-email" type="email" placeholder="예: reply@company.com" value={replyEmail} onChange={(e) => setReplyEmail(e.target.value)} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Recipients */}
        {currentStep === 1 && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">수신자 선택</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Categories */}
                <div className="space-y-3">
                  <Label>카테고리 선택</Label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_CATEGORIES.map((cat) => (
                      <Button
                        key={cat}
                        size="sm"
                        variant={selectedCategories.has(cat) ? "default" : "outline"}
                        onClick={() => toggleCategory(cat)}
                      >
                        {cat}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Regions */}
                <div className="space-y-3">
                  <Label>지역 선택</Label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_REGIONS.map((region) => (
                      <Button
                        key={region}
                        size="sm"
                        variant={selectedRegions.has(region) ? "default" : "outline"}
                        onClick={() => toggleRegion(region)}
                      >
                        {region}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Send count */}
                <div className="space-y-3">
                  <Label>발송 수</Label>
                  <div className="flex flex-wrap gap-2">
                    {SEND_COUNTS.map((count) => (
                      <Button
                        key={count}
                        size="sm"
                        variant={sendCountOption === count ? "default" : "outline"}
                        onClick={() => setSendCountOption(count)}
                      >
                        {count}명
                      </Button>
                    ))}
                    <Button
                      size="sm"
                      variant={sendCountOption === "custom" ? "default" : "outline"}
                      onClick={() => setSendCountOption("custom")}
                    >
                      직접입력
                    </Button>
                  </div>
                  {sendCountOption === "custom" && (
                    <Input
                      type="number"
                      min={1}
                      max={10000}
                      value={customSendCount}
                      onChange={(e) => setCustomSendCount(Number(e.target.value))}
                      className="w-40"
                      placeholder="발송 수 입력"
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Preview Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  수신자 미리보기
                  <Badge variant="secondary">{previewContacts.length}명</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-x-auto max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>업체명</TableHead>
                        <TableHead>이메일</TableHead>
                        <TableHead>업종</TableHead>
                        <TableHead>지역</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewContacts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            조건에 맞는 연락처가 없습니다.
                          </TableCell>
                        </TableRow>
                      ) : (
                        previewContacts.slice(0, 10).map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">{c.company_name}</TableCell>
                            <TableCell className="text-muted-foreground">{c.email}</TableCell>
                            <TableCell><Badge variant="outline">{c.category}</Badge></TableCell>
                            <TableCell>{c.region}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {previewContacts.length > 10 && (
                  <p className="text-xs text-muted-foreground mt-2">외 {previewContacts.length - 10}건 더 있음</p>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Step 3: Email Compose */}
        {currentStep === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">이메일 작성</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>제목</Label>
                  <Input
                    placeholder="이메일 제목을 입력하세요"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>본문</Label>
                  {/* Toolbar */}
                  <div className="flex items-center gap-1 border rounded-t-md px-2 py-1 bg-muted/50">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setBody((p) => p + "**굵은텍스트**")}>
                      <Bold className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setBody((p) => p + "*기울임*")}>
                      <Italic className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setBody((p) => p + "[링크텍스트](https://)")}>
                      <Link2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setBody((p) => p + "\n")}>
                      <WrapText className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Textarea
                    className="min-h-[200px] rounded-t-none -mt-2"
                    placeholder="이메일 본문을 작성하세요..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                </div>
                {/* Personalization variables */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">개인화 변수 삽입</Label>
                  <div className="flex flex-wrap gap-2">
                    {["{업체명}", "{대표자명}", "{업종}", "{지역}"].map((v) => (
                      <Button key={v} variant="outline" size="sm" onClick={() => insertVariable(v)}>
                        {v}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-4 w-4" />미리보기
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border p-4 bg-background min-h-[300px]">
                  <div className="border-b pb-3 mb-3">
                    <p className="text-xs text-muted-foreground">보낸사람: {senderName || "발송자"} &lt;{senderEmail || "email@example.com"}&gt;</p>
                    <p className="font-medium mt-1">
                      {subject
                        ? subject.replace(/\{업체명\}/g, "㈜샘플기업").replace(/\{대표자명\}/g, "홍길동")
                        : "제목 없음"}
                    </p>
                  </div>
                  <div
                    className="text-sm leading-relaxed prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: body ? renderPreviewBody(body) : '<span class="text-muted-foreground">본문을 작성하면 여기에 미리보기가 표시됩니다.</span>',
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Send Settings */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">발송 설정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Send timing */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>발송 시점</Label>
                    <p className="text-sm text-muted-foreground">{sendNow ? "즉시 발송합니다" : "예약된 시간에 발송합니다"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">예약발송</span>
                    <Switch checked={sendNow} onCheckedChange={setSendNow} />
                    <span className="text-sm text-muted-foreground">즉시발송</span>
                  </div>
                </div>

                {!sendNow && (
                  <div className="flex flex-wrap gap-4 p-4 rounded-lg border bg-muted/30">
                    <div className="space-y-2">
                      <Label>날짜</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal", !scheduledDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {scheduledDate ? format(scheduledDate, "yyyy년 MM월 dd일", { locale: ko }) : "날짜 선택"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={scheduledDate}
                            onSelect={setScheduledDate}
                            disabled={(date) => date < new Date()}
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>시간</Label>
                      <Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="w-[140px]" />
                    </div>
                  </div>
                )}

                {/* Max per day */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>하루 최대 발송 수</Label>
                    <span className="text-sm font-medium text-primary">{maxPerDay[0]}통</span>
                  </div>
                  <Slider value={maxPerDay} onValueChange={setMaxPerDay} min={10} max={500} step={10} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>10통</span><span>500통</span>
                  </div>
                </div>

                {/* Interval */}
                <div className="space-y-3">
                  <Label>발송 간격</Label>
                  <div className="flex gap-2">
                    {INTERVALS.map((iv) => (
                      <Button
                        key={iv.value}
                        size="sm"
                        variant={interval === iv.value ? "default" : "outline"}
                        onClick={() => setInterval(iv.value)}
                      >
                        {iv.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sequence */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">시퀀스 (후속 이메일)</CardTitle>
                  <Switch checked={useSequence} onCheckedChange={setUseSequence} />
                </div>
              </CardHeader>
              {useSequence && (
                <CardContent className="space-y-6">
                  {sequences.map((seq, i) => (
                    <div key={i} className="space-y-3 p-4 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{i + 2}차</Badge>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            max={30}
                            value={seq.daysAfter}
                            onChange={(e) => updateSequence(i, "daysAfter", Number(e.target.value))}
                            className="w-20"
                          />
                          <span className="text-sm text-muted-foreground">일 후 발송</span>
                        </div>
                      </div>
                      <Input
                        placeholder="제목"
                        value={seq.subject}
                        onChange={(e) => updateSequence(i, "subject", e.target.value)}
                      />
                      <Textarea
                        placeholder="본문"
                        value={seq.body}
                        onChange={(e) => updateSequence(i, "body", e.target.value)}
                        className="min-h-[80px]"
                      />
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          </div>
        )}

        {/* Confirmation (after step 4) */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">최종 확인</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SummaryItem label="캠페인 이름" value={campaignName} />
                <SummaryItem label="발송자" value={`${senderName} <${senderEmail}>`} />
                <SummaryItem label="회신 이메일" value={replyEmail || senderEmail} />
                <SummaryItem label="이메일 제목" value={subject} />
                <SummaryItem label="수신자 수" value={`${actualSendCount}명`} />
                <SummaryItem
                  label="카테고리"
                  value={selectedCategories.size > 0 ? Array.from(selectedCategories).join(", ") : "전체"}
                />
                <SummaryItem
                  label="지역"
                  value={selectedRegions.size > 0 ? Array.from(selectedRegions).join(", ") : "전체"}
                />
                <SummaryItem label="발송 시점" value={sendNow ? "즉시 발송" : scheduledDate ? `${format(scheduledDate, "yyyy.MM.dd", { locale: ko })} ${scheduledTime}` : "미정"} />
                <SummaryItem label="하루 최대" value={`${maxPerDay[0]}통`} />
                <SummaryItem label="발송 간격" value={INTERVALS.find((iv) => iv.value === interval)?.label ?? ""} />
                <SummaryItem label="시퀀스" value={useSequence ? `${sequences.length}단계` : "미사용"} />
              </div>

              <div className="flex justify-end pt-4">
                <Button size="lg" onClick={handleSubmit} className="gap-2">
                  <Send className="h-4 w-4" />
                  {sendNow ? "캠페인 발송하기" : "캠페인 예약하기"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Navigation */}
      {currentStep < 4 && (
        <div className="flex items-center justify-between mt-8 pb-8">
          <Button
            variant="outline"
            onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />이전
          </Button>
          <div className="text-sm text-muted-foreground">
            {currentStep + 1} / {steps.length}
          </div>
          <Button
            onClick={() => setCurrentStep((s) => s + 1)}
            disabled={!canProceed()}
          >
            {currentStep === 3 ? "최종 확인" : "다음"}<ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}

      {currentStep === 4 && (
        <div className="flex items-center justify-start mt-8 pb-8">
          <Button variant="outline" onClick={() => setCurrentStep(3)}>
            <ArrowLeft className="h-4 w-4 mr-2" />이전으로
          </Button>
        </div>
      )}
    </div>
  );
};

const SummaryItem = ({ label, value }: { label: string; value: string }) => (
  <div className="p-3 rounded-lg border bg-muted/30">
    <p className="text-xs text-muted-foreground mb-1">{label}</p>
    <p className="text-sm font-medium truncate">{value}</p>
  </div>
);


export default CampaignCreate;
