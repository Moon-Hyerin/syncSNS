'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function InstagramConnectModal({ isOpen, onClose, onConnected, onDisconnected, instagramConnection }) {
  // 상태 관리 - 부모에서 전달받은 연동 정보를 기반으로 초기화
  const [connectionState, setConnectionState] = useState({
    isConnecting: false,
    status: instagramConnection ? 'connected' : 'disconnected',
    error: '',
    successMessage: '',
    connectedAccount: instagramConnection ? {
      id: instagramConnection.platform_user_id,
      username: instagramConnection.username,
      display_name: instagramConnection.display_name,
      profile_picture_url: instagramConnection.profile_picture_url,
      followers_count: 0,
      media_count: 0
    } : null
  });

  const router = useRouter();
  const searchParams = useSearchParams();

  // props 변경 시 상태 업데이트
  useEffect(() => {
    setConnectionState(prev => ({
      ...prev,
      status: instagramConnection ? 'connected' : 'disconnected',
      connectedAccount: instagramConnection ? {
        id: instagramConnection.platform_user_id,
        username: instagramConnection.username,
        display_name: instagramConnection.display_name,
        profile_picture_url: instagramConnection.profile_picture_url,
        followers_count: 0,
        media_count: 0
      } : null
    }));
  }, [instagramConnection]);

  // Instagram 연동 정보를 DB에 저장하는 함수
  const saveInstagramConnection = async (accountInfo, tokenData) => {
    try {
      // 현재 로그인한 사용자 정보 가져오기
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('사용자 정보 가져오기 실패:', userError);
        return;
      }

      // 현재 세션 가져오기 (Authorization 헤더용)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('세션 정보 가져오기 실패:', sessionError);
        return;
      }

      // SNS 연동 정보 저장 API 호출
      const response = await fetch('/api/social/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: user.id,
          platform: 'instagram',
          platformUserInfo: accountInfo,
          tokenData: tokenData
        }),
      });

      // 응답이 JSON인지 확인하기 위해 Content-Type 체크
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');

      if (response.ok) {
        if (isJson) {
          try {
            const result = await response.json();
            console.log('Instagram 연동 정보 DB 저장 성공:', result);
          } catch (jsonError) {
            console.error('성공 응답 JSON 파싱 오류:', jsonError);
          }
        } else {
          console.log('Instagram 연동 정보 DB 저장 성공 (비-JSON 응답)');
        }
      } else {
        let errorMessage = 'Instagram 연동 정보 DB 저장 실패';
        
        if (isJson) {
          try {
            const error = await response.json();
            errorMessage = error.error || errorMessage;
            console.error('Instagram 연동 정보 DB 저장 실패:', error);
          } catch (jsonError) {
            console.error('오류 응답 JSON 파싱 오류:', jsonError);
            console.error('Instagram 연동 정보 DB 저장 실패 (파싱 불가):', response.status, response.statusText);
          }
        } else {
          console.error('Instagram 연동 정보 DB 저장 실패 (비-JSON 응답):', response.status, response.statusText);
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Instagram 연동 정보 저장 중 오류:', error);
    }
  };

  // 팝업이 열렸을 때 URL 파라미터 확인
  useEffect(() => {
    if (!isOpen) return;

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
      // URL 파라미터로 성공이 전달된 경우, 저장된 계정 정보를 가져와야 함
      // postMessage 방식을 우선 사용하므로 여기서는 기본 성공 메시지만 표시
      setConnectionState(prev => ({
        ...prev,
        status: 'connected',
        successMessage: 'Instagram 계정이 성공적으로 연결되었습니다!',
        isConnecting: false
      }));
    }

    // URL 파라미터 정리
    if (error || success) {
      router.replace('/connections/instagram');
    }
  }, [isOpen, searchParams, router, onConnected]);

  // Instagram 연동 처리 - 팝업 창으로 처리
  const handleInstagramConnect = async () => {
    setConnectionState(prev => ({ ...prev, isConnecting: true, error: '', successMessage: '' }));

    try {
      // 서버에서 Instagram OAuth URL 가져오기
      const response = await fetch('/api/auth/instagram');
      
      // 응답이 JSON인지 확인하기 위해 Content-Type 체크
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');

      if (!response.ok) {
        let errorMessage = 'Instagram 연동 설정에 실패했습니다.';
        
        if (isJson) {
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

      let data;
      if (isJson) {
        try {
          data = await response.json();
        } catch (jsonError) {
          console.error('응답 JSON 파싱 오류:', jsonError);
          throw new Error('서버 응답을 처리하는데 실패했습니다.');
        }
      } else {
        throw new Error('서버에서 올바르지 않은 응답을 받았습니다.');
      }
      
      // 팝업 창으로 Instagram OAuth 처리
      const popup = window.open(
        data.authUrl,
        'instagram-auth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );
      
      console.log('Instagram OAuth 팝업 열림:', data.authUrl);

      // 팝업 창 메시지 리스너 (OAuth 완료 후 통신)
      const messageListener = (event) => {
        console.log('메시지 수신됨:', event.data);
        
        // 허용된 origin 목록 (환경변수에서 가져오거나 현재 origin)
        const allowedOrigins = [
          window.location.origin,
          process.env.NEXT_PUBLIC_APP_URL
        ].filter(Boolean); // null/undefined 제거
        
        if (!allowedOrigins.includes(event.origin)) {
          console.warn('허용되지 않은 origin에서 온 메시지:', event.origin);
          console.log('허용된 origins:', allowedOrigins);
          return;
        }
        
        if (event.data.type === 'INSTAGRAM_AUTH_SUCCESS') {
          console.log('Instagram 인증 성공 메시지 수신');
          
          // 먼저 UI 상태 업데이트
          setConnectionState(prev => ({
            ...prev,
            status: 'connected',
            successMessage: 'Instagram 계정이 성공적으로 연결되었습니다!',
            isConnecting: false,
            connectedAccount: event.data.account
          }));
          
          // 팝업 닫기
          if (popup && !popup.closed) {
            popup.close();
          }
          window.removeEventListener('message', messageListener);
          
          // 클라이언트에서 Instagram 연동 정보 저장 (비동기)
          saveInstagramConnection(event.data.account, event.data.tokenData)
            .then(() => {
              console.log('Instagram 연동 정보 저장 완료');
              if (onConnected) {
                onConnected(event.data.account);
              }
            })
            .catch((error) => {
              console.error('Instagram 연동 정보 저장 실패:', error);
              // 저장 실패 시 UI 상태 업데이트 (성공 메시지 제거, 오류 메시지 표시)
              setConnectionState(prev => ({
                ...prev,
                status: 'disconnected', // 연결 상태를 disconnected로 변경
                error: '데이터베이스 저장에 실패했습니다. 잠시 후 다시 시도해주세요.',
                successMessage: '', // 성공 메시지 제거
                connectedAccount: null // 연결된 계정 정보 제거
              }));
              // onConnected는 호출하지 않음 (저장 실패 시)
            });
          
          // 성공시 모달 자동 닫기 (1.5초 후)
          setTimeout(() => {
            onClose();
          }, 1500);
        } else if (event.data.type === 'INSTAGRAM_AUTH_ERROR') {
          console.log('Instagram 인증 오류 메시지 수신:', event.data.error);
          
          setConnectionState(prev => ({
            ...prev,
            error: event.data.error,
            isConnecting: false
          }));
          
          if (popup && !popup.closed) {
            popup.close();
          }
          window.removeEventListener('message', messageListener);
        }
      };

      window.addEventListener('message', messageListener);

      // 팝업 창이 닫혔을 때 처리
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          setConnectionState(prev => ({ ...prev, isConnecting: false }));
          window.removeEventListener('message', messageListener);
          clearInterval(checkClosed);
        }
      }, 1000);

    } catch (err) {
      setConnectionState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: err.message || 'Instagram 연동 중 오류가 발생했습니다.' 
      }));
      console.error('Instagram 연동 오류:', err);
    }
  };

  // 연동 해제 처리 - 공통 로직 사용
  const handleDisconnect = async () => {
    if (!instagramConnection) {
      setConnectionState(prev => ({ 
        ...prev, 
        error: '연동 해제할 계정 정보가 없습니다.' 
      }));
      return;
    }

    if (!confirm('정말로 Instagram 연동을 해제하시겠습니까?')) {
      return;
    }

    try {
      // 현재 세션 가져오기 (Authorization 헤더용)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('사용자 인증이 만료되었습니다. 다시 로그인해주세요.');
      }

      const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      // 부모에서 전달받은 연동 정보의 ID 사용
      const connectionId = instagramConnection.id;
      console.log('연동 해제할 계정 ID:', connectionId);
      console.log('연동 계정 정보:', instagramConnection);

      if (!connectionId) {
        throw new Error('연동 계정 ID를 찾을 수 없습니다.');
      }

      // 연동 해제 API 호출 - Supabase 세션 기반
      const deleteUrl = `/api/social/connections/${connectionId}`;
      console.log('연동 해제 URL:', deleteUrl);
      
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: authHeaders,
      });

      console.log('연동 해제 응답 상태:', response.status);

      const responseContentType = response.headers.get('content-type');
      const responseIsJson = responseContentType && responseContentType.includes('application/json');

      if (response.ok) {
        setConnectionState(prev => ({ 
          ...prev, 
          status: 'disconnected',
          successMessage: 'Instagram 연동이 해제되었습니다.',
          error: '',
          connectedAccount: null
        }));
        
        console.log('Instagram 연동 해제 완료');
        
        // 부모 컴포넌트에 연동 해제 알림 (연동 상태 새로고침 트리거)
        if (onDisconnected) {
          onDisconnected();
        }
      } else {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* 모달 헤더 */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <span className="text-lg">📷</span>
              </div>
              <div className="ml-3">
                <h2 className="text-lg font-semibold">Instagram 계정 연동</h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* 모달 콘텐츠 */}
        <div className="p-6">
          {/* 성공 메시지 */}
          {connectionState.successMessage && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
              {connectionState.successMessage}
            </div>
          )}

          {/* 에러 메시지 */}
          {connectionState.error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {connectionState.error}
            </div>
          )}

          {/* 연동된 계정 정보 표시 */}
          {connectionState.status === 'connected' && connectionState.connectedAccount ? (
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl text-green-600">✓</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                연동 완료!
              </h3>
              
              {/* 연동된 계정 정보 */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-3">
                  <img 
                    src={connectionState.connectedAccount.profile_picture_url} 
                    alt="프로필 사진"
                    className="w-12 h-12 rounded-full"
                  />
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">
                      @{connectionState.connectedAccount.username}
                    </p>
                    <p className="text-sm text-gray-600">
                      팔로워 {connectionState.connectedAccount.followers_count?.toLocaleString() || 0}명 • 
                      게시물 {connectionState.connectedAccount.media_count || 0}개
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
                >
                  완료
                </button>
                <button
                  onClick={handleDisconnect}
                  className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700"
                >
                  연동 해제
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-gray-400">📷</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Instagram 계정 연결
              </h3>
              <p className="text-gray-600 mb-4 text-sm">
                Instagram 비즈니스 계정을 연결하여 콘텐츠를 관리하세요
              </p>
              
              {/* 연동 요구사항 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-left">
                <h4 className="font-semibold text-blue-900 mb-2 text-sm">연동 요구사항:</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Instagram 비즈니스 계정</li>
                  <li>• Facebook 페이지와 연결된 계정</li>
                  <li>• 계정 관리 권한</li>
                </ul>
              </div>

              <button
                onClick={handleInstagramConnect}
                disabled={connectionState.isConnecting}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-3 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {connectionState.isConnecting ? 'Instagram 연동 중...' : 'Instagram 계정 연결'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 