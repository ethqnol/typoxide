import React, { useState } from 'react';
import TreeView from '@mui/lab/TreeView';
import TreeItem from '@mui/lab/TreeItem';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FolderIcon from '@mui/icons-material/Folder';
import DescriptionIcon from '@mui/icons-material/Description';
import { Box, Typography } from '@mui/material';

export interface FileEntry {
  name: string;
  path: string;
  is_directory: boolean;
  children: FileEntry[];
}

interface Props {
  tree: FileEntry[];
  onFileSelect: (path: string) => void;
  currentFilePath?: string | null;
}

const SimpleFileItem: React.FC<{ node: FileEntry; onFileSelect: (path: string) => void; currentFilePath?: string | null; depth?: number }> = ({ node, onFileSelect, currentFilePath, depth = 0 }) => {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div>
      <Box
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          py: 0.75,
          px: 1, 
          ml: depth * 1.5,
          cursor: 'pointer',
          borderRadius: 1,
          transition: 'all 0.2s ease',
          bgcolor: currentFilePath === node.path ? 'primary.main' : 'transparent',
          color: currentFilePath === node.path ? 'primary.contrastText' : 'inherit',
          '&:hover': { 
            bgcolor: currentFilePath === node.path ? 'primary.dark' : 'primary.main',
            color: 'primary.contrastText',
            transform: 'translateX(2px)'
          }
        }}
        onClick={(e) => {
          if (node.is_directory) {
            setExpanded(!expanded);
          } else {
            e.stopPropagation();
            onFileSelect(node.path);
          }
        }}
      >
        {node.is_directory ? (
          <FolderIcon sx={{ mr: 1.5, fontSize: 16, color: expanded ? 'warning.main' : 'inherit' }} />
        ) : (
          <DescriptionIcon sx={{ mr: 1.5, fontSize: 16, color: 'info.main' }} />
        )}
        <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
          {node.name}
        </Typography>
        {node.is_directory && (
          <Box sx={{ ml: 'auto' }}>
            {expanded ? <ExpandMoreIcon sx={{ fontSize: 14 }} /> : <ChevronRightIcon sx={{ fontSize: 14 }} />}
          </Box>
        )}
      </Box>
      {node.is_directory && expanded && node.children && (
        <Box sx={{ borderLeft: '1px solid', borderColor: 'divider', ml: 2, pl: 1 }}>
          {node.children.map((child) => (
            <SimpleFileItem key={child.path} node={child} onFileSelect={onFileSelect} currentFilePath={currentFilePath} depth={depth + 1} />
          ))}
        </Box>
      )}
    </div>
  );
};

const FileTree: React.FC<Props> = ({ tree, onFileSelect, currentFilePath }) => {
  console.log('FileTree rendering with tree:', tree);
  
  if (!tree || tree.length === 0) {
    return (
      <Box sx={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        p: 3
      }}>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          No files found
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', width: '100%', overflowY: 'auto' }}>
      <Box sx={{ 
        p: 2, 
        borderBottom: '1px solid', 
        borderColor: 'divider',
        bgcolor: 'rgba(59, 130, 246, 0.1)'
      }}>
        <Typography variant="h6" sx={{ 
          color: 'primary.light', 
          fontWeight: 600,
          fontSize: '0.875rem'
        }}>
          Explorer
        </Typography>
      </Box>
      <Box sx={{ p: 1 }}>
        {tree.map((node) => (
          <SimpleFileItem key={node.path} node={node} onFileSelect={onFileSelect} currentFilePath={currentFilePath} />
        ))}
      </Box>
    </Box>
  );
};

export default FileTree;
