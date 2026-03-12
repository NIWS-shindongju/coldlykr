const TermsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center">
          <a href="/" className="text-xl font-bold text-primary tracking-tight">Coldly</a>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-8">이용약관</h1>
        <p className="text-sm text-muted-foreground mb-8">최종 수정일: 2025년 1월 1일</p>

        <div className="space-y-8 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold mb-3">제1조 (목적)</h2>
            <p>본 약관은 Coldly(이하 "회사")가 제공하는 이메일 마케팅 SaaS 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">제2조 (정의)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>"서비스"란 회사가 제공하는 콜드메일 자동 발송, 연락처 관리, 캠페인 관리, 성과 분석 등 일체의 온라인 서비스를 말합니다.</li>
              <li>"이용자"란 본 약관에 따라 회사가 제공하는 서비스를 이용하는 자를 말합니다.</li>
              <li>"유료 서비스"란 회사가 유료로 제공하는 각종 서비스 및 제반 부가 서비스를 말합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">제3조 (약관의 효력 및 변경)</h2>
            <p>본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다. 회사는 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있으며, 변경된 약관은 공지 후 7일이 경과한 날부터 효력이 발생합니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">제4조 (서비스의 제공 및 변경)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>회사는 이용자에게 콜드메일 자동 발송, 기업 데이터베이스 검색, 캠페인 관리, 이메일 워밍업, 성과 추적 등의 서비스를 제공합니다.</li>
              <li>회사는 서비스의 내용, 이용 방법, 이용 시간을 변경할 수 있으며, 변경 시 사전에 공지합니다.</li>
              <li>회사는 시스템 점검, 장비 교체, 천재지변 등 불가피한 사유로 서비스 제공이 일시 중단될 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">제5조 (이용 계약의 체결)</h2>
            <p>이용 계약은 이용자가 약관의 내용에 동의한 후 회원가입 신청을 하고, 회사가 이를 승낙함으로써 체결됩니다. 회사는 다음 각 호에 해당하는 경우 가입 승낙을 거부하거나 사후에 이용 계약을 해지할 수 있습니다.</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>실명이 아니거나 타인의 정보를 이용한 경우</li>
              <li>허위 정보를 기재하거나, 필수 정보를 제공하지 않은 경우</li>
              <li>관련 법령에 위반되거나, 사회의 안녕 및 질서를 저해할 목적으로 신청한 경우</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">제6조 (결제 및 요금)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>유료 서비스의 요금은 서비스 내 요금제 페이지에 게시된 금액을 따릅니다.</li>
              <li>결제는 신용카드, 계좌이체 등 회사가 지원하는 결제 수단으로 가능합니다.</li>
              <li>유료 서비스는 월 단위 구독 방식으로 운영되며, 구독 기간 만료 시 자동 갱신됩니다.</li>
              <li>이용자는 구독 갱신일 전까지 구독 해지를 요청할 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">제7조 (환불 정책)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>결제일로부터 7일 이내에 서비스를 이용하지 않은 경우 전액 환불이 가능합니다.</li>
              <li>서비스 이용 후에는 이용 일수를 제외한 잔여 기간에 대해 일할 계산하여 환불합니다.</li>
              <li>무료 체험 기간 중에는 별도의 환불 사유가 발생하지 않습니다.</li>
              <li>환불 요청은 서비스 내 설정 페이지 또는 고객센터를 통해 가능합니다.</li>
              <li>환불 처리는 요청일로부터 영업일 기준 3~5일 이내에 완료됩니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">제8조 (이용자의 의무)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>이용자는 관계 법령, 본 약관의 규정, 이용 안내 등을 준수하여야 합니다.</li>
              <li>이용자는 서비스를 이용하여 스팸 메일 발송, 불법 광고 등 법령에 위반되는 행위를 하여서는 안 됩니다.</li>
              <li>이용자는 타인의 개인정보를 무단으로 수집하거나 이용하여서는 안 됩니다.</li>
              <li>이용자는 서비스의 안정적 운영을 방해하는 행위를 하여서는 안 됩니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">제9조 (면책 조항)</h2>
            <p>회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력적 사유로 서비스를 제공할 수 없는 경우 책임이 면제됩니다. 회사는 이용자의 귀책 사유로 인한 서비스 이용 장애에 대해 책임을 지지 않습니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">제10조 (분쟁 해결)</h2>
            <p>본 약관과 관련된 분쟁은 대한민국 법률에 따라 해결하며, 관할 법원은 회사의 본점 소재지를 관할하는 법원으로 합니다.</p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default TermsPage;
