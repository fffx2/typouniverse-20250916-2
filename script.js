// =================================================================================
// INITIALIZATION & GLOBAL STATE
// =================================================================================

// 전역 상태 관리 객체
let appState = {
    service: '',
    platform: '',
    mood: { soft: 50, static: 50 },
    keyword: '',
    primaryColor: '',
    generatedResult: null // 생성된 최종 결과 저장
};

// 지식 베이스 데이터 저장 변수
let knowledgeBase = {};

document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    try {
        const response = await fetch('./knowledge_base.json');
        if (!response.ok) throw new Error('Network response was not ok');
        knowledgeBase = await response.json();
        setupNavigation();
        initializeMainPage();
        initializeLabPage();
    } catch (error) {
        console.error('Failed to initialize app:', error);
        updateAIMessage("시스템 초기화 중 오류가 발생했습니다. 페이지를 새로고침 해주세요.");
    }
}

// =================================================================================
// NAVIGATION
// =================================================================================

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link, .interactive-button');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = e.currentTarget.dataset.target;
            document.querySelectorAll('.main-page, .lab-page').forEach(page => {
                page.classList.remove('active');
                page.classList.add('hidden');
            });
            const targetPage = document.getElementById(targetId);
            if(targetPage) {
                targetPage.classList.remove('hidden');
                targetPage.classList.add('active');
            }
            document.querySelectorAll('.nav-link').forEach(nav => {
                nav.classList.toggle('active', nav.dataset.target === targetId);
            });
            // If navigating to lab, pass generated data
            if (targetId === 'lab-page' && appState.generatedResult) {
                const { bgColor, textColor, fontSize } = appState.generatedResult;
                updateLabPageWithData(bgColor, textColor, fontSize);
            }
        });
    });
}


// =================================================================================
// MAIN PAGE LOGIC (STEP 1, 2, 3)
// =================================================================================

function initializeMainPage() {
    initializeDropdowns();
    initializeSliders();
    document.getElementById('generate-btn').addEventListener('click', generateGuide);
    updateAIMessage("안녕하세요! TYPOUNIVERSE AI Design Assistant입니다. 어떤 프로젝트를 위한 디자인 가이드를 찾으시나요? 먼저 서비스의 목적과 타겟 플랫폼을 알려주세요.");
}

function initializeDropdowns() {
    const services = ['포트폴리오', '브랜드 홍보', '제품 판매', '정보 전달', '학습', '엔터테인먼트'];
    const platforms = ['iOS', 'Android', 'Web', 'Desktop', 'Tablet', 'Wearable', 'VR'];

    populateDropdown('service', services);
    populateDropdown('platform', platforms);

    document.getElementById('service-dropdown').addEventListener('click', () => toggleDropdown('service'));
    document.getElementById('platform-dropdown').addEventListener('click', () => toggleDropdown('platform'));
}

function populateDropdown(type, options) {
    const menu = document.getElementById(`${type}-menu`);
    menu.innerHTML = '';
    options.forEach(optionText => {
        const option = document.createElement('div');
        option.className = 'dropdown-option';
        option.textContent = optionText;
        option.onclick = () => selectOption(type, optionText);
        menu.appendChild(option);
    });
}

function toggleDropdown(type) {
    document.getElementById(`${type}-menu`).classList.toggle('show');
}

function selectOption(type, value) {
    document.getElementById(`${type}-text`).textContent = value;
    document.getElementById(`${type}-dropdown`).classList.add('selected');
    appState[type] = value;
    toggleDropdown(type);

    if (appState.service && appState.platform) {
        document.getElementById('step02').classList.remove('hidden');
        const platformKey = appState.platform.toLowerCase();
        const platformGuide = knowledgeBase.guidelines[platformKey];
        if (platformGuide) {
            updateAIMessage(`${appState.platform} 플랫폼을 선택하셨군요! ${platformGuide.description} 권장 본문 크기는 ${platformGuide.defaultSize}입니다. 이제 서비스의 핵심 분위기를 정해주세요.`);
        }
    }
}

