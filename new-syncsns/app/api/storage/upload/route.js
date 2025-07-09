import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 이미지 업로드 API
export async function POST(request) {
  try {
    // Authorization 헤더에서 토큰 가져오기
    const authorization = request.headers.get('authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증 토큰이 필요합니다.' },
        { status: 401 }
      );
    }

    const token = authorization.split(' ')[1];

    // Supabase 클라이언트 생성
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // 현재 로그인한 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      );
    }

    // FormData에서 파일들 가져오기
    const formData = await request.formData();
    const files = formData.getAll('files'); // 다중 파일 지원

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: '업로드할 파일이 없습니다.' },
        { status: 400 }
      );
    }

    // 파일 개수 제한 (최대 5개)
    if (files.length > 5) {
      return NextResponse.json(
        { error: '최대 5개의 파일만 업로드할 수 있습니다.' },
        { status: 400 }
      );
    }

    const uploadedFiles = [];
    const uploadErrors = [];

    // 각 파일을 순차적으로 업로드
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // 파일 유효성 검사
        if (!file.type.startsWith('image/')) {
          uploadErrors.push({
            fileName: file.name,
            error: '이미지 파일만 업로드할 수 있습니다.'
          });
          continue;
        }

        // 파일 크기 제한 (10MB)
        if (file.size > 10 * 1024 * 1024) {
          uploadErrors.push({
            fileName: file.name,
            error: '파일 크기는 10MB를 초과할 수 없습니다.'
          });
          continue;
        }

        // 파일명 생성 (사용자ID_타임스탬프_원본파일명)
        const fileExtension = file.name.split('.').pop();
        const fileName = `${user.id}_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExtension}`;
        const filePath = `posts/${fileName}`;

        // Supabase Storage에 파일 업로드
        const { data, error } = await supabase.storage
          .from('images') // 'images' 버킷 사용
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.error('파일 업로드 실패:', error);
          uploadErrors.push({
            fileName: file.name,
            error: '파일 업로드에 실패했습니다.'
          });
          continue;
        }

        // 업로드된 파일의 공개 URL 가져오기
        const { data: publicUrlData } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);

        uploadedFiles.push({
          id: `${Date.now()}_${i}`, // 프론트엔드에서 사용할 임시 ID
          fileName: file.name,
          filePath: filePath,
          publicUrl: publicUrlData.publicUrl,
          size: file.size,
          type: file.type
        });

        console.log('파일 업로드 성공:', {
          fileName: file.name,
          filePath: filePath,
          size: file.size
        });

      } catch (fileError) {
        console.error('파일 처리 오류:', fileError);
        uploadErrors.push({
          fileName: file.name,
          error: '파일 처리 중 오류가 발생했습니다.'
        });
      }
    }

    // 업로드 결과 반환
    const response = {
      success: uploadedFiles.length > 0,
      uploadedFiles: uploadedFiles,
      totalUploaded: uploadedFiles.length,
      totalRequested: files.length
    };

    // 업로드 오류가 있는 경우 포함
    if (uploadErrors.length > 0) {
      response.errors = uploadErrors;
      response.message = `${uploadedFiles.length}개 파일 업로드 성공, ${uploadErrors.length}개 파일 업로드 실패`;
    } else {
      response.message = `${uploadedFiles.length}개 파일이 성공적으로 업로드되었습니다.`;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('이미지 업로드 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 업로드된 파일 삭제 API
export async function DELETE(request) {
  try {
    const { filePath } = await request.json();

    if (!filePath) {
      return NextResponse.json(
        { error: '삭제할 파일 경로가 필요합니다.' },
        { status: 400 }
      );
    }

    // Authorization 헤더에서 토큰 가져오기
    const authorization = request.headers.get('authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증 토큰이 필요합니다.' },
        { status: 401 }
      );
    }

    const token = authorization.split(' ')[1];

    // Supabase 클라이언트 생성
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // 현재 로그인한 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      );
    }

    // 파일 경로가 현재 사용자의 것인지 확인
    if (!filePath.includes(user.id)) {
      return NextResponse.json(
        { error: '자신의 파일만 삭제할 수 있습니다.' },
        { status: 403 }
      );
    }

    // Supabase Storage에서 파일 삭제
    const { error } = await supabase.storage
      .from('images')
      .remove([filePath]);

    if (error) {
      console.error('파일 삭제 실패:', error);
      return NextResponse.json(
        { error: '파일 삭제에 실패했습니다.' },
        { status: 500 }
      );
    }

    console.log('파일 삭제 성공:', filePath);

    return NextResponse.json({
      success: true,
      message: '파일이 성공적으로 삭제되었습니다.',
      deletedFilePath: filePath
    });

  } catch (error) {
    console.error('파일 삭제 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 