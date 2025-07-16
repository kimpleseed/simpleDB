import { useState } from 'react'
import Head from 'next/head'

export default function Home() {
  // 탭 상태
  const [activeTab, setActiveTab] = useState('tiktokone')
  
  // TikTokOne 상태 관리
  const [jsonText, setJsonText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [jsonValid, setJsonValid] = useState(null)
  
  // LTK 탭 관련 state
  const [ltkData, setLtkData] = useState('')
  const [ltkUploading, setLtkUploading] = useState(false)
  const [ltkResult, setLtkResult] = useState([])
  const [ltkError, setLtkError] = useState('')

  // TikTokOne 관련 함수들 (기존 함수들을 여기에 복사)
  const parseJSONLenient = (text) => {
    try {
      return JSON.parse(text)
    } catch (error) {
      console.log('정상 JSON 파싱 실패, 강력한 파싱 시도...')
      
      try {
        let fixedText = text.trim()
        fixedText = fixedText.replace(/:\s*"[^"]*\.\.\..*?(?=,|\}|\]|$)/g, ': null')
        fixedText = fixedText.replace(/,\s*"[^"]*"\s*:\s*$/g, '')
        fixedText = fixedText.replace(/,\s*"[^"]*"\s*:\s*(?=,|\}|\])/g, '')
        fixedText = fixedText.replace(/,\s*(?=\}|\])/g, '')
        
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
            if (!inString) {
              inString = true
              result += char
            } else {
              const nextChar = fixedText[i + 1]
              if (!nextChar || /[\s,\}\]\:]/.test(nextChar)) {
                inString = false
                result += char
              } else {
                result += '\\"'
              }
            }
          } else {
            result += char
          }
        }
        
        fixedText = result
        
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
        
        while (openBrackets > 0) {
          fixedText += ']'
          openBrackets--
        }
        while (openBraces > 0) {
          fixedText += '}'
          openBraces--
        }
        
        const parsed = JSON.parse(fixedText)
        console.log('강력한 파싱 성공!')
        return parsed
      } catch (err) {
        console.log('모든 파싱 시도 실패:', err.message)
        throw error
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
      const jsonData = parseJSONLenient(jsonText)
      
      if (!jsonData || typeof jsonData !== 'object') {
        setError('올바른 JSON 객체가 아닙니다.')
        return
      }

      setUploading(true)
      setError(null)
      setResult(null)

      const dataSize = JSON.stringify(jsonData).length
      const maxSize = 8 * 1024 * 1024

      if (dataSize > maxSize) {
        setError(`데이터가 너무 큽니다. (${(dataSize / 1024 / 1024).toFixed(2)}MB / 최대 8MB)`)
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
      setError(`업로드 실패: ${err.message}`)
    } finally {
      setUploading(false)
    }
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
    }
  ]
}`
    setJsonText(sampleJson)
    setJsonValid(true)
    setError(null)
  }

  const handleClear = () => {
    setJsonText('')
    setResult(null)
    setError(null)
    setJsonValid(null)
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

  const copyResults = async () => {
    if (!result || !result.processedData) return;
    
    try {
      const dataRows = result.processedData.map(item => [
        item.name || '',
        item.email || '', 
        item.price || '',
        item.engagement || '',
        typeof item.followers === 'number' ? item.followers.toLocaleString() : '',
        item.sns || ''
      ].join('\t'));
      
      const dataOnlyText = dataRows.join('\n');
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(dataOnlyText);
        alert(`${result.processedData.length}개 데이터가 복사되었습니다!`);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = dataOnlyText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert(`${result.processedData.length}개 데이터가 복사되었습니다!`);
      }
    } catch (error) {
      console.error('복사 실패:', error);
      alert('복사에 실패했습니다.');
    }
  };

  // LTK 관련 함수들
  const handleLtkUpload = async () => {
    if (!ltkData.trim()) {
      setLtkError('JSON 데이터를 입력해주세요.');
      return;
    }

    setLtkUploading(true);
    setLtkError('');

    try {
      const parsedData = JSON.parse(ltkData);
      
      // profiles 배열에서 데이터 추출
      if (!parsedData.profiles || !Array.isArray(parsedData.profiles)) {
        throw new Error('올바른 LTK JSON 형식이 아닙니다. profiles 배열을 찾을 수 없습니다.');
      }

      // Beauty, Makeup 키워드 정의
      const beautyKeywords = ['beauty', 'makeup'];

      // 키워드 매칭 함수 (bio에서 검색)
      const findMatchingKeywords = (bio) => {
        if (!bio) return '';
        const lowerBio = bio.toLowerCase();
        const matchedKeywords = beautyKeywords.filter(keyword => 
          lowerBio.includes(keyword.toLowerCase())
        );
        return matchedKeywords.join(', ');
      };

      // profiles 데이터 처리
      const processedData = parsedData.profiles.map(profile => {
        const matchedKeywords = findMatchingKeywords(profile.bio);
        
        // Instagram URL 생성
        let instagramUrl = '';
        if (profile.instagram_name) {
          // @ 기호 제거
          const cleanInstagramName = profile.instagram_name.replace('@', '');
          instagramUrl = `https://www.instagram.com/${cleanInstagramName}`;
        }

        return {
          ltkName: profile.display_name || '',
          keywordMatching: matchedKeywords,
          instagramUrl: instagramUrl
        };
      });

      setLtkResult(processedData);
      
    } catch (error) {
      console.error('LTK 데이터 파싱 오류:', error);
      setLtkError('JSON 파싱 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setLtkUploading(false);
    }
  };

  const handleLtkClear = () => {
    setLtkData('');
    setLtkResult([]);
    setLtkError('');
  };

  // LTK 결과를 CSV 형태로 복사하는 함수
  const copyLtkToClipboard = () => {
    if (ltkResult.length === 0) return;

    const headers = ['LTK Name', '키워드 매칭', 'Instagram URL'];
    const csvContent = [
      headers.join('\t'),
      ...ltkResult.map(item => [
        item.ltkName,
        item.keywordMatching,
        item.instagramUrl
      ].join('\t'))
    ].join('\n');

    navigator.clipboard.writeText(csvContent).then(() => {
      alert('데이터가 클립보드에 복사되었습니다!');
    }).catch(err => {
      console.error('복사 실패:', err);
      alert('복사에 실패했습니다.');
    });
  };

  return (
    <div className="container">
      <Head>
        <title>Creator Data Parser</title>
        <meta name="description" content="크리에이터 데이터 파싱 도구" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="main">
        <h1 className="title">SimpleDB</h1>
        <p className="subtitle">다양한 플랫폼의 크리에이터 데이터를 파싱합니다</p>

        {/* 탭 네비게이션 */}
        <div className="tabNavigation">
          <button 
            className={`tabButton ${activeTab === 'tiktokone' ? 'active' : ''}`}
            onClick={() => setActiveTab('tiktokone')}
          >
            TikTokOne
          </button>
          <button 
            className={`tabButton ${activeTab === 'ltk' ? 'active' : ''}`}
            onClick={() => setActiveTab('ltk')}
          >
            LTK
          </button>
        </div>

        {/* 탭 내용 */}
        <div className="tabContent">
          {activeTab === 'tiktokone' ? (
            // TikTokOne 탭 내용
            <div className="uploadSection">
              <h2 style={{textAlign: 'center', marginBottom: '1.5rem', color: '#333'}}>
                TikTokOne 데이터 업로드
              </h2>
              
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
                  placeholder="JSON 데이터를 여기에 붙여넣기 하세요..."
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

              {error && (
                <div className={error.startsWith('✅') ? 'success' : 'error'}>
                  <strong>{error.startsWith('✅') ? '성공:' : '오류:'}</strong> {error}
                </div>
              )}

              {result && (
                <div className="result">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2>처리 결과</h2>
                    <button
                      onClick={copyResults}
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
                  
                  {result.processedData && result.processedData.length > 0 && (
                    <div className="sampleData">
                      <h3>처리된 데이터 ({result.processedData.length}개)</h3>
                      <div className="dataTable" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <table>
                          <thead>
                            <tr style={{backgroundColor: '#f8f9fa'}}>
                              <th style={{padding: '12px', border: '1px solid #ddd', fontWeight: 'bold', position: 'sticky', top: 0, backgroundColor: '#f8f9fa'}}>Handle Name</th>
                              <th style={{padding: '12px', border: '1px solid #ddd', fontWeight: 'bold', position: 'sticky', top: 0, backgroundColor: '#f8f9fa'}}>Email</th>
                              <th style={{padding: '12px', border: '1px solid #ddd', fontWeight: 'bold', position: 'sticky', top: 0, backgroundColor: '#f8f9fa'}}>Price</th>
                              <th style={{padding: '12px', border: '1px solid #ddd', fontWeight: 'bold', position: 'sticky', top: 0, backgroundColor: '#f8f9fa'}}>Engagement</th>
                              <th style={{padding: '12px', border: '1px solid #ddd', fontWeight: 'bold', position: 'sticky', top: 0, backgroundColor: '#f8f9fa'}}>Followers</th>
                              <th style={{padding: '12px', border: '1px solid #ddd', fontWeight: 'bold', position: 'sticky', top: 0, backgroundColor: '#f8f9fa'}}>TikTok URL</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.processedData.map((item, index) => (
                              <tr key={index}>
                                <td style={{padding: '8px', border: '1px solid #ddd'}}>{item.name || 'N/A'}</td>
                                <td style={{padding: '8px', border: '1px solid #ddd'}}>{item.email || 'N/A'}</td>
                                <td style={{padding: '8px', border: '1px solid #ddd'}}>{item.price || 'N/A'}</td>
                                <td style={{padding: '8px', border: '1px solid #ddd'}}>{item.engagement || 'N/A'}</td>
                                <td style={{padding: '8px', border: '1px solid #ddd'}}>{typeof item.followers === 'number' ? item.followers.toLocaleString() : 'N/A'}</td>
                                <td style={{padding: '8px', border: '1px solid #ddd'}}>
                                  {item.sns ? (
                                    <a href={item.sns} target="_blank" rel="noopener noreferrer" style={{color: '#007bff', textDecoration: 'none'}}>
                                      링크
                                    </a>
                                  ) : 'N/A'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            // LTK 탭 내용
            <div className="uploadSection">
              <h2 style={{textAlign: 'center', marginBottom: '1.5rem', color: '#333'}}>
                LTK 데이터 업로드
              </h2>
              
              <div className="textInputSection">
                <label className="textLabel">
                  LTK 데이터 입력
                </label>
                <textarea
                  value={ltkData}
                  onChange={(e) => {
                    setLtkData(e.target.value)
                    setLtkError(null)
                  }}
                  placeholder="LTK 데이터를 여기에 붙여넣어주세요..."
                  className="textArea"
                  rows={10}
                />
                <div className="textInfo">
                  <span className="charCount">
                    {ltkData.length.toLocaleString()} 자
                  </span>
                </div>
              </div>

              <div className="buttonGroup">
                <button
                  onClick={handleLtkClear}
                  className="clearButton"
                  disabled={ltkUploading}
                >
                  초기화
                </button>
                <button
                  onClick={handleLtkUpload}
                  disabled={!ltkData.trim() || ltkUploading}
                  className="uploadButton"
                >
                  {ltkUploading ? '처리 중...' : '업로드'}
                </button>
              </div>

              {ltkError && (
                <div className="error">
                  <strong>오류:</strong> {ltkError}
                </div>
              )}

              {ltkResult.length > 0 && (
                <div className="result">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2>처리 결과</h2>
                    <button
                      onClick={copyLtkToClipboard}
                      className="copyResultButton"
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
                    <p><strong>총 처리:</strong> {ltkResult.length}개</p>
                  </div>
                  
                  <div className="sampleData">
                    <h3>처리된 데이터 ({ltkResult.length}개)</h3>
                    <div className="dataTable" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      <table>
                        <thead>
                          <tr style={{backgroundColor: '#f8f9fa'}}>
                            <th style={{padding: '12px', border: '1px solid #ddd', fontWeight: 'bold', position: 'sticky', top: 0, backgroundColor: '#f8f9fa'}}>LTK Name</th>
                            <th style={{padding: '12px', border: '1px solid #ddd', fontWeight: 'bold', position: 'sticky', top: 0, backgroundColor: '#f8f9fa'}}>키워드 매칭</th>
                            <th style={{padding: '12px', border: '1px solid #ddd', fontWeight: 'bold', position: 'sticky', top: 0, backgroundColor: '#f8f9fa'}}>Instagram URL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ltkResult.map((item, index) => (
                            <tr key={index}>
                              <td style={{padding: '8px', border: '1px solid #ddd'}}>{item.ltkName || 'N/A'}</td>
                              <td style={{padding: '8px', border: '1px solid #ddd'}}>{item.keywordMatching || '-'}</td>
                              <td style={{padding: '8px', border: '1px solid #ddd'}}>
                                {item.instagramUrl ? (
                                  <a href={item.instagramUrl} target="_blank" rel="noopener noreferrer" style={{color: '#007bff', textDecoration: 'none'}}>
                                    {item.instagramUrl}
                                  </a>
                                ) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
