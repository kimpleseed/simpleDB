import { useState } from 'react'
import Head from 'next/head'

export default function Home() {
  const [jsonText, setJsonText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [jsonValid, setJsonValid] = useState(null)

  // 더 강력한 JSON 파싱 함수
  const parseJSONLenient = (text) => {
    try {
      // 먼저 정상적인 JSON.parse 시도
      return JSON.parse(text)
    } catch (error) {
      console.log('정상 JSON 파싱 실패, 강력한 파싱 시도...')
      
      try {
        let fixedText = text.trim()
        
        // 1. 불완전한 문자열 값 제거 (예: "influence"... 같은 것들)
        // 콜론 뒤에 따옴표로 시작하지만 제대로 끝나지 않는 문자열들을 찾아서 제거
        fixedText = fixedText.replace(/:\s*"[^"]*\.\.\..*?(?=,|\}|\]|$)/g, ': null')
        
        // 2. 불완전한 키-값 쌍 제거 (콜론 뒤에 값이 없는 경우)
        fixedText = fixedText.replace(/,\s*"[^"]*"\s*:\s*$/g, '')
        fixedText = fixedText.replace(/,\s*"[^"]*"\s*:\s*(?=,|\}|\])/g, '')
        
        // 3. 마지막에 콤마로 끝나는 불완전한 항목들 제거
        fixedText = fixedText.replace(/,\s*(?=\}|\])/g, '')
        
        // 4. 문자열 내의 이스케이프되지 않은 따옴표 처리
        let inString = false
        let escapeNext = false
        let result = ''
        
        for (let i = 0; i < fixedText.length; i++) {
          const char = fixedText[i]
          
          if (escapeNext) {
            result += char
            escapeNext = false
            continue
          }
          
          if (char === '\\') {
            result += char
            escapeNext = true
            continue
          }
          
          if (char === '"') {
            // 문자열 시작/끝 판단
            if (!inString) {
              inString = true
              result += char
            } else {
              // 문자열 끝인지 확인 (다음 문자가 콤마, 중괄호, 대괄호인지)
              const nextChar = fixedText[i + 1]
              if (!nextChar || /[\s,\}\]\:]/.test(nextChar)) {
                inString = false
                result += char
              } else {
                // 문자열 중간의 따옴표는 이스케이프
                result += '\\"'
              }
            }
          } else {
            result += char
          }
        }
        
        fixedText = result
        
        // 5. 중괄호/대괄호 균형 맞추기
        let openBraces = 0
        let openBrackets = 0
        inString = false
        escapeNext = false
        
        for (let i = 0; i < fixedText.length; i++) {
          const char = fixedText[i]
          
          if (escapeNext) {
            escapeNext = false
            continue
          }
          
          if (char === '\\') {
            escapeNext = true
            continue
          }
          
          if (char === '"') {
            inString = !inString
            continue
          }
          
          if (!inString) {
            if (char === '{') openBraces++
            else if (char === '}') openBraces--
            else if (char === '[') openBrackets++
            else if (char === ']') openBrackets--
          }
        }
        
        // 누락된 닫는 괄호 추가
        while (openBrackets > 0) {
          fixedText += ']'
          openBrackets--
        }
        while (openBraces > 0) {
          fixedText += '}'
          openBraces--
        }
        
        console.log('1차 수정 완료, JSON 파싱 시도...')
        
        try {
          const parsed = JSON.parse(fixedText)
          console.log('1차 수정으로 파싱 성공!')
          return parsed
        } catch (secondError) {
          console.log('1차 수정 실패, 2차 시도...')
          
          // 6. 더 공격적인 정리 - 완전하지 않은 부분들을 모두 제거
          let lines = fixedText.split('\n')
          let cleanedLines = []
          let braceLevel = 0
          let bracketLevel = 0
          
          for (let line of lines) {
            let trimmed = line.trim()
            
            // 빈 줄 건너뛰기
            if (!trimmed) continue
            
            // 불완전한 줄들 건너뛰기
            if (trimmed.includes('...') || 
                trimmed.match(/:\s*"[^"]*$/) ||
                trimmed.match(/:\s*$/) ||
                trimmed === ',' ||
                trimmed === '"') {
              continue
            }
            
            // 중괄호/대괄호 레벨 추적
            for (let char of trimmed) {
              if (char === '{') braceLevel++
              else if (char === '}') braceLevel--
              else if (char === '[') bracketLevel++
              else if (char === ']') bracketLevel--
            }
            
            cleanedLines.push(trimmed)
          }
          
          // 균형 맞추기
          while (bracketLevel > 0) {
            cleanedLines.push(']')
            bracketLevel--
          }
          while (braceLevel > 0) {
            cleanedLines.push('}')
            braceLevel--
          }
          
          let cleanedText = cleanedLines.join('\n')
          
          // 마지막 콤마 정리
          cleanedText = cleanedText.replace(/,(\s*[\}\]])/g, '$1')
          
          console.log('2차 수정 완료, 최종 파싱 시도...')
          
          try {
            const parsed = JSON.parse(cleanedText)
            console.log('2차 수정으로 파싱 성공!')
            return parsed
          } catch (thirdError) {
            console.log('2차 수정도 실패, 최소 구조 추출 시도...')
            
            // 7. 최후의 수단: 어떤 배열이든 찾아서 최소 JSON 생성
            const arrayMatches = text.match(/\[[^\[\]]*\]/g) || []
            const objectMatches = text.match(/\{[^\{\}]*\}/g) || []
            
            if (arrayMatches.length > 0) {
              const largestArray = arrayMatches.reduce((max, current) => 
                current.length > max.length ? current : max
              )
              const minimalJson = `{"data": ${largestArray}}`
              console.log('최소 배열 JSON 시도:', minimalJson.substring(0, 100) + '...')
              return JSON.parse(minimalJson)
            }
            
            if (objectMatches.length > 0) {
              const largestObject = objectMatches.reduce((max, current) => 
                current.length > max.length ? current : max
              )
              const minimalJson = `{"data": [${largestObject}]}`
              console.log('최소 객체 JSON 시도:', minimalJson.substring(0, 100) + '...')
              return JSON.parse(minimalJson)
            }
            
            throw new Error('JSON 구조를 찾을 수 없습니다.')
          }
        }
        
      } catch (err) {
        console.log('모든 파싱 시도 실패:', err.message)
        throw error // 원래 에러 반환
      }
    }
  }

  const validateJSON = (text) => {
    if (!text.trim()) {
      setJsonValid(null)
      return
    }

    try {
      const parsed = JSON.parse(text)
      setJsonValid(true)
      setError(null)
      return parsed
    } catch (err) {
      setJsonValid(false)
      setError(`JSON 형식 오류: ${err.message}`)
      return null
    }
  }

  const handleTextChange = (e) => {
    const value = e.target.value
    setJsonText(value)
    setError(null)
    
    // 실시간 JSON 유효성 검사 (디바운스)
    clearTimeout(window.jsonValidationTimeout)
    window.jsonValidationTimeout = setTimeout(() => {
      validateJSON(value)
    }, 1000)
  }

  const handleUpload = async () => {
    if (!jsonText.trim()) {
      setError('JSON 데이터를 입력해주세요.')
      return
    }

    try {
      // 관대한 JSON 파싱 사용
      const jsonData = parseJSONLenient(jsonText)
      
      // 더 유연한 유효성 검사
      if (!jsonData || typeof jsonData !== 'object') {
        setError('올바른 JSON 객체가 아닙니다.')
        return
      }

      setUploading(true)
      setError(null)
      setResult(null)

      // 데이터 크기 확인
      const dataSize = JSON.stringify(jsonData).length
      const maxSize = 8 * 1024 * 1024 // 8MB 제한 (여유분 고려)

      console.log(`데이터 크기: ${(dataSize / 1024 / 1024).toFixed(2)}MB`)

      if (dataSize > maxSize) {
        setError(`데이터가 너무 큽니다. (${(dataSize / 1024 / 1024).toFixed(2)}MB / 최대 8MB)\n더 작은 데이터로 나누어 처리해주세요.`)
        setUploading(false)
        return
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setResult(data)
    } catch (err) {
      console.error('업로드 오류:', err)
      if (err.message.includes('JSON') || err.message.includes('파싱')) {
        setError(`JSON 파싱 실패: ${err.message}\n"자동 수정" 버튼을 시도해보세요.`)
      } else if (err.message.includes('too large') || err.message.includes('크기')) {
        setError(`데이터 크기 초과: ${err.message}\n더 작은 데이터로 나누어 처리해주세요.`)
      } else if (err.message.includes('timeout') || err.message.includes('시간')) {
        setError(`처리 시간 초과: ${err.message}\nVercel 서버리스 함수의 시간 제한입니다.`)
      } else {
        setError(`업로드 실패: ${err.message}`)
      }
    } finally {
      setUploading(false)
    }
  }

  const handleClear = () => {
    setJsonText('')
    setResult(null)
    setError(null)
    setJsonValid(null)
  }

  const handleSampleData = () => {
    const sampleJson = `{
  "baseResp": {
    "StatusCode": 0
  },
  "creators": [
    {
      "aioCreatorID": "sample_001",
      "creatorTTInfo": {
        "nickName": "샘플크리에이터1",
        "handleName": "@sample1",
        "bio": "샘플 크리에이터입니다. contact@sample.com",
        "storeRegion": "KR",
        "isBannedInTT": false
      },
      "statisticData": {
        "overallPerformance": {
          "followerCount": 5000,
          "engagementRate": 4.5,
          "medianViews": 25000
        }
      },
      "recentItems": []
    },
    {
      "aioCreatorID": "sample_002",
      "creatorTTInfo": {
        "nickName": "샘플크리에이터2",
        "handleName": "@sample2",
        "bio": "뷰티 크리에이터입니다. beauty@test.com",
        "storeRegion": "KR",
        "isBannedInTT": false
      },
      "statisticData": {
        "overallPerformance": {
          "followerCount": 15000,
          "engagementRate": 6.2,
          "medianViews": 45000
        }
      },
      "recentItems": []
    }
  ]
}`
    setJsonText(sampleJson)
    setJsonValid(true)
    setError(null)
  }

  const handleValidateOnly = () => {
    const parsed = validateJSON(jsonText)
    if (parsed) {
      // JSON 구조 분석
      const analyzeStructure = (obj) => {
        const arrays = []
        const objects = []
        
        function findStructures(current, path = '') {
          if (Array.isArray(current)) {
            arrays.push({ path: path || 'root', length: current.length })
          } else if (current && typeof current === 'object') {
            objects.push({ path: path || 'root', keys: Object.keys(current).length })
            
            for (const [key, value] of Object.entries(current)) {
              const newPath = path ? `${path}.${key}` : key
              findStructures(value, newPath)
            }
          }
        }
        
        findStructures(obj)
        return { arrays, objects }
      }
      
      const structure = analyzeStructure(parsed)
      const totalArrayItems = structure.arrays.reduce((sum, arr) => sum + arr.length, 0)
      
      setError(`✅ JSON 파싱 성공! 
        배열 ${structure.arrays.length}개 발견 (총 ${totalArrayItems}개 항목)
        ${structure.arrays.map(a => `${a.path}: ${a.length}개`).join(', ')}`)
    }
  }

  const handleTryFix = () => {
    try {
      const parsed = parseJSONLenient(jsonText)
      const fixedJson = JSON.stringify(parsed, null, 2)
      setJsonText(fixedJson)
      setJsonValid(true)
      setError('✅ JSON이 자동으로 수정되었습니다!')
    } catch (err) {
      setError(`자동 수정 실패: ${err.message}`)
    }
  }

  const handleCopyResults = () => {
    if (!result || !result.processedData || result.processedData.length === 0) {
      alert('복사할 데이터가 없습니다.')
      return
    }

    // 데이터만 추출 (헤더 제외)
    const dataOnly = result.processedData.map(item => [
      item.name || '',
      item.email || '',
      item.followers || 0,
      item.sns || ''
    ])

    // TSV 형태로 변환 (탭으로 구분)
    const tsvData = dataOnly.map(row => row.join('\t')).join('\n')
    
    // 클립보드에 복사
    navigator.clipboard.writeText(tsvData).then(() => {
      alert(`${result.processedData.length}개 데이터가 복사되었습니다!\n(Excel이나 Google Sheets에 붙여넣기 가능)`)
    }).catch(err => {
      console.error('복사 실패:', err)
      alert('복사에 실패했습니다. 브라우저가 클립보드 접근을 허용하지 않을 수 있습니다.')
    })
  }

  return (
    <div className="container">
      <Head>
        <title>SimpleDB - Creator Data Upload</title>
        <meta name="description" content="Upload creator data to Supabase" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="main">
        <h1 className="title">
          SimpleDB Creator Upload
        </h1>
        <p className="subtitle">
          JSON 데이터에서 name, email, followers, sns 정보를 추출하여 DB에 저장 (모든 JSON 구조 지원)
        </p>

        <div className="uploadSection">
          <div className="textInputSection">
            <label htmlFor="json-input" className="textLabel">
              JSON 데이터 입력 (어떤 구조든 자동 분석)
              {jsonValid === true && <span className="validIcon"> ✅ 유효</span>}
              {jsonValid === false && <span className="invalidIcon"> ⚠️ 수정 필요</span>}
            </label>
            <textarea
              id="json-input"
              value={jsonText}
              onChange={handleTextChange}
              placeholder="JSON 데이터를 여기에 붙여넣기 하세요... (어떤 구조든 자동으로 분석하여 처리)"
              className={`textArea ${jsonValid === false ? 'warning' : ''}`}
            />
            <div className="textInfo">
              <span className="charCount">
                {jsonText.length.toLocaleString()} 자
              </span>
            </div>
          </div>

          <div className="buttonGroup">
            <button
              onClick={handleSampleData}
              className="sampleButton"
              disabled={uploading}
            >
              샘플 데이터
            </button>
            <button
              onClick={handleValidateOnly}
              className="validateButton"
              disabled={uploading}
            >
              구조 분석
            </button>
            <button
              onClick={handleTryFix}
              className="fixButton"
              disabled={uploading || !jsonText.trim()}
            >
              자동 수정
            </button>
            <button
              onClick={handleClear}
              className="clearButton"
              disabled={uploading}
            >
              초기화
            </button>
            <button
              onClick={handleUpload}
              disabled={!jsonText.trim() || uploading}
              className="uploadButton"
            >
              {uploading ? '처리 중...' : '업로드'}
            </button>
          </div>
        </div>

        {error && (
          <div className={error.startsWith('✅') ? 'success' : 'error'}>
            <strong>{error.startsWith('✅') ? '성공:' : '오류:'}</strong> {error}
            {!error.startsWith('✅') && (
              <div className="errorHelp">
                <p><strong>해결 방법:</strong></p>
                <ul>
                  <li><strong>데이터베이스 오류</strong>인 경우: Supabase에서 테이블을 다시 생성하세요</li>
                  <li><strong>JSON 오류</strong>인 경우: "자동 수정" 버튼을 클릭해보세요</li>
                  <li><strong>구조 분석</strong>: "구조 분석" 버튼으로 JSON 구조를 확인하세요</li>
                  <li>어떤 JSON 구조든 자동으로 분석하여 처리합니다</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {result && (
          <div className="result">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>처리 결과</h2>
              <button
                onClick={handleCopyResults}
                className="copyResultButton"
                disabled={!result.processedData || result.processedData.length === 0}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                📋 결과 복사
              </button>
            </div>
            <div className="resultStats">
              <p><strong>총 처리:</strong> {result.total}개</p>
              <p><strong>조건 통과:</strong> {result.saved}개</p>
              <p><strong>필터됨:</strong> {result.filtered}개</p>
            </div>
            <div className="followerInfo">
              <p><strong>팔로워 수 조건:</strong> {result.minFollowers.toLocaleString()} ~ {result.maxFollowers.toLocaleString()}</p>
            </div>
            
            {result.processedData && result.processedData.length > 0 && (
              <div className="sampleData">
                <h3>처리된 데이터 전체 ({result.processedData.length}개)</h3>
                <div className="dataTable" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <table>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white' }}>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Followers</th>
                        <th>SNS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.processedData.map((item, index) => (
                        <tr key={index}>
                          <td>{item.name || '-'}</td>
                          <td>{item.email || '-'}</td>
                          <td style={{ textAlign: 'right' }}>{item.followers?.toLocaleString() || 0}</td>
                          <td>{item.sns || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
} 