function initializeSliders() {
    const softHardSlider = document.getElementById('soft-hard-slider');
    const staticDynamicSlider = document.getElementById('static-dynamic-slider');

    const updateMoodAndKeywords = () => {
        appState.mood.soft = parseInt(softHardSlider.value);
        appState.mood.static = parseInt(staticDynamicSlider.value);
        if (Math.abs(appState.mood.soft - 50) > 10 || Math.abs(appState.mood.static - 50) > 10) {
            document.getElementById('step03').classList.remove('hidden');
            renderKeywords();
        }
    };

    softHardSlider.addEventListener('input', updateMoodAndKeywords);
    staticDynamicSlider.addEventListener('input', updateMoodAndKeywords);
}


function renderKeywords() {
    const { soft, static: staticMood } = appState.mood;
    let group = (soft < 40 && staticMood >= 60) ? 'group1' :
                (soft < 40 && staticMood < 40) ? 'group2' :
                (soft >= 60 && staticMood < 40) ? 'group3' :
                (soft >= 60 && staticMood >= 60) ? 'group4' : 'group5';
    
    const { keywords, description } = knowledgeBase.iri_colors[group];
    const keywordContainer = document.getElementById('keyword-tags');
    keywordContainer.innerHTML = '';
    keywords.forEach(keyword => {
        const tag = document.createElement('div');
        tag.className = 'tag tag-light';
        tag.textContent = keyword;
        tag.onclick = () => selectKeyword(keyword, group);
        keywordContainer.appendChild(tag);
    });
    updateAIMessage(`선택하신 '${description}' 분위기에 맞는 키워드들을 확인해 보세요.`);
}

function selectKeyword(keyword, group) {
    appState.keyword = keyword;
    document.querySelectorAll('#keyword-tags .tag').forEach(tag => {
        tag.classList.toggle('selected', tag.textContent === keyword);
    });
    
    const { key_colors } = knowledgeBase.iri_colors[group];
    const colorContainer = document.getElementById('color-selection');
    colorContainer.innerHTML = '';
    key_colors.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.background = color;
        swatch.onclick = () => selectColor(color);
        colorContainer.appendChild(swatch);
    });
    
    document.getElementById('color-selection-wrapper').style.display = 'block';
    updateAIMessage(`선택하신 '${keyword}' 키워드에 어울리는 대표 색상들을 제안합니다. 주조 색상을 선택해주세요.`);
}

function selectColor(color) {
    appState.primaryColor = color;
    document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.classList.toggle('selected', swatch.style.backgroundColor === color);
    });
    document.getElementById('generate-btn').classList.remove('hidden');
    updateAIMessage("최고의 선택입니다! 이 색상을 기준으로 가이드를 생성합니다.");
}

async function generateGuide() {
    updateAIMessage("AI가 사용자의 선택을 기반으로 최적의 디자인 가이드라인을 생성하고 있습니다. 잠시만 기다려주세요...");

    try {
        const response = await fetch('/.netlify/functions/generate-guide', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ context: appState, knowledgeBase })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Server error');
        }
        
        const result = await response.json();
        appState.generatedResult = result; //결과 저장
        displayGuide(result);
    } catch (error) {
        console.error('Error generating guide:', error);
        updateAIMessage(`가이드 생성에 실패했습니다: ${error.message}`);
    }
}


function displayGuide(result) {
    const { colorSystem, typography, bgColor, textColor, fontSize } = result;

    // Color System
    document.getElementById('primary-main').style.backgroundColor = colorSystem.primary.main;
    document.getElementById('primary-main').querySelector('.color-code').textContent = colorSystem.primary.main;
    document.getElementById('primary-light').style.backgroundColor = colorSystem.primary.light;
    document.getElementById('primary-light').querySelector('.color-code').textContent = colorSystem.primary.light;
    document.getElementById('primary-dark').style.backgroundColor = colorSystem.primary.dark;
    document.getElementById('primary-dark').querySelector('.color-code').textContent = colorSystem.primary.dark;
    
    document.getElementById('secondary-main').style.backgroundColor = colorSystem.secondary.main;
    document.getElementById('secondary-main').querySelector('.color-code').textContent = colorSystem.secondary.main;
    document.getElementById('secondary-light').style.backgroundColor = colorSystem.secondary.light;
    document.getElementById('secondary-light').querySelector('.color-code').textContent = colorSystem.secondary.light;
    document.getElementById('secondary-dark').style.backgroundColor = colorSystem.secondary.dark;
    document.getElementById('secondary-dark').querySelector('.color-code').textContent = colorSystem.secondary.dark;

    // Typography
    document.getElementById('contrast-description').textContent = typography.contrast;
    document.getElementById('font-size-description').textContent = typography.size;

    // Show Report
    document.getElementById('ai-message').style.display = 'none';
    document.getElementById('ai-report').style.display = 'block';
}

