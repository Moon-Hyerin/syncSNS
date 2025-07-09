'use client';

import { useState } from 'react';
import Link from 'next/link';
import { auth } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
  // 상태 관리 - 폼 데이터 및 UI 상태
  const [email, setEmail] = useState('');
  const [uiState, setUiState] = useState({
    isLoading: false,
    success: false,
    error: ''
  });
  const router = useRouter();

  // 폼 제출 핸들러
  const handleSubmit = async (e) => {
    e.preventDefault();
    setUiState({ isLoading: true, error: '', success: false });

    try {
      const { data, error } = await auth.resetPassword(email);
      
      if (error) {
        setUiState({ 
          isLoading: false, 
          success: false, 
          error: '이메일 발송에 실패했습니다. 이메일 주소를 확인해주세요.' 
        });
        return;
      }

      setUiState({ isLoading: false, success: true, error: '' });

      // 성공 시 로그인 페이지로 이동
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      setUiState({ 
        isLoading: false, 
        success: false, 
        error: '이메일 발송 중 오류가 발생했습니다.' 
      });
      console.error('비밀번호 재설정 오류:', err);
    }
  };

  // 성공 화면 렌더링
  if (uiState.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-md">
            <h3 className="font-semibold mb-2">비밀번호 재설정 이메일을 보냈습니다!</h3>
            <p>이메일을 확인하여 비밀번호를 재설정해주세요.</p>
            <p className="text-sm mt-2">3초 후 로그인 페이지로 이동합니다...</p>
          </div>
          {/* 로그인 페이지 링크 - 현재 디렉토리 구조에 맞게 수정 */}
          <Link 
            href="/login" 
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            바로 로그인하기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* 헤더 섹션 */}
        <div>
          <Link href="/" className="flex justify-center">
            <h1 className="text-2xl font-bold text-blue-600">SYNC SNS</h1>
          </Link>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            비밀번호 찾기
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            가입한 이메일 주소를 입력하시면 비밀번호 재설정 링크를 발송해드립니다.
          </p>
        </div>
        
        {/* 비밀번호 재설정 폼 */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* 에러 메시지 표시 */}
          {uiState.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {uiState.error}
            </div>
          )}
          
          {/* 이메일 입력 필드 */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              이메일 주소
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="이메일을 입력하세요"
            />
          </div>

          {/* 이메일 발송 버튼 */}
          <div>
            <button
              type="submit"
              disabled={uiState.isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uiState.isLoading ? '발송 중...' : '비밀번호 재설정 이메일 발송'}
            </button>
          </div>

          {/* 로그인 페이지 링크 */}
          <div className="text-center">
            <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
              로그인 페이지로 돌아가기
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
} 