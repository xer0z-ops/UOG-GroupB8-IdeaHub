import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import MainLayout from '../../layouts/MainLayout.jsx';
import { fetchAcademicYears } from '../../services/academicYearService.js';
import { fetchReportComments, fetchReportIdeas, fetchReportStatistics } from '../../services/reportService.js';
import { fetchIdeas } from '../../services/ideaService.js';
import { fetchComments } from '../../services/commentService.js';
import { BarChart } from '@mui/x-charts/BarChart';
// import BarChart from '../../components/reports/BarChart.jsx';
import PieChart from '../../components/reports/PieChart.jsx';
import ReportsIdeasTable from '../../components/reports/ReportsIdeasTable.jsx';
import ReportsAnonymousIdeasTable from '../../components/reports/ReportsAnonymousIdeasTable.jsx';
import ReportsAnonymousCommentsTable from '../../components/reports/ReportsAnonymousCommentsTable.jsx';
import AllIdeaDetailsDialog from '../../components/ideas/AllIdeaDetailsDialog.jsx';

const palette = ['#60a5fa', '#86efac', '#fda4af', '#fdba74', '#a5b4fc', '#f9a8d4'];

const buildChartData = (items, valueKey) =>
  items.map((item, index) => ({
    label: item.department,
    value: Number(item[valueKey] || 0),
    color: palette[index % palette.length],
  }));

