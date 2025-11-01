// script.js - English UI Version

import { initDB, saveFiles, getFiles } from './db.js';

// === UI String Constants for Internationalization (i18n) ===
const UI_STRINGS = {
    // General
    allFiles: 'All Files',
    page: 'Page',
    file: 'File',
    copy: 'Copy',
    
    // Notifications & Feedback
    pdfLibLoadError: 'PDF library failed to load. Please refresh the page.',
    loadingPDFs: 'Loading PDFs...',
    noValidPdfsSelected: 'No valid PDF files were selected.',
    loadSuccess: (pdfCount, pageCount) => `Successfully loaded ${pdfCount} PDF(s) with a total of ${pageCount} pages.`,
    pdfReadError: 'An error occurred while reading PDF files: ',
    loadPdfFirst: 'Please load a PDF file first.',
    pageRenderingInProgress: 'Page is still rendering, please wait.',
    pageInfoError: 'Could not get current page information.',
    highlighterCleared: 'Highlighter marks have been cleared.',
    textCopied: 'Page text copied to clipboard!',
    textCopyError: 'An error occurred while copying page text.',
    paragraphCopied: 'Paragraph copied!',
    copyFailed: 'Copy failed.',
    lastResult: 'Reached the last result.',
    firstResult: 'Reached the first result.',

    // Search
    searchResultsDefault: 'Search Results',
    searching: 'Searching...',
    invalidRegex: 'Invalid Regular Expression: ',
    matchFound: 'Match found',
    keywordNotFound: 'Keyword not found',
    keywordNotFoundPanel: '<p style="padding: 10px;">Keyword not found.</p>',
    noMatchesFound: 'No matching results found.',
    matchesFound: (count) => `Found ${count} matching results.`,
    searchError: 'Search Error',
    searchErrorPanel: '<p style="padding: 10px;">An error occurred during the search.</p>',
    searchExecutionError: 'An error occurred during the search.',
    noResultsInFile: 'No search results in this file',
    resultSummary: (page, summary) => `Page ${page}: ${summary}`,
    resultPageInfo: (page, docName) => `Page ${page} (File: ${docName})`,

    // Export & Share
    exporting: 'Exporting...',
    exportCanvasContextError: 'Could not get rendering context for the export canvas.',
    exportSuccess: 'Page exported successfully.',
    exportFail: 'Failed to export image: ',
    preparing: 'Preparing...',
    shareApiNotSupported: 'Your browser does not support the Web Share API.',
    shareFileNotSupported: 'Your browser does not support sharing files.',
    shareFailed: 'Share failed: ',
    shareTitle: (page) => `PDF Global Page ${page}`,
    shareText: (localPage, docName) => `From page ${localPage} of ${docName} (PDF Tool)`,

    // Tooltips (title attributes)
    highlighterOn: 'Enable Highlighter',
    highlighterOff: 'Disable Highlighter',
    textSelectionOn: 'Enable Text Selection',
    textSelectionOff: 'Disable Text Selection',
    magnifierOn: 'Enable Magnifier',
    magnifierOff: 'Disable Magnifier',
    copyPageText: 'Copy page text',
    copyPageTextDisabled: 'Enable Text Selection (TS) mode first',
    paragraphSelection: 'Enable Paragraph Selection',
    paragraphSelectionDisabled: 'Enable Text Selection (TS) mode first',

    // Console Logs
    initSuccess: '✓ PDF Reader optimized and initialized.',
    shortcutsTitle: 'Keyboard Shortcuts:',
    shortcutsNav: '  ← / → : Previous / Next Page (or Result)',
    shortcutsBounds: '  Home / End : First / Last Page',
    shortcutsSearch: '  Ctrl+F : Focus Search Input',
    shortcutsZoom: '  + / - : Zoom In / Zoom Out',
    shortcutsZoomReset: '  Ctrl+0 : Reset Zoom',
};


// === 全域變數 ===
let pdfDocs = [];
let pageMap = [];
let globalTotalPages = 0;
let currentPage = 1;
let pageRendering = false;
let searchResults = [];
let currentFileFilter = 'all'; 

let currentZoomMode = 'height';
let currentScale = 1.0;

let paragraphSelectionModeActive = false;
let currentPageTextContent = null;
let currentViewport = null;
let thumbnailObserver = null;

// === DOM 元素選擇 ===
const canvas = document.getElementById('pdf-canvas');
const ctx = canvas?.getContext('2d');
const toolbar = document.getElementById('toolbar');
const toolbarToggleTab = document.getElementById('toolbar-toggle-tab');
const appContainer = document.getElementById('app-container');
const pdfContainer = document.getElementById('pdf-container');
const textLayerDivGlobal = document.getElementById('text-layer');
const goToFirstPageBtn = document.getElementById('go-to-first-page');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageNumDisplay = document.getElementById('page-num-display');
const pageToGoInput = document.getElementById('page-to-go');
const goToPageBtn = document.getElementById('go-to-page-btn');
const pageSlider = document.getElementById('page-slider');
const resultsDropdown = document.getElementById('resultsDropdown');
const panelResultsDropdown = document.getElementById('panelResultsDropdown');
const fileFilterDropdown = document.getElementById('fileFilterDropdown');
const panelFileFilterDropdown = document.getElementById('panelFileFilterDropdown');
const searchInputElem = document.getElementById('searchInput');
const searchActionButton = document.getElementById('search-action-button');
const searchResultsPanel = document.getElementById('search-results-panel');
const resultsList = document.getElementById('results-list');
const exportPageBtn = document.getElementById('export-page-btn');
const sharePageBtn = document.getElementById('share-page-btn');
const toggleUnderlineBtn = document.getElementById('toggle-underline-btn');
const toggleHighlighterBtn = document.getElementById('toggle-highlighter-btn');
const clearHighlighterBtn = document.getElementById('clear-highlighter-btn');
const toggleTextSelectionBtn = document.getElementById('toggle-text-selection-btn');
const copyPageTextBtn = document.getElementById('copy-page-text-btn');
const toggleParagraphSelectionBtn = document.getElementById('toggle-paragraph-selection-btn');
const drawingCanvas = document.getElementById('drawing-canvas');
const drawingCtx = drawingCanvas?.getContext('2d');
const magnifierGlass = document.getElementById('magnifier-glass');
const magnifierCanvas = document.getElementById('magnifier-canvas');
const localMagnifierCtx = magnifierCanvas?.getContext('2d');
const toggleLocalMagnifierBtn = document.getElementById('toggle-local-magnifier-btn');
const localMagnifierZoomControlsDiv = document.getElementById('local-magnifier-zoom-controls');
const localMagnifierZoomSelector = document.getElementById('local-magnifier-zoom-selector');
const zoomOutBtn = document.getElementById('zoom-out-btn');
const zoomInBtn = document.getElementById('zoom-in-btn');
const fitWidthBtns = document.querySelectorAll('.fit-width-btn');
const fitHeightBtns = document.querySelectorAll('.fit-height-btn');
const zoomLevelDisplay = document.getElementById('zoom-level-display');
const resizer = document.getElementById('resizer');
const mainContent = document.getElementById('main-content');
const fileInput = document.getElementById('fileInput');
const fileInputLabel = document.querySelector('label[for="fileInput"]');
const clearSessionBtn = document.getElementById('clear-session-btn');

// === 模式狀態 ===
let localMagnifierEnabled = false;
let LOCAL_MAGNIFIER_SIZE = 120;
let LOCAL_MAGNIFIER_ZOOM_LEVEL = 2.5;
let showSearchResultsHighlights = true;
let highlighterEnabled = false;
let textSelectionModeActive = false;
let isDrawing = false;
let lastX = 0;
let lastY = 0;

// === 核心功能：重置應用 ===
function resetApp() {
    pdfDocs = [];
    pageMap = [];
    globalTotalPages = 0;
    currentPage = 1;
    searchResults = [];
    currentFileFilter = 'all';

    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    if (textLayerDivGlobal) textLayerDivGlobal.innerHTML = '';
    if (resultsList) resultsList.innerHTML = '';
    
    const dropdowns = [
        { elem: resultsDropdown, default: `<option value="">${UI_STRINGS.searchResultsDefault}</option>` },
        { elem: panelResultsDropdown, default: `<option value="">${UI_STRINGS.searchResultsDefault}</option>` },
        { elem: fileFilterDropdown, default: `<option value="all">${UI_STRINGS.allFiles}</option>` },
        { elem: panelFileFilterDropdown, default: `<option value="all">${UI_STRINGS.allFiles}</option>` }
    ];
    dropdowns.forEach(({ elem, default: defaultHTML }) => {
        if (elem) elem.innerHTML = defaultHTML;
    });

    if (fileInput) {
        fileInput.style.display = 'block';
        fileInput.value = null;
    }
    if (fileInputLabel) fileInputLabel.style.display = 'block';
    if (clearSessionBtn) clearSessionBtn.style.display = 'none';

    updatePageControls();
    updateResultsNav();
}

