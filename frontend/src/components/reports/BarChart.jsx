import { Box, Typography } from '@mui/material';

const palette = ['#60a5fa', '#86efac', '#fda4af', '#fdba74', '#a5b4fc', '#f9a8d4'];

function BarChart({ title, data = [], xAxis, series, height = 160 }) {
  const hasSeries = Array.isArray(series) && series.length > 0 && xAxis?.[0]?.data?.length;
  const maxValue = hasSeries
    ? Math.max(1, ...series.flatMap((s) => s.data || []))
    : Math.max(1, ...data.map((item) => item.value));
  const barWidth = 32;
  const seriesGap = 10;
  const groupGap = 24;
  const categories = hasSeries ? xAxis[0].data : data.map((item) => item.label);
  const groupWidth = hasSeries
    ? series.length * barWidth + (series.length - 1) * seriesGap
    : barWidth;
  const chartWidth = categories.length * (groupWidth + groupGap) + groupGap;

  return (
    <Box sx={{ width: '100%' }}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#364152', mb: 1.5 }}>
        {title}
      </Typography>
      {(hasSeries ? categories.length === 0 : data.length === 0) ? (
        <Typography variant="body2" color="text.secondary">
          No data available.
        </Typography>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <svg width={chartWidth} height={height + 40}>
            {hasSeries
              ? categories.map((label, groupIndex) => {
                  const groupX = groupGap + groupIndex * (groupWidth + groupGap);
                  return (
                    <g key={label}>
                      {series.map((serie, serieIndex) => {
                        const value = serie.data?.[groupIndex] ?? 0;
                        const barHeight = Math.round((value / maxValue) * height);
                        const x = groupX + serieIndex * (barWidth + seriesGap);
                        const y = height - barHeight;
                        const color = serie.color || palette[serieIndex % palette.length];
                        return (
                          <rect key={`${label}-${serieIndex}`} x={x} y={y} width={barWidth} height={barHeight} rx={6} fill={color} />
                        );
                      })}
                      <text
                        x={groupX + groupWidth / 2}
                        y={height + 20}
                        textAnchor="middle"
                        fontSize="11"
                        fill="#94a3b8"
                      >
                        {label}
                      </text>
                    </g>
                  );
                })
              : data.map((item, index) => {
                  const barHeight = Math.round((item.value / maxValue) * height);
                  const x = groupGap + index * (barWidth + groupGap);
                  const y = height - barHeight;
                  const color = item.color || palette[index % palette.length];

                  return (
                    <g key={item.label}>
                      <rect x={x} y={y} width={barWidth} height={barHeight} rx={6} fill={color} />
                      <text x={x + barWidth / 2} y={height + 20} textAnchor="middle" fontSize="11" fill="#94a3b8">
                        {item.label}
                      </text>
                    </g>
                  );
                })}
          </svg>
        </Box>
      )}
    </Box>
  );
}

export default BarChart;
