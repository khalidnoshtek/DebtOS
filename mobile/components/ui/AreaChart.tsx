import { useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import Svg, { Path, Line as SvgLine } from "react-native-svg";
import { colors, spacing, typography } from "@/theme/tokens";

/**
 * Lightweight area/line chart on react-native-svg (already in the native build —
 * no extra native module, no gradient dependency). Phone-first, full-width.
 */
export function AreaChart({
  values,
  labels,
  height = 180,
  color = colors.accent,
  formatY,
}: {
  values: number[];
  labels?: string[];
  height?: number;
  color?: string;
  formatY?: (v: number) => string;
}) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const padX = 6;
  const padTop = 8;
  const padBottom = labels ? 18 : 8;
  const plotH = height - padTop - padBottom;

  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values, 1);
  const range = max - min || 1;

  const n = values.length;
  const x = (i: number) => (n <= 1 ? padX : padX + (i * (width - padX * 2)) / (n - 1));
  const y = (v: number) => padTop + plotH - ((v - min) / range) * plotH;
  const zeroY = y(0);

  const linePath = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const areaPath =
    n > 0 ? `${linePath} L${x(n - 1).toFixed(1)},${zeroY.toFixed(1)} L${x(0).toFixed(1)},${zeroY.toFixed(1)} Z` : "";

  return (
    <View onLayout={onLayout}>
      <View style={styles.yLabels}>
        <Text style={styles.axis}>{formatY ? formatY(max) : Math.round(max)}</Text>
        <Text style={styles.axis}>{formatY ? formatY(min) : Math.round(min)}</Text>
      </View>
      {width > 0 ? (
        <Svg width={width} height={height}>
          {/* zero baseline */}
          <SvgLine x1={padX} y1={zeroY} x2={width - padX} y2={zeroY} stroke={colors.border} strokeWidth={1} strokeDasharray="3 3" />
          <Path d={areaPath} fill={color} fillOpacity={0.15} />
          <Path d={linePath} stroke={color} strokeWidth={2} fill="none" />
        </Svg>
      ) : (
        <View style={{ height }} />
      )}
      {labels ? (
        <View style={styles.xLabels}>
          {labels.map((l, i) => (l ? <Text key={i} style={styles.axis}>{l}</Text> : null))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  yLabels: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  xLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xs },
  axis: { ...typography.caption, fontSize: 10, color: colors.textFaint },
});