// === 核心功能：載入和處理檔案 ===
async function loadAndProcessFiles(files) {
    if (!files?.length) return;
    
    if (typeof pdfjsLib === 'undefined') {
        showNotification(UI_STRINGS.pdfLibLoadError, 'error');
        return;
    }
    
    showLoadingOverlay(UI_STRINGS.loadingPDFs);
    
    resetApp();
    
    currentZoomMode = 'height';
    if (searchInputElem) searchInputElem.value = '';
    showSearchResultsHighlights = true;
    textLayerDivGlobal?.classList.remove('highlights-hidden');
    deactivateAllModes();

    const loadingPromises = Array.from(files).map(file => {
        return new Promise((resolve) => {
            if (!file || file.type !== 'application/pdf') {
                resolve(null);
                return;
            }
            const reader = new FileReader();
            reader.onload = function() {
                const typedarray = new Uint8Array(this.result);
                pdfjsLib.getDocument({ 
                    data: typedarray, 
                    isEvalSupported: false, 
                    enableXfa: false 
                }).promise.then(pdf => {
                    resolve({ pdf, name: file.name });
                }).catch(reason => {
                    console.error(`Error loading ${file.name}:`, reason);
                    resolve(null);
                });
            };
            reader.readAsArrayBuffer(file);
        });
    });

    try {
        const results = await Promise.all(loadingPromises);
        const loadedPdfs = results.filter(r => r !== null);

        if (loadedPdfs.length === 0) {
            hideLoadingOverlay();
            showNotification(UI_STRINGS.noValidPdfsSelected, 'error');
            resetApp();
            return;
        }

        loadedPdfs.forEach((result, docIndex) => {
            pdfDocs.push(result.pdf);
            for (let i = 1; i <= result.pdf.numPages; i++) {
                pageMap.push({ 
                    docIndex, 
                    localPage: i, 
                    docName: result.name 
                });
            }
        });
        
        globalTotalPages = pageMap.length;
        
        hideLoadingOverlay();
        showNotification(UI_STRINGS.loadSuccess(loadedPdfs.length, globalTotalPages), 'success');
        
        renderPage(1);

        if (fileInput) fileInput.style.display = 'none';
        if (fileInputLabel) fileInputLabel.style.display = 'none';
        if (clearSessionBtn) clearSessionBtn.style.display = 'block';

    } catch (error) {
        hideLoadingOverlay();
        showNotification(UI_STRINGS.pdfReadError + error, 'error');
        console.error('Error during file processing:', error);
        resetApp();
    }
}

// === 檔案輸入處理 ===
fileInput?.addEventListener('change', async function(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    try {
        await saveFiles(files);
        const restoreContainer = document.getElementById('restore-session-container');
        if (restoreContainer) restoreContainer.style.display = 'none';
    } catch (dbError) {
        console.warn("Could not save session to IndexedDB", dbError);
    }

    try {
        await loadAndProcessFiles(files);
        
        if (window.innerWidth <= 768 && appContainer?.classList.contains('menu-active')) {
            appContainer.classList.remove('menu-active');
        }
    } catch (loadError) {
        console.error("Failed to load or process PDF files:", loadError);
        showNotification("Error loading or processing PDF files", 'error');
    }
});

clearSessionBtn?.addEventListener('click', resetApp);

// === 輔助函數：取得文件和頁面資訊 ===
function getDocAndLocalPage(globalPage) {
    if (globalPage < 1 || globalPage > globalTotalPages || !pageMap.length) return null;
    const mapping = pageMap[globalPage - 1];
    if (!mapping || pdfDocs[mapping.docIndex] === undefined) return null;
    return {
        doc: pdfDocs[mapping.docIndex],
        localPage: mapping.localPage,
        docName: mapping.docName
    };
}

// === 放大鏡功能 ===
function initLocalMagnifier() {
    if (magnifierCanvas && magnifierGlass) {
        magnifierGlass.style.width = `${LOCAL_MAGNIFIER_SIZE}px`;
        magnifierGlass.style.height = `${LOCAL_MAGNIFIER_SIZE}px`;
        magnifierCanvas.width = LOCAL_MAGNIFIER_SIZE;
        magnifierCanvas.height = LOCAL_MAGNIFIER_SIZE;
    }
    if (localMagnifierZoomSelector) {
        LOCAL_MAGNIFIER_ZOOM_LEVEL = parseFloat(localMagnifierZoomSelector.value);
    }
    if (localMagnifierZoomControlsDiv) {
        localMagnifierZoomControlsDiv.style.display = 'none';
    }
}

function updateLocalMagnifier(clientX, clientY) {
    if (!localMagnifierEnabled || !canvas || !magnifierGlass || !localMagnifierCtx || !pdfContainer) {
        if (magnifierGlass) magnifierGlass.style.display = 'none';
        return;
    }
    
    const pdfContainerRect = pdfContainer.getBoundingClientRect();
    const pointXInContainer = clientX - pdfContainerRect.left;
    const pointYInContainer = clientY - pdfContainerRect.top;
    const canvasRectInContainer = {
        left: canvas.offsetLeft,
        top: canvas.offsetTop,
        right: canvas.offsetLeft + canvas.offsetWidth,
        bottom: canvas.offsetTop + canvas.offsetHeight
    };

    if (pointXInContainer < canvasRectInContainer.left || 
        pointXInContainer > canvasRectInContainer.right || 
        pointYInContainer < canvasRectInContainer.top || 
        pointYInContainer > canvasRectInContainer.bottom) {
        magnifierGlass.style.display = 'none';
        return;
    }
    
    magnifierGlass.style.display = 'block';

    const pointXOnCanvasCSS = pointXInContainer - canvas.offsetLeft;
    const pointYOnCanvasCSS = pointYInContainer - canvas.offsetTop;
    const scaleX = canvas.width / canvas.offsetWidth;
    const scaleY = canvas.height / canvas.offsetHeight;
    const srcX = pointXOnCanvasCSS * scaleX;
    const srcY = pointYOnCanvasCSS * scaleY;
    
    const srcRectCSSWidth = LOCAL_MAGNIFIER_SIZE / LOCAL_MAGNIFIER_ZOOM_LEVEL;
    const srcRectCSSHeight = LOCAL_MAGNIFIER_SIZE / LOCAL_MAGNIFIER_ZOOM_LEVEL;
    const srcRectPixelWidth = srcRectCSSWidth * scaleX;
    const srcRectPixelHeight = srcRectCSSHeight * scaleY;
    const srcRectX = srcX - (srcRectPixelWidth / 2);
    const srcRectY = srcY - (srcRectPixelHeight / 2);

    localMagnifierCtx.clearRect(0, 0, LOCAL_MAGNIFIER_SIZE, LOCAL_MAGNIFIER_SIZE);
    localMagnifierCtx.fillStyle = 'white';
    localMagnifierCtx.fillRect(0, 0, LOCAL_MAGNIFIER_SIZE, LOCAL_MAGNIFIER_SIZE);
    localMagnifierCtx.drawImage(
        canvas, 
        srcRectX, srcRectY, 
        srcRectPixelWidth, srcRectPixelHeight,
        0, 0, 
        LOCAL_MAGNIFIER_SIZE, LOCAL_MAGNIFIER_SIZE
    );

    if (drawingCanvas?.width > 0 && drawingCanvas?.height > 0) {
        const srcDrawRectX = pointXOnCanvasCSS - (srcRectCSSWidth / 2);
        const srcDrawRectY = pointYOnCanvasCSS - (srcRectCSSHeight / 2);
        localMagnifierCtx.drawImage(
            drawingCanvas,
            srcDrawRectX, srcDrawRectY,
            srcRectCSSWidth, srcRectCSSHeight,
            0, 0,
            LOCAL_MAGNIFIER_SIZE, LOCAL_MAGNIFIER_SIZE
        );
    }

    let magnifierTop = pointYInContainer - LOCAL_MAGNIFIER_SIZE - 10;
    let magnifierLeft = pointXInContainer - (LOCAL_MAGNIFIER_SIZE / 2);
    magnifierTop = Math.max(0, Math.min(magnifierTop, pdfContainer.clientHeight - LOCAL_MAGNIFIER_SIZE - 5));
    magnifierLeft = Math.max(0, Math.min(magnifierLeft, pdfContainer.clientWidth - LOCAL_MAGNIFIER_SIZE - 5));
    magnifierGlass.style.top = `${magnifierTop + pdfContainer.scrollTop}px`;
    magnifierGlass.style.left = `${magnifierLeft + pdfContainer.scrollLeft}px`;
}

