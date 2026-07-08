import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface ChartWrapperProps {
  data: any[];
  dataKey: string;
  name: string;
}

export const ChartWrapper: React.FC<ChartWrapperProps> = ({ data, dataKey, name }) => {
  return (
    <ResponsiveContainer width="100%" height={300} className="my-6">
      <LineChart data={data}>
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey={dataKey} name={name} stroke="#4F46E5" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default ChartWrapper;
