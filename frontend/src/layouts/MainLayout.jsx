import { useMemo, useState, useEffect } from "react";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  Drawer,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
  Menu,
  MenuItem,
  TextField,
  Snackbar,
  Alert,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  DashboardOutlined,
  PeopleAltOutlined,
  ApartmentOutlined,
  CategoryOutlined,
  CalendarMonthOutlined,
  Menu as MenuIcon,
  Logout,
  LockOutlined,
  Visibility,
  VisibilityOff,
  InfoOutlined,
  LightbulbOutlined,
  PersonOutlined,
  FileDownloadOutlined,
  AssessmentOutlined,
  WarningAmberRounded,
  ErrorOutline,
} from "@mui/icons-material";
import { Link as RouterLink, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { extractRoleFromToken } from "../utils/auth";
import { isAdministrativeRole } from "../constants/roles";
import { changePassword } from "../services/authService";

const drawerWidth = 240;

const adminNavItems = [
  { label: 'Users', title: 'User Management', icon: <PeopleAltOutlined fontSize="small" />, path: '/admin' },
  { label: 'Departments', title: 'Department Management', icon: <ApartmentOutlined fontSize="small" />, path: '/departments' },
  { label: 'Academic Year', title: 'Academic Year', icon: <CalendarMonthOutlined fontSize="small" />, path: '/academic-years' },
  { label: 'System Analytics', title: 'System Analytics', icon: <CalendarMonthOutlined fontSize="small" />, path: '/system-analytics' },
];

const staffNavItems = [
  { label: "Ideas", icon: <LightbulbOutlined fontSize="small" />, key: "all", path: "/staff" },
  { label: "My Ideas", icon: <PersonOutlined fontSize="small" />, key: "mine", path: "/staff/my-ideas" },
  { label: "Terms & Conditions", icon: <InfoOutlined fontSize="small" />, key: "terms", path: "/staff/terms" },
];

const qa_managerNavItems = [
  { label: "Ideas", icon: <LightbulbOutlined fontSize="small" />, key: "all", path: "/all-ideas" },
  { label: "Categories", icon: <CategoryOutlined fontSize="small" />, key: "categories", path: "/manage-categories" },
  { label: "Users", icon: <PeopleAltOutlined fontSize="small" />, key: "moderation", path: "/user-moderation" },
  { label: "Data Export", icon: <FileDownloadOutlined fontSize="small" />, key: "export", path: "/data-export" },
  { label: "System Analytics", icon: <AssessmentOutlined fontSize="small" />, key: "reports", path: "/reports" },
];

const coorNavItems = [
  { label: "Ideas", icon: <LightbulbOutlined fontSize="small" />, key: "all", path: "/department-ideas" },
  { label: "Engagement", icon: <CategoryOutlined fontSize="small" />, key: "engagement", path: "/engagement" },
  { label: "Users", icon: <PeopleAltOutlined fontSize="small" />, key: "department-users", path: "/department-users" },
  { label: "System Analytics", icon: <AssessmentOutlined fontSize="small" />, key: "reports", path: "/reports" },
];

const MainLayout = ({ children, activeKey = "all", onNavClick }) => {
  const { clearTokens, accessToken, lastLogin, lastLoginDevice, currentUser, isDefaultPassword, setTokens } = useAuth();
  const { pathname } = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [profileAnchorEl, setProfileAnchorEl] = useState(null);
  const isProfileMenuOpen = Boolean(profileAnchorEl);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [passwordValues, setPasswordValues] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [savingPassword, setSavingPassword] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    next: false,
    confirm: false,
  });
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const roleValue = useMemo(() => {
    if (!accessToken) return null;
    return extractRoleFromToken(accessToken);
  }, [accessToken]);



  const isQAManager = roleValue === 'qa_manager';
  const isQACoordinator = roleValue === 'qa_coordinator';
  const isAdminNav = isAdministrativeRole(roleValue);
  const isStaff = roleValue === 'staff';

  const now = new Date();
  const isIdeaClosed = isStaff && currentUser?.currentAcademicYear?.ideaClosureDate
    ? now > new Date(currentUser.currentAcademicYear.ideaClosureDate)
    : false;
  const isFinalClosed = isStaff && currentUser?.currentAcademicYear?.finalClosureDate
    ? now > new Date(currentUser.currentAcademicYear.finalClosureDate)
    : false;
  const navItems = isAdminNav ? adminNavItems : (isQAManager ? qa_managerNavItems : ( isQACoordinator ? coorNavItems : staffNavItems));

  const activeNavItem = navItems.find((item) =>
    item.path ? item.path === pathname : item.key === activeKey
  );

  const pageTitle = activeNavItem?.title || activeNavItem?.label ;

  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen((prevState) => !prevState);
    } else {
      setDesktopOpen((prevState) => !prevState);
    }
  };

  const handleProfileMenuOpen = (event) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileAnchorEl(null);
  };

    useEffect(() => {
    if (!accessToken) return;
    if (!isDefaultPassword) return;
    setChangePasswordOpen(true);
  }, [accessToken, isDefaultPassword]);

  useEffect(() => {
    if (!accessToken) return;
    if (lastLogin) return;
    if (isDefaultPassword) return;
    const userId = currentUser?.id || "user";
    const key = `welcome_shown_${userId}`;
    try {
      if (!sessionStorage.getItem(key)) {
        setWelcomeOpen(true);
        sessionStorage.setItem(key, "true");
      }
    } catch {
      setWelcomeOpen(true);
    }
  }, [accessToken, lastLogin, currentUser?.id]);



  const handleOpenChangePassword = () => {
    setPasswordValues({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordErrors({});
    setChangePasswordOpen(true);
    handleProfileMenuClose();
  };

  const handleCloseChangePassword = (force = false) => {
    if (isDefaultPassword && !force) return;
    setChangePasswordOpen(false);
    setPasswordValues({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordErrors({});
    setShowPasswords({ current: false, next: false, confirm: false });
  };

  const handleTogglePassword = (field) => () => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handlePasswordChange = (field) => (event) => {
    const value = event.target.value;
    setPasswordValues((prev) => ({ ...prev, [field]: value }));
    if (passwordErrors[field]) {
      setPasswordErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validatePasswordForm = () => {
    const nextErrors = {};
    if (!passwordValues.currentPassword) nextErrors.currentPassword = 'Current password is required';
    if (!passwordValues.newPassword) nextErrors.newPassword = 'New password is required';
    if (!passwordValues.confirmPassword) nextErrors.confirmPassword = 'Confirm password is required';
    if (passwordValues.newPassword && passwordValues.confirmPassword && passwordValues.newPassword !== passwordValues.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }
    setPasswordErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmitChangePassword = async () => {
    if (!validatePasswordForm()) return;
    setSavingPassword(true);
    try {
      await changePassword({
        currentPassword: passwordValues.currentPassword,
        newPassword: passwordValues.newPassword,
        confirmedPassword: passwordValues.confirmPassword,
      });
      setTokens({ isDefaultPassword: false });
      handleCloseChangePassword(true);
      setToast({ open: true, message: 'Password changed successfully', severity: 'success' });
      if (!lastLogin) {
        setWelcomeOpen(true);
      }
    } catch (error) {
      setToast({ open: true, message: error?.message || 'Failed to change password', severity: 'error' });
      setPasswordErrors((prev) => ({
        ...prev,
        currentPassword: error?.message || 'Failed to change password',
      }));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleToastClose = () => setToast((prev) => ({ ...prev, open: false }));

  const handleLogout = () => {
    handleProfileMenuClose();
    setLogoutOpen(true);
  };

  const handleCloseLogout = () => setLogoutOpen(false);

  const handleConfirmLogout = () => {
    setLogoutOpen(false);
    clearTokens();
  };

  const sidebar = useMemo(
    () => (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          backgroundColor: '#1f2937',
          color: '#f5f6fb',
          pt: 3,
          pb: 2,
          px: 2,
        }}
      >
        {/* Logo Section */}
        <Stack direction="row" spacing={1.5} alignItems="center" mb={5}>
          <Box
            component="img"
            src="/ideahub-logo.png"
            alt="IdeaHub Logo"
            sx={{
              width: isAdminNav ? 44 : 36,
              height: "auto",
              borderRadius: 2,
              objectFit: "contain",
            }}
          />
          <Box>
            <Typography
              variant="subtitle1"
              sx={{ color: "#fff", fontWeight: 700, lineHeight: 1.2 }}
            >
              IdeaHub
            </Typography>
            {currentUser?.departmentName && (
              <Typography
                variant="caption"
                sx={{ color: "#9ca3af", lineHeight: 1.2, display: 'block' }}
              >
                {`${currentUser.departmentName} (${currentUser.roleDescription ?? ''})`}
              </Typography>
            )}
          </Box>
        </Stack>

        {/* Navigation */}
        <List sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {navItems.map((item) => {
            const active = item.path
              ? pathname === item.path
              : item.key === activeKey;

            return (
              <ListItemButton
                key={isAdminNav ? item.label : item.key}
                {...(item.path ? { component: RouterLink, to: item.path } : {})}
                selected={active}
                onClick={!isAdminNav ? () => onNavClick?.(item.key) : undefined}
                sx={{
                  borderRadius: 2,
                  height: 44,
                  px: 2,
                  color: active ? "#fff" : "#cbd5e1",
                  backgroundColor: active ? "#2563eb" : "transparent",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: active
                      ? "#2563eb"
                      : "rgba(255,255,255,0.06)",
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: "inherit",
                    minWidth: 36,
                  }}
                >
                  {item.icon}
                </ListItemIcon>

                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: "0.95rem",
                    fontWeight: active ? 600 : 500,
                    noWrap: true,
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Box>
    ),
    [pathname, activeKey, onNavClick, isAdminNav, navItems]
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f4f6fb' }}>
      <Box
        component="nav"
        sx={{
          width: { md: desktopOpen ? drawerWidth : 0 },
          flexShrink: { md: 0 },
          transition: "width 0.3s ease",
          overflow: "hidden"
        }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {sidebar}
        </Drawer>
        <Drawer
          variant="persistent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              border: 'none',
              borderRadius: 0,
              background: 'transparent',
            },
          }}
          open={desktopOpen}
        >
          {sidebar}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: '#eef1f6',
          width: { xs: '100%', md: desktopOpen ? `calc(100% - ${drawerWidth}px)` : '100%' },
          transition: "width 0.3s ease",
          height: '100vh',
          overflowY: 'hidden',
        }}
      >
        <AppBar
          position="static"
          elevation={0}
          sx={{ bgcolor: '#f9fbff', borderBottom: '1px solid #e3e7ef', color: '#1f2a37', borderRadius: 0 }}
        >
          <Toolbar sx={{ minHeight: 72, px: { xs: 1.2, lg: 2.4 } }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <IconButton
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 1, ...(mobileOpen && { display: { md: 'none' } }) }}
              >
                <MenuIcon />
              </IconButton>
              <Typography variant="h6">{pageTitle}</Typography>
            </Stack>

            <Box sx={{ flexGrow: 1 }} />
            <>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ cursor: 'pointer' }} onClick={handleProfileMenuOpen}>
                <Avatar sx={{ width: 36, height: 36, bgcolor: "#cbd5e1", fontSize: "0.875rem", color: "#fff" }}>
                  {currentUser?.fullName?.substring(0, 2)?.toUpperCase() || "U"}
                </Avatar>
                <Typography variant="body2" fontWeight={600} color="#475569">
                  {currentUser?.fullName || "User"}
                </Typography>
              </Stack>

              <Menu
                id="profile-menu"
                anchorEl={profileAnchorEl}
                open={isProfileMenuOpen}
                onClose={handleProfileMenuClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                keepMounted
                PaperProps={{
                  sx: {
                    mt: 1.5,
                    borderRadius: 2,
                    minWidth: 200,
                    py: 1,
                    boxShadow: "0 20px 50px rgba(15, 23, 42, 0.18)",
                  },
                }}
              >
                <Box sx={{ px: 2, pb: 1.25 }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {currentUser?.fullName || "User"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {currentUser?.email || "user@university.edu"}
                  </Typography>
                  {currentUser?.currentAcademicYear?.name && (
                    <Typography variant="body2" color="text.secondary">
                      Academic Year: {currentUser.currentAcademicYear.name}
                    </Typography>
                  )}
                  {lastLogin && (
                    <Box>
                      <Divider sx={{ my: 1 }} />
                    <Typography variant="caption" color="text.secondary" display="block">
                      Last login: {new Date(lastLogin).toLocaleString()}
                    </Typography>
                    {lastLoginDevice && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Device: {lastLoginDevice}
                    </Typography>
                  )}
                    </Box>
                  )}
                  
                </Box>
                <Divider sx={{ my: 1 }} />
                <MenuItem
                  onClick={handleOpenChangePassword}
                  sx={{
                    px: 2,
                    gap: 1.25,
                    fontWeight: 600,
                    color: "#1d4ed8",
                  }}
                >
                  <LockOutlined fontSize="small" />
                  Change Password
                </MenuItem>
                <Divider sx={{ my: 1 }} />
                <MenuItem
                  onClick={handleLogout}
                  sx={{
                    px: 2,
                    gap: 1.25,
                    fontWeight: 600,
                    color: "#dc2626",
                  }}
                >
                  <Logout fontSize="small" />
                  Logout
                </MenuItem>
              </Menu>
            </>
          </Toolbar>
        </AppBar>

        {/* <Box sx={{ p: { xs: isAdmin ? 1.2 : 2.5, lg: isAdmin ? 2 : 4 }, minHeight: "calc(100vh - 72px)" }}> */}
        {/* <Box sx={{ px: { xs: 2.5, lg: 4 }, py: { xs: 1, lg: 2 }, minHeight: "calc(100vh - 72px)" }}> */}
      <Box sx={{ height: "calc(100vh - 72px)", overflowY: 'auto' }}>

        {/* Closure warning banner — staff only */}
        {(isFinalClosed || isIdeaClosed) && (
          <Box
            sx={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              px: { xs: 2, md: 3 },
              py: 1,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              bgcolor: isFinalClosed ? "#fef2f2" : "#fffbeb",
              borderBottom: `1px solid ${isFinalClosed ? "#fecaca" : "#fde68a"}`,
            }}
          >
            {isFinalClosed ? (
              <ErrorOutline sx={{ color: "#dc2626", fontSize: 20, flexShrink: 0 }} />
            ) : (
              <WarningAmberRounded sx={{ color: "#d97706", fontSize: 20, flexShrink: 0 }} />
            )}
            <Typography
              variant="body2"
              fontWeight={600}
              sx={{ color: isFinalClosed ? "#b91c1c" : "#92400e" }}
            >
              {isFinalClosed
                ? `Final closure date has passed for "${currentUser.currentAcademicYear.name}" — idea submissions, reactions, comments and edits are all disabled.`
                : `Idea submission period has closed for "${currentUser.currentAcademicYear.name}" — you can no longer post new ideas.`}
            </Typography>
          </Box>
        )}

        {children}
      </Box>
    </Box>

      <Dialog open={welcomeOpen} onClose={() => setWelcomeOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Welcome</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Welcome to IdeaHub.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            variant="contained"
            onClick={() => setWelcomeOpen(false)}
            sx={{ borderRadius: 0.7, textTransform: 'none' }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={logoutOpen} onClose={handleCloseLogout} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Logout</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to log out?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={handleCloseLogout}
            variant="outlined"
            sx={{ borderRadius: 0.7, textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmLogout}
            variant="contained"
            color="error"
            sx={{ borderRadius: 0.7, textTransform: 'none' }}
          >
            Logout
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={changePasswordOpen}
        onClose={isDefaultPassword ? undefined : handleCloseChangePassword}
        maxWidth="xs"
        fullWidth
        disableEscapeKeyDown={isDefaultPassword}
        sx={isDefaultPassword ? { zIndex: (theme) => theme.zIndex.modal + 200 } : undefined}
        slotProps={isDefaultPassword ? { backdrop: { sx: { cursor: 'not-allowed' } } } : undefined}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Change Password
          {isDefaultPassword && (
            <Typography variant="body2" color="error" sx={{ fontWeight: 400, mt: 0.5 }}>
              You are using a default password. You must change it before continuing.
            </Typography>
          )}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Current Password"
              type={showPasswords.current ? 'text' : 'password'}
              value={passwordValues.currentPassword}
              onChange={handlePasswordChange('currentPassword')}
              error={Boolean(passwordErrors.currentPassword)}
              helperText={passwordErrors.currentPassword}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton edge="end" onClick={handleTogglePassword('current')}>
                      {showPasswords.current ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="New Password"
              type={showPasswords.next ? 'text' : 'password'}
              value={passwordValues.newPassword}
              onChange={handlePasswordChange('newPassword')}
              error={Boolean(passwordErrors.newPassword)}
              helperText={passwordErrors.newPassword}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton edge="end" onClick={handleTogglePassword('next')}>
                      {showPasswords.next ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Confirm Password"
              type={showPasswords.confirm ? 'text' : 'password'}
              value={passwordValues.confirmPassword}
              onChange={handlePasswordChange('confirmPassword')}
              error={Boolean(passwordErrors.confirmPassword)}
              helperText={passwordErrors.confirmPassword}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton edge="end" onClick={handleTogglePassword('confirm')}>
                      {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          {!isDefaultPassword && (
            <Button onClick={handleCloseChangePassword} disabled={savingPassword} variant="outlined">
              Cancel
            </Button>
          )}
          <Button onClick={handleSubmitChangePassword} disabled={savingPassword} variant="contained">
            {savingPassword ? 'Saving...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={handleToastClose}>
        <Alert severity={toast.severity} onClose={handleToastClose} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default MainLayout;