// === 更新 UI 控制 ===
function updateZoomControls() {
    if (!zoomLevelDisplay) return;
    zoomLevelDisplay.textContent = `${Math.round(currentScale * 100)}%`;

    fitWidthBtns?.forEach(btn => {
        btn.classList.toggle('active', currentZoomMode === 'width');
    });
    
    fitHeightBtns?.forEach(btn => {
        btn.classList.toggle('active', currentZoomMode === 'height');
    });
}

function updatePageControls() {
    const fabContainer = document.getElementById('floating-action-buttons');
    const hasDocs = pdfDocs.length > 0;

    if (!pageNumDisplay || !fabContainer) {
        if (!hasDocs && pageNumDisplay) pageNumDisplay.textContent = '- / -';
        if (!hasDocs && fabContainer) fabContainer.style.display = 'none';
        return;
    }

    const allControls = [
        goToFirstPageBtn, prevPageBtn, nextPageBtn, pageToGoInput, goToPageBtn, 
        pageSlider, toggleUnderlineBtn, toggleHighlighterBtn, clearHighlighterBtn, 
        toggleTextSelectionBtn, sharePageBtn, exportPageBtn, toggleLocalMagnifierBtn, 
        localMagnifierZoomSelector, copyPageTextBtn, zoomInBtn, zoomOutBtn,
        ...fitWidthBtns, ...fitHeightBtns, toggleParagraphSelectionBtn
    ];
    
    allControls.forEach(el => {
        if (el) el.disabled = !hasDocs;
    });

    if (!hasDocs) {
        pageNumDisplay.textContent = '- / -';
        if (pageToGoInput) {
            pageToGoInput.value = '';
            pageToGoInput.max = 1;
        }
        if (pageSlider) {
            pageSlider.max = 1;
            pageSlider.value = 1;
        }
        fabContainer.style.display = 'none';
        if (localMagnifierZoomControlsDiv) {
            localMagnifierZoomControlsDiv.style.display = 'none';
        }
        updateResultsNav();
        return;
    }

    const docInfo = getDocAndLocalPage(currentPage);
    const pageInfoText = UI_STRINGS.pageIndicator(currentPage, globalTotalPages);
    let fullDisplayText = pageInfoText;
    const fullDocNameForTitle = docInfo?.docName || 'N/A';
    
    if (docInfo?.docName) {
        const cleanName = docInfo.docName.replace(/\.pdf$/i, '');
        const START_CHARS = 10;
        const END_CHARS = 10;
        let displayDocName = cleanName;
        
        if (cleanName.length > (START_CHARS + END_CHARS)) {
            const startPart = cleanName.substring(0, START_CHARS);
            const endPart = cleanName.slice(-END_CHARS);
            displayDocName = `${startPart}...${endPart}`;
        }
        fullDisplayText += ` (${displayDocName})`;
    }
    
    pageNumDisplay.textContent = fullDisplayText;
    pageNumDisplay.title = pageInfoText + UI_STRINGS.fileIndicator(fullDocNameForTitle);
   
    if (pageToGoInput) {
        pageToGoInput.value = currentPage;
        pageToGoInput.max = globalTotalPages;
    }
    
    if (goToFirstPageBtn) goToFirstPageBtn.disabled = (currentPage === 1);
    if (prevPageBtn) prevPageBtn.disabled = (currentPage === 1);
    if (nextPageBtn) nextPageBtn.disabled = (currentPage === globalTotalPages);
    
    if (pageSlider) {
        pageSlider.max = globalTotalPages;
        pageSlider.value = currentPage;
        pageSlider.disabled = (globalTotalPages === 1);
    }

    fabContainer.style.display = 'flex';

    toggleUnderlineBtn?.classList.toggle('active', showSearchResultsHighlights);
    toggleHighlighterBtn?.classList.toggle('active', highlighterEnabled);
    toggleHighlighterBtn.title = highlighterEnabled ? UI_STRINGS.highlighterOff : UI_STRINGS.highlighterOn;
    
    toggleTextSelectionBtn?.classList.toggle('active', textSelectionModeActive);
    toggleTextSelectionBtn.title = textSelectionModeActive ? UI_STRINGS.textSelectionOff : UI_STRINGS.textSelectionOn;
    
    toggleParagraphSelectionBtn?.classList.toggle('active', paragraphSelectionModeActive);
    
    if (sharePageBtn) sharePageBtn.disabled = !navigator.share;
    
    toggleLocalMagnifierBtn?.classList.toggle('active', localMagnifierEnabled);
    toggleLocalMagnifierBtn.title = localMagnifierEnabled ? UI_STRINGS.magnifierOff : UI_STRINGS.magnifierOn;
    
    if (localMagnifierZoomControlsDiv) {
        localMagnifierZoomControlsDiv.style.display = (hasDocs && localMagnifierEnabled) ? 'flex' : 'none';
    }

    const isTSModeActive = textSelectionModeActive;
    if (copyPageTextBtn) {
        copyPageTextBtn.disabled = !hasDocs || !isTSModeActive;
        copyPageTextBtn.title = isTSModeActive ? UI_STRINGS.copyPageText : UI_STRINGS.copyPageTextDisabled;
    }
    
    if (toggleParagraphSelectionBtn) {
        toggleParagraphSelectionBtn.disabled = !hasDocs || !isTSModeActive;
        toggleParagraphSelectionBtn.title = isTSModeActive ? UI_STRINGS.paragraphSelection : UI_STRINGS.paragraphSelectionDisabled;
    }

    updateResultsNav();
    updateZoomControls();
}

// === 工具列切換 ===
toolbarToggleTab?.addEventListener('click', () => {
    appContainer?.classList.toggle('menu-active');
});

pdfContainer?.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && 
        appContainer?.classList.contains('menu-active') && 
        !toolbar?.contains(e.target)) {
        appContainer.classList.remove('menu-active');
    }
});

// === 渲染頁面 ===
function renderPage(globalPageNum, highlightPattern = null) {
    if (!pdfDocs.length || !pdfContainer || !canvas || !ctx) return;
    
    pageRendering = true;
    currentPageTextContent = null;
    currentViewport = null;
    updatePageControls();
    
    drawingCtx?.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    clearParagraphHighlights();

    const pageInfo = getDocAndLocalPage(globalPageNum);
    if (!pageInfo) {
        pageRendering = false;
        updatePageControls();
        return;
    }

    const { doc, localPage } = pageInfo;

    doc.getPage(localPage).then(page => {
        const viewportOriginal = page.getViewport({ scale: 1 });
        let scaleForCss;

        if (currentZoomMode === 'width') {
            scaleForCss = pdfContainer.clientWidth / viewportOriginal.width;
        } else if (currentZoomMode === 'height') {
            const availableHeight = pdfContainer.clientHeight - 20;
            scaleForCss = availableHeight / viewportOriginal.height;
        } else {
            scaleForCss = currentScale;
        }
        currentScale = scaleForCss;

        if (canvas.dataset.originalBorder && pdfDocs.length > 0) {
            canvas.style.border = canvas.dataset.originalBorder;
        } else if (pdfDocs.length > 0) {
            canvas.style.border = '1px solid #000';
        }

        textLayerDivGlobal?.classList.toggle('highlights-hidden', !showSearchResultsHighlights);

        const viewportCss = page.getViewport({ scale: scaleForCss });
        currentViewport = viewportCss;
        const devicePixelRatio = window.devicePixelRatio || 1;
        const QUALITY_FACTOR = 2.0;
        const renderScale = scaleForCss * devicePixelRatio * QUALITY_FACTOR;
        const viewportRender = page.getViewport({ scale: renderScale });

        canvas.width = viewportRender.width;
        canvas.height = viewportRender.height;
        canvas.style.width = `${viewportCss.width}px`;
        canvas.style.height = `${viewportCss.height}px`;

        const renderContext = {
            canvasContext: ctx,
            viewport: viewportRender
        };

        page.render(renderContext).promise.then(() => {
            pageRendering = false;
            updatePageControls();

            const canvasOffsetTop = canvas.offsetTop;
            const canvasOffsetLeft = canvas.offsetLeft;
            
            if (textLayerDivGlobal) {
                textLayerDivGlobal.style.width = `${viewportCss.width}px`;
                textLayerDivGlobal.style.height = `${viewportCss.height}px`;
                textLayerDivGlobal.style.top = `${canvasOffsetTop}px`;
                textLayerDivGlobal.style.left = `${canvasOffsetLeft}px`;
            }

            if (drawingCanvas) {
                drawingCanvas.width = viewportCss.width;
                drawingCanvas.height = viewportCss.height;
                drawingCanvas.style.top = `${canvasOffsetTop}px`;
                drawingCanvas.style.left = `${canvasOffsetLeft}px`;
            }

            if (drawingCtx) {
                drawingCtx.strokeStyle = 'rgba(255, 255, 0, 0.1)';
                drawingCtx.lineWidth = 15;
                drawingCtx.lineJoin = 'round';
                drawingCtx.lineCap = 'round';
            }

            return renderTextLayer(page, viewportCss, highlightPattern);
        }).catch(reason => {
            console.error(`Error rendering page ${localPage}:`, reason);
            pageRendering = false;
            updatePageControls();
        });
    }).catch(reason => {
        console.error(`Error getting page ${localPage}:`, reason);
        pageRendering = false;
        updatePageControls();
    });
}