function ReportsPage() {
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState('statistics');
  const [stats, setStats] = useState({ ideasPerDepartment: [], contributorsPerDepartment: [] });
  const [ideas, setIdeas] = useState([]);
  const [withoutCommentIdeas, setWithoutCommentIdeas] = useState([]);
  const [anonymousReportIdeas, setAnonymousReportIdeas] = useState([]);
  const [comments, setComments] = useState([]);
  const [anonymousReportComments, setAnonymousReportComments] = useState([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedIdeaId, setSelectedIdeaId] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadYears = async () => {
      setLoading(true);
      try {
        const result = await fetchAcademicYears();
        const items = result.items || [];
        if (!isMounted) return;
        setAcademicYears(items || []);
        const current = items.find((item) => item.isCurrent) || items[0];
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
    return () => {
      isMounted = false;
    };
  }, []);

  const selectedYear = useMemo(
    () => academicYears.find((year) => String(year.id) === String(selectedYearId)),
    [academicYears, selectedYearId],
  );

  useEffect(() => {
    if (!selectedYear?.academicYear) return;

    let isMounted = true;
    const loadStats = async () => {
      try {
        const academicYearValue = selectedYear.academicYear.replace('/', '-');
        const [data, ideaItems] = await Promise.all([
          fetchReportStatistics(academicYearValue),
          fetchIdeas().catch(() => []),
        ]);
        const withoutCommentItems = await fetchReportIdeas({
          type: 'without_comments',
          academicYear: academicYearValue,
        }).catch(() => []);
        const anonymousIdeasItems = await fetchReportIdeas({
          type: 'anonymous',
          academicYear: academicYearValue,
        }).catch(() => []);
        const anonymousCommentsItems = await fetchReportComments({
          type: 'anonymous',
          academicYear: academicYearValue,
        }).catch(() => []);
        const commentItems = await fetchComments({ academicYear: academicYearValue }).catch(() => []);
        if (!isMounted) return;
        setStats(data);
        setIdeas(ideaItems || []);
        setWithoutCommentIdeas(withoutCommentItems || []);
        setAnonymousReportIdeas(anonymousIdeasItems || []);
        setAnonymousReportComments(anonymousCommentsItems || []);
        setComments(commentItems || []);
        setErrorMessage('');
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(error?.message || 'Failed to load report statistics');
      }
    };

    loadStats();
    return () => {
      isMounted = false;
    };
  }, [selectedYear?.academicYear]);

  const ideasBarData = useMemo(() => ({
    xAxis: [{ data: stats.ideasPerDepartment.map((item) => item.department) }],
    series: [
      {
        data: stats.ideasPerDepartment.map((item) => Number(item.ideaCount ?? 0)),
        color: '#60a5fa',
      },
    ],
  }), [stats.ideasPerDepartment]);

  const contributorsBarData = useMemo(() => ({
    xAxis: [{ data: stats.contributorsPerDepartment.map((item) => item.department) }],
    series: [
      {
        data: stats.contributorsPerDepartment.map((item) => Number(item.contributorCount ?? 0)),
        color: '#86efac',
      },
    ],
  }), [stats.contributorsPerDepartment]);

  const ideasPieData = useMemo(
    () => buildChartData(stats.ideasPerDepartment, 'percentage'),
    [stats.ideasPerDepartment],
  );
  const contributorsPieData = useMemo(
    () => buildChartData(stats.contributorsPerDepartment, 'percentage'),
    [stats.contributorsPerDepartment],
  );

  const ideasWithoutComments = useMemo(
    () =>
      withoutCommentIdeas.map((idea) => ({
        id: idea.id,
        title: idea.title || idea.name,
        userName: idea.authorName || idea.author?.name || idea.author?.full_name || 'Anonymous',
        department: idea.departmentName || idea.department?.name || 'Unknown',
        category: idea.categoryName || idea.categories?.[0]?.name || 'Unknown',
        thumbUpCount: idea.thumbUpCount || 0,
        thumbDownCount: idea.thumbDownCount || 0,
        reportCount: idea.reportCount || 0,
        statusId: idea.statusId ?? idea.status?.id ?? idea.status_id ?? null,
      })),
    [withoutCommentIdeas],
  );

  const anonymousIdeas = useMemo(
    () =>
      anonymousReportIdeas.map((idea) => ({
        id: idea.id,
        title: idea.title || idea.name,
        department: idea.departmentName || idea.department?.name || 'Unknown',
        category: idea.categoryName || idea.categories?.[0]?.name || 'Unknown',
        thumbUpCount: idea.thumbUpCount || 0,
        thumbDownCount: idea.thumbDownCount || 0,
        reportCount: idea.reportCount || 0,
        statusId: idea.statusId ?? idea.status?.id ?? idea.status_id ?? null,
      })),
    [anonymousReportIdeas],
  );
  const anonymousComments = useMemo(
    () =>
      
      anonymousReportComments.map((comment) => ({
        id: comment.id,
        ideaId: comment.ideaId ?? null,
        comment: comment.comment || comment.content,
        title: comment.title || comment.ideaTitle || 'Untitled Idea',
        department: comment.department?.name || comment.department || 'Unknown',
        category: comment.category?.name || comment.category || 'Unknown',
        thumbUpCount: comment.thumbUpCount || 0,
        thumbDownCount: comment.thumbDownCount || 0,
        reportCount: comment.reportCount || 0,
      })),
    [anonymousReportComments],
  );

  const handleOpenDetail = (row) => {
    if (!row?.id) return;
    const ideaId = row.ideaId ?? row.id;
    setSelectedIdeaId(ideaId);
    setDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setSelectedIdeaId(null);
  };

  return (
    <MainLayout>
      <Box sx={{ p: { xs: 2.5, md: 3.5 } }}>
        <Paper
          elevation={0}
          sx={{
            p: 1,
            borderRadius: 3,
            bgcolor: '#f3f4f6',
            maxWidth: 420,
            mx: 'auto',
            boxShadow: '0 10px 20px rgba(15, 23, 42, 0.08)',
            mb: 3,
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              onClick={() => setActiveTab('statistics')}
              sx={{
                flex: 1,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: 16,
                color: activeTab === 'statistics' ? '#1f2937' : '#9ca3af',
                borderRadius: 2,
                height: 46,
                bgcolor: activeTab === 'statistics' ? '#ffffff' : 'transparent',
                boxShadow: activeTab === 'statistics' ? '0 8px 20px rgba(15, 23, 42, 0.12)' : 'none',
                '&:hover': { bgcolor: activeTab === 'statistics' ? '#ffffff' : 'rgba(255,255,255,0.5)' },
              }}
            >
              Statistics
            </Button>
            <Button
              onClick={() => setActiveTab('reports')}
              sx={{
                flex: 1,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: 16,
                color: activeTab === 'reports' ? '#1f2937' : '#9ca3af',
                borderRadius: 2,
                height: 46,
                bgcolor: activeTab === 'reports' ? '#ffffff' : 'transparent',
                boxShadow: activeTab === 'reports' ? '0 8px 20px rgba(15, 23, 42, 0.12)' : 'none',
                '&:hover': { bgcolor: activeTab === 'reports' ? '#ffffff' : 'rgba(255,255,255,0.5)' },
              }}
            >
              Reports
            </Button>
          </Stack>
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

            {activeTab === 'statistics' ? (
              <Stack spacing={3}>
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
                    <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#364152', mb: 1.5 }}>
                      Ideas per department
                    </Typography>
                    <BarChart title="Ideas per department" xAxis={ideasBarData.xAxis} series={ideasBarData.series} height={300} />
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
                    <PieChart title="Percentage of Ideas per department" data={ideasPieData} />
                  </Paper>
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
                    <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#364152', mb: 1.5 }}>
                      Contributors per department
                    </Typography>
                    <BarChart title="Contributors per department" xAxis={contributorsBarData.xAxis} series={contributorsBarData.series} height={300} />
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
                    <PieChart title="Percentage of Contributors per department" data={contributorsPieData} />
                  </Paper>
                </Stack>
              </Stack>
            ) : (
              <Stack spacing={3}>
                <ReportsIdeasTable
                  title="Ideas without a comment"
                  rows={ideasWithoutComments}
                  onDetail={handleOpenDetail}
                />
                <ReportsAnonymousIdeasTable
                  title="Anonymous Ideas"
                  rows={anonymousIdeas}
                  onDetail={handleOpenDetail}
                />
                <ReportsAnonymousCommentsTable
                  title="Anonymous Comments"
                  rows={anonymousComments}
                  onDetail={handleOpenDetail}
                />
              </Stack>
            )}
          </>
        )}
      </Box>

      <AllIdeaDetailsDialog
        open={detailOpen}
        ideaId={selectedIdeaId}
        onClose={handleCloseDetail}
        onHide={handleCloseDetail}
        showHideActions={false}
      />
    </MainLayout>
  );
}

export default ReportsPage;
