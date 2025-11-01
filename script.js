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
    noResultsInFilePanel: '<p style="padding: 10px;">No results found in this file.</p>',
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

    // CORRECTED SECTION: These are now correctly defined as functions at the top level.
    pageIndicator: (currentPage, totalPages) => `Page ${currentPage} / ${totalPages}`,
    fileIndicator: (fileName) => ` (File: ${fileName})`,

    // Console Logs
    initSuccess: '✓ PDF Reader optimized and initialized.',
    shortcutsTitle: 'Keyboard Shortcuts:',
    shortcutsNav: '  ← / → : Previous / Next Page (or Result)',
    shortcutsBounds: '  Home / End : First / Last Page',
    shortcutsSearch: '  Ctrl+F : Focus Search Input',
    shortcutsZoom: '  + / - : Zoom In / Zoom Out',
    shortcutsZoomReset: '  Ctrl+0 : Reset Zoom',
};