function renderTextLayer(page, viewport, highlightPattern) {
    if (!textLayerDivGlobal || !pdfjsLib?.Util) return Promise.resolve();
    
    return page.getTextContent().then(textContent => {
        currentPageTextContent = textContent;
        textLayerDivGlobal.innerHTML = '';
        
        textContent.items.forEach(item => {
            const textDiv = document.createElement('div');
            const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
            let defaultFontSize = item.height * viewport.scale;
            if (defaultFontSize <= 0) defaultFontSize = 10;
            
            const style = `
                position: absolute;
                left: ${tx[4]}px;
                top: ${tx[5] - (item.height * viewport.scale)}px;
                height: ${item.height * viewport.scale}px;
                width: ${item.width * viewport.scale}px;
                font-size: ${defaultFontSize}px;
                line-height: 1;
                white-space: pre;
                font-family: ${item.fontName ? item.fontName.split(',')[0] : 'sans-serif'};
            `;
            
            textDiv.setAttribute('style', style);
            textDiv.textContent = item.str;

            if (highlightPattern && highlightPattern.test(item.str)) {
                textDiv.classList.add('wavy-underline');
            }
            
            textLayerDivGlobal.appendChild(textDiv);
        });
    }).catch(reason => {
        console.error('Error rendering text layer:', reason);
    });
}

// === 繪圖功能 ===
function getEventPosition(canvasElem, evt) {
    if (!canvasElem) return { x: 0, y: 0 };
    const rect = canvasElem.getBoundingClientRect();
    let clientX, clientY;
    
    if (evt.touches?.length > 0) {
        clientX = evt.touches[0].clientX;
        clientY = evt.touches[0].clientY;
    } else {
        clientX = evt.clientX;
        clientY = evt.clientY;
    }
    
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

function startDrawing(e) {
    if (!highlighterEnabled) return;
    isDrawing = true;
    const pos = getEventPosition(drawingCanvas, e);
    [lastX, lastY] = [pos.x, pos.y];
    drawingCtx.beginPath();
    drawingCtx.moveTo(lastX, lastY);
    if (e.type === 'touchstart') e.preventDefault();
}

function draw(e) {
    if (!isDrawing || !highlighterEnabled) return;
    const pos = getEventPosition(drawingCanvas, e);
    drawingCtx.lineTo(pos.x, pos.y);
    drawingCtx.stroke();
    [lastX, lastY] = [pos.x, pos.y];
    if (e.type === 'touchmove') e.preventDefault();
}

function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
}

if (drawingCanvas) {
    drawingCanvas.addEventListener('mousedown', startDrawing);
    drawingCanvas.addEventListener('mousemove', draw);
    drawingCanvas.addEventListener('mouseup', stopDrawing);
    drawingCanvas.addEventListener('mouseout', stopDrawing);
    drawingCanvas.addEventListener('touchstart', startDrawing, { passive: false });
    drawingCanvas.addEventListener('touchmove', draw, { passive: false });
    drawingCanvas.addEventListener('touchend', stopDrawing);
    drawingCanvas.addEventListener('touchcancel', stopDrawing);
}

// === 縮圖渲染 ===
async function renderThumbnail(docIndex, localPageNum, canvasEl) {
    try {
        const doc = pdfDocs[docIndex];
        if (!doc || !canvasEl) return;
        
        const page = await doc.getPage(localPageNum);
        const viewport = page.getViewport({ scale: 1 });
        const scale = (canvasEl.parentElement.clientWidth - 20) / viewport.width;
        const scaledViewport = page.getViewport({ scale });
        const thumbnailCtx = canvasEl.getContext('2d');
        
        canvasEl.height = scaledViewport.height;
        canvasEl.width = scaledViewport.width;
        
        const renderContext = {
            canvasContext: thumbnailCtx,
            viewport: scaledViewport
        };
        await page.render(renderContext).promise;
    } catch (error) {
        console.error(`Failed to render thumbnail for doc ${docIndex} page ${localPageNum}:`, error);
    }
}

function initThumbnailObserver() {
    if (thumbnailObserver) {
        thumbnailObserver.disconnect();
    }

    thumbnailObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const canvas = entry.target;
                const docIndex = parseInt(canvas.dataset.docIndex, 10);
                const localPage = parseInt(canvas.dataset.localPage, 10);
                renderThumbnail(docIndex, localPage, canvas);
                observer.unobserve(canvas);
            }
        });
    }, { root: resultsList, rootMargin: '0px 0px 200px 0px' });
}

