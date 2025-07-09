import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">SYNC SNS</h1>
            </div>
            <nav className="flex space-x-4">
              <Link 
                href="/login" 
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                로그인
              </Link>
              <Link 
                href="/signup" 
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
              >
                회원가입
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              여러 SNS를 한 번에 관리하세요
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              인스타그램, 트위터 등 다양한 SNS 플랫폼에 동시에 콘텐츠를 발행하고 관리할 수 있습니다.
            </p>
            <div className="flex justify-center space-x-4">
              <Link 
                href="/signup" 
                className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors"
              >
                무료로 시작하기
              </Link>
              <Link 
                href="#" 
                className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg text-lg font-medium hover:bg-gray-50 transition-colors"
              >
                기능 살펴보기
              </Link>
            </div>
          </div>

          {/* 주요 기능 소개 */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">+</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">즉시 발행</h3>
              <p className="text-gray-600">한 번의 작성으로 여러 SNS에 동시에 콘텐츠를 발행하세요</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📅</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">예약 발행</h3>
              <p className="text-gray-600">원하는 시간에 자동으로 콘텐츠가 발행되도록 예약하세요</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI 가공</h3>
              <p className="text-gray-600">LLM을 활용해 각 SNS에 최적화된 콘텐츠로 자동 변환</p>
            </div>
          </div>

          {/* Instagram 연동 안내 */}
          <div className="mt-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-8 text-white text-center">
            <h3 className="text-2xl font-bold mb-4">Instagram 연동 지원</h3>
            <p className="text-lg mb-6">
              Instagram Business API를 통해 안전하고 공식적으로 계정을 연동하세요
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>📷 콘텐츠 발행</div>
              <div>💬 댓글 관리</div>
              <div>📊 인사이트 조회</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
