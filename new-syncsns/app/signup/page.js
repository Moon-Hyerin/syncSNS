'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/supabase';

export default function SignupPage() {
  // 상태 관리 - 폼 데이터 및 UI 상태
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [uiState, setUiState] = useState({
    isLoading: false,
    error: '',
    success: false
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

  // 폼 유효성 검사
  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setUiState(prev => ({ ...prev, error: '비밀번호가 일치하지 않습니다.' }));
      return false;
    }

    if (formData.password.length < 6) {
      setUiState(prev => ({ ...prev, error: '비밀번호는 최소 6자 이상이어야 합니다.' }));
      return false;
    }

    return true;
  };

  // 폼 제출 핸들러
  const handleSubmit = async (e) => {
    e.preventDefault();
    setUiState(prev => ({ ...prev, isLoading: true, error: '' }));

    // 유효성 검사
    if (!validateForm()) {
      setUiState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const { data, error } = await auth.signUp(formData.email, formData.password);
      
      if (error) {
        setUiState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: '회원가입에 실패했습니다. 다시 시도해주세요.' 
        }));
        return;
      }

      setUiState(prev => ({ ...prev, isLoading: false, success: true }));
      
      // 3초 후 로그인 페이지로 이동
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      setUiState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: '회원가입 중 오류가 발생했습니다.' 
      }));
      console.error('회원가입 오류:', err);
    }
  };

  // 성공 화면 렌더링
  if (uiState.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-md">
            <h3 className="font-semibold mb-2">회원가입이 완료되었습니다!</h3>
            <p>이메일을 확인하여 인증을 완료해주세요.</p>
            <p className="text-sm mt-2">3초 후 로그인 페이지로 이동합니다...</p>
          </div>
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
            회원가입
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            또는{' '}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              기존 계정으로 로그인
            </Link>
          </p>
        </div>
        
        {/* 회원가입 폼 */}
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
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="비밀번호를 입력하세요 (최소 6자)"
                minLength={6}
              />
            </div>

            {/* 비밀번호 확인 입력 필드 */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                비밀번호 확인
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="비밀번호를 다시 입력하세요"
                minLength={6}
              />
            </div>
          </div>

          {/* 회원가입 버튼 */}
          <div>
            <button
              type="submit"
              disabled={uiState.isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uiState.isLoading ? '가입 중...' : '회원가입'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 