// === 搜尋功能 ===
function searchKeyword() {
    const input = searchInputElem?.value.trim();
    searchResults = [];
    currentFileFilter = 'all';

    const searchingOption = `<option value="">${UI_STRINGS.searching}</option>`;
    if (resultsDropdown) resultsDropdown.innerHTML = searchingOption;
    if (panelResultsDropdown) panelResultsDropdown.innerHTML = searchingOption;
    if (fileFilterDropdown) fileFilterDropdown.innerHTML = `<option value="all">${UI_STRINGS.allFiles}</option>`;
    if (panelFileFilterDropdown) panelFileFilterDropdown.innerHTML = `<option value="all">${UI_STRINGS.allFiles}</option>`;
    if (resultsList) resultsList.innerHTML = UI_STRINGS.searching;
    updateResultsNav();

    if (!pdfDocs.length || !input) {
        if (pdfDocs.length > 0) renderPage(currentPage, null);
        if (resultsDropdown) resultsDropdown.innerHTML = `<option value="">${UI_STRINGS.searchResultsDefault}</option>`;
        if (panelResultsDropdown) panelResultsDropdown.innerHTML = `<option value="">${UI_STRINGS.searchResultsDefault}</option>`;
        if (resultsList) resultsList.innerHTML = '';
        updateResultsNav();
        return;
    }

    let pattern;
    try {
        if (input.startsWith('/') && input.lastIndexOf('/') > 0) {
            const lastSlashIndex = input.lastIndexOf('/');
            pattern = new RegExp(input.slice(1, lastSlashIndex), input.slice(lastSlashIndex + 1));
        } else {
            const escapedInput = input.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&');
            const keywords = escapedInput.split(/\s+/).filter(k => k.length > 0);
            if (!keywords.length) {
                if (pdfDocs.length > 0) renderPage(currentPage, null);
                if (resultsDropdown) resultsDropdown.innerHTML = `<option value="">${UI_STRINGS.searchResultsDefault}</option>`;
                if (panelResultsDropdown) panelResultsDropdown.innerHTML = `<option value="">${UI_STRINGS.searchResultsDefault}</option>`;
                if (resultsList) resultsList.innerHTML = '';
                updateResultsNav();
                return;
            }
            pattern = new RegExp(keywords.join('.*?'), 'gi');
        }
    } catch (e) {
        showNotification(UI_STRINGS.invalidRegex + e.message, 'error');
        if (resultsDropdown) resultsDropdown.innerHTML = `<option value="">${UI_STRINGS.searchResultsDefault}</option>`;
        if (panelResultsDropdown) panelResultsDropdown.innerHTML = `<option value="">${UI_STRINGS.searchResultsDefault}</option>`;
        if (resultsList) resultsList.innerHTML = '';
        updateResultsNav();
        return;
    }

    let promises = [];
    let globalPageOffset = 0;

    pdfDocs.forEach((doc, docIndex) => {
        for (let i = 1; i <= doc.numPages; i++) {
            const currentGlobalPageForSearch = globalPageOffset + i;
            const pageInfo = pageMap[currentGlobalPageForSearch - 1];
            
            promises.push(
                doc.getPage(i)
                    .then(p => p.getTextContent())
                    .then(textContent => {
                        const pageText = textContent.items.map(item => item.str).join('');
                        pattern.lastIndex = 0;
                        if (pattern.test(pageText)) {
                            pattern.lastIndex = 0;
                            const matchResult = pattern.exec(pageText);
                            let foundMatchSummary = UI_STRINGS.matchFound;
                            
                            if (matchResult) {
                                const matchedText = matchResult[0];
                                const matchIndex = matchResult.index;
                                const contextLength = 40;
                                const startIndex = Math.max(0, matchIndex - contextLength);
                                const endIndex = Math.min(pageText.length, matchIndex + matchedText.length + contextLength);
                                const preMatch = pageText.substring(startIndex, matchIndex).replace(/\n/g, ' ');
                                const highlightedMatch = matchedText.replace(/\n/g, ' ');
                                const postMatch = pageText.substring(matchIndex + matchedText.length, endIndex).replace(/\n/g, ' ');
                                foundMatchSummary = `${startIndex > 0 ? '... ' : ''}${preMatch}<span class="wavy-underline">${highlightedMatch}</span>${postMatch}${endIndex < pageText.length ? ' ...' : ''}`;
                            }
                            return {
                                page: currentGlobalPageForSearch,
                                summary: foundMatchSummary,
                                docName: pageInfo.docName,
                                docIndex: pageInfo.docIndex,
                                localPage: pageInfo.localPage
                            };
                        }
                        return null;
                    })
                    .catch(err => {
                        console.warn(`Error processing page for search: Doc ${pageInfo.docName}, Page ${i}`, err);
                        return null;
                    })
            );
        }
        globalPageOffset += doc.numPages;
    });

    Promise.all(promises).then(allPageResults => {
        searchResults = allPageResults
            .filter(r => r !== null)
            .sort((a, b) => a.page - b.page);
        
        if (resultsDropdown) resultsDropdown.innerHTML = '';
        if (panelResultsDropdown) panelResultsDropdown.innerHTML = '';
        if (resultsList) resultsList.innerHTML = '';

        if (searchResults.length === 0) {
            const notFoundMsg = `<option>${UI_STRINGS.keywordNotFound}</option>`;
            if (resultsDropdown) resultsDropdown.innerHTML = notFoundMsg;
            if (panelResultsDropdown) panelResultsDropdown.innerHTML = notFoundMsg;
            if (fileFilterDropdown) fileFilterDropdown.innerHTML = `<option value="all">${UI_STRINGS.allFiles}</option>`;
            if (panelFileFilterDropdown) panelFileFilterDropdown.innerHTML = `<option value="all">${UI_STRINGS.allFiles}</option>`;
            if (resultsList) resultsList.innerHTML = UI_STRINGS.keywordNotFoundPanel;
            renderPage(currentPage, null);
            showNotification(UI_STRINGS.noMatchesFound, 'info');
        } else {
            updateFilterAndResults('all');
            if (searchResults.length > 0) {
                goToPage(searchResults[0].page, pattern);
            }
            showNotification(UI_STRINGS.matchesFound(searchResults.length), 'success');
        }
        updateResultsNav();

        if (window.innerWidth <= 768 && appContainer?.classList.contains('menu-active')) {
            appContainer.classList.remove('menu-active');
        }
    }).catch(err => {
        console.error('An unexpected error occurred during search:', err);
        const errorMsg = `<option value="">${UI_STRINGS.searchError}</option>`;
        if (resultsDropdown) resultsDropdown.innerHTML = errorMsg;
        if (panelResultsDropdown) panelResultsDropdown.innerHTML = errorMsg;
        if (resultsList) resultsList.innerHTML = UI_STRINGS.searchErrorPanel;
        renderPage(currentPage, null);
        updateResultsNav();
        showNotification(UI_STRINGS.searchExecutionError, 'error');
    });
}

function updateResultsNav() {
    const hasResults = searchResults.length > 0;
    document.body.classList.toggle('results-bar-visible', hasResults);
    appContainer?.classList.toggle('results-panel-visible', hasResults);
}

function updateFilterAndResults(selectedFile = 'all') {
    currentFileFilter = selectedFile;
    const docNames = [...new Set(searchResults.map(r => r.docName))];
    const fileDropdowns = [fileFilterDropdown, panelFileFilterDropdown];

    fileDropdowns.forEach(dropdown => {
        if (!dropdown) return;
        dropdown.innerHTML = `<option value="all">${UI_STRINGS.allFiles}</option>`;
        docNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            dropdown.appendChild(option);
        });
        dropdown.value = currentFileFilter;
    });

    const filteredResults = currentFileFilter === 'all'
        ? searchResults
        : searchResults.filter(r => r.docName === currentFileFilter);

    const summaryDropdowns = [resultsDropdown, panelResultsDropdown];
    summaryDropdowns.forEach(dropdown => {
        if (!dropdown) return;
        dropdown.innerHTML = '';
        if (filteredResults.length === 0) {
            dropdown.innerHTML = `<option value="">${UI_STRINGS.noResultsInFile}</option>`;
        } else {
            filteredResults.forEach(result => {
                const option = document.createElement('option');
                option.value = result.page;
                option.innerHTML = UI_STRINGS.resultSummary(result.page, result.summary);
                dropdown.appendChild(option);
            });
        }
    });
    
    if (resultsList) {
        resultsList.innerHTML = '';
        if (filteredResults.length === 0) {
            resultsList.innerHTML = UI_STRINGS.noResultsInFilePanel;
        } else {
            initThumbnailObserver();
            filteredResults.forEach(result => {
                const resultItem = document.createElement('div');
                resultItem.className = 'result-item';
                resultItem.innerHTML = `
                    <canvas class="thumbnail-canvas" data-doc-index="${result.docIndex}" data-local-page="${result.localPage}"></canvas>
                    <div class="page-info">${UI_STRINGS.resultPageInfo(result.page, result.docName)}</div>
                    <div class="context-snippet">${result.summary}</div>
                `;
                resultItem.addEventListener('click', () => {
                    goToPage(result.page, getPatternFromSearchInput());
                });
                resultsList.appendChild(resultItem);
                const thumbnailCanvas = resultItem.querySelector('.thumbnail-canvas');
                thumbnailObserver.observe(thumbnailCanvas);
            });
        }
    }
    
    const currentPageResult = filteredResults.find(r => r.page === currentPage);
    if (currentPageResult) {
        summaryDropdowns.forEach(d => {
            if (d) d.value = currentPage;
        });
    }
}

// === 搜尋事件監聽 ===
searchActionButton?.addEventListener('click', searchKeyword);
searchInputElem?.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
        e.preventDefault();
        searchActionButton?.click();
    }
});

resultsDropdown?.addEventListener('change', () => {
    goToPageDropdown(resultsDropdown.value);
});

panelResultsDropdown?.addEventListener('change', () => {
    goToPageDropdown(panelResultsDropdown.value);
});

fileFilterDropdown?.addEventListener('change', e => {
    updateFilterAndResults(e.target.value);
});

panelFileFilterDropdown?.addEventListener('change', e => {
    updateFilterAndResults(e.target.value);
});

function goToPageDropdown(pageNumStr) {
    if (pageNumStr) {
        const pageNum = parseInt(pageNumStr);
        goToPage(pageNum, getPatternFromSearchInput());
    }
}

function goToPage(globalPageNum, highlightPatternForPage = null) {
    if (!pdfDocs.length || isNaN(globalPageNum)) return;
    
    const n = Math.max(1, Math.min(globalPageNum, globalTotalPages));
    const currentGlobalPattern = getPatternFromSearchInput();
    
    if (pageRendering && currentPage === n && 
        JSON.stringify(highlightPatternForPage) === JSON.stringify(currentGlobalPattern)) {
        return;
    }
    
    if (pageRendering && !(currentPage === n && 
        JSON.stringify(highlightPatternForPage) !== JSON.stringify(currentGlobalPattern))) {
        return;
    }
    
    currentPage = n;
    const finalHighlightPattern = highlightPatternForPage !== null 
        ? highlightPatternForPage 
        : currentGlobalPattern;
    
    renderPage(currentPage, finalHighlightPattern);
    
    if (pageToGoInput) pageToGoInput.value = currentPage;
    if (pageSlider) pageSlider.value = currentPage;
    if (resultsDropdown) resultsDropdown.value = currentPage;
    if (panelResultsDropdown) panelResultsDropdown.value = currentPage;
}

function getPatternFromSearchInput() {
    const i = searchInputElem?.value.trim();
    if (!i) return null;
    
    try {
        if (i.startsWith('/') && i.lastIndexOf('/') > 0) {
            const ls = i.lastIndexOf('/');
            return new RegExp(i.slice(1, ls), i.slice(ls + 1));
        } else {
            const es = i.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&');
            const k = es.split(/\s+/).filter(ky => ky.length > 0);
            if (k.length > 0) return new RegExp(k.join('.*?'), 'gi');
        }
    } catch (e) {
        console.warn('Could not create regex from input:', e);
        return null;
    }
    return null;
}

