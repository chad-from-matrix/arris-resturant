'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/**
 * Chart palette — gold → copper → brown → pale gold only.
 * No blue, purple or grey-blue anywhere, charts included.
 */
export const CHART_COLORS = ['#E69719', '#97622C', '#6A4F28', '#E4D3A9', '#DFA759', '#532919'];

const AXIS = { stroke: '#B4B1A9', fontSize: 11 };
const GRID = '#B4B1A9';

const tooltipStyle = {
  background: '#FDFCF9',
  border: '1px solid rgba(230,151,25,0.35)',
  borderRadius: 12,
  color: '#6A4F28',
  fontSize: 12,
};

export function BarSeriesChart({
  data,
  xKey,
  series,
  height = 280,
  formatter,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  series: { key: string; name: string; color?: string }[];
  height?: number;
  formatter?: (value: number) => string;
}) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid stroke={GRID} strokeOpacity={0.3} vertical={false} />
          <XAxis dataKey={xKey} tick={AXIS} axisLine={{ stroke: GRID }} tickLine={false} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} width={64} />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: 'rgba(230,151,25,0.08)' }}
            formatter={(value) => (formatter ? formatter(Number(value)) : value)}
          />
          {series.length > 1 ? <Legend wrapperStyle={{ fontSize: 12, color: '#6A4F28' }} /> : null}
          {series.map((entry, index) => (
            <Bar
              key={entry.key}
              dataKey={entry.key}
              name={entry.name}
              fill={entry.color ?? CHART_COLORS[index % CHART_COLORS.length]}
              radius={[6, 6, 0, 0]}
              maxBarSize={44}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LineSeriesChart({
  data,
  xKey,
  series,
  height = 280,
  formatter,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  series: { key: string; name: string; color?: string }[];
  height?: number;
  formatter?: (value: number) => string;
}) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid stroke={GRID} strokeOpacity={0.3} vertical={false} />
          <XAxis dataKey={xKey} tick={AXIS} axisLine={{ stroke: GRID }} tickLine={false} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} width={64} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => (formatter ? formatter(Number(value)) : value)}
          />
          {series.length > 1 ? <Legend wrapperStyle={{ fontSize: 12, color: '#6A4F28' }} /> : null}
          {series.map((entry, index) => (
            <Line
              key={entry.key}
              type="monotone"
              dataKey={entry.key}
              name={entry.name}
              stroke={entry.color ?? CHART_COLORS[index % CHART_COLORS.length]}
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SharePieChart({
  data,
  height = 260,
  formatter,
}: {
  data: { name: string; value: number }[];
  height?: number;
  formatter?: (value: number) => string;
}) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="52%"
            outerRadius="80%"
            paddingAngle={2}
            stroke="#FDFCF9"
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => (formatter ? formatter(Number(value)) : value)}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: '#6A4F28' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
