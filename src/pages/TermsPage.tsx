import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
        <div className="max-w-[800px] mx-auto px-6 h-16 flex items-center gap-4">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">홈으로</span>
          </Link>
          <Link to="/" className="text-xl font-bold text-primary tracking-tight">Coldly</Link>
        </div>
      </header>
      <main className="max-w-[800px] mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-2">이용약관</h1>
        <p className="text-sm text-muted-foreground mb-10">최종 수정일: 2026년 1월 1일</p>

        <div className="space-y-10 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold mb-3">제1조 (목적)</h2>
            <p>본 약관은 Coldly(이하 "회사")가 제공하는 한국 B2B 이메일 마케팅 자동화 SaaS 서비스(이하 "서비스")의 이용에 관한 조건 및 절차, 회사와 이용자 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">제2조 (서비스 내용)</h2>
            <p className="mb-2">회사는 다음과 같은 한국 B2B 이메일 마케팅 자동화 SaaS 서비스를 제공합니다.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>업종별·지역별 기업 데이터베이스 검색 및 연락처 관리</li>
              <li>콜드메일 캠페인 생성 및 자동 발송</li>
              <li>시퀀스 메일(후속 메일) 자동화</li>
              <li>이메일 오픈·응답 등 성과 추적 및 분석</li>
              <li>이메일 워밍업 기능</li>
              <li>발송 도메인 관리</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">제3조 (요금 및 결제)</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>요금제:</strong> 서비스는 다음 3가지 월간 구독 요금제로 운영됩니다.
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li><strong>Starter:</strong> 월 ₩29,000 (월 1,000건 발송, 기본 기능)</li>
                  <li><strong>Growth:</strong> 월 ₩69,000 (월 5,000건 발송, 시퀀스 메일, 성과 분석)</li>
                  <li><strong>Scale:</strong> 월 ₩149,000 (월 20,000건 발송, 전체 기능, 우선 지원)</li>
                </ul>
              </li>
              <li><strong>결제 방식:</strong> 월 자동결제 방식으로, 토스페이먼츠를 통해 신용카드 및 계좌이체로 결제할 수 있습니다.</li>
              <li><strong>자동 갱신:</strong> 구독은 매월 자동으로 갱신되며, 갱신일 전에 해지하지 않으면 동일 요금이 자동 청구됩니다.</li>
              <li><strong>요금 변경:</strong> 회사는 요금을 변경할 수 있으며, 변경 시 최소 30일 전에 공지합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">제4조 (환불 정책)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>결제일로부터 <strong>7일 이내</strong>에 서비스를 이용하지 않은 경우 <strong>전액 환불</strong>이 가능합니다.</li>
              <li>결제일로부터 7일이 경과하였거나, 서비스를 이용한 경우(캠페인 발송, 연락처 조회 등) <strong>환불이 불가</strong>합니다.</li>
              <li>환불 요청은 서비스 내 설정 페이지 또는 고객센터(support@coldly.kr)를 통해 가능합니다.</li>
              <li>환불 처리는 요청일로부터 영업일 기준 3~5일 이내에 완료됩니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">제5조 (서비스 이용 제한)</h2>
            <p className="mb-2">이용자는 다음 행위를 하여서는 안 되며, 위반 시 사전 통보 없이 서비스 이용이 제한되거나 계정이 삭제될 수 있습니다.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>스팸 발송:</strong> 수신자의 동의 없이 대량 이메일을 발송하는 행위</li>
              <li><strong>불법 수집 데이터 사용:</strong> 불법적으로 수집된 이메일 주소, 개인정보를 업로드하거나 사용하는 행위</li>
              <li>피싱, 사기, 악성코드 배포 등 불법적인 목적으로 서비스를 이용하는 행위</li>
              <li>서비스의 안정적 운영을 방해하는 행위 (과도한 API 호출, 시스템 공격 등)</li>
              <li>타인의 계정을 무단으로 사용하거나 공유하는 행위</li>
              <li>관련 법령(개인정보보호법, 정보통신망법 등)을 위반하는 행위</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">제6조 (면책 조항)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력적 사유로 서비스를 제공할 수 없는 경우 책임이 면제됩니다.</li>
              <li>회사는 이용자의 귀책 사유(스팸 발송, 계정 정보 유출 등)로 인한 서비스 이용 장애에 대해 책임을 지지 않습니다.</li>
              <li>회사는 이용자가 서비스를 통해 발송한 이메일의 내용, 수신률, 응답률 등에 대해 보증하지 않습니다.</li>
              <li>서비스를 통해 발생하는 이용자와 수신자 간의 분쟁에 대해 회사는 개입하지 않으며 책임을 지지 않습니다.</li>
              <li>본 약관과 관련된 분쟁은 대한민국 법률에 따라 해결하며, 관할 법원은 회사의 본점 소재지를 관할하는 법원으로 합니다.</li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
};

export default TermsPage;