// === 頁面導航 ===
goToFirstPageBtn?.addEventListener('click', () => {
    if (pdfDocs.length > 0) goToPage(1, getPatternFromSearchInput());
});

prevPageBtn?.addEventListener('click', () => {
    if (currentPage > 1) goToPage(currentPage - 1, getPatternFromSearchInput());
});

nextPageBtn?.addEventListener('click', () => {
    if (pdfDocs.length > 0 && currentPage < globalTotalPages) {
        goToPage(currentPage + 1, getPatternFromSearchInput());
    }
});

goToPageBtn?.addEventListener('click', () => {
    const pn = parseInt(pageToGoInput?.value);
    if (!isNaN(pn)) goToPage(pn, getPatternFromSearchInput());
});

pageToGoInput?.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
        e.preventDefault();
        goToPageBtn?.click();
    }
});

pageSlider?.addEventListener('input', () => {
    const newPage = parseInt(pageSlider.value);
    if (pageToGoInput) pageToGoInput.value = newPage;
    if (currentPage !== newPage) goToPage(newPage, getPatternFromSearchInput());
});

// === 匯出頁面 ===
exportPageBtn?.addEventListener('click', async () => {
    if (!pdfDocs.length || !canvas) {
        showNotification(UI_STRINGS.loadPdfFirst, 'error');
        return;
    }
    if (pageRendering) {
        showNotification(UI_STRINGS.pageRenderingInProgress, 'warning');
        return;
    }

    const EXPORT_RESOLUTION_MULTIPLIER = 2.5;
    const originalBtnText = exportPageBtn.innerHTML;
    exportPageBtn.disabled = true;
    exportPageBtn.innerHTML = `<span class="loading-spinner"></span> ${UI_STRINGS.exporting}`;

    try {
        const pageInfo = getDocAndLocalPage(currentPage);
        if (!pageInfo) throw new Error(UI_STRINGS.pageInfoError);

        const page = await pageInfo.doc.getPage(pageInfo.localPage);
        const exportViewport = page.getViewport({ 
            scale: currentScale * EXPORT_RESOLUTION_MULTIPLIER 
        });

        const tc = document.createElement('canvas');
        tc.width = exportViewport.width;
        tc.height = exportViewport.height;
        const tctx = tc.getContext('2d');
        if (!tctx) throw new Error(UI_STRINGS.exportCanvasContextError);

        const renderContext = {
            canvasContext: tctx,
            viewport: exportViewport
        };
        await page.render(renderContext).promise;

        if (drawingCanvas?.width > 0) {
            tctx.drawImage(
                drawingCanvas,
                0, 0, drawingCanvas.width, drawingCanvas.height,
                0, 0, tc.width, tc.height
            );
        }

        const idu = tc.toDataURL('image/png');
        const l = document.createElement('a');
        l.href = idu;
        const docNamePart = pageInfo.docName.replace(/\.pdf$/i, '');
        l.download = `page_${currentPage}_(${docNamePart}-p${pageInfo.localPage})_annotated_HD.png`;
        document.body.appendChild(l);
        l.click();
        document.body.removeChild(l);
        
        showNotification(UI_STRINGS.exportSuccess, 'success');
    } catch (er) {
        console.error('Export error:', er);
        showNotification(UI_STRINGS.exportFail + er.message, 'error');
    } finally {
        exportPageBtn.disabled = false;
        exportPageBtn.innerHTML = originalBtnText;
    }
});

// === 工具按鈕 ===
toggleUnderlineBtn?.addEventListener('click', () => {
    if (!pdfDocs.length) return;
    showSearchResultsHighlights = !showSearchResultsHighlights;
    renderPage(currentPage, getPatternFromSearchInput());
});

function deactivateAllModes(except = null) {
    if (except !== 'highlighter' && highlighterEnabled) {
        highlighterEnabled = false;
        if (drawingCanvas) drawingCanvas.style.pointerEvents = 'none';
    }
    if (except !== 'textSelection' && textSelectionModeActive) {
        textSelectionModeActive = false;
        if (textLayerDivGlobal) {
            textLayerDivGlobal.style.pointerEvents = 'none';
            textLayerDivGlobal.classList.remove('text-selection-active');
        }
        if (canvas) canvas.style.visibility = 'visible';
    }
    if (except !== 'localMagnifier' && localMagnifierEnabled) {
        localMagnifierEnabled = false;
        if (magnifierGlass) magnifierGlass.style.display = 'none';
    }
    if (except !== 'paragraphSelection' && paragraphSelectionModeActive) {
        paragraphSelectionModeActive = false;
        if (pdfContainer) pdfContainer.classList.remove('paragraph-selection-mode');
        clearParagraphHighlights();
    }
    updatePageControls();
}

toggleHighlighterBtn?.addEventListener('click', () => {
    if (!pdfDocs.length) return;
    const wasActive = highlighterEnabled;
    deactivateAllModes();
    if (!wasActive) {
        highlighterEnabled = true;
        if (drawingCanvas) drawingCanvas.style.pointerEvents = 'auto';
    }
    updatePageControls();
});

toggleTextSelectionBtn?.addEventListener('click', () => {
    if (!pdfDocs.length) return;
    const wasActive = textSelectionModeActive;
    deactivateAllModes();
    if (!wasActive) {
        textSelectionModeActive = true;
        if (textLayerDivGlobal) {
            textLayerDivGlobal.style.pointerEvents = 'auto';
            textLayerDivGlobal.classList.add('text-selection-active');
        }
        if (canvas) canvas.style.visibility = 'hidden';
    }
    updatePageControls();
});

toggleLocalMagnifierBtn?.addEventListener('click', () => {
    if (!pdfDocs.length) return;
    const wasActive = localMagnifierEnabled;
    deactivateAllModes();
    if (!wasActive) {
        localMagnifierEnabled = true;
    }
    updatePageControls();
});

toggleParagraphSelectionBtn?.addEventListener('click', () => {
    if (!pdfDocs.length || !textSelectionModeActive) return;

    paragraphSelectionModeActive = !paragraphSelectionModeActive;

    if (paragraphSelectionModeActive) {
        if (pdfContainer) pdfContainer.classList.add('paragraph-selection-mode');
    } else {
        if (pdfContainer) pdfContainer.classList.remove('paragraph-selection-mode');
        clearParagraphHighlights();
    }
    
    updatePageControls();
});

clearHighlighterBtn?.addEventListener('click', () => {
    if (!pdfDocs.length) return;
    drawingCtx?.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    showNotification(UI_STRINGS.highlighterCleared, 'success');
});

copyPageTextBtn?.addEventListener('click', async () => {
    if (!pdfDocs.length || pageRendering) return;
    
    const pageInfo = getDocAndLocalPage(currentPage);
    if (!pageInfo) {
        showNotification(UI_STRINGS.pageInfoError, 'error');
        return;
    }
    
    try {
        const page = await pageInfo.doc.getPage(pageInfo.localPage);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join('\n');
        await navigator.clipboard.writeText(pageText);
        showNotification(UI_STRINGS.textCopied, 'success');
    } catch (err) {
        console.error('Failed to copy text:', err);
        showNotification(UI_STRINGS.textCopyError, 'error');
    }
});

