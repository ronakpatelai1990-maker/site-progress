interface Props {
  data: number[];
  width?: number;
  height?: number;
}

export function UsageSparkline({ data, width = 80, height = 24 }: Props) {
  if (data.length === 0 || data.every(d => d === 0)) return null;
  
  const max = Math.max(...data, 1);
  const barWidth = Math.floor((width - (data.length - 1)) / data.length);
  
  return (
    <svg width={width} height={height} className="shrink-0">
      {data.map((val, i) => {
        const barHeight = Math.max((val / max) * height, val > 0 ? 2 : 0);
        return (
          <rect
            key={i}
            x={i * (barWidth + 1)}
            y={height - barHeight}
            width={barWidth}
            height={barHeight}
            rx={1}
            className={val > 0 ? "fill-accent" : "fill-secondary"}
          />
        );
      })}
    </svg>
  );
}
