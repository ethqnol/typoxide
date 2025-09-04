import { Box, Button, Typography, Paper, Container } from '@mui/material';
import { open } from '@tauri-apps/api/dialog';
import { createDir, writeTextFile } from '@tauri-apps/api/fs';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import AddIcon from '@mui/icons-material/Add';

interface HomeScreenProps {
  onProjectOpen: (projectPath: string) => void;
}

function HomeScreen({ onProjectOpen }: HomeScreenProps) {
  const handleOpenProject = async () => {
    const folderPath = await open({ directory: true });
    if (folderPath && !Array.isArray(folderPath)) {
      onProjectOpen(folderPath);
    }
  };

  const handleCreateProject = async () => {
    const folderPath = await open({ 
      directory: true,
      title: 'Select folder for new Typst project'
    });
    if (folderPath && !Array.isArray(folderPath)) {
      try {
        const mainTypContent = `= My Typst Document

Hello, world! This is a new Typst document.

== Section 1

Some text goes here.

== Section 2

More content here.
`;
        
        await writeTextFile(`${folderPath}/main.typ`, mainTypContent);
        
        onProjectOpen(folderPath);
      } catch (err: any) {
        console.error('Failed to create project:', err);
      }
    }
  };

  return (
    <Container maxWidth="sm" sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper sx={{ p: 6, textAlign: 'center', bgcolor: 'background.paper' }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 300, mb: 3 }}>
          Typst Editor
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          A modern editor for Typst documents
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleCreateProject}
            startIcon={<AddIcon />}
            sx={{ py: 1.5, fontSize: '1.1rem' }}
          >
            Create New Project
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={handleOpenProject}
            startIcon={<FolderOpenIcon />}
            sx={{ py: 1.5, fontSize: '1.1rem' }}
          >
            Open Project
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default HomeScreen;