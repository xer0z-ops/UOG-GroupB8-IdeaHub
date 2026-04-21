import { useState } from "react";
import { fetchProfile } from "../../services/authService";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Link,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { Visibility, VisibilityOff, LockOutlined, MailOutline, CloseRounded } from "@mui/icons-material";
import { forgotPassword, login } from "../../services/authService";
import useAuth from "../../hooks/useAuth";
import loginImg from '@/assets/Login-pana.png';

const ACCENT = "#2f64ff";
const ACCENT_DARK = "#2752d0";
const BORDER_IDLE = "#d1d5db";
const BORDER_HOVER = "#a0aec0";

// A self-contained styled wrapper so overrides are scoped only to this page
// and don't bleed into the global theme.
const LoginTextField = ({ adornmentIcon, endAdornment, ...props }) => (
  <TextField
    fullWidth
    variant="outlined"
    size="medium"
    InputLabelProps={{
      // Always keep the label shrunk so it never collides with the start icon
      shrink: true,
      sx: {
        color: "#6b7280",
        fontWeight: 500,
        fontSize: "0.875rem",
        "&.Mui-focused": {
          color: ACCENT,
        },
      },
    }}
    InputProps={{
      startAdornment: adornmentIcon ? (
        <InputAdornment position="start">
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              color: "#9ca3af",
              // The focused colour is driven by the fieldset trick below
              ".MuiOutlinedInput-root.Mui-focused &": {
                color: ACCENT,
              },
            }}
          >
            {adornmentIcon}
          </Box>
        </InputAdornment>
      ) : undefined,
      endAdornment: endAdornment ?? undefined,
      sx: {
        borderRadius: "12px",
        bgcolor: "#f9fafb",
        transition: "background-color 0.2s ease",
        // Idle border
        "& fieldset": {
          borderColor: BORDER_IDLE,
          borderWidth: "1.5px",
          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
        },
        // Hover border
        "&:hover fieldset": {
          borderColor: BORDER_HOVER,
        },
        // Focused border + glow — override MUI's default primary colour
        "&.Mui-focused fieldset": {
          borderColor: ACCENT,
          borderWidth: "2px",
          boxShadow: `0 0 0 3px ${ACCENT}22`,
        },
        // Light bg on focus
        "&.Mui-focused": {
          bgcolor: "#fff",
        },
        // Adornment icon colour on focus
        "&.Mui-focused .MuiInputAdornment-root .MuiSvgIcon-root": {
          color: ACCENT,
        },
      },
    }}
    sx={{
      // Remove the extra top gap MUI adds for the floating label
      "& .MuiOutlinedInput-root": {
        "& input": {
          py: "13px",
          fontSize: "0.925rem",
          color: "#111827",
          "&::placeholder": {
            color: "#b0b8c4",
            opacity: 1,
          },
          // Defeat the browser's autofill blue background injection.
          // box-shadow inset is the only CSS property that can override
          // the UA stylesheet's !important autofill background-color.
          "&:-webkit-autofill, &:-webkit-autofill:hover, &:-webkit-autofill:focus": {
            WebkitBoxShadow: "0 0 0 1000px #f9fafb inset",
            WebkitTextFillColor: "#111827",
            caretColor: "#111827",
            borderRadius: "inherit",
            transition: "background-color 99999s ease-in-out 0s",
          },
        },
      },
    }}
    {...props}
  />
);

