import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import MainLayout from '../../layouts/MainLayout.jsx';
import { fetchAcademicYears } from '../../services/academicYearService.js';
import { fetchSystemAnalytics } from '../../services/reportService.js';
// import LineChart from '../../components/reports/LineChart.jsx';
import { LineChart } from '@mui/x-charts/LineChart';
import { BarChart } from '@mui/x-charts/BarChart';
// import BarChart from '../../components/reports/BarChart.jsx';
import PieChart from '../../components/reports/PieChart.jsx';

const palette = ['#60a5fa', '#86efac', '#fda4af', '#fdba74', '#a5b4fc', '#f9a8d4'];

const buildBrowserPie = (usage = {}) =>
  Object.entries(usage).map(([label, value], index) => ({
    label,
    value: Number(value || 0),
    color: palette[index % palette.length],
  }));

const SystemAnalyticsPage = () => {
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [analytics, setAnalytics] = useState({ browserUsage: {}, mostActiveUsers: [], loginActivity: [] });

  useEffect(() => {
    let isMounted = true;
    const loadYears = async () => {
      setLoading(true);
      try {
        const result = await fetchAcademicYears();
        if (!isMounted) return;
        setAcademicYears(result.items || []);
        const current = result.items.find((item) => item.isCurrent) || result.items[0];
        // console.log(items)
        setSelectedYearId(current?.id ?? '');
        setErrorMessage('');
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(error?.message || 'Failed to load academic years');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadYears();
    return () => { isMounted = false; };
  }, []);

  const selectedYear = useMemo(
    () => academicYears.find((year) => String(year.id) === String(selectedYearId)),
    [academicYears, selectedYearId],
  );

  useEffect(() => {
    if (!selectedYear?.academicYear) return;
    let isMounted = true;

    const loadAnalytics = async () => {
      setLoading(true);
      try {
        const academicYearValue = selectedYear.academicYear.replace('/', '-');
        const data = await fetchSystemAnalytics(academicYearValue);
        if (!isMounted) return;
        setAnalytics(data);
        setErrorMessage('');
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(error?.message || 'Failed to load analytics');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadAnalytics();
    return () => { isMounted = false; };
  }, [selectedYear?.academicYear]);

  const loginActivityChart = useMemo(() => ({
    xAxis: [{
      scaleType: 'point',
      data: analytics.loginActivity.map((item) => item.date),
      height: 28,
    }],
    yAxis: [
      { id: 'leftAxisId', width: 50 },
    ],
    series: [
      {
        data: analytics.loginActivity.map((item) => Number(item.count ?? 0)),
        label: 'logins',
        yAxisId: 'leftAxisId',
      },
    ],
  }), [analytics.loginActivity]);

  const browserUsagePie = useMemo(
    () => buildBrowserPie(analytics.browserUsage || {}),
    [analytics.browserUsage],
  );

  const mostActiveBar = useMemo(() => ({
    xAxis: [{ data: analytics.mostActiveUsers.map((item) => item.name) }],
    series: [
      {
        data: analytics.mostActiveUsers.map((item) => Number(item.count ?? 0)),
        color: '#60a5fa',
      },
    ],
  }), [analytics.mostActiveUsers]);

  return (
    <MainLayout>
      <Box sx={{ p: { xs: 2.5, md: 3.5 } }}>
        {loading ? (
          <Typography variant="body2" color="text.secondary">
            Loading...
          </Typography>
        ) : (
          <>
            {errorMessage && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errorMessage}
              </Alert>
            )}

            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 2,
                boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
                mb: 3,
              }}
            >
              {/* <LineChart
                title="Login Activity (previous 7 days)"
                xAxis={loginActivityChart.xAxis}
                series={loginActivityChart.series}
                height={220}
              /> */}
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#364152', mb: 1.5 }}>
                Login Activity (previous 7 days)
              </Typography>
              <LineChart
                title="Login Activity (previous 7 days)"
                series={loginActivityChart.series}
                xAxis={loginActivityChart.xAxis}
                yAxis={loginActivityChart.yAxis}
              />
            </Paper>

            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
              <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#394150' }}>
                Academic year :
              </Typography>
              <TextField
                select
                value={selectedYearId}
                onChange={(event) => setSelectedYearId(event.target.value)}
                sx={{
                  width: 140,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 0.7,
                    height: 40,
                    bgcolor: '#fff',
                  },
                }}
              >
                {academicYears.map((year) => (
                  <MenuItem key={year.id} value={year.id}>
                    {year.academicYear}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3}>
              <Paper
                elevation={0}
                sx={{
                  flex: 1,
                  p: 2.5,
                  borderRadius: 2,
                  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
                }}
              >
                <PieChart title="Browser Usage" data={browserUsagePie} />
              </Paper>
              <Paper
                elevation={0}
                sx={{
                  flex: 1,
                  p: 2.5,
                  borderRadius: 2,
                  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
                }}
              >
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#364152', mb: 1.5 }}>
                  Most Active Users
                </Typography>
                <BarChart title="Most Active Users" xAxis={mostActiveBar.xAxis} series={mostActiveBar.series} height={220} />
              </Paper>
            </Stack>
          </>
        )}
      </Box>
    </MainLayout>
  );
};

export default SystemAnalyticsPage;
