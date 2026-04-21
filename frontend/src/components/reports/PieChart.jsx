import { Box, Stack, Typography } from '@mui/material';

const palette = ['#60a5fa', '#86efac', '#fda4af', '#fdba74', '#a5b4fc', '#f9a8d4'];

const describeArc = (cx, cy, r, startAngle, endAngle) => {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    'M', start.x, start.y,
    'A', r, r, 0, largeArcFlag, 0, end.x, end.y,
    'L', cx, cy,
    'Z',
  ].join(' ');
};

const polarToCartesian = (cx, cy, r, angle) => {
  const rad = (angle - 90) * (Math.PI / 180);
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
};

function PieChart({ title, data = [] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const size = 180;
  const radius = 70;
  const center = size / 2;

  let startAngle = 0;

  return (
    <Box>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#364152', mb: 1.5 }}>
        {title}
      </Typography>
      {total === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No data available.
        </Typography>
      ) : (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <svg width={size} height={size}>
            {data.map((item, index) => {
              const valuePercent = (item.value / total) * 100;
              const endAngle = startAngle + (valuePercent / 100) * 360;
              const color = item.color || palette[index % palette.length];
              const path = describeArc(center, center, radius, startAngle, endAngle);
              startAngle = endAngle;
              return <path key={item.label} d={path} fill={color} />;
            })}
          </svg>
          <Stack spacing={1}>
            {data.map((item, index) => {
              const color = item.color || palette[index % palette.length];
              const percent = total ? Math.round((item.value / total) * 100) : 0;
              return (
                <Stack key={item.label} direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
                  <Typography variant="body2" color="#6b7280">
                    {item.label}
                  </Typography>
                  <Typography variant="body2" color="#6b7280" sx={{ marginLeft: 'auto' }}>
                    {percent}%
                  </Typography>
                </Stack>
              );
            })}
          </Stack>
        </Stack>
      )}
    </Box>
  );
}

export default PieChart;
