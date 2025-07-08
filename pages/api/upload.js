// API 설정 - 대용량 데이터 처리를 위한 설정
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // 크기 제한을 줄임
    },
    responseLimit: false,
  },
  maxDuration: 30, // Vercel Pro 기준 30초
}

// 팔로워 수 필터 설정 (하드코딩)
const MIN_FOLLOWERS = 1000
const MAX_FOLLOWERS = 10000000000

// 이메일 추출 함수
function extractEmailFromBio(bio) {
  if (!bio) return null
  
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/
  const matches = bio.match(emailPattern)
  return matches ? matches[0] : null
}

// 팔로워 수 유효성 검사
function isFollowerCountValid(followerCount) {
  if (followerCount === null || followerCount === undefined) {
    return false
  }
  return MIN_FOLLOWERS <= followerCount && followerCount <= MAX_FOLLOWERS
}

// 크리에이터 데이터인지 확인하는 함수
function isValidCreatorData(item) {
  // 이미지 데이터나 기타 불필요한 데이터 필터링
  if (item.format && item.imageUrl) {
    return false // 이미지 데이터
  }
  
  // 크리에이터 관련 필드가 하나라도 있으면 유효한 것으로 간주
  const creatorFields = [
    'aioCreatorID', 'creatorTTInfo', 'statisticData',
    'nickName', 'handleName', 'bio', 'followerCount',
    'name', 'username', 'followers', 'id'
  ]
  
  return creatorFields.some(field => {
    if (item[field] !== undefined) return true
    if (item.creatorTTInfo && item.creatorTTInfo[field] !== undefined) return true
    if (item.statisticData?.overallPerformance && item.statisticData.overallPerformance[field] !== undefined) return true
    return false
  })
}

// 다양한 JSON 구조에서 크리에이터 데이터 추출
function extractCreatorsFromAnyStructure(data) {
  let creators = []
  
  // 1. 표준 구조: data.creators
  if (data.creators && Array.isArray(data.creators)) {
    creators = data.creators.filter(isValidCreatorData)
    console.log('표준 creators 배열 발견:', creators.length + '개 (유효한 크리에이터)')
    return creators
  }
  
  // 2. 다른 가능한 구조들 탐색
  console.log('표준 creators 배열 없음, 다른 구조 탐색 중...')
  
  // JSON의 모든 키를 확인하여 배열 찾기
  function findArraysInObject(obj, path = '') {
    const arrays = []
    
    if (Array.isArray(obj)) {
      // 배열에서 유효한 크리에이터 데이터만 필터링
      const validCreators = obj.filter(isValidCreatorData)
      if (validCreators.length > 0) {
        arrays.push({ path, data: validCreators, totalLength: obj.length })
      }
    } else if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        const newPath = path ? `${path}.${key}` : key
        arrays.push(...findArraysInObject(value, newPath))
      }
    }
    
    return arrays
  }
  
  const allArrays = findArraysInObject(data)
  console.log('발견된 크리에이터 배열들:', allArrays.map(a => ({ 
    path: a.path, 
    validCreators: a.data.length, 
    totalItems: a.totalLength 
  })))
  
  // 가장 많은 유효한 크리에이터 데이터를 가진 배열 선택
  if (allArrays.length > 0) {
    const bestArray = allArrays.reduce((max, current) => 
      current.data.length > max.data.length ? current : max
    )
    creators = bestArray.data
    console.log(`최적 배열 선택: ${bestArray.path} (${creators.length}개 유효한 크리에이터)`)
  }
  
  return creators
}

