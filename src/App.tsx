import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { open, save } from '@tauri-apps/api/dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/api/fs';
import Editor from '@monaco-editor/react';
import FileTree, { FileEntry } from './FileTree';
import HomeScreen from './HomeScreen';
import {
  Box, AppBar, Toolbar, Button, Typography, TextField, Paper, Tooltip, IconButton, CircularProgress
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SaveIcon from '@mui/icons-material/Save';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import RefreshIcon from '@mui/icons-material/Refresh';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import MenuIcon from '@mui/icons-material/Menu';
import { Panel, PanelGroup, PanelResizeHandle, ImperativePanelHandle } from 'react-resizable-panels';

function App() {
  const [source, setSource] = useState('');
  const [preview, setPreview] = useState('');
  const [filePath, setFilePath] = useState<string | null>(null);
  const [projectRoot, setProjectRoot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>("No errors.");
  const [status, setStatus] = useState<string>('Ready');
  const [fileTree, setFileTree] = useState<FileEntry[]>([]);
  const [mainFile, setMainFile] = useState('main.typ');
  const [mainFileInput, setMainFileInput] = useState('main.typ');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [fitToWidth, setFitToWidth] = useState(true);
  const [isFileTreeVisible, setIsFileTreeVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const fileTreePanelRef = useRef<ImperativePanelHandle>(null);

  const triggerCompilation = useCallback(async () => {
    if (!projectRoot || !mainFile) return;
    setStatus('Compiling...');
    setError("No errors.");
    try {
      const mainFilePath = `${projectRoot}/${mainFile}`;
      const mainFileContent = await readTextFile(mainFilePath);
      const svg = await invoke<string>('compile_preview', { source: mainFileContent, projectRoot });
      setPreview(svg);
      setStatus('Ready');
    } catch (err: any) {
      setPreview('');
      setStatus('Error');
      setError(err.toString());
    }
  }, [projectRoot, mainFile]);

  const loadFileTree = useCallback(async () => {
    if (!projectRoot) return;
    
    setError(`Loading file tree from: ${projectRoot}`);
    try {
        const tree = await invoke<FileEntry[]>('get_file_tree', { projectRoot });
        console.log('File tree loaded:', tree);
        setFileTree(tree);
        setError("File tree loaded");
    } catch (err: any) {
        console.error('File tree error:', err);
        setError(`Failed to load file tree: ${err}`);
    }
  }, [projectRoot]);

  useEffect(() => {
    if (projectRoot) {
      loadFileTree();
      triggerCompilation();
      fileTreePanelRef.current?.resize(14); // Expand the file tree panel
    }
  }, [projectRoot, loadFileTree, triggerCompilation]);

  useEffect(() => {
    if (projectRoot) triggerCompilation();
  }, [mainFile, triggerCompilation]);

  const openFile = async (path: string) => {
    try {
      const content = await readTextFile(path);
      setFilePath(path);
      const root = path.substring(0, path.lastIndexOf('/'));
      if (projectRoot !== root) setProjectRoot(root);
      setSource(content);
    } catch (err: any) {
      setError(`Failed to open file: ${err}`);
    }
  };

  const handleProjectOpen = (projectPath: string) => {
    setProjectRoot(projectPath);
  };

  const handleOpen = async () => {
    const path = await open({ filters: [{ name: 'Typst', extensions: ['typ'] }] });
    if (path && !Array.isArray(path)) openFile(path);
  };

  const handleSave = async () => {
    if (!filePath) {
      const path = await save({ filters: [{ name: 'Typst', extensions: ['typ'] }] });
      if (path && !Array.isArray(path)) {
        await writeTextFile(path, source);
        setFilePath(path);
        const root = path.substring(0, path.lastIndexOf('/'));
        if (!projectRoot) setProjectRoot(root);
        else triggerCompilation();
      }
    } else {
      await writeTextFile(filePath, source);
      triggerCompilation();
    }
  };

  const handleExportPdf = async () => {
    if (!projectRoot || !mainFile) {
      setError('Cannot export PDF without a main file set.');
      return;
    }
    const destination = await save({ filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    if (destination && !Array.isArray(destination)) {
      try {
        const mainFilePath = `${projectRoot}/${mainFile}`;
        const mainFileContent = await readTextFile(mainFilePath);
        await invoke('export_pdf', { source: mainFileContent, projectRoot, destination });
      } catch (err: any) {
        setError(`Failed to export PDF: ${err}`);
      }
    }
  };

  const handleZoomIn = () => {
    setFitToWidth(false);
    setZoomLevel(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setFitToWidth(false);
    setZoomLevel(prev => Math.max(prev / 1.2, 0.2));
  };

  const handleFitToView = () => {
    setFitToWidth(true);
    setZoomLevel(1);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  if (isLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        bgcolor: 'background.default'
      }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={48} sx={{ mb: 2 }} />
          <Typography variant="h6" color="text.secondary">Loading Typst Editor...</Typography>
        </Box>
      </Box>
    );
  }

  if (!projectRoot) {
    return <HomeScreen onProjectOpen={handleProjectOpen} />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" sx={{ flexShrink: 0 }}>
        <Toolbar variant="dense" sx={{ gap: 1 }}>
          <Button variant="outlined" size="small" onClick={handleOpen} startIcon={<FolderOpenIcon />}>Open</Button>
          <Button variant="outlined" size="small" onClick={handleSave} startIcon={<SaveIcon />}>Save</Button>
          <Button variant="outlined" size="small" onClick={handleExportPdf} startIcon={<PictureAsPdfIcon />}>Export</Button>
          <Button variant="outlined" size="small" onClick={loadFileTree} startIcon={<RefreshIcon />}>Reload</Button>
          <Button variant="outlined" size="small" onClick={() => setIsFileTreeVisible(!isFileTreeVisible)} startIcon={<MenuIcon />}>
            {isFileTreeVisible ? 'Hide' : 'Show'} Files
          </Button>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 2 }}>
            <IconButton size="small" onClick={handleZoomOut} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }}><ZoomOutIcon fontSize="small" /></IconButton>
            <Typography variant="body2" sx={{ minWidth: '50px', textAlign: 'center', px: 1, py: 0.5, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
              {Math.round(zoomLevel * 100)}%
            </Typography>
            <IconButton size="small" onClick={handleZoomIn} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }}><ZoomInIcon fontSize="small" /></IconButton>
            <IconButton size="small" onClick={handleFitToView} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }}><FitScreenIcon fontSize="small" /></IconButton>
          </Box>

          <Box sx={{ flexGrow: 1 }} />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(255,255,255,0.05)', px: 2, py: 0.5, borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">Main:</Typography>
            <TextField 
              size="small" 
              variant="outlined" 
              value={mainFileInput} 
              onChange={(e) => setMainFileInput(e.target.value)} 
              sx={{ 
                minWidth: '120px',
                '& .MuiOutlinedInput-root': {
                  height: '32px',
                  fontSize: '0.8rem',
                }
              }}
            />
            <Button size="small" variant="contained" onClick={() => setMainFile(mainFileInput)}>Set</Button>
          </Box>
          
          <Typography variant="body2" sx={{ 
            ml: 2, 
            px: 2, 
            py: 0.5, 
            borderRadius: 1, 
            bgcolor: status === 'Error' ? 'error.dark' : status === 'Compiling...' ? 'warning.dark' : 'success.dark' 
          }}>
            {status}
          </Typography>
        </Toolbar>
      </AppBar>
      <Box sx={{ flexGrow: 1 }}>
        <PanelGroup direction="vertical">
          <Panel>
            <PanelGroup direction="horizontal">
              {isFileTreeVisible && (
                <>
                  <Panel ref={fileTreePanelRef} defaultSize={14} minSize={9} collapsible>
                    <Box sx={{ 
                      height: '100%', 
                      overflow: 'auto', 
                      bgcolor: 'background.paper',
                      borderRight: '1px solid',
                      borderColor: 'divider'
                    }}>
                      <FileTree tree={fileTree} onFileSelect={openFile} currentFilePath={filePath} />
                    </Box>
                  </Panel>
                  <PanelResizeHandle style={{ width: '2px', background: '#334155', cursor: 'col-resize' }} />
                </>
              )}
              <Panel defaultSize={43} minSize={30}>
                <Box sx={{ height: '100%', bgcolor: '#1e1e1e' }}>
                  <Editor 
                    height="100%" 
                    language="markdown" 
                    value={source} 
                    onChange={(value) => setSource(value || '')} 
                    theme="vs-dark" 
                    options={{ 
                      minimap: { enabled: false }, 
                      fontSize: 13, 
                      wordWrap: 'on',
                      fontFamily: 'JetBrains Mono, Fira Code, Monaco, Consolas, monospace',
                      lineHeight: 1.6,
                      padding: { top: 16, bottom: 16 }
                    }}
                  />
                </Box>
              </Panel>
              <PanelResizeHandle style={{ width: '2px', background: '#334155', cursor: 'col-resize' }} />
              <Panel defaultSize={43} minSize={30}>
                <Paper sx={{ 
                  height: '100%', 
                  overflow: 'auto', 
                  m: 0,
                  borderRadius: 0,
                  bgcolor: '#f8fafc',
                  p: 2
                }}>
                  <Box sx={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    minHeight: '100%'
                  }}>
                    <div 
                      style={{ 
                        zoom: fitToWidth ? 'unset' : zoomLevel,
                        width: fitToWidth ? '100%' : 'auto',
                        maxWidth: fitToWidth ? '100%' : 'none',
                        transition: 'zoom 0.2s ease',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        borderRadius: '8px',
                        overflow: 'visible',
                        backgroundColor: 'white'
                      }} 
                      dangerouslySetInnerHTML={{ __html: preview }} 
                    />
                  </Box>
                </Paper>
              </Panel>
            </PanelGroup>
          </Panel>
          <PanelResizeHandle style={{ height: '2px', background: '#334155', cursor: 'row-resize' }} />
          <Panel defaultSize={20} minSize={10}>
            <Box sx={{ 
              height: '100%', 
              p: 2, 
              bgcolor: '#0f172a', 
              borderTop: '1px solid',
              borderColor: 'divider',
              overflow: 'auto' 
            }}>
              <Typography variant="h6" sx={{ mb: 1, color: 'primary.light' }}>Console</Typography>
              <Box sx={{ 
                bgcolor: 'rgba(0,0,0,0.3)', 
                p: 1.5, 
                borderRadius: 1, 
                border: '1px solid #334155'
              }}>
                <pre style={{ 
                  whiteSpace: 'pre-wrap', 
                  wordBreak: 'break-word', 
                  margin: 0,
                  fontSize: '0.8rem',
                  lineHeight: 1.4,
                  color: '#e2e8f0'
                }}>{error}</pre>
              </Box>
            </Box>
          </Panel>
        </PanelGroup>
      </Box>
    </Box>
  );
}

export default App;
