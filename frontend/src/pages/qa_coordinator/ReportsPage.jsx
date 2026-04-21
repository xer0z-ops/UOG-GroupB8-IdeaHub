import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import MainLayout from '../../layouts/MainLayout.jsx';
import { fetchAcademicYears } from '../../services/academicYearService.js';
import { fetchCoordinatorStatistics, fetchReportComments, fetchReportIdeas } from '../../services/reportService.js';
import { fetchIdeas } from '../../services/ideaService.js';
import { fetchComments } from '../../services/commentService.js';
import { BarChart } from '@mui/x-charts/BarChart';
import { PieChart } from '@mui/x-charts/PieChart';
// import PieChart from '../../components/reports/PieChart.jsx';
import ReportsIdeasTable from '../../components/reports/ReportsIdeasTable.jsx';
import ReportsAnonymousIdeasTable from '../../components/reports/ReportsAnonymousIdeasTable.jsx';
import ReportsAnonymousCommentsTable from '../../components/reports/ReportsAnonymousCommentsTable.jsx';
import AllIdeaDetailsDialog from '../../components/ideas/AllIdeaDetailsDialog.jsx';
import { data } from 'react-router-dom';

const palette = ['#60a5fa', '#86efac', '#fda4af', '#fdba74', '#a5b4fc', '#f9a8d4'];

const buildCategoryPie = (items) =>
  items.map((item, index) => ({
    label: item.category,
    value: Number(item.percentage ?? item.ideaCount ?? 0),
    color: palette[index % palette.length],
  }));

const ReportsPage = () => {
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState('statistics');
  const [stats, setStats] = useState({ ideasPerCategory: [], contributions: [] });
  const [ideas, setIdeas] = useState([]);
  const [withoutCommentIdeas, setWithoutCommentIdeas] = useState([]);
  const [anonymousReportIdeas, setAnonymousReportIdeas] = useState([]);
  const [anonymousReportComments, setAnonymousReportComments] = useState([]);
  const [comments, setComments] = useState([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedIdeaId, setSelectedIdeaId] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadYears = async () => {
      setLoading(true);
      try {
        const result = await fetchAcademicYears();
        if (!isMounted) return;
        setAcademicYears(result.items || []);
        const current = result.items.find((item) => item.isCurrent) || result.items[0];
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
      setStatsLoading(true);
      try {
        const academicYearValue = selectedYear.academicYear.replace('/', '-');
        const data = await fetchCoordinatorStatistics(academicYearValue);
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
        const ideaItems = await fetchIdeas().catch(() => []);
        const commentItems = await fetchComments({ academicYear: academicYearValue }).catch(() => []);
        if (!isMounted) return;
        setStats(data);
        setWithoutCommentIdeas(withoutCommentItems || []);
        setAnonymousReportIdeas(anonymousIdeasItems || []);
        setAnonymousReportComments(anonymousCommentsItems || []);
        setIdeas(ideaItems || []);
        setComments(commentItems || []);
        setErrorMessage('');
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(error?.message || 'Failed to load report statistics');
      } finally {
        if (isMounted) setStatsLoading(false);
      }
    };

    loadStats();
    return () => {
      isMounted = false;
    };
  }, [selectedYearId, selectedYear?.academicYear]);

  const contributions = stats.contributions?.[0];
  const contributionBar = {
    xAxis: [{ data: ['Active', 'Inactive'] }],
    series: [
      {
        data: [
          Number(contributions?.contributedCount ?? 0),
          Number(contributions?.notContributedCount ?? 0),
        ],
        color: '#86efac',
      },
    ],
    height: 300,
  };

   const ideasByCategoryPie = useMemo(
    () =>
      (stats.ideasPerCategory || []).map((item, index) => ({
        id: index,
        value: Number(item.ideaCount ?? item.percentage ?? 0),
        label: item.category || `Category ${index + 1}`,
        color: palette[index % palette.length],
      })),
    [stats.ideasPerCategory],
  );
  const hasIdeasByCategory = ideasByCategoryPie.some((item) => Number(item.value) > 0);

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

        {loading || statsLoading ? (
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
                    Contributors in Department
                  </Typography>
                  <BarChart title="Contributors in Department" xAxis={contributionBar.xAxis} series={contributionBar.series} height={contributionBar.height} />
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
                  {/* <PieChart title="Ideas by Category" data={ideasByCategoryPie} /> */}
                  
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#364152', mb: 1.5 }}>
                    Ideas by Category
                  </Typography>
                  {hasIdeasByCategory ? (
                    <PieChart
                      series={[
                        {
                          data: ideasByCategoryPie,
                        },
                      ]}
                      width={220}
                      height={220}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No data available.
                    </Typography>
                  )}

                </Paper>
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
};

export default ReportsPage;
