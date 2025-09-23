// script.js

import { initDB, saveFiles, getFiles } from './db.js';

document.addEventListener('DOMContentLoaded', () => {
    if (typeof pdfjsLib === 'undefined') {
        console.error('pdfjsLib is not defined. Ensure pdf.mjs is loaded before script.js.');
        alert('Failed to load PDF library. Please refresh the page or check your internet connection.');
        return;
    }

    let pdfDocs = [];
    let pageMap = [];
    let globalTotalPages = 0;
    let currentPage = 1;
    let pageRendering = false;
    let searchResults = [];
    let currentFileFilter = 'all'; // For cascading dropdowns

    let currentZoomMode = 'height';
    let currentScale = 1.0;

    let paragraphSelectionModeActive = false;
    let currentPageTextContent = null;
    let currentViewport = null;

    const canvas = document.getElementById('pdf-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
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
    
    // Dropdown selectors (including new ones)
    const resultsDropdown = document.getElementById('resultsDropdown');
    const panelResultsDropdown = document.getElementById('panelResultsDropdown');
    const fileFilterDropdown = document.getElementById('fileFilterDropdown');
    const panelFileFilterDropdown = document.getElementById('panelFileFilterDropdown');


    const exportPageBtn = document.getElementById('export-page-btn');
    const sharePageBtn = document.getElementById('share-page-btn');
    const toggleUnderlineBtn = document.getElementById('toggle-underline-btn');
    const toggleHighlighterBtn = document.getElementById('toggle-highlighter-btn');
    const clearHighlighterBtn = document.getElementById('clear-highlighter-btn');
    const toggleTextSelectionBtn = document.getElementById('toggle-text-selection-btn');
    const drawingCanvas = document.getElementById('drawing-canvas');
    const drawingCtx = drawingCanvas ? drawingCanvas.getContext('2d') : null;
    const searchInputElem = document.getElementById('searchInput');
    const searchActionButton = document.getElementById('search-action-button');

    const magnifierGlass = document.getElementById('magnifier-glass');
    const magnifierCanvas = document.getElementById('magnifier-canvas');
    const localMagnifierCtx = magnifierCanvas ? magnifierCanvas.getContext('2d') : null;
    const toggleLocalMagnifierBtn = document.getElementById('toggle-local-magnifier-btn');
    const localMagnifierZoomControlsDiv = document.getElementById('local-magnifier-zoom-controls');
    const localMagnifierZoomSelector = document.getElementById('local-magnifier-zoom-selector');

    const searchResultsPanel = document.getElementById('search-results-panel');
    const resultsList = document.getElementById('results-list');
    const copyPageTextBtn = document.getElementById('copy-page-text-btn');

    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const fitWidthBtn = document.getElementById('fit-width-btn');
    const fitHeightBtn = document.getElementById('fit-height-btn');
    const zoomLevelDisplay = document.getElementById('zoom-level-display');

    const toggleParagraphSelectionBtn = document.getElementById('toggle-paragraph-selection-btn');
    
    // Resizer selectors
    const resizer = document.getElementById('resizer');
    const mainContent = document.getElementById('main-content');


    let localMagnifierEnabled = false;
    let LOCAL_MAGNIFIER_SIZE = 120;
    let LOCAL_MAGNIFIER_ZOOM_LEVEL = 2.5;

    let showSearchResultsHighlights = true;
    let highlighterEnabled = false;
    let textSelectionModeActive = false;
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    async function loadAndProcessFiles(files) {
        if (!files || files.length === 0) return;
        if (typeof pdfjsLib === 'undefined') {
            alert('The PDF library failed to load correctly, cannot open files.');
            return;
        }

        pdfDocs = [];
        pageMap = [];
        globalTotalPages = 0;
        currentPage = 1;
        searchResults = [];
        currentFileFilter = 'all';
        currentZoomMode = 'height';

        if (resultsDropdown) resultsDropdown.innerHTML = '<option value="">Search Results</option>';
        if (panelResultsDropdown) panelResultsDropdown.innerHTML = '<option value="">Search Results</option>';
        if (fileFilterDropdown) fileFilterDropdown.innerHTML = '<option value="all">All Files</option>';
        if (panelFileFilterDropdown) panelFileFilterDropdown.innerHTML = '<option value="all">All Files</option>';
        if (resultsList) resultsList.innerHTML = '';
        updateResultsNav();

        if (searchInputElem) searchInputElem.value = '';
        showSearchResultsHighlights = true;
        if (textLayerDivGlobal) textLayerDivGlobal.classList.remove('highlights-hidden');
        
        deactivateAllModes();

        if (textLayerDivGlobal) {
            textLayerDivGlobal.classList.remove('text-selection-active');
            textLayerDivGlobal.style.pointerEvents = 'none';
        }
        if (drawingCanvas) drawingCanvas.style.pointerEvents = 'none';
        if (canvas) canvas.style.visibility = 'visible';
        if (drawingCtx && drawingCanvas) drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
        if (magnifierGlass) magnifierGlass.style.display = 'none';
        if (pdfContainer) pdfContainer.classList.remove('paragraph-selection-mode');

        const loadingPromises = Array.from(files).map(file => {
            return new Promise((resolve) => {
                if (!file || file.type !== 'application/pdf') {
                    resolve(null);
                    return;
                }
                const reader = new FileReader();
                reader.onload = function() {
                    const typedarray = new Uint8Array(this.result);
                    pdfjsLib.getDocument({ data: typedarray, isEvalSupported: false, enableXfa: false }).promise.then(pdf => {
                        resolve({ pdf: pdf, name: file.name });
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
                alert('No valid PDF files were selected.');
                pdfDocs = [];
                updatePageControls();
                return;
            }

            loadedPdfs.forEach((result, docIndex) => {
                pdfDocs.push(result.pdf);
                for (let i = 1; i <= result.pdf.numPages; i++) {
                    pageMap.push({ docIndex: docIndex, localPage: i, docName: result.name });
                }
            });
            globalTotalPages = pageMap.length;
            renderPage(1);
        } catch (error) {
            alert('An error occurred while reading the PDF file: ' + error);
            console.error('Error during file processing:', error);
            pdfDocs = [];
            updatePageControls();
        }
    }

    document.getElementById('fileInput').addEventListener('change', async function(e) {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            try {
                await saveFiles(files);
                document.getElementById('restore-session-container').style.display = 'none';
                await loadAndProcessFiles(files);
            } catch (error) {
                console.error("Failed to save or process files:", error);
                alert("An error occurred while saving or processing the files.");
            }
        }
    });

    function getDocAndLocalPage(globalPage) {
        if (globalPage < 1 || globalPage > globalTotalPages || pageMap.length === 0) return null;
        const mapping = pageMap[globalPage - 1];
        if (!mapping || pdfDocs[mapping.docIndex] === undefined) return null;
        return {
            doc: pdfDocs[mapping.docIndex],
            localPage: mapping.localPage,
            docName: mapping.docName
        };
    }

    function initLocalMagnifier() {
        if (magnifierCanvas && magnifierGlass) {
            magnifierGlass.style.width = `${LOCAL_MAGNIFIER_SIZE}px`;
            magnifierGlass.style.height = `${LOCAL_MAGNIFIER_SIZE}px`;
            magnifierCanvas.width = LOCAL_MAGNIFIER_SIZE;
            magnifierCanvas.height = LOCAL_MAGNIFIER_SIZE;
        }
        if (localMagnifierZoomSelector) LOCAL_MAGNIFIER_ZOOM_LEVEL = parseFloat(localMagnifierZoomSelector.value);
        if (localMagnifierZoomControlsDiv) localMagnifierZoomControlsDiv.style.display = 'none';
    }

    function updateLocalMagnifier(clientX, clientY) {
        if (!localMagnifierEnabled || !canvas || !magnifierGlass || !localMagnifierCtx || !pdfContainer) {
            if (magnifierGlass) magnifierGlass.style.display = 'none';
            return;
        }
        const pdfContainerRect = pdfContainer.getBoundingClientRect();
        const pointXInContainer = clientX - pdfContainerRect.left;
        const pointYInContainer = clientY - pdfContainerRect.top;
        const canvasRectInContainer = { left: canvas.offsetLeft, top: canvas.offsetTop, right: canvas.offsetLeft + canvas.offsetWidth, bottom: canvas.offsetTop + canvas.offsetHeight };

        if (pointXInContainer < canvasRectInContainer.left || pointXInContainer > canvasRectInContainer.right || pointYInContainer < canvasRectInContainer.top || pointYInContainer > canvasRectInContainer.bottom) {
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
        localMagnifierCtx.drawImage(canvas, srcRectX, srcRectY, srcRectPixelWidth, srcRectPixelHeight, 0, 0, LOCAL_MAGNIFIER_SIZE, LOCAL_MAGNIFIER_SIZE);

        if (drawingCanvas && drawingCanvas.width > 0 && drawingCanvas.height > 0) {
            const srcDrawRectX = pointXOnCanvasCSS - (srcRectCSSWidth / 2);
            const srcDrawRectY = pointYOnCanvasCSS - (srcRectCSSHeight / 2);
            localMagnifierCtx.drawImage(drawingCanvas, srcDrawRectX, srcDrawRectY, srcRectCSSWidth, srcRectCSSHeight, 0, 0, LOCAL_MAGNIFIER_SIZE, LOCAL_MAGNIFIER_SIZE);
        }

        let magnifierTop = (pointYInContainer - LOCAL_MAGNIFIER_SIZE - 10);
        let magnifierLeft = (pointXInContainer - (LOCAL_MAGNIFIER_SIZE / 2));
        magnifierTop = Math.max(0, Math.min(magnifierTop, pdfContainer.clientHeight - LOCAL_MAGNIFIER_SIZE - 5));
        magnifierLeft = Math.max(0, Math.min(magnifierLeft, pdfContainer.clientWidth - LOCAL_MAGNIFIER_SIZE - 5));
        magnifierGlass.style.top = `${magnifierTop + pdfContainer.scrollTop}px`;
        magnifierGlass.style.left = `${magnifierLeft + pdfContainer.scrollLeft}px`;
    }

    function updateZoomControls() {
        if (!zoomLevelDisplay || !fitWidthBtn || !fitHeightBtn) return;
        zoomLevelDisplay.textContent = `${Math.round(currentScale * 100)}%`;
        fitWidthBtn.classList.toggle('active', currentZoomMode === 'width');
        fitHeightBtn.classList.toggle('active', currentZoomMode === 'height');
    }

    function updatePageControls() {
        const fabContainer = document.getElementById('floating-action-buttons');
        const hasDocs = pdfDocs.length > 0;

        if (!pageNumDisplay || !fabContainer) {
            if (!hasDocs && pageNumDisplay) pageNumDisplay.textContent = '- / -';
            if (!hasDocs && fabContainer) fabContainer.style.display = 'none';
            return;
        }

        const allControls = [goToFirstPageBtn, prevPageBtn, nextPageBtn, pageToGoInput, goToPageBtn, pageSlider, toggleUnderlineBtn, toggleHighlighterBtn, clearHighlighterBtn, toggleTextSelectionBtn, sharePageBtn, exportPageBtn, toggleLocalMagnifierBtn, localMagnifierZoomSelector, copyPageTextBtn, zoomInBtn, zoomOutBtn, fitWidthBtn, fitHeightBtn, toggleParagraphSelectionBtn];
        allControls.forEach(el => { if(el) el.disabled = !hasDocs; });

        if (!hasDocs) {
            pageNumDisplay.textContent = '- / -';
            if (pageToGoInput) { pageToGoInput.value = ''; pageToGoInput.max = 1; }
            if (pageSlider) { pageSlider.max = 1; pageSlider.value = 1; }
            fabContainer.style.display = 'none';
            if (localMagnifierZoomControlsDiv) localMagnifierZoomControlsDiv.style.display = 'none';
            updateResultsNav();
            return;
        }

        const docInfo = getDocAndLocalPage(currentPage);
        const docNameDisplay = docInfo ? ` (File: ${docInfo.docName})` : '';
        pageNumDisplay.textContent = `Page ${currentPage} / ${globalTotalPages}${docNameDisplay}`;
        if (pageToGoInput) { pageToGoInput.value = currentPage; pageToGoInput.max = globalTotalPages; }
        if (goToFirstPageBtn) goToFirstPageBtn.disabled = (currentPage === 1);
        if (prevPageBtn) prevPageBtn.disabled = (currentPage === 1);
        if (nextPageBtn) nextPageBtn.disabled = (currentPage === globalTotalPages);
        if (pageSlider) { pageSlider.max = globalTotalPages; pageSlider.value = currentPage; pageSlider.disabled = (globalTotalPages === 1); }

        fabContainer.style.display = 'flex';

        toggleUnderlineBtn.classList.toggle('active', showSearchResultsHighlights);
        toggleHighlighterBtn.classList.toggle('active', highlighterEnabled);
        toggleHighlighterBtn.title = highlighterEnabled ? 'Disable Highlighter' : 'Enable Highlighter';
        toggleTextSelectionBtn.classList.toggle('active', textSelectionModeActive);
        toggleTextSelectionBtn.title = textSelectionModeActive ? 'Disable Text Selection' : 'Enable Text Selection';
        toggleParagraphSelectionBtn.classList.toggle('active', paragraphSelectionModeActive);
        toggleParagraphSelectionBtn.title = paragraphSelectionModeActive ? 'Disable Paragraph Selection' : 'Enable Paragraph Selection';
        if (sharePageBtn) sharePageBtn.disabled = !navigator.share;
        toggleLocalMagnifierBtn.classList.toggle('active', localMagnifierEnabled);
        toggleLocalMagnifierBtn.title = localMagnifierEnabled ? 'Disable Magnifier' : 'Enable Magnifier';
        if (localMagnifierZoomControlsDiv) localMagnifierZoomControlsDiv.style.display = (hasDocs && localMagnifierEnabled) ? 'flex' : 'none';

        updateResultsNav();
        updateZoomControls();
    }

    if (toolbarToggleTab && appContainer) {
        toolbarToggleTab.addEventListener('click', () => appContainer.classList.toggle('menu-active'));
    }
    if (pdfContainer && appContainer) {
        pdfContainer.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && appContainer.classList.contains('menu-active') && !toolbar.contains(e.target)) {
                appContainer.classList.remove('menu-active');
            }
        });
    }

    function renderPage(globalPageNum, highlightPattern = null) {
        if (pdfDocs.length === 0 || !pdfContainer || !canvas || !ctx) return;
        pageRendering = true;
        currentPageTextContent = null;
        currentViewport = null;
        updatePageControls();
        if (drawingCtx && drawingCanvas) drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
        clearParagraphHighlights();

        const pageInfo = getDocAndLocalPage(globalPageNum);
        if (!pageInfo) {
            pageRendering = false;
            updatePageControls();
            return;
        }

        const { doc, localPage } = pageInfo;

        doc.getPage(localPage).then(function(page) {
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

            if (canvas.dataset.originalBorder && pdfDocs.length > 0) canvas.style.border = canvas.dataset.originalBorder;
            else if (pdfDocs.length > 0) canvas.style.border = '1px solid #000';

            textLayerDivGlobal.classList.toggle('highlights-hidden', !showSearchResultsHighlights);

            const viewportCss = page.getViewport({ scale: scaleForCss });
            currentViewport = viewportCss;
            const devicePixelRatio = window.devicePixelRatio || 1;
            const qualityMultiplier = 1.5;

            const renderScale = scaleForCss * devicePixelRatio * qualityMultiplier;
            const viewportRender = page.getViewport({ scale: renderScale });

            canvas.width = viewportRender.width; canvas.height = viewportRender.height;
            canvas.style.width = `${viewportCss.width}px`; canvas.style.height = `${viewportCss.height}px`;

            const renderContext = { canvasContext: ctx, viewport: viewportRender };

            page.render(renderContext).promise.then(() => {
                pageRendering = false;
                updatePageControls();

                const canvasOffsetTop = canvas.offsetTop;
                const canvasOffsetLeft = canvas.offsetLeft;
                textLayerDivGlobal.style.width = `${viewportCss.width}px`;
                textLayerDivGlobal.style.height = `${viewportCss.height}px`;
                textLayerDivGlobal.style.top = `${canvasOffsetTop}px`;
                textLayerDivGlobal.style.left = `${canvasOffsetLeft}px`;

                drawingCanvas.width = viewportCss.width;
                drawingCanvas.height = viewportCss.height;
                drawingCanvas.style.top = `${canvasOffsetTop}px`;
                drawingCanvas.style.left = `${canvasOffsetLeft}px`;

                drawingCtx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
                drawingCtx.lineWidth = 15;
                drawingCtx.lineJoin = 'round'; drawingCtx.lineCap = 'round';

                return renderTextLayer(page, viewportCss, highlightPattern);
            }).catch(reason => {
                console.error(`Error rendering page ${localPage} from doc ${pageInfo.docName}: ` + reason);
                pageRendering = false;
                updatePageControls();
            });
        }).catch(reason => {
            console.error(`Error getting page ${localPage} from doc ${pageInfo.docName}: ` + reason);
            pageRendering = false;
            updatePageControls();
        });
    }

    function renderTextLayer(page, viewport, highlightPattern) {
        if (!textLayerDivGlobal || !pdfjsLib || !pdfjsLib.Util) return Promise.resolve();
        return page.getTextContent().then(function(textContent) {
            currentPageTextContent = textContent;
            textLayerDivGlobal.innerHTML = '';
            textContent.items.forEach(function(item) {
                const textDiv = document.createElement('div');
                const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
                let defaultFontSize = item.height * viewport.scale;
                if (defaultFontSize <= 0) defaultFontSize = 10;
                const style = `position:absolute; left:${tx[4]}px; top:${tx[5] - (item.height * viewport.scale)}px; height:${item.height * viewport.scale}px; width:${item.width * viewport.scale}px; font-size:${defaultFontSize}px; line-height: 1; white-space: pre; font-family: ${item.fontName ? item.fontName.split(',')[0] : 'sans-serif'};`;
                textDiv.setAttribute('style', style);
                textDiv.textContent = item.str;

                if (highlightPattern && highlightPattern.test(item.str)) {
                    textDiv.classList.add('wavy-underline');
                }
                textLayerDivGlobal.appendChild(textDiv);
            });
        }).catch(reason => console.error('Error rendering text layer: ' + reason));
    }

    function getEventPosition(canvasElem, evt) {
        if (!canvasElem) return { x: 0, y: 0 };
        const rect = canvasElem.getBoundingClientRect();
        let clientX, clientY;
        if (evt.touches && evt.touches.length > 0) {
            clientX = evt.touches[0].clientX;
            clientY = evt.touches[0].clientY;
        } else {
            clientX = evt.clientX;
            clientY = evt.clientY;
        }
        return { x: clientX - rect.left, y: clientY - rect.top };
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

    async function renderThumbnail(docIndex, localPageNum, canvasEl) {
        try {
            const doc = pdfDocs[docIndex];
            if (!doc || !canvasEl) return;
            const page = await doc.getPage(localPageNum);
            const viewport = page.getViewport({ scale: 1 });
            const scale = (canvasEl.parentElement.clientWidth - 20) / viewport.width;
            const scaledViewport = page.getViewport({ scale: scale });
            const thumbnailCtx = canvasEl.getContext('2d');
            canvasEl.height = scaledViewport.height;
            canvasEl.width = scaledViewport.width;
            const renderContext = { canvasContext: thumbnailCtx, viewport: scaledViewport };
            await page.render(renderContext).promise;
        } catch (error) {
            console.error(`Failed to render thumbnail for doc ${docIndex} page ${localPageNum}:`, error);
        }
    }

    function searchKeyword() {
        const input = searchInputElem.value.trim();
        searchResults = [];
        currentFileFilter = 'all'; // Reset filter on new search

        const searchingOption = '<option value="">Searching...</option>';
        if(resultsDropdown) resultsDropdown.innerHTML = searchingOption;
        if(panelResultsDropdown) panelResultsDropdown.innerHTML = searchingOption;
        if(fileFilterDropdown) fileFilterDropdown.innerHTML = '<option value="all">All Files</option>';
        if(panelFileFilterDropdown) panelFileFilterDropdown.innerHTML = '<option value="all">All Files</option>';
        if(resultsList) resultsList.innerHTML = 'Searching, please wait...';
        updateResultsNav();

        if (pdfDocs.length === 0 || !input) {
            if (pdfDocs.length > 0) renderPage(currentPage, null);
            if(resultsDropdown) resultsDropdown.innerHTML = '<option value="">Search Results</option>';
            if(panelResultsDropdown) panelResultsDropdown.innerHTML = '<option value="">Search Results</option>';
            if(resultsList) resultsList.innerHTML = '';
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
                if (keywords.length === 0) {
                    if (pdfDocs.length > 0) renderPage(currentPage, null);
                    if(resultsDropdown) resultsDropdown.innerHTML = '<option value="">Search Results</option>';
                    if(panelResultsDropdown) panelResultsDropdown.innerHTML = '<option value="">Search Results</option>';
                    if(resultsList) resultsList.innerHTML = '';
                    updateResultsNav();
                    return;
                }
                pattern = new RegExp(keywords.join('.*?'), 'gi');
            }
        } catch (e) {
            alert('Invalid regular expression: ' + e.message);
            if(resultsDropdown) resultsDropdown.innerHTML = '<option value="">Search Results</option>';
            if(panelResultsDropdown) panelResultsDropdown.innerHTML = '<option value="">Search Results</option>';
            if(resultsList) resultsList.innerHTML = '';
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
                    doc.getPage(i).then(p => p.getTextContent().then(textContent => {
                        const pageText = textContent.items.map(item => item.str).join('');
                        pattern.lastIndex = 0;
                        if (pattern.test(pageText)) {
                            pattern.lastIndex = 0;
                            const matchResult = pattern.exec(pageText);
                            let foundMatchSummary = 'Match found';
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
                            return { page: currentGlobalPageForSearch, summary: foundMatchSummary, docName: pageInfo.docName, docIndex: pageInfo.docIndex, localPage: pageInfo.localPage };
                        }
                        return null;
                    })).catch(err => {
                        console.warn(`Error processing page for search: Doc ${pageInfo.docName}, Page ${i}`, err);
                        return null;
                    })
                );
            }
            globalPageOffset += doc.numPages;
        });

        Promise.all(promises).then((allPageResults) => {
            searchResults = allPageResults.filter(r => r !== null).sort((a, b) => a.page - b.page);
            
            if(resultsDropdown) resultsDropdown.innerHTML = '';
            if(panelResultsDropdown) panelResultsDropdown.innerHTML = '';
            if(resultsList) resultsList.innerHTML = '';

            if (searchResults.length === 0) {
                const notFoundMsg = '<option>Keyword not found</option>';
                if(resultsDropdown) resultsDropdown.innerHTML = notFoundMsg;
                if(panelResultsDropdown) panelResultsDropdown.innerHTML = notFoundMsg;
                if(fileFilterDropdown) fileFilterDropdown.innerHTML = '<option value="all">All Files</option>';
                if(panelFileFilterDropdown) panelFileFilterDropdown.innerHTML = '<option value="all">All Files</option>';
                if(resultsList) resultsList.innerHTML = '<p style="padding: 10px;">Keyword not found.</p>';
                renderPage(currentPage, null);
            } else {
                updateFilterAndResults('all'); // Populate all results initially
                if (searchResults.length > 0) {
                    goToPage(searchResults[0].page, pattern);
                }
            }
            updateResultsNav();

            if (window.innerWidth <= 768 && appContainer.classList.contains('menu-active')) {
                appContainer.classList.remove('menu-active');
            }
        }).catch(err => {
            console.error('An unexpected error occurred during search:', err);
            const errorMsg = '<option value="">Search Error</option>';
            if(resultsDropdown) resultsDropdown.innerHTML = errorMsg;
            if(panelResultsDropdown) panelResultsDropdown.innerHTML = errorMsg;
            if(resultsList) resultsList.innerHTML = '<p style="padding: 10px;">An error occurred during search.</p>';
            renderPage(currentPage, null);
            updateResultsNav();
        });
    }

    function updateResultsNav() {
        const hasResults = searchResults.length > 0;
        document.body.classList.toggle('results-bar-visible', hasResults);
        if (appContainer) appContainer.classList.toggle('results-panel-visible', hasResults);
    }
    
    // NEW FUNCTION for cascading dropdowns
    function updateFilterAndResults(selectedFile = 'all') {
        currentFileFilter = selectedFile;
    
        // 1. Get unique doc names and populate file filters
        const docNames = [...new Set(searchResults.map(r => r.docName))];
        const fileDropdowns = [fileFilterDropdown, panelFileFilterDropdown];
    
        fileDropdowns.forEach(dropdown => {
            if (!dropdown) return;
            dropdown.innerHTML = '<option value="all">All Files</option>';
            docNames.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                dropdown.appendChild(option);
            });
            dropdown.value = currentFileFilter; // Set the current selection
        });
    
        // 2. Filter search results based on selection
        const filteredResults = currentFileFilter === 'all'
            ? searchResults
            : searchResults.filter(r => r.docName === currentFileFilter);
    
        // 3. Populate summary dropdowns
        const summaryDropdowns = [resultsDropdown, panelResultsDropdown];
        summaryDropdowns.forEach(dropdown => {
            if (!dropdown) return;
            dropdown.innerHTML = ''; // Clear previous results
            if (filteredResults.length === 0) {
                dropdown.innerHTML = '<option value="">No results for this file</option>';
            } else {
                filteredResults.forEach(result => {
                    const option = document.createElement('option');
                    option.value = result.page;
                    option.innerHTML = `Page ${result.page}: ${result.summary}`;
                    dropdown.appendChild(option);
                });
            }
        });
        
        // 4. Populate results list panel
        if (resultsList) {
            resultsList.innerHTML = ''; // Clear previous list
            if (filteredResults.length === 0) {
                 resultsList.innerHTML = '<p style="padding: 10px;">No results found for this file.</p>';
            } else {
                filteredResults.forEach(result => {
                    const resultItem = document.createElement('div');
                    resultItem.className = 'result-item';
                    resultItem.innerHTML = `<canvas class="thumbnail-canvas"></canvas><div class="page-info">Page ${result.page} (File: ${result.docName})</div><div class="context-snippet">${result.summary}</div>`;
                    resultItem.addEventListener('click', () => goToPage(result.page, getPatternFromSearchInput()));
                    resultsList.appendChild(resultItem);
                    const thumbnailCanvas = resultItem.querySelector('.thumbnail-canvas');
                    renderThumbnail(result.docIndex, result.localPage, thumbnailCanvas);
                });
            }
        }
        
        // 5. If a page is showing, update its selection in the new dropdown
        const currentPageResult = filteredResults.find(r => r.page === currentPage);
        if (currentPageResult) {
            summaryDropdowns.forEach(d => { if(d) d.value = currentPage; });
        }
    }


    if (searchActionButton) searchActionButton.addEventListener('click', searchKeyword);
    if (searchInputElem) searchInputElem.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); searchActionButton.click(); } });
    
    // Summary dropdown listeners
    if (resultsDropdown) {
        resultsDropdown.addEventListener('change', () => goToPageDropdown(resultsDropdown.value));
    }
    if (panelResultsDropdown) {
        panelResultsDropdown.addEventListener('change', () => goToPageDropdown(panelResultsDropdown.value));
    }

    // NEW file filter dropdown listeners
    if (fileFilterDropdown) {
        fileFilterDropdown.addEventListener('change', (e) => {
            updateFilterAndResults(e.target.value);
        });
    }
    if (panelFileFilterDropdown) {
        panelFileFilterDropdown.addEventListener('change', (e) => {
            updateFilterAndResults(e.target.value);
        });
    }


    function goToPageDropdown(pageNumStr) {
        if (pageNumStr) {
            const pageNum = parseInt(pageNumStr);
            goToPage(pageNum, getPatternFromSearchInput());
        }
    }

    function goToPage(globalPageNum, highlightPatternForPage = null) {
        if (pdfDocs.length === 0 || isNaN(globalPageNum)) return;
        const n = Math.max(1, Math.min(globalPageNum, globalTotalPages));
        const currentGlobalPattern = getPatternFromSearchInput();
        if (pageRendering && currentPage === n && JSON.stringify(highlightPatternForPage) === JSON.stringify(currentGlobalPattern)) return;
        if (pageRendering && !(currentPage === n && JSON.stringify(highlightPatternForPage) !== JSON.stringify(currentGlobalPattern))) return;
        
        currentPage = n;
        const finalHighlightPattern = highlightPatternForPage !== null ? highlightPatternForPage : currentGlobalPattern;
        renderPage(currentPage, finalHighlightPattern);
        
        if (pageToGoInput) pageToGoInput.value = currentPage;
        if (pageSlider) pageSlider.value = currentPage;
        if (resultsDropdown) resultsDropdown.value = currentPage;
        if (panelResultsDropdown) panelResultsDropdown.value = currentPage;
    }

    function getPatternFromSearchInput() {
        const i = searchInputElem ? searchInputElem.value.trim() : null;
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

    if (goToFirstPageBtn) goToFirstPageBtn.addEventListener('click', () => { if (pdfDocs.length > 0) goToPage(1, getPatternFromSearchInput()); });
    if (prevPageBtn) prevPageBtn.addEventListener('click', () => { if (currentPage > 1) goToPage(currentPage - 1, getPatternFromSearchInput()); });
    if (nextPageBtn) nextPageBtn.addEventListener('click', () => { if (pdfDocs.length > 0 && currentPage < globalTotalPages) goToPage(currentPage + 1, getPatternFromSearchInput()); });
    
    if (goToPageBtn && pageToGoInput) {
        goToPageBtn.addEventListener('click', () => {
            const pn = parseInt(pageToGoInput.value);
            if (!isNaN(pn)) goToPage(pn, getPatternFromSearchInput());
        });
    }
    if (pageToGoInput && goToPageBtn) {
        pageToGoInput.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); goToPageBtn.click(); } });
    }
    if (pageSlider) pageSlider.addEventListener('input', () => {
        const newPage = parseInt(pageSlider.value);
        if (pageToGoInput) pageToGoInput.value = newPage;
        if (currentPage !== newPage) goToPage(newPage, getPatternFromSearchInput());
    });

    if (exportPageBtn) exportPageBtn.addEventListener('click', () => {
        if (pdfDocs.length === 0 || !canvas) { alert('Please load a PDF file first'); return; }
        if (pageRendering) { alert('The page is still rendering, please wait'); return; }
        const wasCanvasHidden = canvas.style.visibility === 'hidden';
        if (wasCanvasHidden) canvas.style.visibility = 'visible';
        try {
            const tc = document.createElement('canvas');
            tc.width = canvas.width; tc.height = canvas.height;
            const tctx = tc.getContext('2d');
            if (!tctx) { alert('Could not get context for the export canvas'); return; }
            tctx.drawImage(canvas, 0, 0);
            if (drawingCanvas && drawingCtx) tctx.drawImage(drawingCanvas, 0, 0, drawingCanvas.width, drawingCanvas.height, 0, 0, tc.width, tc.height);
            const idu = tc.toDataURL('image/png');
            const l = document.createElement('a');
            l.href = idu;
            const pageInfo = getDocAndLocalPage(currentPage);
            const docNamePart = pageInfo ? pageInfo.docName.replace(/\.pdf$/i, '') : 'document';
            l.download = `page_${currentPage}_(${docNamePart}-p${pageInfo.localPage})_annotated.png`;
            document.body.appendChild(l);
            l.click();
            document.body.removeChild(l);
        } catch (er) {
            console.error('Export error:', er);
            alert('Failed to export image: ' + er.message);
        } finally {
            if (wasCanvasHidden) canvas.style.visibility = 'hidden';
        }
    });

    if (toggleUnderlineBtn) toggleUnderlineBtn.addEventListener('click', () => {
        if (pdfDocs.length === 0) return;
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

    if (toggleHighlighterBtn) toggleHighlighterBtn.addEventListener('click', () => {
        if (pdfDocs.length === 0) return;
        const wasActive = highlighterEnabled;
        deactivateAllModes();
        if (!wasActive) {
            highlighterEnabled = true;
            if (drawingCanvas) drawingCanvas.style.pointerEvents = 'auto';
        }
        updatePageControls();
    });

    if (toggleTextSelectionBtn) toggleTextSelectionBtn.addEventListener('click', () => {
        if (pdfDocs.length === 0) return;
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

    if (toggleLocalMagnifierBtn) toggleLocalMagnifierBtn.addEventListener('click', () => {
        if (pdfDocs.length === 0) return;
        const wasActive = localMagnifierEnabled;
        deactivateAllModes();
        if (!wasActive) {
            localMagnifierEnabled = true;
        }
        updatePageControls();
    });

    if (toggleParagraphSelectionBtn) toggleParagraphSelectionBtn.addEventListener('click', () => {
        if (pdfDocs.length === 0) return;
        const wasActive = paragraphSelectionModeActive;
        deactivateAllModes();
        if (!wasActive) {
            paragraphSelectionModeActive = true;
            if (pdfContainer) pdfContainer.classList.add('paragraph-selection-mode');
        }
        updatePageControls();
    });


    if (clearHighlighterBtn && drawingCtx && drawingCanvas) clearHighlighterBtn.addEventListener('click', () => {
        if (pdfDocs.length === 0) return;
        drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    });
    
    if (copyPageTextBtn) copyPageTextBtn.addEventListener('click', async () => {
        if (pdfDocs.length === 0 || pageRendering) return;
        const pageInfo = getDocAndLocalPage(currentPage);
        if (!pageInfo) { showFeedback('Could not get current page info.'); return; }
        try {
            const page = await pageInfo.doc.getPage(pageInfo.localPage);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join('\n');
            await navigator.clipboard.writeText(pageText);
            showFeedback('Page text copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy text:', err);
            showFeedback('Error copying page text.');
        }
    });

    if (sharePageBtn) sharePageBtn.addEventListener('click', async () => {
        if (pdfDocs.length === 0 || !canvas) { alert('Please load a PDF file first'); return; }
        if (pageRendering) { alert('The page is still rendering, please wait'); return; }
        const wasCanvasHidden = canvas.style.visibility === 'hidden';
        if (wasCanvasHidden) canvas.style.visibility = 'visible';
        if (!navigator.share) { alert('Your browser does not support the Web Share API'); if (wasCanvasHidden) canvas.style.visibility = 'hidden'; return; }
        try {
            const tc = document.createElement('canvas');
            tc.width = canvas.width; tc.height = canvas.height;
            const tctx = tc.getContext('2d');
            if (!tctx) { alert('Could not get context for the share canvas'); if (wasCanvasHidden) canvas.style.visibility = 'hidden'; return; }
            tctx.drawImage(canvas, 0, 0);
            if (drawingCanvas && drawingCtx) { tctx.drawImage(drawingCanvas, 0, 0, drawingCanvas.width, drawingCanvas.height, 0, 0, tc.width, tc.height); }
            const blob = await new Promise(resolve => tc.toBlob(resolve, 'image/png'));
            if (!blob) { throw new Error('Failed to create image data from canvas.'); }
            const pageInfo = getDocAndLocalPage(currentPage);
            const docNamePart = pageInfo ? pageInfo.docName.replace(/\.pdf$/i, '') : 'document';
            const fn = `page_${currentPage}_(${docNamePart}-p${pageInfo.localPage})_annotated.png`;
            const f = new File([blob], fn, { type: 'image/png' });
            const sd = { title: `PDF Global Page ${currentPage}`, text: `Page ${pageInfo.localPage} from ${docNamePart} (PDF Tool)`, files: [f] };
            if (navigator.canShare && navigator.canShare({ files: [f] })) {
                await navigator.share(sd);
            } else {
                const fsd = { title: sd.title, text: sd.text };
                if (fsd.text && navigator.canShare && navigator.canShare(fsd)) {
                    await navigator.share(fsd);
                } else {
                    alert('Your browser does not support sharing files or text.');
                }
            }
        } catch (er) {
            console.error('Share error:', er);
            if (er.name !== 'AbortError') { alert('Share failed: ' + er.message); }
        } finally {
            if (wasCanvasHidden) { canvas.style.visibility = 'hidden'; }
        }
    });

    if (localMagnifierZoomSelector) localMagnifierZoomSelector.addEventListener('change', (e) => { LOCAL_MAGNIFIER_ZOOM_LEVEL = parseFloat(e.target.value); });

    function handlePointerMoveForLocalMagnifier(e) {
        if (!localMagnifierEnabled) return;
        if (e.type === 'touchmove' || e.type === 'touchstart') e.preventDefault();
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; } 
        else if (e.clientX !== undefined) { clientX = e.clientX; clientY = e.clientY; } 
        else { return; }
        updateLocalMagnifier(clientX, clientY);
    }

    function handlePointerLeaveForLocalMagnifier() {
        if (localMagnifierEnabled && magnifierGlass) magnifierGlass.style.display = 'none';
    }

    if (pdfContainer) {
        pdfContainer.addEventListener('mousemove', handlePointerMoveForLocalMagnifier);
        pdfContainer.addEventListener('mouseleave', handlePointerLeaveForLocalMagnifier);
        pdfContainer.addEventListener('touchstart', handlePointerMoveForLocalMagnifier, { passive: false });
        pdfContainer.addEventListener('touchmove', handlePointerMoveForLocalMagnifier, { passive: false });
        pdfContainer.addEventListener('touchend', handlePointerLeaveForLocalMagnifier);
        pdfContainer.addEventListener('touchcancel', handlePointerLeaveForLocalMagnifier);
    }

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (pdfDocs.length > 0) renderPage(currentPage, getPatternFromSearchInput());
        }, 250);
    });

    if (fitWidthBtn) fitWidthBtn.addEventListener('click', () => { currentZoomMode = 'width'; renderPage(currentPage, getPatternFromSearchInput()); });
    if (fitHeightBtn) fitHeightBtn.addEventListener('click', () => { currentZoomMode = 'height'; renderPage(currentPage, getPatternFromSearchInput()); });
    if (zoomInBtn) zoomInBtn.addEventListener('click', () => { currentZoomMode = 'custom'; currentScale += 0.2; renderPage(currentPage, getPatternFromSearchInput()); });
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => { currentZoomMode = 'custom'; currentScale = Math.max(0.1, currentScale - 0.2); renderPage(currentPage, getPatternFromSearchInput()); });

    function navigateToNextResult() {
        if (searchResults.length === 0) return;
        const nextResult = searchResults.find(r => r.page > currentPage);
        if (nextResult) {
            goToPage(nextResult.page, getPatternFromSearchInput());
        } else {
            showFeedback('Already at the last result');
        }
    }

    function navigateToPreviousResult() {
        if (searchResults.length === 0) return;
        const prevResult = [...searchResults].reverse().find(r => r.page < currentPage);
        if (prevResult) {
            goToPage(prevResult.page, getPatternFromSearchInput());
        } else {
            showFeedback('Already at the first result');
        }
    }

    function showFeedback(message) {
        let feedbackDiv = document.getElementById('feedback-message');
        if (!feedbackDiv) {
            feedbackDiv = document.createElement('div');
            feedbackDiv.id = 'feedback-message';
            document.body.appendChild(feedbackDiv);
            Object.assign(feedbackDiv.style, { position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(0, 0, 0, 0.7)', color: 'white', padding: '10px 20px', borderRadius: '20px', zIndex: '9999', opacity: '0', transition: 'opacity 0.5s', pointerEvents: 'none' });
        }
        feedbackDiv.textContent = message;
        feedbackDiv.style.opacity = '1';
        setTimeout(() => { feedbackDiv.style.opacity = '0'; }, 1500);
    }

    let touchStartX = 0, touchStartY = 0, isSwiping = false;
    const MIN_SWIPE_DISTANCE_X = 50, MAX_SWIPE_DISTANCE_Y = 60;

    if (pdfContainer) {
        pdfContainer.addEventListener('touchstart', (e) => {
            if (highlighterEnabled || textSelectionModeActive || localMagnifierEnabled || paragraphSelectionModeActive || e.touches.length !== 1) { isSwiping = false; return; }
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            isSwiping = true;
        }, { passive: true });
        pdfContainer.addEventListener('touchend', (e) => {
            if (!isSwiping || e.changedTouches.length !== 1) { isSwiping = false; return; }
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const diffX = touchEndX - touchStartX;
            const diffY = touchEndY - touchStartY;
            if (Math.abs(diffX) > MIN_SWIPE_DISTANCE_X && Math.abs(diffY) < MAX_SWIPE_DISTANCE_Y) {
                const isSearchResultMode = searchResults.length > 0;
                if (diffX < 0) { isSearchResultMode ? navigateToNextResult() : nextPageBtn.click(); } 
                else { isSearchResultMode ? navigateToPreviousResult() : prevPageBtn.click(); }
            }
            isSwiping = false;
        });
        pdfContainer.addEventListener('touchcancel', () => { isSwiping = false; });
    }

    function clearParagraphHighlights() {
        document.querySelectorAll('.paragraph-highlight, #copy-paragraph-btn').forEach(el => el.remove());
    }

    function handleParagraphSelection(e) {
        if (!paragraphSelectionModeActive || !currentPageTextContent || !currentViewport) return;

        clearParagraphHighlights();

        const pos = getEventPosition(canvas, e);
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

        currentPageTextContent.items.sort((a, b) => a.transform[5] - b.transform[5] || a.transform[4] - b.transform[4]);

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
            if (line.length === 0) continue;
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
            pdfContainer.appendChild(highlight);
            paragraphText += line.map(item => item.str).join('') + '\n';
        }

        const lastLineOfParagraph = lines[paragraphEndLine];
        if (lastLineOfParagraph.length > 0) {
            const lastItemOfParagraph = lastLineOfParagraph[lastLineOfParagraph.length - 1];
            const tx = pdfjsLib.Util.transform(currentViewport.transform, lastItemOfParagraph.transform);
            const copyBtn = document.createElement('button');
            copyBtn.id = 'copy-paragraph-btn';
            copyBtn.textContent = 'Copy';
            copyBtn.style.left = `${tx[4] + lastItemOfParagraph.width * currentViewport.scale + 5}px`;
            copyBtn.style.top = `${tx[5] - lastItemOfParagraph.height * currentViewport.scale}px`;
            copyBtn.onclick = async () => {
                try {
                    await navigator.clipboard.writeText(paragraphText.trim());
                    showFeedback('Paragraph copied!');
                    clearParagraphHighlights();
                } catch (err) {
                    showFeedback('Failed to copy.');
                    console.error('Copy failed:', err);
                }
            };
            pdfContainer.appendChild(copyBtn);
        }
    }

    if (pdfContainer) {
        pdfContainer.addEventListener('click', handleParagraphSelection);
    }
    
    // NEW FUNCTION to rerender thumbnails after resize
    function rerenderAllThumbnails() {
        if (!resultsList) return;
        const resultItems = resultsList.querySelectorAll('.result-item');
        
        const filteredResults = currentFileFilter === 'all'
            ? searchResults
            : searchResults.filter(r => r.docName === currentFileFilter);

        if (resultItems.length !== filteredResults.length) {
            console.warn("Mismatch between DOM results and filtered results. Skipping thumbnail rerender.");
            return;
        }

        resultItems.forEach((item, index) => {
            const resultData = filteredResults[index];
            const canvasEl = item.querySelector('.thumbnail-canvas');
            if (resultData && canvasEl) {
                const ctx = canvasEl.getContext('2d');
                ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
                renderThumbnail(resultData.docIndex, resultData.localPage, canvasEl);
            }
        });
    }

    // NEW FUNCTION to initialize the resizer logic
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
            const maxWidth = mainContent.clientWidth * 0.7; // 70% of parent
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

    initLocalMagnifier();
    updatePageControls();
    initResizer(); // Initialize the resizer

    async function initializeApp() {
        try {
            await initDB();
            const storedFiles = await getFiles();
            if (storedFiles.length > 0) {
                const restoreContainer = document.getElementById('restore-session-container');
                const restoreBtn = document.getElementById('restore-session-btn');
                if(restoreContainer) restoreContainer.style.display = 'block';
                if(restoreBtn) {
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
    
    initializeApp();
});
