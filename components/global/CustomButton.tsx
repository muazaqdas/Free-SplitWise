import { Fragment, useState, type ReactNode } from 'react';
import { Pressable, Text, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

interface CustomButtonProps {
  buttonText?: string;
  leftComponent?: ReactNode;
  rightComponent?: ReactNode;
  onPress?: () => void;
  className?: string;
  textClassName?: string;
  fillColor?: string;
  showTeeth?: boolean;
}

const TOOTH_WIDTH = 14;
const TOOTH_HEIGHT = 6;
const MIN_TEETH = 3;
const TOOTH_STROKE = '#78350f';

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function buildPillPath(width: number, height: number): string {
  const r = height / 2;
  return `M${r},0 L${width - r},0 A${r},${r} 0 0 1 ${width - r},${height} L${r},${height} A${r},${r} 0 0 1 ${r},0 Z`;
}

interface Tooth {
  fillPath: string;
  ribPath: string;
}

function buildTeeth(width: number, height: number, edge: 'top' | 'bottom', seedBase: number): Tooth[] {
  const r = height / 2;
  const straightWidth = Math.max(width - 2 * r, 0);
  const count = Math.max(MIN_TEETH, Math.round(straightWidth / TOOTH_WIDTH));

  const weights = Array.from({ length: count }, (_, i) => 0.55 + seededRandom(seedBase + i) * 0.9);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map((w) => (w / totalWeight) * straightWidth);

  const teeth: Tooth[] = [];
  let x = r;
  for (let i = 0; i < count; i++) {
    const toothWidth = widths[i];
    const toothHeight = TOOTH_HEIGHT * (0.55 + seededRandom(seedBase + i + 50) * 0.9);
    const x0 = x;
    const x1 = x + toothWidth;
    const midX = x + toothWidth / 2;
    const baseY = edge === 'top' ? 0 : height;
    const apexY = edge === 'top' ? toothHeight : height - toothHeight;
    teeth.push({
      fillPath: `M${x0},${baseY} L${midX},${apexY} L${x1},${baseY} Z`,
      ribPath: `M${midX},${baseY} L${midX},${apexY}`,
    });
    x = x1;
  }
  return teeth;
}

export default function CustomButton({
  buttonText = '',
  leftComponent,
  rightComponent,
  onPress,
  className = '',
  textClassName = '',
  fillColor = '#0f172a',
  showTeeth = false,
}: CustomButtonProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  };

  const hasSize = size.width > 0 && size.height > 0;
  const topTeeth = showTeeth && hasSize ? buildTeeth(size.width, size.height, 'top', 1) : [];
  const bottomTeeth = showTeeth && hasSize ? buildTeeth(size.width, size.height, 'bottom', 100) : [];

  return (
    <Pressable
      onPress={onPress}
      onLayout={handleLayout}
      className={`flex-row items-center justify-center gap-2 rounded-full px-4 py-2.5 active:scale-95 ${className}`}
    >
      {hasSize && (
        <Svg
          width={size.width}
          height={size.height}
          viewBox={`0 0 ${size.width} ${size.height}`}
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          <Defs>
            <LinearGradient id="toothGradTop" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#a16207" />
              <Stop offset="1" stopColor="#fef08a" />
            </LinearGradient>
            <LinearGradient id="toothGradBottom" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#fef08a" />
              <Stop offset="1" stopColor="#a16207" />
            </LinearGradient>
          </Defs>
          <Path d={buildPillPath(size.width, size.height)} fill={fillColor} />
          {topTeeth.map((tooth, i) => (
            <Fragment key={`top-${i}`}>
              <Path d={tooth.fillPath} fill="url(#toothGradTop)" stroke={TOOTH_STROKE} strokeWidth={0.5} />
              <Path d={tooth.ribPath} stroke="rgba(120,53,15,0.35)" strokeWidth={0.6} />
            </Fragment>
          ))}
          {bottomTeeth.map((tooth, i) => (
            <Fragment key={`bottom-${i}`}>
              <Path d={tooth.fillPath} fill="url(#toothGradBottom)" stroke={TOOTH_STROKE} strokeWidth={0.5} />
              <Path d={tooth.ribPath} stroke="rgba(120,53,15,0.35)" strokeWidth={0.6} />
            </Fragment>
          ))}
        </Svg>
      )}
      {leftComponent}
      <Text className={`text-center text-base font-semibold text-white ${textClassName}`}>{buttonText}</Text>
      {rightComponent}
    </Pressable>
  );
}