function updateAIMessage(message) {
    const aiMessageContainer = document.getElementById('ai-message');
    aiMessageContainer.textContent = message;
    aiMessageContainer.style.display = 'block';
    document.getElementById('ai-report').style.display = 'none';
}


// =================================================================================
// LAB PAGE LOGIC
// =================================================================================

function initializeLabPage() {
    // Contrast Checker
    const bgColorInput = document.getElementById('bg-color-input');
    const textColorInput = document.getElementById('text-color-input');
    const bgColorPicker = document.getElementById('bg-color-picker');
    const textColorPicker = document.getElementById('text-color-picker');
    const lineHeightInput = document.getElementById('line-height-input');

    bgColorInput.addEventListener('input', () => { bgColorPicker.value = bgColorInput.value; updateContrast(); });
    textColorInput.addEventListener('input', () => { textColorPicker.value = textColorInput.value; updateContrast(); });
    bgColorPicker.addEventListener('input', () => { bgColorInput.value = bgColorPicker.value; updateContrast(); });
    textColorPicker.addEventListener('input', () => { textColorInput.value = textColorPicker.value; updateContrast(); });
    lineHeightInput.addEventListener('input', updateLineHeight);
    
    updateContrast();

    // Font Unit Converter
    const fontSizeInput = document.getElementById('font-size-input');
    fontSizeInput.addEventListener('input', updateFontUnits);
    updateFontUnits();

    // Colorblind Simulator
    document.querySelectorAll('input[name="cbType"]').forEach(radio => {
        radio.addEventListener('change', updateColorblindSimulator);
    });
    updateColorblindSimulator();
}


function updateLabPageWithData(bgColor, textColor, fontSize) {
    // Contrast Checker
    document.getElementById('bg-color-input').value = bgColor;
    document.getElementById('bg-color-picker').value = bgColor;
    document.getElementById('text-color-input').value = textColor;
    document.getElementById('text-color-picker').value = textColor;
    updateContrast();

    // Font Unit Converter
    document.getElementById('font-size-input').value = parseInt(fontSize, 10);
    updateFontUnits();

    // Colorblind Simulator
    updateColorblindSimulator();
}


