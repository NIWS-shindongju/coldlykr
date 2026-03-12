const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center">
          <a href="/" className="text-xl font-bold text-primary tracking-tight">Coldly</a>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-8">개인정보처리방침</h1>
        <p className="text-sm text-muted-foreground mb-8">최종 수정일: 2025년 1월 1일</p>

        <div className="space-y-8 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. 개인정보의 수집 항목</h2>
            <p className="mb-2">Coldly(이하 "회사")는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다.</p>
            <h3 className="font-medium mb-1 mt-3">필수 수집 항목</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>이메일 주소</li>
              <li>비밀번호 (암호화 저장)</li>
              <li>이름 (또는 닉네임)</li>
              <li>회사명</li>
            </ul>
            <h3 className="font-medium mb-1 mt-3">선택 수집 항목</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>전화번호</li>
              <li>사업자등록번호 (세금계산서 발행 시)</li>
            </ul>
            <h3 className="font-medium mb-1 mt-3">자동 수집 항목</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>IP 주소, 접속 로그, 쿠키, 브라우저 정보</li>
              <li>서비스 이용 기록 (캠페인 발송 이력, 접속 일시 등)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. 개인정보의 이용 목적</h2>
            <p className="mb-2">수집된 개인정보는 다음의 목적을 위해 이용됩니다.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>서비스 제공 및 운영:</strong> 회원 인증, 계정 관리, 이메일 캠페인 발송, 성과 분석 리포트 제공</li>
              <li><strong>결제 및 요금 처리:</strong> 유료 서비스 결제, 환불 처리, 세금계산서 발행</li>
              <li><strong>고객 지원:</strong> 문의 응대, 서비스 이용 안내, 공지사항 전달</li>
              <li><strong>서비스 개선:</strong> 이용 통계 분석, 서비스 품질 향상, 신규 기능 개발</li>
              <li><strong>법적 의무 이행:</strong> 관련 법령에 따른 의무 준수, 분쟁 해결</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. 개인정보의 보유 및 이용 기간</h2>
            <p className="mb-2">회사는 개인정보 수집·이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 관련 법령에 의해 보존이 필요한 경우 해당 기간 동안 보관합니다.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>계약 또는 청약 철회에 관한 기록:</strong> 5년 (전자상거래법)</li>
              <li><strong>대금 결제 및 재화 등의 공급에 관한 기록:</strong> 5년 (전자상거래법)</li>
              <li><strong>소비자 불만 또는 분쟁 처리에 관한 기록:</strong> 3년 (전자상거래법)</li>
              <li><strong>로그인 기록:</strong> 3개월 (통신비밀보호법)</li>
              <li><strong>회원 탈퇴 후 개인정보:</strong> 탈퇴 후 30일 이내 파기</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. 개인정보의 제3자 제공</h2>
            <p>회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우에는 예외로 합니다.</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>이용자가 사전에 동의한 경우</li>
              <li>법령에 의해 요구되는 경우</li>
              <li>서비스 제공을 위해 필요한 경우 (결제 처리 등), 최소한의 정보만 제공</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. 개인정보의 처리 위탁</h2>
            <p>회사는 서비스 운영을 위해 다음과 같이 개인정보 처리를 위탁하고 있습니다.</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>결제 처리:</strong> 토스페이먼츠 (결제 정보 처리)</li>
              <li><strong>클라우드 인프라:</strong> 서비스 운영 및 데이터 저장</li>
              <li><strong>이메일 발송:</strong> 이메일 캠페인 발송 처리</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. 이용자의 권리</h2>
            <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>개인정보 열람 요구</li>
              <li>오류 등이 있을 경우 정정 요구</li>
              <li>삭제 요구</li>
              <li>처리 정지 요구</li>
            </ul>
            <p className="mt-2">위 권리 행사는 서비스 내 설정 페이지 또는 고객센터를 통해 가능하며, 회사는 지체 없이 필요한 조치를 취합니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. 개인정보의 안전성 확보 조치</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>비밀번호 암호화 저장</li>
              <li>SSL/TLS를 통한 데이터 전송 암호화</li>
              <li>접근 권한 관리 및 접근 통제</li>
              <li>개인정보 취급 직원 최소화 및 교육</li>
              <li>정기적인 보안 점검</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. 쿠키의 사용</h2>
            <p>회사는 서비스 이용 편의를 위해 쿠키를 사용합니다. 이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 이 경우 일부 서비스 이용에 제한이 있을 수 있습니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. 개인정보 보호책임자</h2>
            <p>개인정보 처리에 관한 불만이나 문의는 아래 담당자에게 연락해 주시기 바랍니다.</p>
            <ul className="list-none pl-0 space-y-1 mt-2">
              <li>담당부서: 개인정보보호팀</li>
              <li>이메일: privacy@coldly.kr</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. 개인정보처리방침의 변경</h2>
            <p>본 방침은 시행일로부터 적용되며, 법령·정책 또는 보안 기술의 변경에 따라 내용의 추가·삭제 및 수정이 있을 경우 변경사항 시행 7일 전부터 서비스 내 공지를 통하여 고지합니다.</p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPage;