sharePageBtn?.addEventListener('click', async () => {
    if (!pdfDocs.length || !canvas) {
        showNotification(UI_STRINGS.loadPdfFirst, 'error');
        return;
    }
    if (pageRendering) {
        showNotification(UI_STRINGS.pageRenderingInProgress, 'warning');
        return;
    }
    if (!navigator.share) {
        showNotification(UI_STRINGS.shareApiNotSupported, 'error');
        return;
    }

    const SHARE_RESOLUTION_MULTIPLIER = 2.0;
    const originalBtnText = sharePageBtn.innerHTML;
    sharePageBtn.disabled = true;
    sharePageBtn.innerHTML = `<span class="loading-spinner"></span> ${UI_STRINGS.preparing}`;

    try {
        const pageInfo = getDocAndLocalPage(currentPage);
        if (!pageInfo) throw new Error(UI_STRINGS.pageInfoError);

        const page = await pageInfo.doc.getPage(pageInfo.localPage);
        const shareViewport = page.getViewport({ 
            scale: currentScale * SHARE_RESOLUTION_MULTIPLIER 
        });

        const tc = document.createElement('canvas');
        tc.width = shareViewport.width;
        tc.height = shareViewport.height;
        const tctx = tc.getContext('2d');
        if (!tctx) throw new Error('Could not get rendering context for the share canvas.');

        const renderContext = {
            canvasContext: tctx,
            viewport: shareViewport
        };
        await page.render(renderContext).promise;

        if (drawingCanvas?.width > 0) {
            tctx.drawImage(
                drawingCanvas,
                0, 0, drawingCanvas.width, drawingCanvas.height,
                0, 0, tc.width, tc.height
            );
        }

        const blob = await new Promise(resolve => tc.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('Could not create image data from canvas.');

        const docNamePart = pageInfo.docName.replace(/\.pdf$/i, '');
        const fn = `page_${currentPage}_(${docNamePart}-p${pageInfo.localPage})_annotated_HD.png`;
        const f = new File([blob], fn, { type: 'image/png' });
        const sd = {
            title: UI_STRINGS.shareTitle(currentPage),
            text: UI_STRINGS.shareText(pageInfo.localPage, docNamePart),
            files: [f]
        };

        if (navigator.canShare && navigator.canShare({ files: [f] })) {
            await navigator.share(sd);
        } else {
            showNotification(UI_STRINGS.shareFileNotSupported, 'error');
        }
    } catch (er) {
        console.error('Share error:', er);
        if (er.name !== 'AbortError') {
            showNotification(UI_STRINGS.shareFailed + er.message, 'error');
        }
    } finally {
        sharePageBtn.disabled = false;
        sharePageBtn.innerHTML = originalBtnText;
    }
});

localMagnifierZoomSelector?.addEventListener('change', e => {
    LOCAL_MAGNIFIER_ZOOM_LEVEL = parseFloat(e.target.value);
});

function handlePointerMoveForLocalMagnifier(e) {
    if (!localMagnifierEnabled) return;
    if (e.type === 'touchmove' || e.type === 'touchstart') e.preventDefault();
    
    let clientX, clientY;
    if (e.touches?.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else if (e.clientX !== undefined) {
        clientX = e.clientX;
        clientY = e.clientY;
    } else {
        return;
    }
    
    updateLocalMagnifier(clientX, clientY);
}

function handlePointerLeaveForLocalMagnifier() {
    if (localMagnifierEnabled && magnifierGlass) {
        magnifierGlass.style.display = 'none';
    }
}

if (pdfContainer) {
    pdfContainer.addEventListener('mousemove', handlePointerMoveForLocalMagnifier);
    pdfContainer.addEventListener('mouseleave', handlePointerLeaveForLocalMagnifier);
    pdfContainer.addEventListener('touchstart', handlePointerMoveForLocalMagnifier, { passive: false });
    pdfContainer.addEventListener('touchmove', handlePointerMoveForLocalMagnifier, { passive: false });
    pdfContainer.addEventListener('touchend', handlePointerLeaveForLocalMagnifier);
    pdfContainer.addEventListener('touchcancel', handlePointerLeaveForLocalMagnifier);
}

// === 視窗調整大小 ===
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (pdfDocs.length > 0) {
            renderPage(currentPage, getPatternFromSearchInput());
        }
    }, 250);
});

// === 縮放控制 ===
fitWidthBtns?.forEach(btn => {
    btn.addEventListener('click', () => {
        currentZoomMode = 'width';
        renderPage(currentPage, getPatternFromSearchInput());
    });
});

fitHeightBtns?.forEach(btn => {
    btn.addEventListener('click', () => {
        currentZoomMode = 'height';
        renderPage(currentPage, getPatternFromSearchInput());
    });
});

zoomInBtn?.addEventListener('click', () => {
    currentZoomMode = 'custom';
    currentScale += 0.2;
    renderPage(currentPage, getPatternFromSearchInput());
});

zoomOutBtn?.addEventListener('click', () => {
    currentZoomMode = 'custom';
    currentScale = Math.max(0.1, currentScale - 0.2);
    renderPage(currentPage, getPatternFromSearchInput());
});

// === 搜尋結果導航 ===
function navigateToNextResult() {
    if (!searchResults.length) return;
    const nextResult = searchResults.find(r => r.page > currentPage);
    if (nextResult) {
        goToPage(nextResult.page, getPatternFromSearchInput());
    } else {
        showNotification(UI_STRINGS.lastResult, 'info');
    }
}

function navigateToPreviousResult() {
    if (!searchResults.length) return;
    const prevResult = [...searchResults].reverse().find(r => r.page < currentPage);
    if (prevResult) {
        goToPage(prevResult.page, getPatternFromSearchInput());
    } else {
        showNotification(UI_STRINGS.firstResult, 'info');
    }
}

// === 通知系統 (優化版) ===
function showNotification(message, type = 'info') {
    let notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        document.body.appendChild(notificationContainer);
        Object.assign(notificationContainer.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: '10000',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxWidth: '350px'
        });
    }

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    notification.innerHTML = `
        <span class="notification-icon">${icons[type] || icons.info}</span>
        <span class="notification-message">${message}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    Object.assign(notification.style, {
        padding: '12px 16px',
        borderRadius: '8px',
        backgroundColor: type === 'success' ? '#10b981' :
                        type === 'error' ? '#ef4444' :
                        type === 'warning' ? '#f59e0b' : '#3b82f6',
        color: 'white',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        animation: 'slideIn 0.3s ease-out',
        fontSize: '14px'
    });
    
    notificationContainer.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// 載入覆蓋層
function showLoadingOverlay(message = 'Loading...') {
    let overlay = document.getElementById('loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner-large"></div>
                <p class="loading-message">${message}</p>
            </div>
        `;
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '10001'
        });
        document.body.appendChild(overlay);
    } else {
        overlay.querySelector('.loading-message').textContent = message;
        overlay.style.display = 'flex';
    }
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// === 觸控手勢 ===
let touchStartX = 0;
let touchStartY = 0;
let isSwiping = false;
const MIN_SWIPE_DISTANCE_X = 50;
const MAX_SWIPE_DISTANCE_Y = 60;

if (pdfContainer) {
    pdfContainer.addEventListener('touchstart', e => {
        if (highlighterEnabled || textSelectionModeActive || 
            localMagnifierEnabled || paragraphSelectionModeActive || 
            e.touches.length !== 1) {
            isSwiping = false;
            return;
        }
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isSwiping = true;
    }, { passive: true });
    
    pdfContainer.addEventListener('touchend', e => {
        if (!isSwiping || e.changedTouches.length !== 1) {
            isSwiping = false;
            return;
        }
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;
        
        if (Math.abs(diffX) > MIN_SWIPE_DISTANCE_X && Math.abs(diffY) < MAX_SWIPE_DISTANCE_Y) {
            const isSearchResultMode = searchResults.length > 0;
            if (diffX < 0) {
                isSearchResultMode ? navigateToNextResult() : nextPageBtn?.click();
            } else {
                isSearchResultMode ? navigateToPreviousResult() : prevPageBtn?.click();
            }
        }
        isSwiping = false;
    });
    
    pdfContainer.addEventListener('touchcancel', () => {
        isSwiping = false;
    });
}

// === 段落選擇功能 ===
function clearParagraphHighlights() {
    document.querySelectorAll('.paragraph-highlight, #copy-paragraph-btn').forEach(el => el.remove());
}

