import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const PrivacyPage = () => {
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
        <h1 className="text-3xl font-bold mb-2">개인정보처리방침</h1>
        <p className="text-sm text-muted-foreground mb-10">최종 수정일: 2026년 1월 1일</p>

        <div className="space-y-10 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. 수집하는 개인정보 항목</h2>
            <p className="mb-2">Coldly(이하 "회사")는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다.</p>
            <table className="w-full border-collapse border border-border mt-2">
              <thead>
                <tr className="bg-muted/50">
                  <th className="border border-border px-4 py-2 text-left font-medium">구분</th>
                  <th className="border border-border px-4 py-2 text-left font-medium">수집 항목</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-border px-4 py-2 font-medium">필수</td>
                  <td className="border border-border px-4 py-2">이름, 이메일 주소, 비밀번호(암호화 저장), 회사명</td>
                </tr>
                <tr>
                  <td className="border border-border px-4 py-2 font-medium">결제</td>
                  <td className="border border-border px-4 py-2">결제 수단 정보(카드번호 일부, 결제 일시, 결제 금액)</td>
                </tr>
                <tr>
                  <td className="border border-border px-4 py-2 font-medium">자동 수집</td>
                  <td className="border border-border px-4 py-2">IP 주소, 접속 로그, 브라우저 정보, 서비스 이용 기록</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. 개인정보의 이용 목적</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>서비스 제공:</strong> 회원 인증, 계정 관리, 이메일 캠페인 발송, 성과 분석 리포트 제공</li>
              <li><strong>결제 처리:</strong> 유료 서비스 구독 결제, 환불 처리, 결제 내역 관리</li>
              <li><strong>고객 지원:</strong> 문의 응대, 서비스 장애 안내, 공지사항 전달</li>
              <li><strong>서비스 개선:</strong> 이용 통계 분석, 서비스 품질 향상, 신규 기능 개발</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. 개인정보의 보유 및 파기</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>회원 탈퇴 시 개인정보는 <strong>즉시 파기</strong>합니다.</li>
              <li>단, 관련 법령에 따라 다음 정보는 일정 기간 보관합니다:
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li><strong>결제 및 대금 결제 기록:</strong> 5년 보관 (전자상거래법)</li>
                  <li><strong>계약 또는 청약 철회 기록:</strong> 5년 보관 (전자상거래법)</li>
                  <li><strong>소비자 불만·분쟁 처리 기록:</strong> 3년 보관 (전자상거래법)</li>
                  <li><strong>로그인 기록:</strong> 3개월 보관 (통신비밀보호법)</li>
                </ul>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. 개인정보의 제3자 제공</h2>
            <p className="mb-2">회사는 원칙적으로 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 단, 서비스 운영을 위해 다음과 같이 처리를 위탁하고 있습니다.</p>
            <table className="w-full border-collapse border border-border mt-2">
              <thead>
                <tr className="bg-muted/50">
                  <th className="border border-border px-4 py-2 text-left font-medium">위탁 업체</th>
                  <th className="border border-border px-4 py-2 text-left font-medium">위탁 업무</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-border px-4 py-2">토스페이먼츠</td>
                  <td className="border border-border px-4 py-2">결제 처리 및 정산</td>
                </tr>
                <tr>
                  <td className="border border-border px-4 py-2">AWS (Amazon Web Services)</td>
                  <td className="border border-border px-4 py-2">서버 운영 및 데이터 저장</td>
                </tr>
                <tr>
                  <td className="border border-border px-4 py-2">Resend</td>
                  <td className="border border-border px-4 py-2">이메일 캠페인 발송 처리</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. 이용자의 권리</h2>
            <p className="mb-2">이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>개인정보 열람, 정정, 삭제, 처리 정지 요구</li>
              <li>서비스 내 설정 페이지에서 직접 수정 가능</li>
              <li>고객센터(아래 이메일)를 통한 요청 가능</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. 개인정보의 안전성 확보 조치</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>비밀번호 암호화 저장 (bcrypt)</li>
              <li>SSL/TLS를 통한 데이터 전송 암호화</li>
              <li>접근 권한 관리 및 접근 통제 (Row Level Security)</li>
              <li>정기적인 보안 점검 및 취약점 진단</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. 개인정보보호 책임자</h2>
            <p className="mb-3">개인정보 처리에 관한 불만, 문의, 열람·정정·삭제 요청은 아래 담당자에게 연락해 주시기 바랍니다.</p>
            <div className="border border-border rounded-lg p-4 bg-muted/30">
              <p className="font-medium mb-1">개인정보보호 책임자</p>
              <ul className="space-y-1">
                <li>담당부서: 개인정보보호팀</li>
                <li>이메일: <a href="mailto:privacy@coldly.kr" className="text-primary hover:underline">privacy@coldly.kr</a></li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. 개인정보처리방침의 변경</h2>
            <p>본 방침은 시행일로부터 적용되며, 법령·정책 또는 보안 기술의 변경에 따라 내용의 추가·삭제 및 수정이 있을 경우 변경사항 시행 7일 전부터 서비스 내 공지를 통하여 고지합니다.</p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPage;
