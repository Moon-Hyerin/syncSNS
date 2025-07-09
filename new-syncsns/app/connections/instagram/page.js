'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/supabase';
import useAuthGuard from '@/app/lib/useAuthGuard';
import useSocialConnections from '@/app/lib/useSocialConnections';
import InstagramConnectModal from './InstagramConnectModal';

export default function InstagramConnectPage() {
  // 상태 관리
  const [userData, setUserData] = useState({
    user: null
  });
  const [connectionState, setConnectionState] = useState({
    isConnecting: false,
    error: '',
    successMessage: ''
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  // 소셜 연동 상태 관리 훅 사용 (인스타그램만)
  const {
    isLoading: isLoadingConnection,
    error: connectionsError,
    getConnection,
    isConnected,
    refreshConnections,
    addConnection
  } = useSocialConnections(userData.user?.id, {
    platform: 'instagram',
    autoFetch: !!userData.user?.id
  });

  // 인스타그램 연동 정보 가져오기
  const instagramConnection = getConnection('instagram');
  const isInstagramConnected = isConnected('instagram');

  // 연동 상태 객체 생성
  const connectionStatus = {
    status: isInstagramConnected ? 'connected' : 'disconnected',
    connectedAccount: instagramConnection ? {
      id: instagramConnection.platform_user_id,
      username: instagramConnection.username,
      display_name: instagramConnection.display_name,
      profile_picture_url: instagramConnection.profile_picture_url,
      followers_count: 0, // 실시간 데이터는 별도 구현 필요
      media_count: 0
    } : null
  };

  // 사용자 인증 확인 - useAuthGuard 커스텀 훅 사용
  useAuthGuard(useCallback((user) => {
    setUserData({ user });
  }, []));

  // URL 파라미터에서 성공/실패 메시지 확인
  useEffect(() => {
    const error = searchParams.get('error');
    const success = searchParams.get('success');

    if (error) {
      let errorMessage = '';
      switch (error) {
        case 'access_denied':
          errorMessage = '사용자가 Instagram 연동을 거부했습니다.';
          break;
        case 'no_code':
          errorMessage = 'Instagram에서 인증 코드를 받지 못했습니다.';
          break;
        case 'token_exchange_failed':
          errorMessage = 'Instagram 토큰 교환에 실패했습니다.';
          break;
        default:
          errorMessage = 'Instagram 연동 중 오류가 발생했습니다.';
      }
      setConnectionState(prev => ({
        ...prev,
        error: errorMessage,
        isConnecting: false
      }));
    } else if (success) {
      setConnectionState(prev => ({
        ...prev,
        successMessage: 'Instagram 계정이 성공적으로 연결되었습니다!',
        isConnecting: false
      }));
    }

    // URL 파라미터 정리
    if (error || success) {
      router.replace('/connections/instagram');
    }
  }, [searchParams, router]);

  // Instagram 연동 팝업 열기
  const handleInstagramConnect = () => {
    setIsModalOpen(true);
  };

  // 팝업에서 연동 완료 시 호출될 콜백
  const handleConnectionSuccess = (accountData) => {
    // 훅을 통해 연동 정보 추가
    addConnection(accountData);
    
    setConnectionState(prev => ({
      ...prev,
      successMessage: 'Instagram 계정이 성공적으로 연결되었습니다!'
    }));
    setIsModalOpen(false);
    
    // 연동 완료 후 다시 연동 상태 확인 (DB에서 최신 정보 가져오기)
    setTimeout(() => {
      refreshConnections();
    }, 1000);
  };

  // 팝업에서 연동 해제 시 호출될 콜백
  const handleDisconnectionSuccess = () => {
    console.log('Instagram 연동 해제 완료');
    
    setConnectionState(prev => ({
      ...prev,
      successMessage: 'Instagram 연동이 해제되었습니다.',
      error: ''
    }));
    setIsModalOpen(false);
    
    // 연동 해제 후 상태 새로고침
    setTimeout(() => {
      refreshConnections();
    }, 1000);
  };

  // Instagram 연동 해제 - 직접 처리
  const handleDisconnect = async () => {
    if (!userData.user || !instagramConnection) {
      alert('연동 정보를 찾을 수 없습니다.');
      return;
    }

    if (!confirm('정말로 Instagram 연동을 해제하시겠습니까?')) {
      return;
    }

    try {
      // 현재 세션 가져오기 (Authorization 헤더용)
      const { data: { session }, error: sessionError } = await auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('사용자 인증이 만료되었습니다. 다시 로그인해주세요.');
      }

      const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      // 공통 로직에서 가져온 연동 정보의 ID 사용
      const connectionId = instagramConnection.id;
      console.log('연동 해제할 계정 ID:', connectionId);

      if (!connectionId) {
        throw new Error('연동 계정 ID를 찾을 수 없습니다.');
      }

      // 연동 해제 API 호출
      const response = await fetch(`/api/social/connections/${connectionId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });

      console.log('연동 해제 응답 상태:', response.status);

      if (response.ok) {
        setConnectionState(prev => ({ 
          ...prev, 
          successMessage: 'Instagram 연동이 해제되었습니다.',
          error: ''
        }));
        
        // 연동 상태 새로고침
        refreshConnections();
        
        console.log('Instagram 연동 해제 완료');
      } else {
        const responseContentType = response.headers.get('content-type');
        const responseIsJson = responseContentType && responseContentType.includes('application/json');
        
        let errorMessage = '연동 해제에 실패했습니다.';
        
        if (responseIsJson) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (jsonError) {
            console.error('오류 응답 JSON 파싱 오류:', jsonError);
            errorMessage = `서버 오류 (${response.status}): ${response.statusText}`;
          }
        } else {
          errorMessage = `서버 오류 (${response.status}): ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }
    } catch (err) {
      setConnectionState(prev => ({ 
        ...prev, 
        error: err.message || '연동 해제 중 오류가 발생했습니다.' 
      }));
      console.error('연동 해제 오류:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                ← 대시보드로 돌아가기
              </Link>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Instagram 연동</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {userData.user?.email}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          
          {/* Instagram 연동 헤더 */}
          <div className="px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <span className="text-2xl">📷</span>
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-semibold">Instagram 계정 연동</h2>
                <p className="text-purple-100">Instagram 비즈니스 계정을 연결하여 게시글을 관리하세요</p>
              </div>
            </div>
          </div>

          {/* 연동 상태 및 액션 */}
          <div className="p-6">
            {/* 성공 메시지 표시 */}
            {connectionState.successMessage && (
              <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
                {connectionState.successMessage}
              </div>
            )}

            {/* 에러 메시지 표시 */}
            {(connectionState.error || connectionsError) && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {connectionState.error || connectionsError}
              </div>
            )}

            {/* 로딩 상태 */}
            {isLoadingConnection ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <span className="text-3xl text-gray-400">📷</span>
                </div>
                <p className="text-gray-600">연동 상태를 확인하는 중...</p>
              </div>
            ) : connectionStatus.status === 'disconnected' ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl text-gray-400">📷</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Instagram 계정이 연결되지 않았습니다
                </h3>
                <p className="text-gray-600 mb-6">
                  Instagram 비즈니스 계정을 연결하여 콘텐츠를 관리하고 발행하세요
                </p>
                
                {/* 연동 요구사항 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                  <h4 className="font-semibold text-blue-900 mb-2">연동 요구사항:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Instagram 비즈니스 계정 (개인 계정은 지원되지 않음)</li>
                    <li>• Facebook 페이지와 연결된 Instagram 계정</li>
                    <li>• 계정 관리 권한</li>
                  </ul>
                </div>

                <button
                  onClick={handleInstagramConnect}
                  disabled={isModalOpen}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isModalOpen ? 'Instagram 연동 중...' : 'Instagram 계정 연결'}
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl text-green-600">✓</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Instagram 계정이 연결되었습니다
                </h3>
                
                {/* 연동된 계정 정보 표시 */}
                {connectionStatus.connectedAccount && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-6 max-w-sm mx-auto">
                    <div className="flex items-center space-x-3">
                      <img 
                        src={connectionStatus.connectedAccount.profile_picture_url} 
                        alt="프로필 사진"
                        className="w-12 h-12 rounded-full"
                      />
                      <div className="text-left">
                        <p className="font-semibold text-gray-900">
                          @{connectionStatus.connectedAccount.username}
                        </p>
                        <p className="text-sm text-gray-600">
                          팔로워 {connectionStatus.connectedAccount.followers_count?.toLocaleString() || 0}명 • 
                          게시물 {connectionStatus.connectedAccount.media_count || 0}개
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <p className="text-gray-600 mb-6">
                  이제 Instagram에 콘텐츠를 발행할 수 있습니다
                </p>
                
                <div className="flex justify-center space-x-4">
                  <Link 
                    href="/posts/createPost"
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
                  >
                    게시글 작성하기
                  </Link>
                  <button
                    onClick={handleDisconnect}
                    className="bg-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700"
                  >
                    연동 해제
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Instagram API 정보 */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-2">Instagram Graph API 기능:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 콘텐츠 발행 (사진, 비디오, 캐러셀)</li>
              <li>• 댓글 관리 및 답글</li>
              <li>• 미디어 인사이트 조회</li>
              <li>• 멘션 알림</li>
            </ul>
            <p className="text-xs text-gray-500 mt-2">
              * 무료 API 사용으로 일부 기능에 제한이 있을 수 있습니다.
            </p>
          </div>
        </div>
      </main>

      {/* Instagram 연동 팝업 */}
              <InstagramConnectModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)}
          onConnected={handleConnectionSuccess}
          onDisconnected={handleDisconnectionSuccess}
          instagramConnection={instagramConnection}
        />
    </div>
  );
} 