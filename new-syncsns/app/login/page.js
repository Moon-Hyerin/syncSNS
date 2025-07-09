'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/supabase';


export default function LoginPage() {
  // 상태 관리 - 폼 데이터 및 UI 상태
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [uiState, setUiState] = useState({
    isLoading: false,
    error: ''
  });
  
  const router = useRouter();

  // 입력값 변경 핸들러
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 폼 제출 핸들러
  const handleSubmit = async (e) => {
    e.preventDefault();
    setUiState({ isLoading: true, error: '' });

    try {
      const { data, error } = await auth.signIn(formData.email, formData.password);
      
      if (error) {
        setUiState({ 
          isLoading: false, 
          error: '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.' 
        });
        return;
      }

      // 로그인 성공 시 대시보드로 이동
      router.push('/dashboard');
    } catch (err) {
      setUiState({ 
        isLoading: false, 
        error: '로그인 중 오류가 발생했습니다.' 
      });
      console.error('로그인 오류:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* 헤더 섹션 */}
        <div>
          <Link href="/" className="flex justify-center">
            <h1 className="text-2xl font-bold text-blue-600">SYNC SNS</h1>
          </Link>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            로그인
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            또는{' '}
            <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500">
              새 계정 만들기
            </Link>
          </p>
        </div>
        
        {/* 로그인 폼 */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* 에러 메시지 표시 */}
          {uiState.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {uiState.error}
            </div>
          )}
          
          <div className="space-y-4">
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
                value={formData.email}
                onChange={handleInputChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="이메일을 입력하세요"
              />
            </div>
            
            {/* 비밀번호 입력 필드 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="비밀번호를 입력하세요"
              />
            </div>
          </div>

          {/* 비밀번호 찾기 링크 */}
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link href="/forgotPassword" className="font-medium text-blue-600 hover:text-blue-500">
                비밀번호를 잊으셨나요?
              </Link>
            </div>
          </div>

          {/* 로그인 버튼 */}
          <div>
            <button
              type="submit"
              disabled={uiState.isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uiState.isLoading ? '로그인 중...' : '로그인'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 