const LoginPage = () => {
  const { setTokens, updateCurrentUser } = useAuth();
  const [formValues, setFormValues] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

  const handleChange = (field) => (event) => {
    setFormValues((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSubmitting(true);

    try {
      const tokens = await login(formValues);
      try {
        const profile = await fetchProfile(tokens.accessToken);
        updateCurrentUser(profile);
      } catch {
        // non-fatal — profile will load in background
      }
      setTokens(tokens);
    } catch (error) {
      setErrorMessage(error?.message || "Unable to log in right now.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenForgot = () => {
    setForgotEmail("");
    setForgotError("");
    setForgotOpen(true);
  };

  const handleCloseForgot = () => {
    if (forgotSubmitting) return;
    setForgotOpen(false);
  };

  const handleForgotSubmit = async () => {
    if (!forgotEmail.trim()) {
      setForgotError("Email is required");
      return;
    }
    setForgotSubmitting(true);
    setForgotError("");
    try {
      const response = await forgotPassword({ email: forgotEmail.trim() });
      setForgotOpen(false);
      setToast({
        open: true,
        message: response?.message || "A new password is sent to your mail.",
        severity: "success",
      });
    } catch (error) {
      setForgotError(error?.message || "Failed to reset password.");
    } finally {
      setForgotSubmitting(false);
    }
  };

  const handleToastClose = () => setToast((prev) => ({ ...prev, open: false }));

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#343d4e",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 420,
          bgcolor: "#fff",
          borderRadius: "20px",
          p: { xs: 3, sm: 4 },
          textAlign: "center",
          boxShadow: "0 35px 45px rgba(0,0,0,0.35)",
        }}
      >
        {/* Header */}
        <Typography variant="h5" fontWeight={700} color="#111827" mb={0.5}>
          Welcome to IdeaHub
        </Typography>
        <Typography variant="subtitle1" fontWeight={600} color="#374151" mb={0.5}>
          Login
        </Typography>
        <Typography variant="body2" color="#6b7280" mb={3}>
          Sign in to access the system
        </Typography>

        {/* Illustration */}
        <Box
          component="img"
          src={loginImg}
          alt="Secure login illustration"
          sx={{ width: "70%", maxWidth: 220, mx: "auto", mb: 3, display: "block" }}
        />

        {/* Form */}
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
        >
          {errorMessage && (
            <Alert
              severity="error"
              onClose={() => setErrorMessage("")}
              sx={{ borderRadius: "10px", textAlign: "left" }}
            >
              {errorMessage}
            </Alert>
          )}

          <LoginTextField
            type="email"
            label="Email"
            placeholder="Enter your email"
            value={formValues.email}
            onChange={handleChange("email")}
            required
            adornmentIcon={<MailOutline fontSize="small" />}
          />

          <LoginTextField
            type={showPassword ? "text" : "password"}
            label="Password"
            placeholder="Enter your password"
            value={formValues.password}
            onChange={handleChange("password")}
            required
            adornmentIcon={<LockOutlined fontSize="small" />}
            endAdornment={
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword((prev) => !prev)}
                  edge="end"
                  size="small"
                  sx={{
                    color: "#9ca3af",
                    "&:hover": { color: ACCENT, bgcolor: `${ACCENT}11` },
                  }}
                >
                  {showPassword ? (
                    <Visibility fontSize="small" />
                  ) : (
                    <VisibilityOff fontSize="small" />
                  )}
                </IconButton>
              </InputAdornment>
            }
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={submitting}
            sx={{
              mt: 0.5,
              borderRadius: "12px",
              bgcolor: ACCENT,
              fontSize: "0.95rem",
              fontWeight: 600,
              py: 1.5,
              letterSpacing: 0.3,
              boxShadow: `0 4px 14px ${ACCENT}55`,
              "&:hover": {
                bgcolor: ACCENT_DARK,
                boxShadow: `0 6px 18px ${ACCENT}66`,
              },
              "&.Mui-disabled": {
                bgcolor: `${ACCENT}88`,
                color: "#fff",
              },
            }}
          >
            {submitting ? (
              <CircularProgress size={22} sx={{ color: "#fff" }} />
            ) : (
              "Sign In"
            )}
          </Button>
        </Box>

        <Link
          component="button"
          type="button"
          variant="body2"
          onClick={handleOpenForgot}
          sx={{
            mt: 2.5,
            display: "inline-block",
            color: ACCENT,
            fontWeight: 500,
            textDecorationColor: `${ACCENT}55`,
            "&:hover": { color: ACCENT_DARK },
          }}
        >
          Forgot Password?
        </Link>

        <Typography variant="caption" display="block" mt={3} color="#9ca3af">
          © {new Date().getFullYear()} IdeaHub
        </Typography>
      </Box>

      <Dialog open={forgotOpen} onClose={handleCloseForgot} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pr: 5 }}>
          Reset Your Password
          <IconButton
            size="small"
            onClick={handleCloseForgot}
            sx={{
              position: "absolute",
              right: 12,
              top: 12,
              bgcolor: "#f3f4f6",
              "&:hover": { bgcolor: "#e5e7eb" },
            }}
          >
            <CloseRounded fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 600, color: "#374151" }}>
            Email
          </Typography>
          <TextField
            fullWidth
            placeholder="Enter Email"
            value={forgotEmail}
            onChange={(event) => setForgotEmail(event.target.value)}
            error={Boolean(forgotError)}
            helperText={forgotError}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 0.7,
                bgcolor: '#fff',
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={handleCloseForgot}
            disabled={forgotSubmitting}
            variant="contained"
            sx={{
              bgcolor: '#bdbdbd',
              color: '#fff',
              textTransform: 'none',
              borderRadius: 0.7,
              px: 3,
              '&:hover': { bgcolor: '#a3a3a3' },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleForgotSubmit}
            disabled={forgotSubmitting}
            variant="contained"
            sx={{
              bgcolor: ACCENT,
              borderRadius: 0.7,
              px: 3,
              textTransform: 'none',
              '&:hover': { bgcolor: ACCENT_DARK },
            }}
          >
            {forgotSubmitting ? 'Resetting...' : 'Reset'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={handleToastClose}>
        <Alert severity={toast.severity} onClose={handleToastClose} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LoginPage;