// --- Contrast Checker Functions ---
function getLuminance(hex) {
    let rgb = hexToRgb(hex);
    if (!rgb) return 0;
    let [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
        c /= 255.0;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getContrastRatio(hex1, hex2) {
    const lum1 = getLuminance(hex1);
    const lum2 = getLuminance(hex2);
    return (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
}

function updateContrast() {
    const bgColor = document.getElementById('bg-color-input').value;
    const textColor = document.getElementById('text-color-input').value;
    const ratio = getContrastRatio(bgColor, textColor);

    document.getElementById('contrast-ratio').textContent = `${ratio.toFixed(2)} : 1`;
    document.getElementById('text-preview').style.backgroundColor = bgColor;
    document.getElementById('text-preview').style.color = textColor;

    const aaStatus = document.getElementById('aa-status');
    const aaaStatus = document.getElementById('aaa-status');

    aaStatus.classList.toggle('pass', ratio >= 4.5);
    aaStatus.classList.toggle('fail', ratio < 4.5);
    aaaStatus.classList.toggle('pass', ratio >= 7);
    aaaStatus.classList.toggle('fail', ratio < 7);

    updateColorblindSimulator();
}

function updateLineHeight() {
    const lineHeight = document.getElementById('line-height-input').value;
    document.getElementById('line-height-value').textContent = lineHeight;
    document.getElementById('text-preview').style.lineHeight = lineHeight;
}

// --- Font Unit Converter ---
function updateFontUnits() {
    const pxValue = parseFloat(document.getElementById('font-size-input').value) || 16;
    const ptValue = (pxValue * 0.75).toFixed(1);
    const remValue = (pxValue / 16).toFixed(2);
    const spValue = pxValue; // Assuming 1:1 mapping for simplicity

    document.getElementById('pt-example').textContent = `${ptValue}pt`;
    document.getElementById('rem-example').textContent = `${remValue}rem`;
    document.getElementById('sp-example').textContent = `${spValue}sp`;
}

// --- Colorblind Simulator ---
function updateColorblindSimulator() {
    const type = document.querySelector('input[name="cbType"]:checked').value;
    const bgColor = document.getElementById('bg-color-input').value;
    const textColor = document.getElementById('text-color-input').value;

    const origBg = document.getElementById('origBg');
    const origText = document.getElementById('origText');
    origBg.style.backgroundColor = bgColor;
    origBg.querySelector('.hex-code-sim').textContent = bgColor;
    origText.style.backgroundColor = textColor;
    origText.querySelector('.hex-code-sim').textContent = textColor;

    const simBgHex = (type === 'normal') ? bgColor : simulateColorblindness(bgColor);
    const simTextHex = (type === 'normal') ? textColor : simulateColorblindness(textColor);

    const simBg = document.getElementById('simBg');
    const simText = document.getElementById('simText');
    simBg.style.backgroundColor = simBgHex;
    simBg.querySelector('.hex-code-sim').textContent = simBgHex;
    simText.style.backgroundColor = simTextHex;
    simText.querySelector('.hex-code-sim').textContent = simTextHex;
    
    const contrast = getContrastRatio(simBgHex, simTextHex);
    updateAccessibilitySolution(type, contrast);
}

function simulateColorblindness(hex) {
    // This is a simplified simulation for Protanopia/Deuteranopia (Red-Green)
    const rgb = hexToRgb(hex);
    if (!rgb) return '#000000';
    
    // Using a common transformation matrix for Deuteranopia
    const r = rgb.r * 0.625 + rgb.g * 0.375 + rgb.b * 0;
    const g = rgb.r * 0.7 + rgb.g * 0.3 + rgb.b * 0;
    const b = rgb.r * 0 + rgb.g * 0.3 + rgb.b * 0.7;

    return rgbToHex(Math.round(r), Math.round(g), Math.round(b));
}

function updateAccessibilitySolution(type, contrast) {
    const solutionText = document.getElementById('solution-text');
    if (type === 'normal') {
        solutionText.textContent = "현재 일반 시각 기준으로 색상을 보고 있습니다. '적록색약 시각'을 선택하여 색상 접근성을 시뮬레이션 해보세요.";
    } else {
        if (contrast < 3) {
            solutionText.textContent = `시뮬레이션 결과 명도 대비가 ${contrast.toFixed(2)}:1로 매우 낮아 구분이 어렵습니다. 색상의 밝기(명도)나 채도를 조절하여 대비를 높이는 것을 권장합니다. 텍스트에 밑줄이나 굵기 등 시각적 단서를 추가하는 것도 좋은 대안입니다.`;
        } else if (contrast < 4.5) {
            solutionText.textContent = `시뮬레이션 결과 명도 대비가 ${contrast.toFixed(2)}:1로 다소 낮습니다. 색상 외에 아이콘, 텍스처, 패턴 등을 함께 사용하여 정보를 전달하는 '다중 부호화' 방식을 고려해 보세요.`;
        } else {
            solutionText.textContent = `시뮬레이션 결과 명도 대비가 ${contrast.toFixed(2)}:1로 양호합니다. 현재 색상 조합은 적록색약 사용자도 충분히 인지할 수 있습니다.`;
        }
    }
}


// =================================================================================
// UTILITY FUNCTIONS
// =================================================================================

function hexToRgb(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function rgbToHex(r, g, b) {
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}