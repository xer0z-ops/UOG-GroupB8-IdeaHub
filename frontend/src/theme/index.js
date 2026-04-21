import { createTheme } from '@mui/material/styles';

const primaryFontStack = ['"Inter"', '"Roboto"', '"Helvetica"', '"Arial"', 'sans-serif'].join(',');

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0d47a1',
      light: '#5472d3',
      dark: '#002171',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#ff9800',
      light: '#ffc947',
      dark: '#c66900',
      contrastText: '#1a1a1a',
    },
    success: {
      main: '#2e7d32',
      light: '#60ad5e',
      dark: '#005005',
      contrastText: '#ffffff',
    },
    error: {
      main: '#c62828',
      light: '#ff5f52',
      dark: '#8e0000',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#f9a825',
      light: '#ffd95a',
      dark: '#c17900',
      contrastText: '#1a1a1a',
    },
    info: {
      main: '#0288d1',
      light: '#5eb8ff',
      dark: '#005b9f',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f7f8fa',
      paper: '#ffffff',
    },
    divider: '#e0e0e0',
    text: {
      primary: '#1c1c1c',
      secondary: '#5f6368',
      disabled: '#9e9e9e',
    },
  },
  typography: {
    fontFamily: primaryFontStack,
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
      lineHeight: 1.2,
    },
    h2: {
      fontWeight: 600,
      fontSize: '2.125rem',
      lineHeight: 1.3,
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
      lineHeight: 1.3,
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.35,
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.4,
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.1rem',
      lineHeight: 1.4,
    },
    subtitle1: {
      fontWeight: 500,
      fontSize: '1rem',
    },
    subtitle2: {
      fontWeight: 500,
      fontSize: '0.875rem',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.9rem',
      lineHeight: 1.5,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
    caption: {
      fontSize: '0.8rem',
      color: '#6b6b6b',
    },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiBox: {
      styleOverrides: {
        root: {
         borderRadius: 2,
       }
     } 
    }, 
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
        sizeLarge: {
          padding: '12px 28px',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 4,
        },
        outlined: {
          borderColor: '#e3e6ed',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          border: '1px solid #e3e6ed',
          boxShadow: '0 4px 20px rgba(15, 18, 31, 0.04)',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
      },
    },
  },
});

export default theme;