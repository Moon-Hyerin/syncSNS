'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import useAuthGuard from '@/app/lib/useAuthGuard';
import useSocialConnections from '@/app/lib/useSocialConnections';

export default function CreatePostPage() {
  // 상태 관리
  const [userData, setUserData] = useState({
    user: null
  });
  const [postData, setPostData] = useState({
    content: '',
    selectedPlatforms: [],
    images: []
  });
  const [uiState, setUiState] = useState({
    isPublishing: false,
    isUploadingImages: false,
    error: '',
    success: false
  });
  
  const router = useRouter();

  // 소셜 연동 상태 관리 훅 사용
  const {
    isLoading: isLoadingConnections,
    error: connectionsError,
    getPlatformStatus,
    isConnected,
    refreshConnections
  } = useSocialConnections(userData.user?.id, {
    autoFetch: !!userData.user?.id
  });

  // 사용 가능한 플랫폼 목록 (기본 설정)
  const basePlatforms = [
    { id: 'instagram', name: 'Instagram', icon: '📷' },
    { id: 'twitter', name: 'Twitter', icon: '🐦' },
  ];

  // 실제 연동 상태가 반영된 플랫폼 목록
  const availablePlatforms = getPlatformStatus(basePlatforms);

  // 사용자 인증 확인 - useAuthGuard 커스텀 훅 사용
  useAuthGuard(useCallback((user) => {
    setUserData({ user });
  }, []));

  // 플랫폼 선택/해제 토글
  const handlePlatformToggle = (platformId) => {
    setPostData(prev => ({
      ...prev,
      selectedPlatforms: prev.selectedPlatforms.includes(platformId) 
        ? prev.selectedPlatforms.filter(id => id !== platformId)
        : [...prev.selectedPlatforms, platformId]
    }));
  };

  // 이미지 업로드 처리
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length + postData.images.length > 5) {
      setUiState(prev => ({ ...prev, error: '최대 5개의 이미지만 업로드할 수 있습니다.' }));
      return;
    }

    // 업로드 시작 시 로딩 상태 활성화
    setUiState(prev => ({ 
      ...prev, 
      error: '', 
      isUploadingImages: true
    }));
    
    try {
      // Supabase Storage에 이미지 업로드
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setUiState(prev => ({ ...prev, error: '로그인이 필요합니다.', isUploadingImages: false }));
        return;
      }

      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });



      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });



      const result = await response.json();

      if (result.success && result.uploadedFiles.length > 0) {
        setPostData(prev => ({
          ...prev,
          images: [...prev.images, ...result.uploadedFiles]
        }));
        
        // 업로드 완료
        setUiState(prev => ({ ...prev, isUploadingImages: false }));
        
        if (result.errors && result.errors.length > 0) {
          setUiState(prev => ({ 
            ...prev, 
            error: `일부 파일 업로드 실패: ${result.errors.map(e => e.error).join(', ')}` 
          }));
        }
      } else {
        setUiState(prev => ({ 
          ...prev, 
          error: result.error || '이미지 업로드에 실패했습니다.',
          isUploadingImages: false
        }));
      }
    } catch (error) {
      console.error('이미지 업로드 오류:', error);
      setUiState(prev => ({ 
        ...prev, 
        error: '이미지 업로드 중 오류가 발생했습니다.',
        isUploadingImages: false
      }));
    }
  };

  // 이미지 제거
  const removeImage = async (imageId) => {
    try {
      const imageToRemove = postData.images.find(img => img.id === imageId);
      if (imageToRemove && imageToRemove.filePath) {
        // Supabase Storage에서 파일 삭제
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await fetch('/api/storage/upload', {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filePath: imageToRemove.filePath })
          });
        }
      }
    } catch (error) {
      console.error('이미지 삭제 오류:', error);
    }

    setPostData(prev => ({
      ...prev,
      images: prev.images.filter(img => img.id !== imageId)
    }));
  };

  // 게시글 발행 처리
  const handlePublish = async () => {
    // 기본 유효성 검사
    if (!postData.content.trim()) {
      setUiState(prev => ({ ...prev, error: '게시글 내용을 입력해주세요.' }));
      return;
    }

    if (postData.selectedPlatforms.length === 0) {
      setUiState(prev => ({ ...prev, error: '발행할 플랫폼을 선택해주세요.' }));
      return;
    }

    // 선택된 플랫폼이 실제로 연동되어 있는지 확인
    const disconnectedPlatforms = postData.selectedPlatforms.filter(platformId => 
      !isConnected(platformId)
    );
    
    if (disconnectedPlatforms.length > 0) {
      const platformNames = disconnectedPlatforms
        .map(platformId => basePlatforms.find(p => p.id === platformId)?.name || platformId)
        .join(', ');
      setUiState(prev => ({ 
        ...prev, 
        error: `${platformNames} 계정이 연동되어 있지 않습니다. 먼저 계정을 연결해주세요.` 
      }));
      return;
    }

    // Instagram 선택 시 이미지 필수 확인
    if (postData.selectedPlatforms.includes('instagram') && postData.images.length === 0) {
      setUiState(prev => ({ 
        ...prev, 
        error: 'Instagram 발행 시 이미지가 필수입니다.' 
      }));
      return;
    }

    setUiState(prev => ({ ...prev, isPublishing: true, error: '' }));

    try {
      // 1. 세션 확인
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('로그인이 필요합니다.');
      }

      // 2. 게시글 생성 API 호출
      console.log('게시글 생성 시도:', {
        content: postData.content.substring(0, 50) + '...',
        imageCount: postData.images.length,
        platforms: postData.selectedPlatforms
      });

      const createResponse = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: postData.content,
          images: postData.images,
          selectedPlatforms: postData.selectedPlatforms,
          publishType: 'immediate'
        })
      });

      const createResult = await createResponse.json();
      console.log('게시글 생성 응답:', createResult);

      if (!createResult.success) {
        throw new Error(createResult.error || '게시글 생성에 실패했습니다.');
      }

      console.log('게시글 생성 성공:', createResult.post);

      // 3. 플랫폼별 발행 API 호출
      console.log('플랫폼별 발행 시도:', createResult.post.id);

      const publishResponse = await fetch(`/api/posts/${createResult.post.id}/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const publishResult = await publishResponse.json();
      console.log('플랫폼별 발행 응답:', publishResult);

      if (!publishResult.success) {
        throw new Error(publishResult.error || '게시글 발행에 실패했습니다.');
      }

      console.log('게시글 발행 성공:', publishResult);

      // 발행 결과 확인
      const failedPlatforms = publishResult.publishResults.filter(result => !result.success);
      if (failedPlatforms.length > 0) {
        const failedPlatformNames = failedPlatforms.map(result => 
          basePlatforms.find(p => p.id === result.platform)?.name || result.platform
        ).join(', ');
        
        setUiState(prev => ({ 
          ...prev, 
          isPublishing: false, 
          error: `${failedPlatformNames} 발행에 실패했습니다: ${failedPlatforms.map(p => p.error).join(', ')}` 
        }));
        return;
      }

      // 모든 플랫폼 발행 성공
      setUiState(prev => ({ ...prev, isPublishing: false, success: true }));

      // 3초 후 대시보드로 이동
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);

    } catch (err) {
      setUiState(prev => ({ 
        ...prev, 
        isPublishing: false, 
        error: err.message || '게시글 발행 중 오류가 발생했습니다.' 
      }));
      console.error('발행 오류:', err);
    }
  };

  // 성공 화면 렌더링
  if (uiState.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl text-green-600">✓</span>
          </div>
          <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-md">
            <h3 className="font-semibold mb-2">게시글이 성공적으로 발행되었습니다!</h3>
            <p>선택한 플랫폼에 콘텐츠가 발행되었습니다.</p>
            <p className="text-sm mt-2">3초 후 대시보드로 이동합니다...</p>
          </div>
          <Link 
            href="/dashboard" 
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            대시보드로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 이미지 업로드 로딩 오버레이 */}
      {uiState.isUploadingImages && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">이미지 업로드 중...</h3>
              <p className="text-sm text-gray-600">잠시만 기다려주세요.</p>
            </div>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                ← 대시보드로 돌아가기
              </Link>
            </div>
            <h1 className="text-xl font-bold text-gray-900">게시글 작성</h1>
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            
            {/* 에러 메시지 표시 */}
            {(uiState.error || connectionsError) && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                <div className="flex items-center">
                  <span className="text-red-600 mr-2">❌</span>
                  <div>
                    <p className="font-medium">오류가 발생했습니다:</p>
                    <p className="text-sm mt-1">{uiState.error || connectionsError}</p>
                    <p className="text-xs mt-2 text-red-600">
                      문제가 계속되면 브라우저의 개발자 도구(F12)에서 Console 탭을 확인해보세요.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 게시글 내용 */}
            <div className="mb-6">
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                게시글 내용
              </label>
              <textarea
                id="content"
                value={postData.content}
                onChange={(e) => setPostData(prev => ({ ...prev, content: e.target.value }))}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="게시글 내용을 입력하세요..."
                maxLength={2200}
              />
              <div className="mt-1 text-right text-sm text-gray-500">
                {postData.content.length}/2200
              </div>
            </div>

            {/* 이미지 업로드 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이미지 첨부 (최대 5개)
              </label>
              <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                uiState.isUploadingImages 
                  ? 'border-blue-300 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uiState.isUploadingImages}
                  className="hidden"
                  id="image-upload"
                />
                <label 
                  htmlFor="image-upload" 
                  className={`cursor-pointer ${uiState.isUploadingImages ? 'cursor-not-allowed' : ''}`}
                >
                  <div className="text-gray-400 mb-2">
                    {uiState.isUploadingImages ? (
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    ) : (
                      <span className="text-2xl">📷</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {uiState.isUploadingImages 
                      ? '이미지 업로드 중...' 
                      : '클릭하여 이미지를 선택하거나 드래그해서 업로드하세요'
                    }
                  </p>
                  {!uiState.isUploadingImages && (
                    <p className="text-xs text-gray-500 mt-1">
                      JPG, PNG, GIF (최대 10MB)
                    </p>
                  )}
                </label>
              </div>

              {/* 업로드된 이미지 미리보기 */}
              {postData.images.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4">
                  {postData.images.map((image) => (
                    <div key={image.id} className="relative">
                      <img
                        src={image.publicUrl || image.preview}
                        alt="미리보기"
                        className={`w-full h-full object-cover rounded-lg transition-opacity ${
                          uiState.isUploadingImages ? 'opacity-50' : ''
                        }`}
                      />
                      <button
                        onClick={() => removeImage(image.id)}
                        disabled={uiState.isUploadingImages}
                        className={`absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-colors ${
                          uiState.isUploadingImages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-600'
                        }`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 플랫폼 선택 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                발행할 플랫폼 선택
              </label>
              
              {/* 연동 상태 로딩 중 */}
              {isLoadingConnections ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availablePlatforms.map((platform) => (
                    <div key={platform.id} className="relative">
                      <div className="block p-4 rounded-lg border-2 border-gray-200 bg-gray-50 animate-pulse">
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">{platform.icon}</span>
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{platform.name}</h3>
                            <p className="text-sm text-gray-500">연동 상태 확인 중...</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availablePlatforms.map((platform) => (
                    <div key={platform.id} className="relative">
                      <input
                        type="checkbox"
                        id={platform.id}
                        checked={postData.selectedPlatforms.includes(platform.id)}
                        onChange={() => handlePlatformToggle(platform.id)}
                        disabled={!platform.connected}
                        className="sr-only"
                      />
                      <label
                        htmlFor={platform.id}
                        className={`block p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                          postData.selectedPlatforms.includes(platform.id)
                            ? 'border-blue-500 bg-blue-50'
                            : platform.connected
                            ? 'border-gray-200 hover:border-gray-300'
                            : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">{platform.icon}</span>
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{platform.name}</h3>
                            <p className={`text-sm ${
                              platform.connected ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {platform.connected ? '연결됨' : '연결되지 않음'}
                            </p>
                          </div>
                        </div>
                      </label>
                      {!platform.connected && (
                        <Link
                          href={platform.id === 'instagram' ? '/connections/instagram' : '/connections'}
                          className="absolute top-2 right-2 text-xs text-blue-600 hover:text-blue-800"
                        >
                          연결하기
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {/* 연동된 계정이 없을 때 안내 메시지 */}
              {!isLoadingConnections && !availablePlatforms.some(p => p.connected) && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <span className="text-yellow-600 mr-2">⚠️</span>
                    <div>
                      <p className="text-sm text-yellow-800 font-medium">
                        연동된 소셜 계정이 없습니다
                      </p>
                      <p className="text-sm text-yellow-700 mt-1">
                        게시글을 발행하려면 먼저 소셜 계정을 연결해주세요.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 발행 버튼 */}
            <div className="flex justify-end space-x-4">
              <Link
                href="/dashboard"
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                취소
              </Link>
              <button
                onClick={handlePublish}
                disabled={
                  uiState.isPublishing || 
                  uiState.isUploadingImages ||
                  isLoadingConnections || 
                  !postData.content.trim() || 
                  postData.selectedPlatforms.length === 0 ||
                  !availablePlatforms.some(p => p.connected)
                }
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uiState.isPublishing ? '발행 중...' : 
                 uiState.isUploadingImages ? '이미지 업로드 중...' :
                 isLoadingConnections ? '연동 상태 확인 중...' :
                 !availablePlatforms.some(p => p.connected) ? '연동 계정 없음' :
                 '즉시 발행'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 