function handleParagraphSelection(e) {
    if (!paragraphSelectionModeActive || !currentPageTextContent || !currentViewport) return;

    clearParagraphHighlights();

    const pos = getEventPosition(textLayerDivGlobal, e);
    const clickPoint = { x: pos.x, y: pos.y };

    let closestItem = null;
    currentPageTextContent.items.forEach(item => {
        const tx = pdfjsLib.Util.transform(currentViewport.transform, item.transform);
        const itemRect = {
            left: tx[4],
            top: tx[5] - item.height * currentViewport.scale,
            right: tx[4] + item.width * currentViewport.scale,
            bottom: tx[5]
        };
        if (clickPoint.x >= itemRect.left && clickPoint.x <= itemRect.right &&
            clickPoint.y >= itemRect.top && clickPoint.y <= itemRect.bottom) {
            closestItem = item;
        }
    });

    if (!closestItem) return;

    const lineTolerance = closestItem.height * 0.5;
    const paragraphBreakTolerance = closestItem.height * 1.5;

    const lines = [];
    let currentLine = [];
    let lastY = -1;

    currentPageTextContent.items.sort((a, b) => 
        a.transform[5] - b.transform[5] || a.transform[4] - b.transform[4]
    );

    currentPageTextContent.items.forEach(item => {
        if (lastY === -1 || Math.abs(item.transform[5] - lastY) < lineTolerance) {
            currentLine.push(item);
        } else {
            lines.push(currentLine.sort((a, b) => a.transform[4] - b.transform[4]));
            currentLine = [item];
        }
        lastY = item.transform[5];
    });
    lines.push(currentLine.sort((a, b) => a.transform[4] - b.transform[4]));

    let clickedLineIndex = lines.findIndex(line => line.includes(closestItem));
    if (clickedLineIndex === -1) return;

    let paragraphStartLine = clickedLineIndex;
    while (paragraphStartLine > 0) {
        const currentLineY = lines[paragraphStartLine][0].transform[5];
        const prevLineY = lines[paragraphStartLine - 1][0].transform[5];
        if (Math.abs(currentLineY - prevLineY) > paragraphBreakTolerance) break;
        paragraphStartLine--;
    }

    let paragraphEndLine = clickedLineIndex;
    while (paragraphEndLine < lines.length - 1) {
        const currentLineY = lines[paragraphEndLine][0].transform[5];
        const nextLineY = lines[paragraphEndLine + 1][0].transform[5];
        if (Math.abs(nextLineY - currentLineY) > paragraphBreakTolerance) break;
        paragraphEndLine++;
    }

    let paragraphText = '';
    for (let i = paragraphStartLine; i <= paragraphEndLine; i++) {
        const line = lines[i];
        if (!line.length) continue;
        
        const firstItem = line[0];
        const lastItem = line[line.length - 1];
        const txFirst = pdfjsLib.Util.transform(currentViewport.transform, firstItem.transform);
        const txLast = pdfjsLib.Util.transform(currentViewport.transform, lastItem.transform);
        
        const highlight = document.createElement('div');
        highlight.className = 'paragraph-highlight';
        highlight.style.left = `${txFirst[4]}px`;
        highlight.style.top = `${txFirst[5] - firstItem.height * currentViewport.scale}px`;
        highlight.style.width = `${(txLast[4] + lastItem.width * currentViewport.scale) - txFirst[4]}px`;
        highlight.style.height = `${firstItem.height * currentViewport.scale}px`;
        textLayerDivGlobal.appendChild(highlight);
        
        paragraphText += line.map(item => item.str).join('') + '\n';
    }

    const lastLineOfParagraph = lines[paragraphEndLine];
    if (lastLineOfParagraph.length > 0) {
        const lastItemOfParagraph = lastLineOfParagraph[lastLineOfParagraph.length - 1];
        const tx = pdfjsLib.Util.transform(currentViewport.transform, lastItemOfParagraph.transform);
        
        const copyBtn = document.createElement('button');
        copyBtn.id = 'copy-paragraph-btn';
        copyBtn.textContent = UI_STRINGS.copy;
        copyBtn.style.left = `${tx[4] + lastItemOfParagraph.width * currentViewport.scale + 5}px`;
        copyBtn.style.top = `${tx[5] - lastItemOfParagraph.height * currentViewport.scale}px`;
        copyBtn.onclick = async () => {
            try {
                await navigator.clipboard.writeText(paragraphText.trim());
                showNotification(UI_STRINGS.paragraphCopied, 'success');
                clearParagraphHighlights();
            } catch (err) {
                showNotification(UI_STRINGS.copyFailed, 'error');
                console.error('Copy failed:', err);
            }
        };
        textLayerDivGlobal.appendChild(copyBtn);
    }
}

if (textLayerDivGlobal) {
    textLayerDivGlobal.addEventListener('click', handleParagraphSelection);
}

// === 縮圖重新渲染 ===
function rerenderAllThumbnails() {
    if (!resultsList) return;
    initThumbnailObserver();
    const resultItems = resultsList.querySelectorAll('.result-item');
    
    resultItems.forEach(item => {
        const canvasEl = item.querySelector('.thumbnail-canvas');
        if (canvasEl) {
            thumbnailObserver.observe(canvasEl);
        }
    });
}

// === 面板調整大小 ===
function initResizer() {
    if (!resizer || !searchResultsPanel) return;

    let x = 0;
    let panelWidth = 0;

    const mouseDownHandler = function (e) {
        e.preventDefault();
        x = e.clientX;
        const panelStyles = window.getComputedStyle(searchResultsPanel);
        panelWidth = parseInt(panelStyles.width, 10);
        
        document.body.style.userSelect = 'none';
        document.body.style.pointerEvents = 'none';

        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    };

    const mouseMoveHandler = function (e) {
        const dx = e.clientX - x;
        const newWidth = panelWidth - dx;
        
        const minWidth = 200;
        const maxWidth = mainContent.clientWidth * 0.7;
        if (newWidth > minWidth && newWidth < maxWidth) {
            searchResultsPanel.style.flexBasis = `${newWidth}px`;
        }
    };

    const mouseUpHandler = function () {
        document.body.style.userSelect = '';
        document.body.style.pointerEvents = '';

        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);

        if (pdfDocs.length > 0) {
            renderPage(currentPage, getPatternFromSearchInput());
        }
        if (searchResults.length > 0) {
            rerenderAllThumbnails();
        }
    };

    resizer.addEventListener('mousedown', mouseDownHandler);
}

// === 鍵盤快捷鍵 ===
document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    if (!pdfDocs.length) return;

    switch(e.key) {
        case 'ArrowLeft':
        case 'PageUp':
            e.preventDefault();
            searchResults.length > 0 ? navigateToPreviousResult() : prevPageBtn?.click();
            break;
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
            e.preventDefault();
            searchResults.length > 0 ? navigateToNextResult() : nextPageBtn?.click();
            break;
        case 'Home':
            e.preventDefault();
            goToPage(1, getPatternFromSearchInput());
            break;
        case 'End':
            e.preventDefault();
            goToPage(globalTotalPages, getPatternFromSearchInput());
            break;
        case 'f':
        case 'F':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                searchInputElem?.focus();
            }
            break;
        case '+':
        case '=':
            e.preventDefault();
            zoomInBtn?.click();
            break;
        case '-':
            e.preventDefault();
            zoomOutBtn?.click();
            break;
        case '0':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                currentZoomMode = 'height';
                renderPage(currentPage, getPatternFromSearchInput());
            }
            break;
    }
});

// === 初始化應用 ===
async function initializeApp() {
    try {
        await initDB();
        const storedFiles = await getFiles();
        if (storedFiles.length > 0) {
            const restoreContainer = document.getElementById('restore-session-container');
            const restoreBtn = document.getElementById('restore-session-btn');
            if (restoreContainer) restoreContainer.style.display = 'block';
            if (restoreBtn) {
                restoreBtn.onclick = async () => {
                    await loadAndProcessFiles(storedFiles);
                    restoreContainer.style.display = 'none';
                };
            }
        }
    } catch (error) {
        console.error("Could not initialize app from IndexedDB:", error);
    }
}

// === CSS 動畫與樣式注入 ===
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(400px); opacity: 0; } }
    .notification-close { background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; opacity: 0.8; transition: opacity 0.2s; }
    .notification-close:hover { opacity: 1; }
    .notification-icon { font-weight: bold; font-size: 16px; }
    .notification-message { flex: 1; }
    .loading-content { text-align: center; color: white; }
    .loading-spinner-large { width: 50px; height: 50px; border: 4px solid rgba(255, 255, 255, 0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
    .loading-message { font-size: 16px; margin: 0; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255, 255, 255, 0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 8px; vertical-align: middle; }
    button:not(:disabled):active { transform: scale(0.95); transition: transform 0.1s; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .toolbar button.active { background-color: #3b82f6; color: white; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3); }
    .result-item { transition: all 0.2s; cursor: pointer; }
    .result-item:hover { transform: translateX(-5px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); }
    input[type="range"]::-webkit-slider-thumb { transition: all 0.2s; }
    input[type="range"]::-webkit-slider-thumb:hover { transform: scale(1.2); }
    ::-webkit-scrollbar { width: 10px; height: 10px; }
    ::-webkit-scrollbar-track { background: #f1f1f1; }
    ::-webkit-scrollbar-thumb { background: #888; border-radius: 5px; }
    ::-webkit-scrollbar-thumb:hover { background: #555; }
    html { scroll-behavior: smooth; }
`;
document.head.appendChild(style);

// === 啟動應用 ===
initLocalMagnifier();
updatePageControls();
initResizer();
initializeApp();

console.log(UI_STRINGS.initSuccess);
console.log(UI_STRINGS.shortcutsTitle);
console.log(UI_STRINGS.shortcutsNav);
console.log(UI_STRINGS.shortcutsBounds);
console.log(UI_STRINGS.shortcutsSearch);
console.log(UI_STRINGS.shortcutsZoom);
console.log(UI_STRINGS.shortcutsZoomReset);
