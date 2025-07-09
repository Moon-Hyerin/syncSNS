'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import useAuthGuard from '@/app/lib/useAuthGuard';
import useSocialConnections from '@/app/lib/useSocialConnections';
import { getKoreanTimeISO, formatKoreanDate } from '@/lib/dateUtils';

export default function DashboardPage() {
  // 상태 관리
  const [userData, setUserData] = useState({
    user: null,
    recentPosts: []
  });
  
  const [uiState, setUiState] = useState({
    isLoading: true,
    error: ''
  });

  const router = useRouter();

  // 소셜 연동 상태 관리 훅 사용
  const {
    connections,
    isLoading: isLoadingConnections,
    error: connectionsError,
    getConnectedPlatforms
  } = useSocialConnections(userData.user?.id, {
    autoFetch: !!userData.user?.id
  });

  // 사용자 데이터 로드
  const loadUserData = async () => {
    try {
      setUiState(prev => ({ ...prev, isLoading: true }));
      
      // 임시 게시글 데이터
      const mockPosts = [
        {
          id: 1,
          content: '안녕하세요! 첫 번째 게시물입니다.',
          platforms: ['Instagram'],
          status: 'published',
          createdAt: getKoreanTimeISO()
        }
      ];
      
      setUserData(prev => ({
        ...prev,
        recentPosts: mockPosts
      }));
      
    } catch (err) {
      console.error('사용자 데이터 로드 오류:', err);
      setUiState(prev => ({ ...prev, error: '데이터를 불러오는 중 오류가 발생했습니다.' }));
    } finally {
      setUiState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (err) {
      console.error('로그아웃 오류:', err);
    }
  };

  // 사용자 인증 확인 및 데이터 로드
  useAuthGuard(useCallback((user) => {
    setUserData(prev => ({ ...prev, user }));
    loadUserData();
  }, []));

  // 게시글 상태별 스타일 클래스 반환
  const getPostStatusClass = (status) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 게시글 상태별 텍스트 반환
  const getPostStatusText = (status) => {
    switch (status) {
      case 'published':
        return '발행됨';
      case 'scheduled':
        return '예약됨';
      default:
        return '임시저장';
    }
  };

  // 계정 상태별 스타일 클래스 반환
  const getAccountStatusClass = (status) => {
    return status === 'connected' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-gray-100 text-gray-800';
  };

  // 플랫폼 아이콘 반환
  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'instagram':
        return '📷';
      case 'twitter':
        return '🐦';
      case 'threads':
        return '🧵';
      case 'facebook':
        return '📘';
      default:
        return '📱';
    }
  };

  // 플랫폼 이름 반환
  const getPlatformName = (platform) => {
    switch (platform) {
      case 'instagram':
        return 'Instagram';
      case 'twitter':
        return 'Twitter';
      case 'threads':
        return 'Threads';
      case 'facebook':
        return 'Facebook';
      default:
        return platform;
    }
  };

  // 로딩 화면
  if (uiState.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">SYNC SNS 대시보드</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                환영합니다, {userData.user?.email}!
              </span>
              <button 
                onClick={handleLogout}
                className="text-sm text-red-600 hover:text-red-800"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 왼쪽 컬럼 - 빠른 액션 및 게시글 */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 빠른 액션 카드들 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link 
                href="/posts/createPost"
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center">
                  <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-xl">+</span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">즉시 발행</h3>
                    <p className="text-gray-600">지금 바로 콘텐츠를 작성하고 발행하세요</p>
                  </div>
                </div>
              </Link>

              <Link 
                href="/connections/instagram"
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center">
                  <div className="h-12 w-12 bg-pink-100 rounded-full flex items-center justify-center">
                    <span className="text-pink-600 font-bold text-xl">📷</span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">Instagram 연동</h3>
                    <p className="text-gray-600">인스타그램 계정을 연결하고 관리하세요</p>
                  </div>
                </div>
              </Link>
            </div>

            {/* 최근 게시글 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">최근 게시글</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {userData.recentPosts.length > 0 ? (
                  userData.recentPosts.map((post) => (
                    <div key={post.id} className="px-6 py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-gray-900 mb-2">{post.content}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>
                              플랫폼: {post.platforms.length > 0 ? post.platforms.join(', ') : '없음'}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs ${getPostStatusClass(post.status)}`}>
                              {getPostStatusText(post.status)}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatKoreanDate(post.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-8 text-center text-gray-500">
                    아직 작성된 게시글이 없습니다.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 오른쪽 컬럼 - 사이드바 */}
          <div className="space-y-6">
            
            {/* 연결된 계정 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">연결된 계정</h2>
              </div>
              <div className="p-6 space-y-4">
                {/* 연동 상태 로딩 중 */}
                {isLoadingConnections ? (
                  <div className="text-center py-4">
                    <div className="animate-pulse text-gray-500">
                      연동 계정을 확인하는 중...
                    </div>
                  </div>
                ) : connectionsError ? (
                  <div className="text-center py-4 text-red-600">
                    <p className="text-sm">{connectionsError}</p>
                  </div>
                ) : connections.length > 0 ? (
                  connections.map((account) => (
                    <div key={account.id} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          {getPlatformIcon(account.platform)}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {getPlatformName(account.platform)}
                          </p>
                          <p className="text-xs text-gray-500">
                            @{account.username}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${getAccountStatusClass('connected')}`}>
                        연결됨
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <p className="text-sm">연결된 계정이 없습니다.</p>
                    <Link 
                      href="/connections/instagram"
                      className="text-blue-600 hover:text-blue-700 text-sm mt-2 inline-block"
                    >
                      Instagram 연동하기
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* 통계 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">이번 달 통계</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">총 게시글</span>
                  <span className="font-semibold">{userData.recentPosts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">즉시 발행</span>
                  <span className="font-semibold">
                    {userData.recentPosts.filter(p => p.status === 'published').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">연결된 계정</span>
                  <span className="font-semibold">
                    {connections.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 