// 크리에이터 데이터 파싱 (DB 저장 없이)
async function parseCreators(data) {
  // baseResp 확인 (선택사항)
  const base = data.baseResp || {}
  if (base.StatusCode && base.StatusCode !== 0) {
    console.warn(`API 경고: StatusCode=${base.StatusCode}`)
  }

  // 다양한 구조에서 크리에이터 데이터 추출
  const creators = extractCreatorsFromAnyStructure(data)
  
  if (!creators || creators.length === 0) {
    throw new Error('유효한 크리에이터 데이터를 찾을 수 없습니다. JSON 구조를 확인해주세요.')
  }

  const summaries = []
  let savedCount = 0
  let filteredCount = 0
  let duplicateCount = 0

  console.log(`총 ${creators.length}개의 유효한 크리에이터 데이터를 처리 중...`)

  for (const creator of creators) {
    console.log('=== 크리에이터 항목 분석 ===')
    
    // Python 코드와 동일한 구조로 데이터 추출
    const info = creator.creatorTTInfo || {}
    const perf = creator.statisticData?.overallPerformance || {}
    const price = creator.esData?.price || {}
    
    // bio에서 이메일 추출
    const bio = info.bio
    const email = extractEmailFromBio(bio)
    
    // 크리에이터 데이터 구성 (Python 코드와 동일)
    const creatorData = {
      aioCreatorID: creator.aioCreatorID,
      name: info.nickName,
      email: email,
      followers: perf.followerCount,
      sns: info.handleName,
      // 추가 정보들
      bio: bio,
      country: info.storeRegion,
      isBanned: info.isBannedInTT,
      engagementRate: perf.engagementRate,
      medianViews: perf.medianViews,
      startingRate100k: price.startingRate100k,
      currency: price.currency,
      recentItemsCount: creator.recentItems?.length || 0
    }

    console.log('=== 추출된 필드들 ===')
    console.log('aioCreatorID:', creatorData.aioCreatorID)
    console.log('name:', creatorData.name)
    console.log('email:', creatorData.email)
    console.log('followers:', creatorData.followers)
    console.log('sns:', creatorData.sns)

    // 필수 필드 검증
    if (!creatorData.aioCreatorID) {
      console.log('⚠️ aioCreatorID가 없어서 건너뜀')
      continue
    }

    // DB 저장용 데이터 (필수 필드만)
    const dbData = {
      aioCreatorID: creatorData.aioCreatorID,
      name: creatorData.name || '알 수 없음',
      email: creatorData.email,
      followers: parseInt(creatorData.followers) || 0,
      sns: creatorData.sns || ''
    }

    summaries.push(dbData)

    console.log(`처리 중: ${dbData.name} (팔로워: ${dbData.followers})`)

    // 팔로워 수 조건 확인 (DB 저장은 건너뜀)
    if (isFollowerCountValid(dbData.followers)) {
      savedCount++
      console.log(`✓ 조건 통과: ${dbData.name} (팔로워: ${dbData.followers?.toLocaleString()}, SNS: ${dbData.sns})`)
    } else {
      filteredCount++
      console.log(`✗ 필터됨: ${dbData.name} (팔로워: ${dbData.followers}) - 조건: ${MIN_FOLLOWERS} ~ ${MAX_FOLLOWERS}`)
    }
  }

  console.log(`처리 완료: 총 ${summaries.length}개, 조건 통과 ${savedCount}개, 필터 ${filteredCount}개`)
  console.log(`팔로워 수 조건: ${MIN_FOLLOWERS.toLocaleString()} ~ ${MAX_FOLLOWERS.toLocaleString()}`)

  return {
    total: summaries.length,
    saved: savedCount,
    duplicate: 0, // DB 저장 안하므로 중복 체크 없음
    filtered: filteredCount,
    minFollowers: MIN_FOLLOWERS,
    maxFollowers: MAX_FOLLOWERS,
    processedData: summaries // 전체 데이터 반환
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('=== API 요청 시작 ===')
    
    // JSON 데이터를 안전하게 받기
    let jsonData
    try {
      jsonData = req.body
      if (!jsonData || typeof jsonData !== 'object') {
        throw new Error('유효하지 않은 JSON 데이터')
      }
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError)
      return res.status(400).json({ error: 'JSON 파싱 실패: ' + parseError.message })
    }

    const dataSize = JSON.stringify(jsonData).length
    console.log(`JSON 데이터 처리 시작: ${(dataSize / 1024 / 1024).toFixed(2)}MB (${dataSize.toLocaleString()}자)`)

    // 크기 제한 확인
    if (dataSize > 10 * 1024 * 1024) { // 10MB 제한
      return res.status(413).json({ error: 'JSON 데이터가 너무 큽니다. (최대 10MB)' })
    }

    // 데이터 구조 분석
    console.log('JSON 구조 분석:')
    console.log('- 최상위 키들:', Object.keys(jsonData))
    
    // 크리에이터 데이터 파싱 (DB 저장 없이)
    const result = await parseCreators(jsonData)
    
    console.log('=== API 요청 완료 ===')
    res.status(200).json(result)
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: error.message })
  }
}